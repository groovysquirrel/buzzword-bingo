import { tables } from "./storage";

// Create WebSocket API for real-time game updates
export const gameWebSocket = new sst.aws.ApiGatewayWebSocket("GameWebSocket", {
  domain: {
    name: $app.stage === "prod" ? "ws.buzzwordbingo.live" : "ws-dev.buzzwordbingo.live",
  }
});

// Define WebSocket handler functions first
const wsConnectHandler = new sst.aws.Function("WSConnectHandler", {
  handler: "packages/backend/src/websocket/connect.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards],
  environment: {
    WEBSOCKET_API_ENDPOINT: gameWebSocket.url,
  }
});

const wsDisconnectHandler = new sst.aws.Function("WSDisconnectHandler", {
  handler: "packages/backend/src/websocket/disconnect.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards],
});

const wsMessageHandler = new sst.aws.Function("WSMessageHandler", {
  handler: "packages/backend/src/websocket/message.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards, gameWebSocket],

  });

const wsAuthorizerFunction = new sst.aws.Function("WSAuthorizerFunction", {
  handler: "packages/backend/src/websocket/authorizer.main",
});

// Add Lambda authorizer for WebSocket connections
const wsAuthorizer = gameWebSocket.addAuthorizer("WSAuthorizer", {
  lambda: {
    function: wsAuthorizerFunction.arn,
    identitySources: ["route.request.querystring.token"]
  },
});

// WebSocket routes following the working pattern
gameWebSocket.route("$connect", wsConnectHandler.arn, {
  auth: { lambda: wsAuthorizer.id }
});

gameWebSocket.route("$disconnect", wsDisconnectHandler.arn);

gameWebSocket.route("$default", wsMessageHandler.arn);

// Custom message routes for specific actions
gameWebSocket.route("subscribe", wsMessageHandler.arn);
gameWebSocket.route("unsubscribe", wsMessageHandler.arn);
gameWebSocket.route("get_leaderboard", wsMessageHandler.arn);

// Export for use in API functions that need to broadcast
export const webSocketApiUrl = gameWebSocket.url;


