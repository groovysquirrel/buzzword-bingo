import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Delete Word Category Function
 * 
 * Deletes a word category from DynamoDB.
 * Expects category name in path parameter: /admin/words/categories/{categoryName}
 */
export async function main(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log("Deleting word category from DynamoDB");

  try {
    // Get category name from path parameters
    const categoryName = event.pathParameters?.categoryName;

    if (!categoryName) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({
          success: false,
          error: "Category name is required",
          message: "Please provide a category name in the URL path"
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

    // Decode the category name (in case it has special characters)
    const decodedCategoryName = decodeURIComponent(categoryName);

    // Delete the category from DynamoDB
    await dynamoDb.send(new DeleteCommand({
      TableName: Resource.Words.name,
      Key: {
        category: decodedCategoryName
      }
    }));

    console.log(`Successfully deleted category '${decodedCategoryName}'`);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({
        success: true,
        deletedCategory: decodedCategoryName,
        message: `Successfully deleted category '${decodedCategoryName}'`
      }),
    };

  } catch (error) {
    console.error("Error deleting word category:", error);
    
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({
        success: false,
        error: "Failed to delete word category",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
} 