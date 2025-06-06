/**
 * Type definitions for the Buzzword Bingo game
 * 
 * These interfaces define the structure of data used throughout the application
 * for type safety and better developer experience.
 */

/**
 * Represents a player's session information
 * This data is stored in localStorage for persistent game sessions
 */
export interface SessionInfo {
  /** Unique identifier for the player's session */
  sessionId: string;
  /** Authentication token signed by the server */
  signedToken: string;
  /** Player's chosen nickname */
  nickname: string;
  /** ID of the current game they're playing */
  currentGameId: string;
  /** Timestamp when the player joined */
  joinedAt: string;
}

/**
 * Represents a player's bingo card
 * Contains the 5x5 grid of words and which words have been marked
 */
export interface BingoCard {
  /** ID of the game this card belongs to */
  gameId: string;
  /** ID of the player's session */
  sessionId: string;
  /** 5x5 grid of words arranged in rows and columns */
  words: string[][];
  /** Array of words the player has marked */
  markedWords: string[];
}

/**
 * Response from the server when a player marks a word
 * Contains information about the marking action and any achievements
 */
export interface MarkWordResponse {
  /** Whether the word was successfully marked */
  success: boolean;
  /** Human-readable message about the result */
  message: string;
  /** Total points the player now has */
  points: number;
  /** Total number of words in the game */
  totalWords: number;
  /** Whether the player achieved BINGO with this word */
  bingo?: boolean;
  /** Type of BINGO achieved (row, column, diagonal) */
  bingoType?: string;
  /** Array of words that formed the winning pattern */
  winningWords?: string[];
  /** Secret word revealed when BINGO is achieved */
  secretWord?: string;
}

/**
 * Represents a single entry in the leaderboard
 * Contains player statistics and ranking information
 */
export interface LeaderboardEntry {
  /** Player's nickname */
  nickname: string;
  /** Player's session ID */
  sessionId: string;
  /** Percentage of words marked (0-100) */
  progressPercentage: number;
  /** Number of words the player has marked */
  wordsMarked: number;
  /** Total number of words in the game */
  totalWords: number;
  /** Player's current point total */
  points: number;
}

/**
 * Complete leaderboard response from the server
 * Contains all players' statistics sorted by rank
 */
export interface LeaderboardResponse {
  /** ID of the game */
  gameId: string;
  /** When the leaderboard was last updated */
  timestamp: string;
  /** Total number of players in the game */
  totalPlayers: number;
  /** Array of player entries sorted by rank */
  leaderboard: LeaderboardEntry[];
}

/**
 * Represents a game activity event
 * Used for the real-time activity feed
 */
export interface GameEvent {
  /** Unique identifier for the event */
  eventId: string;
  /** Type of event - see EVENT_TYPES in utils/eventFormatter for available types */
  eventType: string;
  /** When the event occurred */
  timestamp: string;
  /** Human-readable message describing the event */
  message: string;
  /** Player's nickname who triggered the event */
  playerNickname?: string;
  /** Additional data specific to the event type */
  eventData?: any;
}

/**
 * Properties for bingo cell components
 * Used to render individual squares in the bingo grid
 */
export interface BingoCellProps {
  /** The word displayed in this cell */
  word: string;
  /** Whether this cell has been marked */
  isMarked: boolean;
  /** Whether this cell is currently being marked (loading state) */
  isMarking: boolean;
  /** Function called when the cell is clicked */
  onClick: (word: string) => void;
  /** Row index for accessibility */
  rowIndex: number;
  /** Column index for accessibility */
  colIndex: number;
}

/**
 * Properties for the bingo grid component
 * Contains the complete 5x5 grid of words
 */
export interface BingoGridProps {
  /** The bingo card data */
  bingoCard: BingoCard;
  /** Currently loading word (if any) */
  markingWord: string | null;
  /** Function called when a word is marked */
  onMarkWord: (word: string) => void;
  /** Function called when a BINGO pattern is detected */
  onBingoDetected?: (bingoResult: { hasBingo: boolean; bingoType?: string; winningWords?: string[] }) => void;
  /** Current game state (open, started, paused, bingo, ended) */
  gameStatus?: string;
  /** Whether the grid should be disabled (non-interactive) */
  disabled?: boolean;
  /** Secret word to display when BINGO is achieved */
  secretWord?: string | null;
  /** Whether player is awaiting BINGO confirmation */
  awaitingConfirmation?: boolean;
  /** Function called when the "Join Next Game" button is clicked */
  onJoinNextGame?: () => void;
  /** Winner information for displaying game end messages */
  winnerInfo?: {
    sessionId: string;
    nickname: string;
    bingoType: string;
    points: number;
    secretWord: string;
  };
}

/**
 * Properties for leaderboard components
 * Used to display player rankings
 */
export interface LeaderboardProps {
  /** Complete leaderboard data */
  leaderboard: LeaderboardResponse;
  /** Current player's session (to highlight their entry) */
  currentSession?: SessionInfo;
  /** Whether to show detailed statistics */
  showDetails?: boolean;
}

/**
 * Properties for player status components
 * Shows current game progress and statistics
 */
export interface PlayerStatusProps {
  /** Player's bingo card */
  bingoCard: BingoCard;
  /** Player's current rank */
  rank: number | null;
  /** Whether to show detailed progress */
  showProgress?: boolean;
} 