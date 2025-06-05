import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "./lib/handler";
import { verifySessionToken } from "./lib/token";
import { getCurrentActiveGameId } from "./lib/gameUtils";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function checkGameStatus(event: APIGatewayProxyEvent) {
  // Validate session token
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) {
    throw new Error("Authorization header required");
  }

  const token = authHeader.replace("Bearer ", "");
  const session = verifySessionToken(token);
  
  if (!session) {
    throw new Error("Invalid session token");
  }

  // Get the player's current game ID from the request
  const currentGameId = event.pathParameters?.gameId;
  if (!currentGameId) {
    throw new Error("Game ID is required");
  }

  // Get the actual current active game ID
  const activeGameId = await getCurrentActiveGameId();

  // Check if the player's game is still active
  let gameIsActive = false;
  try {
    const result = await dynamoDb.send(new GetCommand({
      TableName: Resource.Games.name,
      Key: { gameId: currentGameId },
    }));

    gameIsActive = result.Item?.status === "active";
  } catch (error) {
    console.error("Error checking game status:", error);
    gameIsActive = false;
  }

  const needsGameSwitch = currentGameId !== activeGameId;

  return JSON.stringify({
    currentGameId,
    activeGameId,
    gameIsActive,
    needsGameSwitch,
    sessionId: session.sessionId,
    nickname: session.nickname,
    message: needsGameSwitch 
      ? `Your game (${currentGameId}) is no longer active. Switch to the new game: ${activeGameId}`
      : gameIsActive 
        ? "Your game is still active"
        : "Your game is no longer active",
    timestamp: new Date().toISOString(),
  });
}

export const main = handler(checkGameStatus); 