import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Player, BingoProgress, LeaderboardEntry, Event } from "./types";
import { broadcastGameEvent, broadcastLeaderboardUpdate } from "../websocket/broadcast";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

let eventIdCounter = Date.now(); // Use timestamp-based counter

/**
 * Add a game event and automatically broadcast via WebSocket
 * 
 * This replaces the old SSE-based event system with WebSocket broadcasting
 */
export async function addEvent(type: string, data: any) {
  const now = new Date();
  const timestamp = now.toISOString();
  const eventId = `${timestamp}-${eventIdCounter++}`;
  
  const event: Event = {
    eventId,
    type,
    data,
    timestamp,
    expiresAt: Math.floor(now.getTime() / 1000) + (24 * 60 * 60), // Expire after 24 hours
  };

  try {
    // Store event in database
    await dynamoDb.send(new PutCommand({
      TableName: Resource.Events.name,
      Item: event,
    }));
    
    console.log("Event stored:", event);

    // 🚀 NEW: Automatic WebSocket broadcasting
    const gameId = data.gameId || "unknown";
    await broadcastGameEvent(gameId, type, data);

    // 🚀 NEW: Broadcast updated leaderboard for key events
    if (["word_marked", "player_joined", "bingo_called", "bingo_completed"].includes(type)) {
      try {
        const updatedLeaderboard = await getCurrentLeaderboard(gameId);
        await broadcastLeaderboardUpdate(gameId, updatedLeaderboard);
        console.log("Broadcasted leaderboard update via WebSocket");
      } catch (error) {
        console.error("Failed to broadcast leaderboard update:", error);
      }
    }

    return event;
  } catch (error) {
    console.error("Failed to store event:", error);
    return null;
  }
}

/**
 * Get recent events for activity feed
 */
export async function getRecentEvents(limit: number = 10): Promise<Event[]> {
  try {
    // Get all events and sort by timestamp (since we don't have a perfect GSI setup for this)
    const result = await dynamoDb.send(new ScanCommand({
      TableName: Resource.Events.name,
    }));

    const events = (result.Items || []) as Event[];
    
    // Sort by timestamp descending and take the most recent
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return events.slice(0, limit);
  } catch (error) {
    console.error("Failed to get recent events:", error);
    return [];
  }
}

/**
 * Get current leaderboard for a game
 * 
 * This function is used both for API responses and WebSocket broadcasting
 */
export async function getCurrentLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
  console.log(`🔍 Getting leaderboard for game: ${gameId}`);
  
  // Get all players
  const playersResult = await dynamoDb.send(new ScanCommand({
    TableName: Resource.Players.name,
  }));

  const players = (playersResult.Items || []) as Player[];
  console.log(`👥 Found ${players.length} players`);

  // Get all progress for this game
  const progressResult = await dynamoDb.send(new ScanCommand({
    TableName: Resource.BingoProgress.name,
    FilterExpression: "gameId = :gameId",
    ExpressionAttributeValues: {
      ":gameId": gameId,
    },
  }));

  const allProgress = (progressResult.Items || []) as BingoProgress[];
  console.log(`📊 Found ${allProgress.length} progress entries for game ${gameId}`);

  // Group progress by sessionId
  const progressBySession = new Map<string, BingoProgress[]>();
  for (const progress of allProgress) {
    if (!progressBySession.has(progress.sessionId)) {
      progressBySession.set(progress.sessionId, []);
    }
    progressBySession.get(progress.sessionId)!.push(progress);
  }

  // Create leaderboard entries for existing players
  const leaderboard: LeaderboardEntry[] = players.map(player => {
    const playerProgress = progressBySession.get(player.sessionId) || [];
    const wordsMarked = playerProgress.length;
    const points = wordsMarked * 10;
    const progressPercentage = Math.round((wordsMarked / 24) * 100);

    return {
      nickname: player.nickname,
      sessionId: player.sessionId,
      progressPercentage,
      wordsMarked,
      totalWords: 24,
      points,
    };
  });

  // SIMPLE FIX: Add entries for sessions that have progress but no player record
  for (const [sessionId, sessionProgress] of progressBySession.entries()) {
    const existingEntry = leaderboard.find(entry => entry.sessionId === sessionId);
    if (!existingEntry) {
      const wordsMarked = sessionProgress.length;
      const points = wordsMarked * 10;
      const progressPercentage = Math.round((wordsMarked / 24) * 100);
      
      console.log(`🔧 Adding missing player for session ${sessionId}: ${wordsMarked} words, ${points} points`);
      
      leaderboard.push({
        nickname: `Player-${sessionId.slice(-8)}`, // Temporary nickname until player record is restored
        sessionId: sessionId,
        progressPercentage,
        wordsMarked,
        totalWords: 24,
        points,
      });
    }
  }

  // Sort by points
  leaderboard.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.progressPercentage !== a.progressPercentage) return b.progressPercentage - a.progressPercentage;
    return a.nickname.localeCompare(b.nickname);
  });

  console.log(`🏆 Final leaderboard has ${leaderboard.length} entries`);

  return leaderboard;
} 