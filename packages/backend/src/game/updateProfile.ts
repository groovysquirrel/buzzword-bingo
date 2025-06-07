import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, GetCommand, ScanCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";
import { extractSessionFromHeaders, createSessionToken } from "../auth/token";
import { WebSocketManager } from "../lib/websocketManager";
import { addEvent } from "../lib/gameEvents";
import { getCurrentActiveGameId } from "../lib/gameUtils";
import { validateNickname } from "../lib/userValidation";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function updateProfile(event: APIGatewayProxyEvent) {
  // Verify session token
  const session = extractSessionFromHeaders(event.headers);
  if (!session) {
    throw new Error("Invalid or missing session token");
  }

  console.log(`🔧 updateProfile: Session ${session.sessionId} (${session.nickname}) updating profile`);

  const body = JSON.parse(event.body || "{}");
  const { nickname } = body;

  const trimmedNickname = await validateNickname(nickname, session.sessionId);


  const oldNickname = session.nickname;

  // Update player record
  await dynamoDb.send(new UpdateCommand({
    TableName: Resource.Players.name,
    Key: { sessionId: session.sessionId },
    UpdateExpression: "SET nickname = :nickname, updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":nickname": trimmedNickname,
      ":updatedAt": new Date().toISOString()
    }
  }));

  console.log(`✅ Updated nickname from "${oldNickname}" to "${trimmedNickname}" for session ${session.sessionId}`);

  // Create new session token with updated nickname
  const newTokenPayload = {
    sessionId: session.sessionId,
    nickname: trimmedNickname,
    createdAt: session.createdAt // Keep original creation time
  };
  const newSignedToken = createSessionToken(newTokenPayload);

  // Get current game ID for the event
  const currentGameId = await getCurrentActiveGameId();

  // Publish nickname change event for activity feed
  await addEvent("nickname_updated", {
    sessionId: session.sessionId,
    oldNickname: oldNickname,
    newNickname: trimmedNickname,
    gameId: currentGameId,
    message: `${oldNickname} is now known as ${trimmedNickname}`
  });

  // Broadcast nickname change to all connected clients for real-time leaderboard updates
  const wsManager = WebSocketManager.getInstance();
  await wsManager.broadcastMessage({
    type: 'nickname_updated',
    sessionId: session.sessionId,
    oldNickname: oldNickname,
    newNickname: trimmedNickname,
    timestamp: new Date().toISOString(),
    message: `${oldNickname} is now known as ${trimmedNickname}`
  });

  return JSON.stringify({
    success: true,
    message: "Nickname updated successfully",
    oldNickname: oldNickname,
    newNickname: trimmedNickname,
    sessionId: session.sessionId,
    newSignedToken: newSignedToken // Return new token with updated nickname
  });
}

export const main = handler(updateProfile); 