import { tables } from "./storage";
import { gameWebSocket, webSocketApiUrl } from "./websocket";

// Create functions that need WebSocket broadcasting capability
const joinFunction = new sst.aws.Function("JoinFunction", {
  handler: "packages/backend/src/join.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards],
  environment: { WEBSOCKET_API_ENDPOINT: webSocketApiUrl }
});

const markWordFunction = new sst.aws.Function("MarkWordFunction", {
  handler: "packages/backend/src/markWord.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards, gameWebSocket],
  environment: { WEBSOCKET_API_ENDPOINT: webSocketApiUrl }
});

const submitBingoFunction = new sst.aws.Function("SubmitBingoFunction", {
  handler: "packages/backend/src/submitBingo.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards],
  environment: { WEBSOCKET_API_ENDPOINT: webSocketApiUrl }
});

const resetGameFunction = new sst.aws.Function("ResetGameFunction", {
  handler: "packages/backend/src/admin/resetGame.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards],
  environment: { WEBSOCKET_API_ENDPOINT: webSocketApiUrl }
});

const newGameFunction = new sst.aws.Function("NewGameFunction", {
  handler: "packages/backend/src/admin/newGame.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards],
  environment: { WEBSOCKET_API_ENDPOINT: webSocketApiUrl }
});

const testFunction = new sst.aws.Function("TestFunction", {
  handler: "packages/backend/src/test.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards],
  environment: { WEBSOCKET_API_ENDPOINT: webSocketApiUrl }
});

// Create the API
export const api = new sst.aws.ApiGatewayV2("Api", {
  transform: {
    route: {
      handler: {
        link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards],
      },
      args: {
        // Remove IAM auth for player endpoints - we'll use session tokens instead
        // Admin endpoints will need auth later
      },
    }
  },
  domain: {
    name: $app.stage === "prod" ? "api.buzzwordbingo.live" : "dev.api.buzzwordbingo.live",
  }
});

// Player endpoints - no auth required, using session tokens
api.route("POST /join", joinFunction.arn);
api.route("GET /bingo/{gameId}", "packages/backend/src/getBingoCard.main");
api.route("POST /bingo/{gameId}/mark", markWordFunction.arn);
api.route("POST /bingo/{gameId}/submit", submitBingoFunction.arn);
api.route("GET /game/{gameId}/status", "packages/backend/src/checkGameStatus.main");

// Public access endpoints
api.route("POST /public/token", "packages/backend/src/getPublicToken.main");

// Leaderboard and game status endpoints
api.route("GET /current-game", "packages/backend/src/getCurrentGame.main");

// Game history endpoint
api.route("GET /games/history", "packages/backend/src/getGameHistory.main");

// Admin endpoints (no auth for now, will add later)
api.route("GET /admin/games", "packages/backend/src/admin/listGames.main");
api.route("POST /admin/games", "packages/backend/src/admin/createGame.main");
api.route("PUT /admin/games/{gameId}", "packages/backend/src/admin/updateGame.main");
api.route("POST /admin/games/{gameId}/reset", resetGameFunction.arn);
api.route("POST /admin/games/{gameId}/new", newGameFunction.arn);
api.route("POST /admin/system/purge", "packages/backend/src/admin/systemPurge.main");

// Test endpoint for development
api.route("GET /test", testFunction.arn);
