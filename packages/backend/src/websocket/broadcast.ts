import { Resource } from "sst";
import { WebSocketManager } from "../lib/websocketManager";

const webSocketManager = WebSocketManager.getInstance();

/**
 * WebSocket Broadcasting Utility
 * 
 * Integrates with the existing addEvent system to send real-time updates
 * to all connected WebSocket clients when game events occur.
 */

/**
 * Broadcast game event to all connected WebSocket clients
 * This should be called whenever addEvent is called to provide real-time updates
 */
export async function broadcastGameEvent(gameId: string, eventType: string, eventData: any) {
  try {
    console.log(`Broadcasting ${eventType} event for game ${gameId}`);

    // Prepare the message to broadcast
    const broadcastMessage = {
      type: "activity_event",
      gameId,
      timestamp: new Date().toISOString(),
      event: {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: eventType,
        data: eventData,
        timestamp: new Date().toISOString(),
      }
    };

    // Use WebSocket manager to broadcast the message
    await webSocketManager.broadcastMessage(broadcastMessage);

  } catch (error) {
    console.error("Error broadcasting game event:", error);
  }
}

/**
 * Broadcast leaderboard update to all connected WebSocket clients
 * This sends the latest leaderboard data to all connections
 */
export async function broadcastLeaderboardUpdate(gameId: string, leaderboardData: any[]) {
  try {
    console.log(`Broadcasting leaderboard update for game ${gameId}`);

    // Prepare the leaderboard message
    const leaderboardMessage = {
      type: "leaderboard_update",
      gameId,
      timestamp: new Date().toISOString(),
      leaderboard: leaderboardData,
      totalPlayers: leaderboardData.length
    };

    // Use WebSocket manager to broadcast the message
    await webSocketManager.broadcastMessage(leaderboardMessage);

  } catch (error) {
    console.error("Error broadcasting leaderboard update:", error);
  }
} 