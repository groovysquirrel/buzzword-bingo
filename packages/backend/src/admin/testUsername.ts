import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";
import { testUsernameAppropriateness } from "../lib/userValidation";

/**
 * Test Username Validation Endpoint
 * 
 * This endpoint allows testing the AI-powered username validation logic
 * without creating actual player records. Useful for development and testing.
 */
async function testUsername(event: APIGatewayProxyEvent) {
  const body = JSON.parse(event.body || "{}");
  const { nickname } = body;

  if (!nickname || typeof nickname !== 'string') {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "nickname is required and must be a string",
        timestamp: new Date().toISOString()
      })
    };
  }

  try {
    // The testing function now handles everything cleanly without throwing
    const result = await testUsernameAppropriateness(nickname);
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...result,
        originalNickname: nickname.trim(),
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error(`Unexpected error testing username "${nickname}":`, error);
    
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "error",
        originalNickname: nickname.trim(),
        message: "Unexpected error occurred during testing",
        timestamp: new Date().toISOString()
      })
    };
  }
}

export const main = handler(testUsername); 