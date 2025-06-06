import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, PutCommand, DynamoDBDocumentClient, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../lib/handler";
import { Game } from "../lib/types";
import { WebSocketManager } from "../lib/websocketManager";
import { addEvent } from "../lib/gameEvents";

/**
 * Game State Management System
 * 
 * This function handles the lifecycle transitions of buzzword bingo games.
 * 
 * Game States:
 * - open: Players can join the game
 * - started: Game is active, players can mark words
 * - paused: Game is temporarily stopped, no actions allowed
 * - bingo: Someone has called bingo, awaiting verification
 * - ended: Game completed with a winner
 * - cancelled: Game terminated without completion
 * 
 * Valid State Transitions:
 * - open → started, paused, cancelled
 * - started → paused, bingo, ended, cancelled  
 * - paused → started, cancelled
 * - bingo → ended, started (if false bingo), cancelled
 * - ended → (terminal state)
 * - cancelled → (terminal state)
 */

const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/**
 * Valid game states that the system supports
 */
const VALID_STATES = ['open', 'started', 'paused', 'bingo', 'ended', 'cancelled'] as const;
type GameState = typeof VALID_STATES[number];

/**
 * Define which state transitions are allowed
 * This prevents invalid state changes that could break the game flow
 */
const VALID_TRANSITIONS: Record<GameState, GameState[]> = {
  open: ['started', 'paused', 'cancelled'],
  started: ['paused', 'bingo', 'ended', 'cancelled'],
  paused: ['started', 'cancelled'], 
  bingo: ['ended', 'started', 'cancelled'],
  ended: [], // Terminal state
  cancelled: [] // Terminal state
};

/**
 * User-friendly descriptions for each game state
 */
const STATE_DESCRIPTIONS: Record<GameState, string> = {
  open: 'Players can join the game',
  started: 'Game is active - players can mark words',
  paused: 'Game is temporarily paused',
  bingo: 'BINGO called - awaiting verification', 
  ended: 'Game completed with winner',
  cancelled: 'Game was cancelled'
};

