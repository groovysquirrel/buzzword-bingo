import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "./lib/handler";
import { Game, CompletedBingo } from "./lib/types";

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function getGameHistory(event: APIGatewayProxyEvent) {
  try {
    // Get all games from the database
    const gamesResult = await dynamoDb.send(new ScanCommand({
      TableName: Resource.Games.name,
    }));

    const games = (gamesResult.Items || []) as Game[];

    // Get all completed bingo records to find winners
    const completedBingoResult = await dynamoDb.send(new ScanCommand({
      TableName: Resource.CompletedBingo.name,
    }));

    const completedBingos = (completedBingoResult.Items || []) as CompletedBingo[];

    // Group completed bingos by game ID and find the first winner for each game
    const gameWinners = new Map<string, CompletedBingo>();
    for (const bingo of completedBingos) {
      if (!gameWinners.has(bingo.gameId) || 
          new Date(bingo.completedAt) < new Date(gameWinners.get(bingo.gameId)!.completedAt)) {
        gameWinners.set(bingo.gameId, bingo);
      }
    }

    // Create history entries
    const gameHistory = games.map(game => {
      const winner = gameWinners.get(game.gameId);
      
      return {
        gameId: game.gameId,
        startTime: game.startTime,
        endTime: game.endTime || null,
        status: game.status,
        winner: winner ? {
          nickname: winner.nickname,
          completedAt: winner.completedAt,
          secretWord: winner.secretWord,
        } : null,
        totalWords: game.wordList ? game.wordList.length : 0,
      };
    });

    // Sort by start time (most recent first)
    gameHistory.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    return JSON.stringify({
      totalGames: gameHistory.length,
      completedGames: gameHistory.filter(g => g.status === 'complete').length,
      activeGames: gameHistory.filter(g => g.status === 'active').length,
      timestamp: new Date().toISOString(),
      history: gameHistory,
    });
  } catch (error) {
    console.error("Get game history error:", error);
    return JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}

export const main = handler(getGameHistory); 