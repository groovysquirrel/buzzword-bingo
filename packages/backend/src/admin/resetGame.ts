import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, BatchWriteCommand, UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";
import { addEvent } from "../sseLeaderboard";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function resetGame(event: APIGatewayProxyEvent) {
  const gameId = event.pathParameters?.gameId;
  if (!gameId) {
    throw new Error("Game ID is required");
  }

  const now = new Date().toISOString();

  // Mark the current game as complete with end time
  await dynamoDb.send(new UpdateCommand({
    TableName: Resource.Games.name,
    Key: { gameId },
    UpdateExpression: "SET #status = :status, endTime = :endTime",
    ExpressionAttributeNames: {
      "#status": "status",
    },
    ExpressionAttributeValues: {
      ":status": "complete",
      ":endTime": now,
    },
  }));

  // Get all progress records for this game
  const progressResult = await dynamoDb.send(new ScanCommand({
    TableName: Resource.BingoProgress.name,
    FilterExpression: "gameId = :gameId",
    ExpressionAttributeValues: {
      ":gameId": gameId,
    },
  }));

  const progressItems = progressResult.Items || [];

  // Batch delete all progress records
  if (progressItems.length > 0) {
    // DynamoDB batch write can handle max 25 items at a time
    const batchSize = 25;
    for (let i = 0; i < progressItems.length; i += batchSize) {
      const batch = progressItems.slice(i, i + batchSize);
      
      const deleteRequests = batch.map(item => ({
        DeleteRequest: {
          Key: {
            sessionId: item.sessionId,
            word: item.word,
          },
        },
      }));

      await dynamoDb.send(new BatchWriteCommand({
        RequestItems: {
          [Resource.BingoProgress.name]: deleteRequests,
        },
      }));
    }
  }

  // Also clear any completed bingo records for this game
  const completedResult = await dynamoDb.send(new ScanCommand({
    TableName: Resource.CompletedBingo.name,
    FilterExpression: "gameId = :gameId",
    ExpressionAttributeValues: {
      ":gameId": gameId,
    },
  }));

  const completedItems = completedResult.Items || [];
  
  if (completedItems.length > 0) {
    const batchSize = 25;
    for (let i = 0; i < completedItems.length; i += batchSize) {
      const batch = completedItems.slice(i, i + batchSize);
      
      const deleteRequests = batch.map(item => ({
        DeleteRequest: {
          Key: {
            sessionId: item.sessionId,
            gameId: item.gameId,
          },
        },
      }));

      await dynamoDb.send(new BatchWriteCommand({
        RequestItems: {
          [Resource.CompletedBingo.name]: deleteRequests,
        },
      }));
    }
  }

  // Publish game reset event for real-time updates
  await addEvent("game_reset", {
    gameId: gameId,
    progressRecordsCleared: progressItems.length,
    completedBingoRecordsCleared: completedItems.length,
  });

  return JSON.stringify({
    success: true,
    message: `Game ${gameId} has been reset and marked as complete`,
    gameCompletedAt: now,
    progressRecordsDeleted: progressItems.length,
    completedBingoRecordsDeleted: completedItems.length,
    timestamp: new Date().toISOString(),
  });
}

export const main = handler(resetGame); 