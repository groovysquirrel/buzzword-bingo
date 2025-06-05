import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * WebSocket Connection Handler
 * 
 * Called when a client connects to the WebSocket API
 * Stores connection information for later message broadcasting
 */
export async function main(event: APIGatewayProxyEvent) {
  console.log("WebSocket connection event:", JSON.stringify(event, null, 2));

  const { connectionId, domainName, stage } = event.requestContext;
  
  if (!connectionId) {
    return { statusCode: 400, body: "Missing connection ID" };
  }

  try {
    // Extract user context from authorizer (passed through after successful auth)
    const sessionId = event.requestContext.authorizer?.sessionId;
    const nickname = event.requestContext.authorizer?.nickname;
    
    if (!sessionId || !nickname) {
      console.error("Missing user context from authorizer");
      return { statusCode: 401, body: "Unauthorized" };
    }

    // Store connection information in DynamoDB
    // We'll create a separate table for WebSocket connections
    const connectionData = {
      connectionId,
      sessionId,
      nickname,
      domainName,
      stage,
      connectedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    // For now, we'll store this in the Events table with a special type
    // In production, you might want a dedicated connections table
    await dynamoDb.send(new PutCommand({
      TableName: Resource.Events.name,
      Item: {
        id: `connection-${connectionId}`,
        type: "websocket_connection",
        timestamp: new Date().toISOString(),
        data: connectionData,
      },
    }));

    console.log(`WebSocket connected: ${nickname} (${sessionId}) -> ${connectionId}`);

    return { statusCode: 200, body: "Connected" };

  } catch (error) {
    console.error("Connection error:", error);
    return { 
      statusCode: 500, 
      body: "Failed to connect: " + (error instanceof Error ? error.message : String(error))
    };
  }
} 