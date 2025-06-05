import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "./lib/handler";
import { BingoProgress } from "./lib/types";
import { extractSessionFromHeaders } from "./lib/token";
import { addEvent } from "./lib/gameEvents";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function markWord(event: APIGatewayProxyEvent) {
  // Verify session token
  const session = extractSessionFromHeaders(event.headers);
  if (!session) {
    throw new Error("Invalid or missing session token");
  }

  const gameId = event.pathParameters?.gameId;
  if (!gameId) {
    throw new Error("Game ID is required");
  }

  const body = JSON.parse(event.body || "{}");
  const { word } = body;

  if (!word || word.trim().length === 0) {
    throw new Error("Word is required");
  }

  // Don't allow marking the SYNERGY (FREE) space
  if (word === "SYNERGY (FREE)") {
    throw new Error("SYNERGY (FREE) space cannot be marked");
  }

  // Create progress record
  const progress: BingoProgress = {
    sessionId: session.sessionId,
    word: word.trim(),
    gameId,
    markedAt: new Date().toISOString(),
  };

  // Save to database (using PutCommand which will overwrite if exists)
  await dynamoDb.send(new PutCommand({
    TableName: Resource.BingoProgress.name,
    Item: progress,
  }));

  // Publish word marked event for real-time updates
  await addEvent("word_marked", {
    nickname: session.nickname,
    word: progress.word,
    gameId,
    sessionId: session.sessionId,
  });

  return JSON.stringify({
    success: true,
    word: progress.word,
    markedAt: progress.markedAt,
  });
}

export const main = handler(markWord); 