async function changeGameState(event: APIGatewayProxyEvent) {
  try {
    // Extract game ID from URL path
    const gameId = event.pathParameters?.gameId;
    if (!gameId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Game ID is required in URL path"
        })
      };
    }

    // Parse request body to get new state and optional reason
    const body = JSON.parse(event.body || "{}");
    const { newState, reason, broadcast = true, action } = body;

    // Validate the new state
    if (!newState || !VALID_STATES.includes(newState)) {
      return {
        statusCode: 400, 
        body: JSON.stringify({
          success: false,
          error: `Invalid state. Must be one of: ${VALID_STATES.join(', ')}`,
          validStates: VALID_STATES
        })
      };
    }

    // Get current game from database
    const getResult = await dynamoDb.send(new GetCommand({
      TableName: Resource.Games.name,
      Key: { gameId }
    }));

    const currentGame = getResult.Item as Game;
    if (!currentGame) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: `Game ${gameId} not found`
        })
      };
    }

    const currentState = currentGame.status as GameState;

    // Check if this state transition is allowed
    if (!VALID_TRANSITIONS[currentState as keyof typeof VALID_TRANSITIONS]) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: `Unknown current state: ${currentState}`,
          currentState,
          validStates: VALID_STATES
        })
      };
    }

    if (!VALID_TRANSITIONS[currentState as keyof typeof VALID_TRANSITIONS].includes(newState)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: `Invalid transition from ${currentState} to ${newState}`,
          currentState,
          validTransitions: VALID_TRANSITIONS[currentState as keyof typeof VALID_TRANSITIONS],
          stateDescriptions: STATE_DESCRIPTIONS
        })
      };
    }

    // Update the game state in database
    const updatedGame: Game = {
      ...currentGame,
      status: newState,
      updatedAt: new Date().toISOString(),
      stateHistory: [
        ...(currentGame.stateHistory || []),
        {
          from: currentState,
          to: newState,
          timestamp: new Date().toISOString(),
          reason: reason || `State changed via admin`
        }
      ]
    };

    await dynamoDb.send(new PutCommand({
      TableName: Resource.Games.name,
      Item: updatedGame
    }));

    // Broadcast state change to all connected clients via WebSocket
    const wsManager = WebSocketManager.getInstance();
    if (broadcast) {
      let winnerInfo = null;
      
      // If transitioning from bingo to ended with verify-bingo action, fetch winner information
      if (currentState === 'bingo' && newState === 'ended' && action === 'verify-bingo') {
        try {
          // Query CompletedBingo table to get winner details using the correct GSI
          const bingoResult = await dynamoDb.send(new QueryCommand({
            TableName: Resource.CompletedBingo.name,
            IndexName: 'GameCompletionsIndex', // Use the correct GSI from infra/storage.ts
            KeyConditionExpression: 'gameId = :gameId',
            ExpressionAttributeValues: {
              ':gameId': gameId
            },
            ScanIndexForward: false, // Get most recent first
            Limit: 1
          }));
          
          if (bingoResult.Items && bingoResult.Items.length > 0) {
            const winnerRecord = bingoResult.Items[0];
            
            // Mark the BINGO as verified
            await dynamoDb.send(new UpdateCommand({
              TableName: Resource.CompletedBingo.name,
              Key: {
                sessionId: winnerRecord.sessionId,
                gameId: gameId
              },
              UpdateExpression: 'SET verified = :verified',
              ExpressionAttributeValues: {
                ':verified': true
              }
            }));
            
            // Get winner's nickname from Players table
            let winnerNickname = 'Unknown Player';
            try {
              const playerResult = await dynamoDb.send(new GetCommand({
                TableName: Resource.Players.name,
                Key: { sessionId: winnerRecord.sessionId }
              }));
              
              if (playerResult.Item) {
                winnerNickname = playerResult.Item.nickname || 'Unknown Player';
              }
            } catch (error) {
              console.error('Failed to fetch winner nickname:', error);
            }
            
            // Calculate actual points by counting total marked words from BingoProgress
            let winnerPoints = 0;
            try {
              const progressResult = await dynamoDb.send(new QueryCommand({
                TableName: Resource.BingoProgress.name,
                KeyConditionExpression: 'sessionId = :sessionId',
                ExpressionAttributeValues: {
                  ':sessionId': winnerRecord.sessionId
                }
              }));
              
              if (progressResult.Items) {
                // Count words marked in this specific game
                winnerPoints = progressResult.Items.filter(item => item.gameId === gameId).length;
              }
            } catch (error) {
              console.error('Failed to fetch winner progress:', error);
              // Fallback to winning pattern length if progress query fails
              winnerPoints = winnerRecord.winningWords ? winnerRecord.winningWords.length : 0;
            }
            
            winnerInfo = {
              sessionId: winnerRecord.sessionId,
              nickname: winnerNickname,
              bingoType: winnerRecord.bingoType,
              points: winnerPoints,
              secretWord: winnerRecord.secretWord
            };
            
            console.log(`🏆 Winner info found:`, winnerInfo);
            
            // Add activity event for BINGO completion
            await addEvent("bingo_completed", {
              nickname: winnerNickname,
              gameId,
              sessionId: winnerRecord.sessionId,
              bingoType: winnerRecord.bingoType,
              points: winnerPoints,
              secretWord: winnerRecord.secretWord,
              message: `${winnerNickname} achieved assessment completion milestone! BINGO!`
            });
            
          } else {
            console.warn('⚠️ No CompletedBingo record found for game', gameId);
          }
        } catch (error) {
          console.error('❌ Failed to fetch winner info:', error);
        }
      }
      
      await wsManager.broadcastMessage({
        type: 'game_state_changed',
        gameId,
        previousState: currentState,
        newState,
        timestamp: new Date().toISOString(),
        reason: reason || `Game state changed to ${newState}`,
        stateDescription: STATE_DESCRIPTIONS[newState as keyof typeof STATE_DESCRIPTIONS],
        winnerInfo // Include winner information if available
      });
    }

    console.log(`Game ${gameId} state changed: ${currentState} → ${newState}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        gameId,
        previousState: currentState,
        newState,
        stateDescription: STATE_DESCRIPTIONS[newState as keyof typeof STATE_DESCRIPTIONS],
        timestamp: new Date().toISOString(),
        validNextStates: VALID_TRANSITIONS[newState as keyof typeof VALID_TRANSITIONS]
      })
    };

  } catch (error) {
    console.error("Game state change error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      })
    };
  }
}

export const main = handler(changeGameState); 