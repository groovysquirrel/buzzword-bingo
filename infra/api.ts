import { tables } from "./storage";

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
api.route("POST /join", "packages/backend/src/join.main");
api.route("GET /bingo/{gameId}", "packages/backend/src/getBingoCard.main");
api.route("POST /bingo/{gameId}/mark", "packages/backend/src/markWord.main");
api.route("POST /bingo/{gameId}/submit", "packages/backend/src/submitBingo.main");
api.route("GET /game/{gameId}/status", "packages/backend/src/checkGameStatus.main");

// Leaderboard and game status endpoints
api.route("GET /leaderboard/{gameId}/stream", "packages/backend/src/sseLeaderboard.main");
api.route("GET /current-game", "packages/backend/src/getCurrentGame.main");

// Game history endpoint
api.route("GET /games/history", "packages/backend/src/getGameHistory.main");

// Admin endpoints (no auth for now, will add later)
api.route("GET /admin/games", "packages/backend/src/admin/listGames.main");
api.route("POST /admin/games", "packages/backend/src/admin/createGame.main");
api.route("PUT /admin/games/{gameId}", "packages/backend/src/admin/updateGame.main");
api.route("POST /admin/games/{gameId}/reset", "packages/backend/src/admin/resetGame.main");
api.route("POST /admin/games/{gameId}/new", "packages/backend/src/admin/newGame.main");
api.route("POST /admin/system/purge", "packages/backend/src/admin/systemPurge.main");

// Test endpoint for development
api.route("GET /test", "packages/backend/src/test.main");
