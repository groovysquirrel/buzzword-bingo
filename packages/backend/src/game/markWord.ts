import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";
import { BingoProgress } from "../lib/types";
import { extractSessionFromHeaders } from "../auth/token";
import { addEvent } from "../lib/gameEvents";
import { getCurrentNickname } from "../lib/userValidation";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function markWord(event: APIGatewayProxyEvent) {
  // Verify session token
  const session = extractSessionFromHeaders(event.headers);
  if (!session) {
    throw new Error("Invalid or missing session token");
  }

  console.log(`🎯 markWord: Session ${session.sessionId} (${session.nickname}) marking word`);

  // Get current nickname from database (in case it was updated)
  const currentNickname = await getCurrentNickname(session.sessionId, session.nickname);

  // SIMPLE FIX: Ensure player record exists (handles missing player records)
  try {
    const playerCheck = await dynamoDb.send(new GetCommand({
      TableName: Resource.Players.name,
      Key: { sessionId: session.sessionId }
    }));

    if (!playerCheck.Item) {
      console.log(`🔧 Player record missing for ${session.sessionId}, creating it`);
      // Create missing player record
      await dynamoDb.send(new PutCommand({
        TableName: Resource.Players.name,
        Item: {
          sessionId: session.sessionId,
          nickname: currentNickname,
          joinedAt: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(sessionId)"
      }));
      console.log(`✅ Created player record for ${currentNickname} (${session.sessionId})`);
    } else {
      console.log(`✅ Player record exists for ${currentNickname} (${session.sessionId})`);
    }
  } catch (createError) {
    console.log(`⚠️ Could not verify/create player record: ${createError instanceof Error ? createError.message : String(createError)}`);
    // Continue anyway - the leaderboard hotfix will handle it
  }

  const gameId = event.pathParameters?.gameId;
  if (!gameId) {
    throw new Error("Game ID is required");
  }

  // Validate that the game exists and is in a valid state for marking words
  const gameResult = await dynamoDb.send(new GetCommand({
    TableName: Resource.Games.name,
    Key: { gameId }
  }));

  const game = gameResult.Item;
  if (!game) {
    console.log(`Game ${gameId} not found when marking word - returning clear cache instruction`);
    return JSON.stringify({
      action: "clear_cache",
      reason: "game_not_found_during_mark",
      message: "This game no longer exists. The system may have been reset.",
      timestamp: new Date().toISOString()
    });
  }

  // Check if game is in a state where words can be marked
  const validStates = ["open", "playing", "paused", "bingo"];
  if (!validStates.includes(game.status)) {
    console.error(`Cannot mark words in game ${gameId} with status: ${game.status}`);
    throw new Error(`Game is in "${game.status}" state. Words can only be marked when game is open, playing, paused, or in bingo verification.`);
  }

  console.log(`Marking word in game ${gameId} (status: ${game.status}) for session ${session.sessionId}`);

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

  console.log(`Successfully marked word "${word}" for session ${session.sessionId} in game ${gameId}`);

  // Publish word marked event for real-time updates - use current nickname from database
  await addEvent("word_marked", {
    nickname: currentNickname, // Use fresh nickname from database
    word: progress.word,
    gameId,
    sessionId: session.sessionId,
  });

  return JSON.stringify({
    success: true,
    word: progress.word,
    markedAt: progress.markedAt,
    gameId: gameId, // Include game ID in response for debugging
    gameStatus: game.status // Include game status for debugging
  });
}

export const main = handler(markWord); 