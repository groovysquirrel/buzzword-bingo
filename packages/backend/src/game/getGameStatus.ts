import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";
import { Game } from "../lib/types";

/**
 * Get Game Status Function
 * 
 * Retrieves the current status and information for a specific game.
 * This endpoint provides detailed information about a game's current state,
 * including player count, start time, and available transitions.
 * 
 * Path Parameters:
 * - gameId: The unique identifier for the game
 * 
 * Returns:
 * - Game status information
 * - Valid state transitions available
 * - Player statistics
 * - Timing information
 */

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function getGameStatus(event: APIGatewayProxyEvent) {
  try {
    // Extract game ID from URL path
    const gameId = event.pathParameters?.gameId;
    if (!gameId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Game ID is required in URL path"
        })
      };
    }

    // Get game from database
    const getResult = await dynamoDb.send(new GetCommand({
      TableName: Resource.Games.name,
      Key: { gameId }
    }));

    const game = getResult.Item as Game;
    if (!game) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: `Game ${gameId} not found`
        })
      };
    }

    // Calculate game duration if started
    let duration = null;
    if (game.startTime) {
      const startTime = new Date(game.startTime).getTime();
      const currentTime = Date.now();
      duration = Math.round((currentTime - startTime) / 1000); // Duration in seconds
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        gameId: game.gameId,
        status: game.status,
        startTime: game.startTime,
        endTime: game.endTime,
        duration,
        wordCount: game.wordList?.length || 0,
        updatedAt: game.updatedAt,
        stateHistory: game.stateHistory || [],
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error("Get game status error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      })
    };
  }
}

export const main = handler(getGameStatus);
