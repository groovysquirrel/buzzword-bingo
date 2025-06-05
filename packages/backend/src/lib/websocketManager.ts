import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * WebSocket Connection Manager
 * 
 * Simplified utility for managing WebSocket connections and sending messages
 * Based on working patterns from other projects
 */
export class WebSocketManager {
  private static instance: WebSocketManager;
  private apiGatewayClient: ApiGatewayManagementApiClient | null = null;

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Initialize the WebSocket API client
   */
  private initializeClient(): void {
    if (!this.apiGatewayClient) {
      const wsEndpoint = Resource.GameWebSocket.url;
      if (!wsEndpoint) {
        throw new Error("GameWebSocket.url not available from SST Resource");
      }

      // Convert WebSocket URL (wss://) to API Gateway Management endpoint (https://)
      // The ApiGatewayManagementApiClient needs the HTTPS endpoint, not the WSS endpoint
      const apiEndpoint = wsEndpoint.replace('wss://', '').replace('https://', '');
      const finalEndpoint = `https://${apiEndpoint}`;

      this.apiGatewayClient = new ApiGatewayManagementApiClient({
        endpoint: finalEndpoint,
        region: process.env.AWS_REGION || 'us-east-1'
      });

      console.log(`[WebSocket Manager] Initialized client with management endpoint: ${finalEndpoint} (from WebSocket URL: ${wsEndpoint})`);
    }
  }

  /**
   * Send a message to a specific WebSocket connection
   */
  public async sendMessage(connectionId: string, message: any): Promise<void> {
    this.initializeClient();

    if (!this.apiGatewayClient) {
      throw new Error("WebSocket API client not initialized");
    }

    try {
      await this.apiGatewayClient.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(message)
      }));

      console.log(`[WebSocket Manager] Message sent to connection: ${connectionId}`);
    } catch (error: any) {
      if (error.statusCode === 410) {
        console.log(`[WebSocket Manager] Connection ${connectionId} is stale, removing`);
        await this.removeStaleConnection(connectionId);
      } else {
        console.error(`[WebSocket Manager] Failed to send message to ${connectionId}:`, error);
        throw error;
      }
    }
  }

  /**
   * Remove a stale connection from the database
   */
  private async removeStaleConnection(connectionId: string): Promise<void> {
    try {
      await dynamoDb.send(new DeleteCommand({
        TableName: Resource.Events.name,
        Key: { eventId: `connection-${connectionId}` }
      }));
      console.log(`[WebSocket Manager] Removed stale connection: ${connectionId}`);
    } catch (error) {
      console.error(`[WebSocket Manager] Failed to remove stale connection ${connectionId}:`, error);
    }
  }

  /**
   * Broadcast a message to all active connections
   */
  public async broadcastMessage(message: any): Promise<void> {
    this.initializeClient();

    try {
      // Get all active WebSocket connections (this logic could be moved to a separate method)
      const { ScanCommand } = await import("@aws-sdk/lib-dynamodb");
      
      const connectionsResult = await dynamoDb.send(new ScanCommand({
        TableName: Resource.Events.name,
        FilterExpression: "#type = :type",
        ExpressionAttributeNames: {
          "#type": "type",
        },
        ExpressionAttributeValues: {
          ":type": "websocket_connection",
        },
      }));

      const connections = connectionsResult.Items || [];
      
      if (connections.length === 0) {
        console.log("[WebSocket Manager] No active connections found for broadcast");
        return;
      }

      console.log(`[WebSocket Manager] Broadcasting to ${connections.length} connections`);

      // Send to all connections
      const promises = connections.map(async (connection) => {
        const connectionData = connection.data;
        if (connectionData && connectionData.connectionId) {
          try {
            await this.sendMessage(connectionData.connectionId, message);
          } catch (error) {
            console.error(`[WebSocket Manager] Failed to broadcast to ${connectionData.connectionId}:`, error);
          }
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      console.error("[WebSocket Manager] Error in broadcast:", error);
      throw error;
    }
  }
} 