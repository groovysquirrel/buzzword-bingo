import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";
import { Player, JoinGameResponse } from "../lib/types";
import { generateSessionId, createSessionToken } from "../auth/token";
import { getCurrentActiveGameId } from "../lib/gameUtils";
import { addEvent } from "../lib/gameEvents";
import { validateNickname } from "../lib/userValidation";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));


  

async function joinGame(event: APIGatewayProxyEvent) {
  const body = JSON.parse(event.body || "{}");
  const { nickname } = body;

  const sessionId = generateSessionId();

  const trimmedNickname = await validateNickname(nickname, sessionId);

  // Generate session ID and create player record
  const now = new Date().toISOString();

  const player: Player = {
    sessionId,
    nickname: trimmedNickname,
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

  if (!currentGameId) {
    throw new Error("No active game found. Please wait for a game to start.");
  }

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