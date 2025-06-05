import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "./lib/handler";
import { MASTER_BUZZWORDS, generateBingoCard, getCurrentGameId } from "./lib/gameUtils";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function testEndpoint(event: APIGatewayProxyEvent) {
  try {
    // Test database connectivity by counting players
    const playersResult = await dynamoDb.send(new ScanCommand({
      TableName: Resource.Players.name,
      Select: "COUNT",
    }));

    // Test game utilities
    const sampleCard = generateBingoCard();
    const currentGameId = getCurrentGameId();

    return JSON.stringify({
      status: "OK",
      timestamp: new Date().toISOString(),
      database: {
        playersTableName: Resource.Players.name,
        totalPlayers: playersResult.Count || 0,
      },
      gameInfo: {
        currentGameId,
        totalBuzzwords: MASTER_BUZZWORDS.length,
        sampleCard: sampleCard[0], // Just show first row
      },
      tables: {
        players: Resource.Players.name,
        games: Resource.Games.name,
        bingoProgress: Resource.BingoProgress.name,
        completedBingo: Resource.CompletedBingo.name,
      },
    });
  } catch (error) {
    console.error("Test endpoint error:", error);
    return JSON.stringify({
      status: "ERROR",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}

export const main = handler(testEndpoint); 