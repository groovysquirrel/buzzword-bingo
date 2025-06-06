import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyWebsocketEventV2WithRequestContext } from "aws-lambda";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Custom request context type with authorizer data
 */
interface CustomRequestContext {
  connectionId: string;
  routeKey: string;
  messageId: string;
  eventType: string;
  extendedRequestId: string;
  requestTime: string;
  messageDirection: string;
  stage: string;
  connectedAt: number;
  requestTimeEpoch: number;
  identity: {
    sourceIp: string;
  };
  requestId: string;
  domainName: string;
  apiId: string;
  authorizer?: {
    principalId: string;
    integrationLatency: number;
    userId: string;
    connectionType: string;
    sessionId?: string;
    nickname?: string;
    deviceId?: string;
    createdAt: string;
    permissions?: string;
  };
}

/**
 * WebSocket Connection Handler
 * 
 * Called when a client connects to the WebSocket API
 * Stores connection information for later message broadcasting
 * Handles both user sessions and public status board connections
 */
export async function main(event: APIGatewayProxyWebsocketEventV2WithRequestContext<CustomRequestContext>) {
  //console.log('[WS Connect] Handler called with event:', JSON.stringify(event, null, 2));

  const { connectionId, domainName, stage } = event.requestContext;
  
  if (!connectionId) {
    console.error('[WS Connect] Missing connection ID');
    return { statusCode: 400, body: "Missing connection ID" };
  }

  try {
    // Extract connection info from authorizer context
    const connectionType = event.requestContext.authorizer?.connectionType;
    const userId = event.requestContext.authorizer?.userId;
    const sessionId = event.requestContext.authorizer?.sessionId;
    const nickname = event.requestContext.authorizer?.nickname;
    const deviceId = event.requestContext.authorizer?.deviceId;
    const permissions = event.requestContext.authorizer?.permissions;
    
/*     console.log('[WS Connect] Authorizer context:', {
      connectionType,
      userId,
      sessionId,
      nickname,
      deviceId,
      permissions,
      authorizer: event.requestContext.authorizer
    }); */
    
    if (!connectionType || !userId) {
      console.error('[WS Connect] Missing required connection info from authorizer');
      return { statusCode: 401, body: "Unauthorized - Missing connection info" };
    }

    let connectionData: any;
    let identifier: string;

    if (connectionType === "user") {
      // User connection
      if (!sessionId || !nickname) {
        console.error('[WS Connect] Missing user context from authorizer');
        return { statusCode: 401, body: "Unauthorized - Missing user context" };
      }

      identifier = sessionId;
      connectionData = {
        connectionId,
        connectionType: "user",
        userId,
        sessionId,
        nickname,
        domainName,
        stage,
        connectedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };

      //console.log(`[WS Connect] User connection: ${nickname} (${sessionId}) -> ${connectionId}`);

    } else if (connectionType === "public") {
      // Public status board connection
      if (!deviceId) {
        console.error('[WS Connect] Missing device ID from authorizer');
        return { statusCode: 401, body: "Unauthorized - Missing device ID" };
      }

      identifier = deviceId;
      connectionData = {
        connectionId,
        connectionType: "public",
        userId,
        deviceId,
        permissions: permissions ? permissions.split(',') : [],
        domainName,
        stage,
        connectedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };

      //console.log(`[WS Connect] Public connection: ${deviceId} -> ${connectionId}`);

    } else {
      console.error('[WS Connect] Unknown connection type:', connectionType);
      return { statusCode: 401, body: "Unauthorized - Unknown connection type" };
    }

    //console.log('[WS Connect] Storing connection data:', connectionData);

    // Store connection in the Events table with a special type for WebSocket connections
    const now = new Date();
    await dynamoDb.send(new PutCommand({
      TableName: Resource.Events.name,
      Item: {
        eventId: `connection-${connectionId}`,
        type: "websocket_connection",
        timestamp: now.toISOString(),
        data: connectionData,
        expiresAt: Math.floor(now.getTime() / 1000) + (24 * 60 * 60), // Expire after 24 hours
      },
    }));

    //console.log(`[WS Connect] Successfully connected: ${connectionType} connection -> ${connectionId}`);

    return { 
      statusCode: 200, 
      body: JSON.stringify({
        success: true,
        metadata: {
          connectionId,
          connectionType,
          identifier,
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('[WS Connect] Connection error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to establish connection'
        },
        metadata: {
          connectionId,
          timestamp: new Date().toISOString()
        }
      })
    };
  }
} 