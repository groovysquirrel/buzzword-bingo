import { tables } from "./storage";

/**
 * WebSocket Infrastructure for Real-Time Communication
 * 
 * This file sets up the WebSocket API Gateway for real-time communication
 * between the server and clients. It handles:
 * 1. Connection management (connect/disconnect)
 * 2. Authentication via custom authorizer
 * 3. Message routing for game events
 * 4. Broadcasting capabilities for live updates
 */

// =============================================================================
// WEBSOCKET API GATEWAY
// =============================================================================

/**
 * Main WebSocket API Gateway
 * Provides real-time bidirectional communication between server and clients
 */
export const gameWebSocket = new sst.aws.ApiGatewayWebSocket("GameWebSocket", {
  domain: {
    name: $app.stage === "prod" 
      ? "ws.buzzwordbingo.live" 
      : $app.stage.startsWith("version")
      ? `v${$app.stage.slice(7)}.ws.buzzwordbingo.live`
      : "ws-dev.buzzwordbingo.live",
  }
});

// =============================================================================
// WEBSOCKET HANDLER FUNCTIONS
// =============================================================================

/**
 * Connection Handler
 * Manages new WebSocket connections and stores connection info in database
 */
const wsConnectHandler = new sst.aws.Function("WSConnectHandler", {
  handler: "packages/backend/src/websocket/connect.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards],
  environment: {
    WEBSOCKET_API_ENDPOINT: gameWebSocket.url,
  }
});

/**
 * Disconnection Handler  
 * Cleans up connection data when clients disconnect
 */
const wsDisconnectHandler = new sst.aws.Function("WSDisconnectHandler", {
  handler: "packages/backend/src/websocket/disconnect.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards],
});

/**
 * Message Handler
 * Processes incoming WebSocket messages and routes them appropriately
 */
const wsMessageHandler = new sst.aws.Function("WSMessageHandler", {
  handler: "packages/backend/src/websocket/message.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards, gameWebSocket],
});

/**
 * Authorization Handler
 * Validates tokens and authorizes WebSocket connections
 * Supports both user session tokens and public device tokens
 */
const wsAuthorizerFunction = new sst.aws.Function("WSAuthorizerFunction", {
  handler: "packages/backend/src/auth/authorizer.main",
});

// =============================================================================
// WEBSOCKET AUTHORIZATION
// =============================================================================

/**
 * Custom authorizer for WebSocket connections
 * Validates tokens passed in query string parameters
 */
const wsAuthorizer = gameWebSocket.addAuthorizer("WSAuthorizer", {
  lambda: {
    function: wsAuthorizerFunction.arn,
    identitySources: ["route.request.querystring.token"]
  },
});

// =============================================================================
// WEBSOCKET ROUTES
// =============================================================================

/**
 * Connection lifecycle routes
 * These handle the basic WebSocket connection lifecycle
 */

// When client connects (with authentication)
gameWebSocket.route("$connect", wsConnectHandler.arn, {
  auth: { lambda: wsAuthorizer.id }
});

// When client disconnects  
gameWebSocket.route("$disconnect", wsDisconnectHandler.arn);

// Default message handler for unmatched routes
gameWebSocket.route("$default", wsMessageHandler.arn);

/**
 * Custom message routes for specific actions
 * These handle specific WebSocket message types
 */

// Subscribe to game updates
gameWebSocket.route("subscribe", wsMessageHandler.arn);

// Unsubscribe from game updates  
gameWebSocket.route("unsubscribe", wsMessageHandler.arn);

// Request current leaderboard
gameWebSocket.route("get_leaderboard", wsMessageHandler.arn);

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * WebSocket API URL for use in other infrastructure components
 * Used by Lambda functions that need to broadcast messages
 */
export const webSocketApiUrl = gameWebSocket.url;


