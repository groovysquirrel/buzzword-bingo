import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { QueryCommand, GetCommand, PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";
import { BingoCard, BingoProgress, StoredBingoCard } from "../lib/types";
import { extractSessionFromHeaders } from "../auth/token";
import { generateBingoCard } from "../lib/gameUtils";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function getBingoCard(event: APIGatewayProxyEvent) {
  // Verify session token
  const session = extractSessionFromHeaders(event.headers);
  if (!session) {
    throw new Error("Invalid or missing session token");
  }

  const gameId = event.pathParameters?.gameId;
  if (!gameId) {
    throw new Error("Game ID is required");
  }

  // First, try to get existing card for this session/game combination
  let cardWords: string[][];
  
  try {
    const existingCardResult = await dynamoDb.send(new GetCommand({
      TableName: Resource.BingoCards.name,
      Key: {
        sessionId: session.sessionId,
        gameId: gameId,
      },
    }));

    if (existingCardResult.Item) {
      // Found existing card, parse the stored layout
      const storedCard = existingCardResult.Item as StoredBingoCard;
      cardWords = JSON.parse(storedCard.cardWords);
      console.log(`Retrieved existing bingo card for session ${session.sessionId}, game ${gameId}`);
    } else {
      // No existing card, generate new one and store it
      cardWords = generateBingoCard();
      
      const newCard: StoredBingoCard = {
        sessionId: session.sessionId,
        gameId: gameId,
        cardWords: JSON.stringify(cardWords),
        createdAt: new Date().toISOString(),
      };

      await dynamoDb.send(new PutCommand({
        TableName: Resource.BingoCards.name,
        Item: newCard,
      }));
      
      console.log(`Generated and stored new bingo card for session ${session.sessionId}, game ${gameId}`);
    }
  } catch (error) {
    console.error("Error managing bingo card storage:", error);
    // Fallback to generating a card without storage
    cardWords = generateBingoCard();
  }

  // Get player's marked words for this game
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

  const bingoCard: BingoCard = {
    gameId,
    sessionId: session.sessionId,
    words: cardWords,
    markedWords,
  };

  return JSON.stringify({
    ...bingoCard,
    markedWords: Array.from(markedWords), // Convert Set to Array for JSON
  });
}

export const main = handler(getBingoCard); 