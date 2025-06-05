import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, PutCommand, QueryCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Player, BingoProgress, LeaderboardEntry, Event } from "./lib/types";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

let eventIdCounter = Date.now(); // Use timestamp-based counter

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
    await dynamoDb.send(new PutCommand({
      TableName: Resource.Events.name,
      Item: event,
    }));
    
    console.log("Event stored:", event);
    return event;
  } catch (error) {
    console.error("Failed to store event:", error);
    return null;
  }
}

async function getRecentEvents(limit: number = 10): Promise<Event[]> {
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

async function getCurrentLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
  // Get all players
  const playersResult = await dynamoDb.send(new ScanCommand({
    TableName: Resource.Players.name,
  }));

  const players = (playersResult.Items || []) as Player[];

  // Get all progress for this game
  const progressResult = await dynamoDb.send(new ScanCommand({
    TableName: Resource.BingoProgress.name,
    FilterExpression: "gameId = :gameId",
    ExpressionAttributeValues: {
      ":gameId": gameId,
    },
  }));

  const allProgress = (progressResult.Items || []) as BingoProgress[];

  // Group progress by sessionId
  const progressBySession = new Map<string, BingoProgress[]>();
  for (const progress of allProgress) {
    if (!progressBySession.has(progress.sessionId)) {
      progressBySession.set(progress.sessionId, []);
    }
    progressBySession.get(progress.sessionId)!.push(progress);
  }

  // Create leaderboard entries
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

  // Sort by points
  leaderboard.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.progressPercentage !== a.progressPercentage) return b.progressPercentage - a.progressPercentage;
    return a.nickname.localeCompare(b.nickname);
  });

  return leaderboard;
}

async function sseLeaderboard(event: APIGatewayProxyEvent) {
  const gameId = event.pathParameters?.gameId;
  if (!gameId) {
    throw new Error("Game ID is required");
  }

  try {
    const [leaderboard, recentEvents] = await Promise.all([
      getCurrentLeaderboard(gameId),
      getRecentEvents(10)
    ]);

    const response = {
      type: "leaderboard_update",
      gameId,
      timestamp: new Date().toISOString(),
      leaderboard,
      events: recentEvents.map(event => ({
        id: event.eventId,
        type: event.type,
        data: event.data,
        timestamp: event.timestamp,
      })),
    };
    
    return JSON.stringify(response);
  } catch (error) {
    console.error("SSE leaderboard error:", error);
    return JSON.stringify({
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}

export const main = sseLeaderboard; 