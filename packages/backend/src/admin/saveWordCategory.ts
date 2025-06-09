import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Save Word Category Function
 * 
 * Creates or updates a word category in DynamoDB.
 * Expects JSON body with: { category: string, words: string[] }
 */
export async function main(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log("Saving word category to DynamoDB");

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({
          success: false,
          error: "Request body is required",
          message: "Please provide category data in the request body"
        }),
      };
    }

    const { category, words } = JSON.parse(event.body);

    // Validate input
    if (!category || typeof category !== 'string' || category.trim() === '') {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({
          success: false,
          error: "Invalid category name",
          message: "Category name must be a non-empty string"
        }),
      };
    }

    if (!Array.isArray(words) || words.length === 0) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({
          success: false,
          error: "Invalid words array",
          message: "Words must be a non-empty array of strings"
        }),
      };
    }

    // Check if we have the Words table resource
    if (!Resource.Words.name) {
      console.log("Words table not found");
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({
          success: false,
          error: "Words table not configured",
          message: "The Words table resource is not available. Check infrastructure setup."
        }),
      };
    }

    // Save the category to DynamoDB
    await dynamoDb.send(new PutCommand({
      TableName: Resource.Words.name,
      Item: {
        category: category.trim(),
        words: words.filter(word => word && word.trim()).map(word => word.trim()),
        updatedAt: new Date().toISOString(),
        wordCount: words.length
      }
    }));

    console.log(`Successfully saved category '${category}' with ${words.length} words`);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({
        success: true,
        category,
        wordCount: words.length,
        message: `Successfully saved category '${category}' with ${words.length} words`
      }),
    };

  } catch (error) {
    console.error("Error saving word category:", error);
    
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Failed to save word category",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
} 