import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, BatchWriteCommand, PutCommand, UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";
import { createDefaultGame, generateBuzzwordGameId } from "../lib/gameUtils";
import { addEvent } from "../lib/gameEvents";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function newGame(event: APIGatewayProxyEvent) {
  const currentGameId = event.pathParameters?.gameId;
  if (!currentGameId) {
    throw new Error("Current game ID is required");
  }

  const now = new Date().toISOString();

  // First, mark ALL active games as complete to ensure we only have one active game
  const activeGamesResult = await dynamoDb.send(new ScanCommand({
    TableName: Resource.Games.name,
    FilterExpression: "#status IN (:playing, :open, :paused, :bingo)",
    ExpressionAttributeNames: {
      "#status": "status",
    },
    ExpressionAttributeValues: {
      ":playing": "playing",
      ":open": "open", 
      ":paused": "paused",
      ":bingo": "bingo"
    },
  }));

  const activeGames = activeGamesResult.Items || [];
  
  // Mark all active games as complete
  for (const game of activeGames) {
    await dynamoDb.send(new UpdateCommand({
      TableName: Resource.Games.name,
      Key: { gameId: game.gameId },
      UpdateExpression: "SET #status = :status, endTime = :endTime, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "ended",
        ":endTime": now,
        ":updatedAt": now,
      },
    }));
  }

  // Generate new buzzword-based game ID (much more corporate!)
  const newGameId = generateBuzzwordGameId();

  // Create new game record
  const newGameConfig = {
    ...createDefaultGame(),
    gameId: newGameId,
  };

  await dynamoDb.send(new PutCommand({
    TableName: Resource.Games.name,
    Item: newGameConfig,
  }));

  // Clear all progress from the previous game (same as reset functionality)
  const progressResult = await dynamoDb.send(new ScanCommand({
    TableName: Resource.BingoProgress.name,
    FilterExpression: "gameId = :gameId",
    ExpressionAttributeValues: {
      ":gameId": currentGameId,
    },
  }));

  const progressItems = progressResult.Items || [];

  // Batch delete old progress records
  if (progressItems.length > 0) {
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

  // Clear completed bingo records from previous game
  const completedResult = await dynamoDb.send(new ScanCommand({
    TableName: Resource.CompletedBingo.name,
    FilterExpression: "gameId = :gameId",
    ExpressionAttributeValues: {
      ":gameId": currentGameId,
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

  // Publish new game event for real-time updates
  await addEvent("new_game", {
    previousGameId: currentGameId,
    newGameId: newGameId,
    progressRecordsCleared: progressItems.length,
    completedBingoRecordsCleared: completedItems.length,
    previousActiveGames: activeGames.map(g => g.gameId),
  });

  return JSON.stringify({
    success: true,
          message: `New game created`,
    previousGameId: currentGameId,
    previousActiveGames: activeGames.map(g => g.gameId),
    previousGameCompletedAt: now,
    newGameId: newGameId,
    progressRecordsDeleted: progressItems.length,
    completedBingoRecordsDeleted: completedItems.length,
    timestamp: new Date().toISOString(),
    newGameConfig: newGameConfig,
  });
}

export const main = handler(newGame); 