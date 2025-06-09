import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, GetCommand, PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";
import { Game } from "../lib/types";
import { verifySessionToken } from "../auth/token";
import { createDefaultGame } from "../lib/gameUtils";
import { addEvent } from "../lib/gameEvents";

/**
 * Get Current Game Function
 * 
 * This function handles multiple scenarios:
 * 1. Public queries for current active game (no auth required)
 * 2. Player-specific game status checks (with session token)
 * 
 * For public access: Returns the currently active game information
 * For authenticated players: Validates their game status and suggests transitions
 * 
 * Query Parameters:
 * - playerCheck: Set to 'true' for player-specific status validation
 * 
 * Headers:
 * - Authorization: Bearer token (optional, enables player-specific features)
 */

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function getCurrentGame(event: APIGatewayProxyEvent) {
  try {
    // Check if this is a player-specific status check
    const isPlayerCheck = event.queryStringParameters?.playerCheck === 'true';
    const authHeader = event.headers.Authorization || event.headers.authorization;

    // Find the current active game
    const scanResult = await dynamoDb.send(new ScanCommand({
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

    const activeGames = (scanResult.Items || []) as Game[];

    if (activeGames.length === 0) {
      // No active games found - return error indicating no games available
      const baseResponse = {
        currentGameId: null,
        status: null,
        startTime: null,
        endTime: null,
        wordCount: 0,
        updatedAt: null,
        timestamp: new Date().toISOString(),
        error: "No active games found"
      };

      // If not a player check or no auth, return basic info
      if (!isPlayerCheck || !authHeader) {
        return {
          statusCode: 200,
          body: JSON.stringify(baseResponse)
        };
      }

      // Handle player-specific status check with authentication
      try {
        const token = authHeader.replace("Bearer ", "");
        const session = verifySessionToken(token);
        
        if (!session) {
          return {
            statusCode: 401,
            body: JSON.stringify({
              ...baseResponse,
              error: "Invalid session token",
              playerStatus: "authentication_failed"
            })
          };
        }

        // No active games available for player
        return {
          statusCode: 200,
          body: JSON.stringify({
            ...baseResponse,
            // Player-specific information
            playerGameId: null,
            playerGameStatus: "no_active_games",
            needsGameSwitch: false,
            playerStatus: "no_games_available",
            sessionId: session.sessionId,
            nickname: session.nickname,
            message: "No active games available. Please wait for an admin to create a new game.",
            suggestions: ["Wait for a new game to be created", "Contact an administrator"],
            // Action recommendations  
            recommendedActions: ["wait_for_game"]
          })
        };

      } catch (authError) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            ...baseResponse,
            error: "Authentication failed",
            playerStatus: "authentication_error",
            message: "Unable to verify player session"
          })
        };
      }
    }

    // Get the most recent active game
    const currentGame = activeGames.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];

    // Base response for public queries
    const baseResponse = {
      currentGameId: currentGame.gameId,
      status: currentGame.status,
      startTime: currentGame.startTime,
      endTime: currentGame.endTime,
      wordCount: currentGame.wordList ? currentGame.wordList.length : 0,
      updatedAt: currentGame.updatedAt,
      timestamp: new Date().toISOString(),
    };

    // If not a player check or no auth, return basic info
    if (!isPlayerCheck || !authHeader) {
      return {
        statusCode: 200,
        body: JSON.stringify(baseResponse)
      };
    }

    // Handle player-specific status check with authentication
    try {
      const token = authHeader.replace("Bearer ", "");
      const session = verifySessionToken(token);
      
      if (!session) {
        return {
          statusCode: 401,
          body: JSON.stringify({
            ...baseResponse,
            error: "Invalid session token",
            playerStatus: "authentication_failed"
          })
        };
      }

      // Get the player's current game from their session
      // Note: Session token doesn't contain currentGameId, so we need to get it from the request or use path param
      const playerGameId = event.pathParameters?.gameId || event.queryStringParameters?.gameId;
      const currentActiveGameId = currentGame.gameId;

      // Check if player needs to switch games
      const needsGameSwitch = playerGameId !== currentActiveGameId;
      
      let playerGameStatus = null;
      if (playerGameId && playerGameId !== currentActiveGameId) {
        // Check if player's old game still exists
        try {
          const playerGameResult = await dynamoDb.send(new GetCommand({
            TableName: Resource.Games.name,
            Key: { gameId: playerGameId },
          }));
          
          if (!playerGameResult.Item) {
            // Player's game doesn't exist - likely purged
            console.log(`Player's game ${playerGameId} not found - returning clear cache instruction`);
            return {
              statusCode: 200,
              body: JSON.stringify({
                action: "clear_cache",
                reason: "player_game_not_found", 
                message: "Your game no longer exists. The system may have been reset.",
                currentGameId: currentActiveGameId,
                timestamp: new Date().toISOString()
              })
            };
          }
          
          playerGameStatus = playerGameResult.Item.status;
        } catch (error) {
          playerGameStatus = "error";
        }
      }

      // Generate appropriate message and suggestions
      let message = "Your game is current and active";
      let suggestions: string[] = [];
      let playerStatus = "current";

      if (needsGameSwitch) {
        playerStatus = "needs_switch";
        message = `Your game (${playerGameId}) is no longer active. Switch to: ${currentActiveGameId}`;
        suggestions = [
          `Join the new game: ${currentActiveGameId}`,
          "Your progress in the previous game has been saved"
        ];
      } else if (currentGame.status === 'paused') {
        playerStatus = "game_paused";
        message = "The current game is paused";
        suggestions = ["Wait for the game to resume", "Check back later"];
      } else if (currentGame.status === 'bingo') {
        playerStatus = "bingo_pending";
        message = "BINGO has been called! Awaiting verification";
        suggestions = ["Wait for admin verification", "Continue viewing your card"];
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          ...baseResponse,
          // Player-specific information
          playerGameId,
          playerGameStatus,
          needsGameSwitch,
          playerStatus,
          sessionId: session.sessionId,
          nickname: session.nickname,
          message,
          suggestions,
          // Action recommendations
          recommendedActions: needsGameSwitch ? ["switch_game"] : ["continue_playing"]
        })
      };

    } catch (authError) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          ...baseResponse,
          error: "Authentication failed",
          playerStatus: "authentication_error",
          message: "Unable to verify player session"
        })
      };
    }

  } catch (error) {
    console.error("Get current game error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        currentGameId: null,
        timestamp: new Date().toISOString(),
      })
    };
  }
}

export const main = handler(getCurrentGame); 