import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { WebSocketManager } from "../lib/websocketManager";
import { getCurrentLeaderboard } from "../lib/gameEvents";
import { Game } from "../lib/types";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const webSocketManager = WebSocketManager.getInstance();

/**
 * WebSocket Message Handler
 * 
 * Handles incoming WebSocket messages and broadcasts updates
 */
export async function main(event: APIGatewayProxyEvent) {
  console.log("WebSocket message event:", JSON.stringify(event, null, 2));

  const { connectionId } = event.requestContext;
  
  if (!connectionId) {
    return { statusCode: 400, body: "Missing connection ID" };
  }

  try {
    // Parse incoming message
    const body = event.body ? JSON.parse(event.body) : {};
    const { action, gameId } = body;

    console.log(`WebSocket message from ${connectionId}: ${action} for game ${gameId}`);

    switch (action) {
      case "subscribe":
        await handleSubscribe(connectionId, gameId);
        break;
      
      case "unsubscribe":
        await handleUnsubscribe(connectionId);
        break;
      
      case "get_leaderboard":
        await handleGetLeaderboard(connectionId, gameId);
        break;
      
      default:
        console.log(`Unknown action: ${action}`);
    }

    return { statusCode: 200, body: "Message processed" };

  } catch (error) {
    console.error("Message handling error:", error);
    return { 
      statusCode: 500, 
      body: "Failed to process message: " + (error instanceof Error ? error.message : String(error))
    };
  }
}

/**
 * Handle subscription to game updates
 */
async function handleSubscribe(connectionId: string, gameId: string) {
  console.log(`Connection ${connectionId} subscribed to game ${gameId}`);
  
  try {
    // Send confirmation
    await webSocketManager.sendMessage(connectionId, {
      type: "subscribed",
      gameId,
      message: "Successfully subscribed to game updates"
    });

    // Send current leaderboard immediately
    if (gameId) {
      await handleGetLeaderboard(connectionId, gameId);
      
      // Send current game status
      await sendCurrentGameStatus(connectionId, gameId);
    }
  } catch (error) {
    console.error("Failed to handle subscription:", error);
  }
}

/**
 * Send current game status to a specific connection
 */
async function sendCurrentGameStatus(connectionId: string, gameId: string) {
  try {
    // Get current game from database
    const getResult = await dynamoDb.send(new GetCommand({
      TableName: Resource.Games.name,
      Key: { gameId }
    }));

    const currentGame = getResult.Item as Game;
    if (currentGame) {
      await webSocketManager.sendMessage(connectionId, {
        type: 'game_state_changed',
        gameId,
        previousState: null, // No previous state for initial status
        newState: currentGame.status,
        timestamp: new Date().toISOString(),
        reason: 'Initial game status',
        stateDescription: getStateDescription(currentGame.status)
      });
      console.log(`Sent current game status (${currentGame.status}) to ${connectionId}`);
    }
  } catch (error) {
    console.error("Failed to send current game status:", error);
  }
}

/**
 * Get user-friendly state description
 */
function getStateDescription(status: string): string {
  const descriptions: Record<string, string> = {
    open: 'Players can join the game',
    started: 'Game is active - players can mark words',
    paused: 'Game is temporarily paused',
    bingo: 'BINGO called - awaiting verification', 
    ended: 'Game completed with winner',
    cancelled: 'Game was cancelled'
  };
  return descriptions[status] || status;
}

/**
 * Handle unsubscription from game updates
 */
async function handleUnsubscribe(connectionId: string) {
  console.log(`Connection ${connectionId} unsubscribed`);
  
  await webSocketManager.sendMessage(connectionId, {
    type: "unsubscribed",
    message: "Unsubscribed from game updates"
  });
}

/**
 * Handle leaderboard request
 */
async function handleGetLeaderboard(connectionId: string, gameId: string) {
  if (!gameId) {
    console.log(`Connection ${connectionId} requested leaderboard without game ID`);
    return;
  }

  try {
    const leaderboard = await getCurrentLeaderboard(gameId);
    
    await webSocketManager.sendMessage(connectionId, {
      type: "leaderboard_update",
      gameId,
      timestamp: new Date().toISOString(),
      leaderboard: leaderboard,
      totalPlayers: leaderboard.length
    });

    console.log(`Sent leaderboard to ${connectionId} for game ${gameId}`);
  } catch (error) {
    console.error("Failed to get leaderboard:", error);
    
    await webSocketManager.sendMessage(connectionId, {
      type: "error",
      message: "Failed to retrieve leaderboard"
    });
  }
}

/**
 * Broadcast message to all active connections for a specific game
 */
export async function broadcastToGame(gameId: string, data: any) {
  try {
    console.log(`Broadcasting message for game ${gameId}:`, data);
    
    // Use the WebSocket manager to broadcast the message
    await webSocketManager.broadcastMessage(data);
    
  } catch (error) {
    console.error("Broadcast error:", error);
  }
} 