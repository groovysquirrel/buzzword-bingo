import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * WebSocket Disconnect Handler
 * 
 * Called when a client disconnects from the WebSocket API
 * Cleans up connection information
 */
export async function main(event: APIGatewayProxyEvent) {
  console.log("WebSocket disconnect event:", JSON.stringify(event, null, 2));

  const { connectionId } = event.requestContext;
  
  if (!connectionId) {
    return { statusCode: 400, body: "Missing connection ID" };
  }

  try {
    // Remove connection information from DynamoDB
    await dynamoDb.send(new DeleteCommand({
      TableName: Resource.Events.name,
      Key: {
        id: `connection-${connectionId}`,
      },
    }));

    console.log(`WebSocket disconnected: ${connectionId}`);

    return { statusCode: 200, body: "Disconnected" };

  } catch (error) {
    console.error("Disconnect error:", error);
    return { 
      statusCode: 500, 
      body: "Failed to disconnect: " + (error instanceof Error ? error.message : String(error))
    };
  }
} 