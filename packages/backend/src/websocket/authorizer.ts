import { APIGatewayProxyWebsocketEventV2WithRequestContext } from "aws-lambda";
import { verifyAnyToken } from "../lib/token";

/**
 * Custom request context type matching WebSocket API Gateway structure
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
}

/**
 * Custom WebSocket event structure
 */
interface CustomWebsocketEvent extends APIGatewayProxyWebsocketEventV2WithRequestContext<CustomRequestContext> {
  queryStringParameters?: {
    [key: string]: string;
  };
  methodArn: string;
}

/**
 * IAM Policy structure for API Gateway
 */
interface PolicyDocument {
  Version: string;
  Statement: Array<{
    Action: string | string[];
    Effect: string;
    Resource: string;
  }>;
}

interface AuthResponse {
  principalId: string;
  policyDocument?: PolicyDocument;
  context: {
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
 * WebSocket API Gateway Authorizer
 * 
 * Validates both user session tokens and public access tokens for status boards
 * Format: wss://ws.buzzwordbingo.live?token=<session_token_or_public_token>
 */
export async function main(event: CustomWebsocketEvent): Promise<AuthResponse> {
  console.log('[WS Authorizer] Handler called with event:', JSON.stringify(event, null, 2));

  try {
    // Extract token from query parameters
    const token = event.queryStringParameters?.token;
    
    if (!token) {
      console.log('[WS Authorizer] No token provided in query string');
      return generateDeny('anonymous', event.methodArn);
    }

    console.log('[WS Authorizer] Token found, verifying...');

    // Verify the token (either session or public)
    const tokenResult = verifyAnyToken(token);
    
    if (!tokenResult) {
      console.log('[WS Authorizer] Invalid token');
      return generateDeny('invalid', event.methodArn);
    }

    console.log(`[WS Authorizer] Token verified - Type: ${tokenResult.type}`);
    
    // Generate and return the allow policy based on token type
    let response: AuthResponse;
    
    if (tokenResult.type === "user") {
      // User session token
      const session = tokenResult.data;
      console.log(`[WS Authorizer] User session verified: ${session.nickname} (${session.sessionId})`);
      
      response = generateAllow(session.sessionId, event.methodArn, {
        userId: session.sessionId,
        connectionType: "user",
        sessionId: session.sessionId,
        nickname: session.nickname,
        createdAt: session.createdAt
      });
    } else {
      // Public access token
      const publicData = tokenResult.data;
      console.log(`[WS Authorizer] Public access verified: ${publicData.deviceId}`);
      
      response = generateAllow(publicData.deviceId, event.methodArn, {
        userId: publicData.deviceId,
        connectionType: "public", 
        deviceId: publicData.deviceId,
        createdAt: publicData.createdAt,
        permissions: publicData.permissions.join(',')
      });
    }
    
    console.log('[WS Authorizer] Returning allow policy for connection type:', tokenResult.type);
    return response;

  } catch (error) {
    console.error('[WS Authorizer] Authorization failed:', error);
    return generateDeny('error', event.methodArn);
  }
}

/**
 * Generate an allow IAM policy for API Gateway
 */
function generateAllow(principalId: string, resource: string, contextData: any): AuthResponse {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: resource,
        },
        {
          Action: [
            'execute-api:*'
          ],
          Effect: 'Allow',
          Resource: resource.replace(/\/@connections\/.*$/, '/*/*/*')
        }
      ]
    },
    context: contextData
  };
}

/**
 * Generate a deny IAM policy for API Gateway
 */
function generateDeny(principalId: string, resource: string): AuthResponse {
  console.log(`[WS Authorizer] Denying access for: ${principalId}`);
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Deny',
          Resource: resource,
        }
      ]
    },
    context: {
      userId: principalId,
      connectionType: "denied",
      createdAt: new Date().toISOString()
    }
  };
} 