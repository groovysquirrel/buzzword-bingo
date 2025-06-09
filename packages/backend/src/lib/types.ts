/**
 * Core type definitions for the Buzzword Bingo backend
 * 
 * These interfaces define the structure of data stored in DynamoDB
 * and used throughout the backend Lambda functions.
 */

// Player entity
export interface Player {
  sessionId: string;
  nickname: string;
  joinedAt: string;
  signedToken?: string; // HMAC signed token for validation
}

// Game entity
export interface Game {
  gameId: string;
  status: "open" | "playing" | "paused" | "bingo" | "ended" | "cancelled" | "active" | "scheduled" | "complete" | "testing"; // Extended to support new states
  wordList: string[];
  startTime: string;
  endTime?: string;
  nextGameId?: string;
  secretWords: string[]; // Pool of secret "beer words" for winners
  updatedAt?: string; // When the game was last modified
  stateHistory?: GameStateTransition[]; // History of state changes
}

// Bingo progress tracking
export interface BingoProgress {
  sessionId: string;
  word: string;
  gameId: string;
  markedAt: string;
}

// Completed bingo record
export interface CompletedBingo {
  sessionId: string;
  gameId: string;
  completedAt: string;
  winningWords: string[]; // The 25 words that made up their winning card
  secretWord: string; // The secret word they get for winning
  nickname: string; // Denormalized for easy display
}

// Bingo card structure for frontend
export interface BingoCard {
  gameId: string;
  sessionId: string;
  words: string[][]; // 5x5 grid of words
  markedWords: Set<string>; // Words the user has marked
}

// Stored bingo card in DynamoDB
export interface StoredBingoCard {
  sessionId: string;
  gameId: string;
  cardWords: string; // JSON stringified grid array (variable size)
  createdAt: string;
  gameSettings?: {
    gridSize: "3x3" | "4x4" | "5x5";
    selectedCategories: string[];
  };
}

// API Response types
export interface JoinGameResponse {
  sessionId: string;
  signedToken: string;
  nickname: string;
  currentGameId: string;
}

export interface LeaderboardEntry {
  nickname: string;
  sessionId: string;
  progressPercentage: number;
  wordsMarked: number;
  totalWords: number;
  points: number; // Points scored (10 per marked word)
}

// Session token payload for HMAC signing
export interface SessionTokenPayload {
  sessionId: string;
  nickname: string;
  createdAt: string;
}

export interface Event {
  eventId: string;
  type: string;
  data: any;
  timestamp: string;
  expiresAt: number; // TTL field for auto-deletion
}

// Game state transition tracking
export interface GameStateTransition {
  from: string;
  to: string;
  timestamp: string;
  reason?: string;
} 