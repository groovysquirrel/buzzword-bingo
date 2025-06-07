import { tables } from "./storage";
import { gameWebSocket, webSocketApiUrl } from "./websocket";

/**
 * Buzzword Bingo API Infrastructure
 * 
 * This file defines the RESTful API endpoints for the Buzzword Bingo application.
 * The API is organized into three main categories:
 * 1. Public endpoints - accessible to all users
 * 2. Game endpoints - for player interactions
 * 3. Admin endpoints - for game management and administration
 */

// =============================================================================
// LAMBDA FUNCTIONS WITH WEBSOCKET BROADCASTING
// =============================================================================

/**
 * Functions that need WebSocket broadcasting capabilities for real-time updates
 * These functions can send instant notifications to all connected clients
 */

const joinFunction = new sst.aws.Function("JoinFunction", {
  handler: "packages/backend/src/game/joinGame.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards, gameWebSocket],
  environment: { WEBSOCKET_API_ENDPOINT: webSocketApiUrl }
});

const markWordFunction = new sst.aws.Function("MarkWordFunction", {
  handler: "packages/backend/src/game/markWord.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards, gameWebSocket],
  environment: { WEBSOCKET_API_ENDPOINT: webSocketApiUrl }
});

// Admin functions that broadcast game state changes
const newGameFunction = new sst.aws.Function("NewGameFunction", {
  handler: "packages/backend/src/admin/newGame.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards, gameWebSocket],
  environment: { WEBSOCKET_API_ENDPOINT: webSocketApiUrl }
});

const gameStateFunction = new sst.aws.Function("GameStateFunction", {
  handler: "packages/backend/src/admin/gameState.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards, gameWebSocket],
  environment: { WEBSOCKET_API_ENDPOINT: webSocketApiUrl }
});

const resetGameFunction = new sst.aws.Function("ResetGameFunction", {
  handler: "packages/backend/src/admin/resetGame.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards, gameWebSocket],
  environment: { WEBSOCKET_API_ENDPOINT: webSocketApiUrl }
});

// =============================================================================
// API GATEWAY CONFIGURATION
// =============================================================================

/**
 * Main API Gateway configuration
 * Sets up the HTTP API with custom domain and default linking to database tables
 */
export const api = new sst.aws.ApiGatewayV2("Api", {
  transform: {
    route: {
      handler: {
        // All routes have access to database tables by default
        link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards, gameWebSocket],
      },
    }
  },
  domain: {
    name: $app.stage === "prod" ? "api.buzzwordbingo.live" : "dev.api.buzzwordbingo.live",
  }
});

// =============================================================================
// PUBLIC ENDPOINTS (No authentication required)
// =============================================================================

/**
 * Public access endpoints for status boards and general information
 * These endpoints can be accessed by anyone without authentication
 */

// Generate public access tokens for status displays
api.route("POST /public/token", "packages/backend/src/auth/getPublicToken.main");

// Get current game information (read-only)
api.route("GET /current-game", "packages/backend/src/game/getCurrentGame.main");

// Get game history for displays
api.route("GET /games/history", "packages/backend/src/game/getGameHistory.main");

// =============================================================================
// GAME ENDPOINTS (Player interactions)
// =============================================================================

/**
 * Endpoints for player game interactions
 * These handle joining games, marking words, and checking status
 */

// Join a game session
api.route("POST /join", joinFunction.arn);

// Get player's bingo card
api.route("GET /bingo/{gameId}", "packages/backend/src/game/getBingoCard.main");

// Mark a word on bingo card
api.route("POST /bingo/{gameId}/mark", markWordFunction.arn);

// Call BINGO when player achieves winning pattern
const callBingoFunction = new sst.aws.Function("CallBingoFunction", {
  handler: "packages/backend/src/game/callBingo.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards, gameWebSocket],
  environment: { WEBSOCKET_API_ENDPOINT: webSocketApiUrl }
});
api.route("POST /bingo/{gameId}/call", callBingoFunction.arn);

// Get detailed game status (consolidated function)
api.route("GET /game/{gameId}/status", "packages/backend/src/game/getGameStatus.main");

// Update player profile (nickname)
const updateProfileFunction = new sst.aws.Function("UpdateProfileFunction", {
  handler: "packages/backend/src/game/updateProfile.main",
  link: [tables.players, tables.games, tables.bingoProgress, tables.completedBingo, tables.events, tables.bingoCards, gameWebSocket],
  environment: { WEBSOCKET_API_ENDPOINT: webSocketApiUrl }
});
api.route("POST /profile/update", updateProfileFunction.arn);

// =============================================================================
// ADMIN ENDPOINTS (Game management and administration)
// =============================================================================

/**
 * Administrative endpoints for game management
 * These endpoints control game lifecycle and system administration
 */

// Game lifecycle management
api.route("POST /admin/games/{gameId}/new", newGameFunction.arn);                    // Create new game
api.route("POST /admin/games/{gameId}/state", gameStateFunction.arn);               // Change game state
api.route("POST /admin/games/{gameId}/reset", resetGameFunction.arn);               // Reset game data

// System administration
api.route("POST /admin/system/purge", "packages/backend/src/admin/systemPurge.main"); // Clear all data
api.route("GET /admin/test", "packages/backend/src/admin/test.main");                // System health check
