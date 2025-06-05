import { APIGatewayAuthorizerEvent, APIGatewayAuthorizerResult } from "aws-lambda";
import { verifySessionToken } from "../lib/token";

/**
 * WebSocket API Gateway Authorizer
 * 
 * Validates session tokens passed as query parameters when clients connect to WebSocket
 * Format: wss://ws.buzzwordbingo.live?token=<session_token>
 */
export async function main(event: any): Promise<APIGatewayAuthorizerResult> {
  try {
    // For WebSocket, the token comes from the identitySource configured in SST
    // which is "route.request.querystring.token"
    const token = event.queryStringParameters?.token || event.authorizationToken;
    
    if (!token) {
      console.log("No token provided in query string");
      return generatePolicy("user", "Deny", event.methodArn);
    }

    // Verify the session token
    const session = verifySessionToken(token);
    
    if (!session) {
      console.log("Invalid session token");
      return generatePolicy("user", "Deny", event.methodArn);
    }

    console.log(`WebSocket connection authorized for user: ${session.nickname} (${session.sessionId})`);
    
    // Return allow policy with user context
    return generatePolicy(session.sessionId, "Allow", event.methodArn, {
      sessionId: session.sessionId,
      nickname: session.nickname,
      createdAt: session.createdAt
    });

  } catch (error) {
    console.error("WebSocket authorization error:", error);
    return generatePolicy("user", "Deny", event.methodArn);
  }
}

/**
 * Generate IAM policy for API Gateway
 */
function generatePolicy(
  principalId: string, 
  effect: "Allow" | "Deny", 
  resource: string,
  context?: Record<string, any>
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context: context || {},
  };
} 