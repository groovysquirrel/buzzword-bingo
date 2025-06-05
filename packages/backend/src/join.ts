import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "./lib/handler";
import { Player, JoinGameResponse } from "./lib/types";
import { generateSessionId, createSessionToken } from "./lib/token";
import { getCurrentGameId, getCurrentActiveGameId } from "./lib/gameUtils";
import { addEvent } from "./sseLeaderboard";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function joinGame(event: APIGatewayProxyEvent) {
  const body = JSON.parse(event.body || "{}");
  const { nickname } = body;

  if (!nickname || nickname.trim().length === 0) {
    throw new Error("Nickname is required");
  }

  if (nickname.length > 20) {
    throw new Error("Nickname must be 20 characters or less");
  }

  // Basic profanity filter (simple version)
  const profanityWords = ["fuck", "shit", "damn", "hell"];
  const lowercaseNickname = nickname.toLowerCase();
  if (profanityWords.some(word => lowercaseNickname.includes(word))) {
    throw new Error("Please choose a different nickname");
  }

  // Generate session ID and create player record
  const sessionId = generateSessionId();
  const now = new Date().toISOString();

  const player: Player = {
    sessionId,
    nickname: nickname.trim(),
    joinedAt: now,
  };

  // Create session token
  const tokenPayload = {
    sessionId,
    nickname: player.nickname,
    createdAt: now,
  };
  const signedToken = createSessionToken(tokenPayload);

  // Save player to database
  await dynamoDb.send(new PutCommand({
    TableName: Resource.Players.name,
    Item: player,
    ConditionExpression: "attribute_not_exists(sessionId)", // Prevent duplicates
  }));

  // Get the current active game ID from database
  const currentGameId = await getCurrentActiveGameId();

  // Publish join event for real-time updates
  await addEvent("player_joined", {
    nickname: player.nickname,
    sessionId: player.sessionId,
    gameId: currentGameId,
  });

  // Return session information
  const response: JoinGameResponse = {
    sessionId,
    signedToken,
    nickname: player.nickname,
    currentGameId: currentGameId,
  };

  return JSON.stringify(response);
}

export const main = handler(joinGame); 