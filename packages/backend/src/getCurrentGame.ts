import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "./lib/handler";
import { Game } from "./lib/types";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function getCurrentGame(event: APIGatewayProxyEvent) {
  try {
    // Get all games and find the active one
    const result = await dynamoDb.send(new ScanCommand({
      TableName: Resource.Games.name,
      FilterExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "active",
      },
    }));

    const activeGames = (result.Items || []) as Game[];

    if (activeGames.length === 0) {
      return JSON.stringify({
        error: "No active game found",
        currentGameId: null,
        timestamp: new Date().toISOString(),
      });
    }

    // If multiple active games, return the most recent one
    const currentGame = activeGames.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];

    return JSON.stringify({
      currentGameId: currentGame.gameId,
      status: currentGame.status,
      startTime: currentGame.startTime,
      wordCount: currentGame.wordList ? currentGame.wordList.length : 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get current game error:", error);
    return JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      currentGameId: null,
      timestamp: new Date().toISOString(),
    });
  }
}

export const main = handler(getCurrentGame); 