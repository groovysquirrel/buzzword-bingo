import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// For now, let's create a simple leaderboard function here
// We'll integrate with the existing leaderboard logic
async function getCurrentLeaderboard(gameId: string) {
  // This is a simplified version - in production you'd import from sseLeaderboard
  // or create a shared leaderboard service
  return [];
}

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
  // TODO: Store subscription info and send initial data
}

/**
 * Handle unsubscription from game updates
 */
async function handleUnsubscribe(connectionId: string) {
  console.log(`Connection ${connectionId} unsubscribed`);
  // TODO: Remove subscription info
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
    console.log(`Sent leaderboard to ${connectionId} for game ${gameId}`);
    // TODO: Send leaderboard data via WebSocket
  } catch (error) {
    console.error("Failed to get leaderboard:", error);
  }
}

/**
 * Broadcast message to all active connections for a specific game
 */
export async function broadcastToGame(gameId: string, data: any) {
  try {
    // Get all active connections
    const result = await dynamoDb.send(new ScanCommand({
      TableName: Resource.Events.name,
      FilterExpression: "#type = :type",
      ExpressionAttributeNames: {
        "#type": "type",
      },
      ExpressionAttributeValues: {
        ":type": "websocket_connection",
      },
    }));

    const connections = result.Items || [];
    
    console.log(`Broadcasting message to ${connections.length} connections for game ${gameId}:`, data);
    
    // TODO: Implement actual message broadcasting
    
  } catch (error) {
    console.error("Broadcast error:", error);
  }
} 