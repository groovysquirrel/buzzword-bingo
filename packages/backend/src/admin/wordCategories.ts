import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Load Word Categories
 * 
 * Retrieves all word categories from DynamoDB and returns full category data with words.
 * Falls back to default categories if none exist in the database.
 */
export async function main(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log("Loading word categories from DynamoDB");

  try {
    // Check if we have the Words table resource
    if (!Resource.Words.name) {
      console.log("Words table not found, falling back to empty result");
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({
          success: false,
          categories: [],
          error: "Words table not configured - please check infrastructure setup"
        }),
      };
    }

    // Scan the Words table to get all categories
    const result = await dynamoDb.send(new ScanCommand({
      TableName: Resource.Words.name,
      ProjectionExpression: "category, words"
    }));

    const items = result.Items || [];
    
    if (items.length === 0) {
      console.log("No categories found in database, returning empty result");
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({
          success: true,
          categories: [],
          message: "No categories found in database - run seed operation first"
        }),
      };
    }

    // Transform items to match frontend interface: {category: string, words: string[]}
    const categories = items
      .filter(item => item.category && item.words) // Only include valid items
      .map(item => ({
        category: item.category,
        words: Array.isArray(item.words) ? item.words : []
      }))
      .sort((a, b) => a.category.localeCompare(b.category)); // Sort alphabetically

    const totalWords = categories.reduce((sum, cat) => sum + cat.words.length, 0);

    console.log(`Loaded ${categories.length} categories with ${totalWords} total words`);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({
        success: true,
        categories,
        totalWords,
        message: `Successfully loaded ${categories.length} categories`
      }),
    };

  } catch (error) {
    console.error("Error loading word categories:", error);
    
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({
        success: false,
        categories: [],
        error: "Failed to load word categories",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
} 