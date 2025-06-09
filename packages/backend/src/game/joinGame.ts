import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";
import { Player, JoinGameResponse } from "../lib/types";
import { generateSessionId, createSessionToken } from "../auth/token";
import { getCurrentActiveGameId } from "../lib/gameUtils";
import { addEvent } from "../lib/gameEvents";
import { validateNicknameWithDetails } from "../lib/userValidation";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function joinGame(event: APIGatewayProxyEvent) {
  const body = JSON.parse(event.body || "{}");
  const { nickname } = body;

  const sessionId = generateSessionId();

  // Use the new structured validation
  const validationResult = await validateNicknameWithDetails(nickname, sessionId);
  
  if (validationResult.status === "rejected") {
    // Return structured error response that frontend can handle
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "VALIDATION_FAILED",
        message: validationResult.message,
        rejectionReason: validationResult.rejectionReason,
        alternateName: validationResult.alternateName,
        aiGeneratedReason: validationResult.aiGeneratedReason,
        usedAI: validationResult.usedAI,
        timestamp: new Date().toISOString()
      })
    };
  }

  const trimmedNickname = validationResult.validatedNickname!;

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
    // Create a custom error response that indicates the system may have been reset
    const errorResponse = {
      statusCode: 404,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "NO_ACTIVE_GAMES",
        message: "No active game found. Please wait for a game to start.",
        userMessage: "The system appears to have been reset. Please try joining again once a new game is created.",
        systemReset: true, // Flag indicating potential system reset
        timestamp: new Date().toISOString(),
        clearLocalStorage: true // Instruction for frontend to clear localStorage
      })
    };
    
    console.log("🚨 Join game failed - no active games available, potential system reset");
    return errorResponse;
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