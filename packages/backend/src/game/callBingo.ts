import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, PutCommand, UpdateCommand, QueryCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";
import { extractSessionFromHeaders, generateSecretWord } from "../auth/token";
import { addEvent } from "../lib/gameEvents";
import { BingoProgress, StoredBingoCard } from "../lib/types";
import { checkForBingo } from "../lib/gameUtils";
import { WebSocketManager } from "../lib/websocketManager";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Enhanced BINGO check that returns pattern details
 */
function checkForBingoWithDetails(markedWords: Set<string>, cardWords: string[][]): {
  hasBingo: boolean;
  bingoType?: string;
  winningWords?: string[];
} {
  // Add SYNERGY (FREE) space to marked words
  const allMarkedWords = new Set([...markedWords, "SYNERGY (FREE)"]);
  
  // Check rows
  for (let row = 0; row < 5; row++) {
    if (cardWords[row].every(word => allMarkedWords.has(word))) {
      return { 
        hasBingo: true, 
        bingoType: `Row ${row + 1}`, 
        winningWords: cardWords[row] 
      };
    }
  }
  
  // Check columns
  for (let col = 0; col < 5; col++) {
    const columnWords = cardWords.map(row => row[col]);
    if (columnWords.every(word => allMarkedWords.has(word))) {
      return { 
        hasBingo: true, 
        bingoType: `Column ${col + 1}`, 
        winningWords: columnWords 
      };
    }
  }
  
  // Check diagonal (top-left to bottom-right)
  const diagonal1 = cardWords.map((row, index) => row[index]);
  if (diagonal1.every(word => allMarkedWords.has(word))) {
    return { 
      hasBingo: true, 
      bingoType: 'Diagonal (↘)', 
      winningWords: diagonal1 
    };
  }
  
  // Check diagonal (top-right to bottom-left)
  const diagonal2 = cardWords.map((row, index) => row[4 - index]);
  if (diagonal2.every(word => allMarkedWords.has(word))) {
    return { 
      hasBingo: true, 
      bingoType: 'Diagonal (↙)', 
      winningWords: diagonal2 
    };
  }
  
  return { hasBingo: false };
}

async function callBingo(event: APIGatewayProxyEvent) {
  // Verify session token
  const session = extractSessionFromHeaders(event.headers);
  if (!session) {
    throw new Error("Invalid or missing session token");
  }

  const gameId = event.pathParameters?.gameId;
  if (!gameId) {
    throw new Error("Game ID is required");
  }

  console.log(`🎯 BINGO called by ${session.nickname} (${session.sessionId}) in game ${gameId}`);

  // Get game and verify it's in a valid state for BINGO calls
  const gameResult = await dynamoDb.send(new GetCommand({
    TableName: Resource.Games.name,
    Key: { gameId }
  }));

  const game = gameResult.Item;
  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  // Only allow BINGO calls in started games
  if (game.status !== "started") {
    throw new Error(`Cannot call BINGO in game with status "${game.status}". Game must be started.`);
  }

  // Get player's bingo card
  const cardResult = await dynamoDb.send(new GetCommand({
    TableName: Resource.BingoCards.name,
    Key: {
      sessionId: session.sessionId,
      gameId: gameId,
    },
  }));

  if (!cardResult.Item) {
    throw new Error("Bingo card not found");
  }

  const storedCard = cardResult.Item as StoredBingoCard;
  const cardWords: string[][] = JSON.parse(storedCard.cardWords);

  // Get player's marked words
  const progressResult = await dynamoDb.send(new QueryCommand({
    TableName: Resource.BingoProgress.name,
    KeyConditionExpression: "sessionId = :sessionId",
    ExpressionAttributeValues: {
      ":sessionId": session.sessionId,
    },
  }));

  const markedWords = new Set<string>();
  if (progressResult.Items) {
    for (const item of progressResult.Items as BingoProgress[]) {
      if (item.gameId === gameId) {
        markedWords.add(item.word);
      }
    }
  }

  // Verify BINGO is actually valid using enhanced check
  const bingoCheck = checkForBingoWithDetails(markedWords, cardWords);
  
  if (!bingoCheck.hasBingo) {
    throw new Error("Invalid BINGO call - no winning pattern found");
  }

  // Generate secret word for the winner
  const secretWord = generateSecretWord();

  // Change game state to "bingo" (pending verification)
  await dynamoDb.send(new UpdateCommand({
    TableName: Resource.Games.name,
    Key: { gameId },
    UpdateExpression: "SET #status = :status, #bingoCalledAt = :timestamp, #bingoCalledBy = :sessionId",
    ExpressionAttributeNames: {
      "#status": "status",
      "#bingoCalledAt": "bingoCalledAt", 
      "#bingoCalledBy": "bingoCalledBy"
    },
    ExpressionAttributeValues: {
      ":status": "bingo",
      ":timestamp": new Date().toISOString(),
      ":sessionId": session.sessionId
    }
  }));

  // Broadcast game state change to all connected clients via WebSocket
  const wsManager = WebSocketManager.getInstance();
  await wsManager.broadcastMessage({
    type: 'game_state_changed',
    gameId,
    previousState: 'started',
    newState: 'bingo',
    timestamp: new Date().toISOString(),
    reason: `BINGO called by ${session.nickname}`,
    stateDescription: 'BINGO called - awaiting verification',
    bingoCalledBy: session.nickname
  });

  // Record the BINGO call in CompletedBingo table (pending verification)
  await dynamoDb.send(new PutCommand({
    TableName: Resource.CompletedBingo.name,
    Item: {
      sessionId: session.sessionId,
      gameId,
      completedAt: new Date().toISOString(),
      bingoType: bingoCheck.bingoType || "Unknown",
      winningWords: bingoCheck.winningWords || [],
      secretWord,
      verified: false, // Will be set to true when admin confirms
    },
  }));

  // Publish BINGO event
  await addEvent("bingo_called", {
    nickname: session.nickname,
    gameId,
    sessionId: session.sessionId,
    bingoType: bingoCheck.bingoType,
    winningWords: bingoCheck.winningWords,
    message: `${session.nickname} called BINGO! (${bingoCheck.bingoType})`
  });

  console.log(`✅ BINGO called successfully by ${session.nickname} - awaiting verification`);

  return JSON.stringify({
    success: true,
    message: "BINGO called successfully! Awaiting admin verification.",
    bingoType: bingoCheck.bingoType,
    winningWords: bingoCheck.winningWords,
    secretWord, // Give them the secret word immediately
    gameStatus: "bingo",
    verified: false
  });
}

export const main = handler(callBingo); 