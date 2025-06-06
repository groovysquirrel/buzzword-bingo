import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";
import { verifyAnyToken } from "../auth/token";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function test(event: APIGatewayProxyEvent) {
  try {
    // Test token verification if provided
    const testToken = event.queryStringParameters?.token;
    let tokenTest = null;
    
    if (testToken) {
      console.log("Testing token verification...");
      try {
        const tokenResult = verifyAnyToken(testToken);
        tokenTest = {
          valid: !!tokenResult,
          tokenType: tokenResult?.type || null,
          data: tokenResult?.data || "Invalid token",
          error: null
        };
      } catch (error) {
        tokenTest = {
          valid: false,
          tokenType: null,
          data: null,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }

    // Get basic table stats
    const tables = [
      { name: "Players", table: Resource.Players.name },
      { name: "Games", table: Resource.Games.name },
      { name: "BingoProgress", table: Resource.BingoProgress.name },
      { name: "CompletedBingo", table: Resource.CompletedBingo.name },
      { name: "Events", table: Resource.Events.name },
      { name: "BingoCards", table: Resource.BingoCards.name },
    ];

    const tableStats = await Promise.all(
      tables.map(async ({ name, table }) => {
        try {
          const result = await dynamoDb.send(new ScanCommand({
            TableName: table,
            Select: "COUNT",
          }));
          
          return {
            table: name,
            count: result.Count || 0,
            status: "OK"
          };
        } catch (error) {
          return {
            table: name,
            count: 0,
            status: `Error: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      })
    );

    // Test WebSocket connection info if any exists
    let webSocketConnections = null;
    try {
      const wsResult = await dynamoDb.send(new ScanCommand({
        TableName: Resource.Events.name,
        FilterExpression: "#type = :type",
        ExpressionAttributeNames: {
          "#type": "type",
        },
        ExpressionAttributeValues: {
          ":type": "websocket_connection",
        },
      }));
      
      webSocketConnections = {
        count: wsResult.Items?.length || 0,
        connections: wsResult.Items?.map(item => ({
          connectionId: item.data?.connectionId,
          nickname: item.data?.nickname,
          connectedAt: item.data?.connectedAt
        })) || []
      };
    } catch (error) {
      webSocketConnections = {
        error: error instanceof Error ? error.message : String(error)
      };
    }

    return JSON.stringify({
      message: "Buzzword Bingo Admin API Test Endpoint",
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        WEBSOCKET_API_ENDPOINT: process.env.WEBSOCKET_API_ENDPOINT || "Not configured"
      },
      tokenTest,
      tableStats,
      webSocketConnections,
      requestInfo: {
        method: event.httpMethod,
        path: event.path,
        queryParams: event.queryStringParameters,
        headers: Object.keys(event.headers || {}),
      }
    }, null, 2);
  } catch (error) {
    console.error("Admin test endpoint error:", error);
    return JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
}

export const main = handler(test); 