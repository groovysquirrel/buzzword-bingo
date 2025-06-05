import { tables } from "./storage";

// Create WebSocket API for real-time game updates
export const gameWebSocket = new sst.aws.ApiGatewayWebSocket("GameWebSocket", {
  domain: {
    name: $app.stage === "prod" ? "ws.buzzwordbingo.live" : "ws-dev.buzzwordbingo.live",
  }
});

// WebSocket Lambda functions
const connectHandler = new sst.aws.Function("WSConnectHandler", {
  handler: "packages/backend/src/websocket/connect.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards],
  environment: {
    WEBSOCKET_API_ENDPOINT: gameWebSocket.url,
  }
});

const disconnectHandler = new sst.aws.Function("WSDisconnectHandler", {
  handler: "packages/backend/src/websocket/disconnect.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards],
});

const messageHandler = new sst.aws.Function("WSMessageHandler", {
  handler: "packages/backend/src/websocket/message.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards],
  environment: {
    WEBSOCKET_API_ENDPOINT: gameWebSocket.url,
  }
});

// Add Lambda authorizer for WebSocket connections using session tokens
const wsAuthorizer = gameWebSocket.addAuthorizer("WSAuthorizer", {
  lambda: {
    function: new sst.aws.Function("WSAuthorizerHandler", {
      handler: "packages/backend/src/websocket/authorizer.main",
    }).arn,
    identitySources: ["route.request.querystring.token"]
  },
});

// WebSocket routes
gameWebSocket.route("$connect", connectHandler.arn, {
  auth: { lambda: wsAuthorizer.id }
});

gameWebSocket.route("$disconnect", disconnectHandler.arn);

gameWebSocket.route("$default", messageHandler.arn);

// Specific message routes
gameWebSocket.route("subscribe", messageHandler.arn);
gameWebSocket.route("unsubscribe", messageHandler.arn);


