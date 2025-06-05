import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, BatchWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * System Purge - DANGER ZONE!
 * 
 * This endpoint clears ALL data from ALL tables.
 * Use only for testing and development.
 */
async function systemPurge(event: APIGatewayProxyEvent) {
  console.log("🚨 SYSTEM PURGE INITIATED - THIS WILL DELETE ALL DATA");
  
  const tables = [
    { name: Resource.Players.name, keys: ["sessionId"] },
    { name: Resource.Games.name, keys: ["gameId"] },
    { name: Resource.BingoProgress.name, keys: ["sessionId", "word"] },
    { name: Resource.BingoCards.name, keys: ["sessionId", "gameId"] },
    { name: Resource.CompletedBingo.name, keys: ["sessionId", "gameId"] },
    { name: Resource.Events.name, keys: ["eventId"] },
  ];

  const purgeResults = [];

  for (const table of tables) {
    try {
      console.log(`Purging table: ${table.name}`);
      
      // Scan all items in the table
      let scanResult: any;
      let allItems: any[] = [];
      
      do {
        scanResult = await dynamoDb.send(new ScanCommand({
          TableName: table.name,
          ExclusiveStartKey: scanResult?.LastEvaluatedKey,
        }));
        
        if (scanResult.Items) {
          allItems.push(...scanResult.Items);
        }
      } while (scanResult.LastEvaluatedKey);

      console.log(`Found ${allItems.length} items in ${table.name}`);

      if (allItems.length === 0) {
        purgeResults.push({
          tableName: table.name,
          itemsFound: 0,
          itemsDeleted: 0,
          status: "empty"
        });
        continue;
      }

      // Delete items in batches
      const batchSize = 25; // DynamoDB limit
      let totalDeleted = 0;

      for (let i = 0; i < allItems.length; i += batchSize) {
        const batch = allItems.slice(i, i + batchSize);
        
        const deleteRequests = batch.map(item => {
          // Create the key based on table structure
          const key: any = {};
          for (const keyField of table.keys) {
            key[keyField] = item[keyField];
          }
          
          return {
            DeleteRequest: { Key: key }
          };
        });

        await dynamoDb.send(new BatchWriteCommand({
          RequestItems: {
            [table.name]: deleteRequests,
          },
        }));

        totalDeleted += batch.length;
        console.log(`Deleted batch ${Math.ceil((i + batchSize) / batchSize)} from ${table.name}`);
      }

      purgeResults.push({
        tableName: table.name,
        itemsFound: allItems.length,
        itemsDeleted: totalDeleted,
        status: "purged"
      });

    } catch (error) {
      console.error(`Error purging ${table.name}:`, error);
      purgeResults.push({
        tableName: table.name,
        itemsFound: 0,
        itemsDeleted: 0,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  const totalItemsDeleted = purgeResults.reduce((sum, result) => sum + result.itemsDeleted, 0);

  console.log(`🚨 SYSTEM PURGE COMPLETE - Deleted ${totalItemsDeleted} total items`);

  return JSON.stringify({
    success: true,
    message: "System purge completed",
    timestamp: new Date().toISOString(),
    totalItemsDeleted,
    tableResults: purgeResults,
    warning: "ALL DATA HAS BEEN DELETED FROM ALL TABLES"
  });
}

export const main = handler(systemPurge); 