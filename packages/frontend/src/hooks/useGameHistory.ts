import { useState, useEffect } from 'react';
import { API } from 'aws-amplify';

interface GameHistoryEntry {
  gameId: string;
  startTime: string;
  endTime: string | null;
  status: string;
  winner: {
    nickname: string;
    completedAt: string;
    secretWord: string;
  } | null;
  totalWords: number;
}

interface GameHistoryResponse {
  totalGames: number;
  completedGames: number;
  activeGames: number;
  timestamp: string;
  history: GameHistoryEntry[];
}

interface CurrentGameResponse {
  currentGameId: string | null;
  status: string;
  startTime: string;
  wordCount: number;
  timestamp: string;
  error?: string;
}

interface UseGameHistoryResult {
  currentGameId: string | null;
  gameHistory: GameHistoryResponse | null;
  selectedGameId: string | null;
  loading: boolean;
  error: string | null;
  refreshHistory: () => Promise<void>;
  setSelectedGameId: (gameId: string | null) => void;
  selectCurrentGame: () => void;
}

export function useGameHistory(): UseGameHistoryResult {
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistoryResponse | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current active game from API
   */
  const fetchCurrentGame = async () => {
    try {
      const result: CurrentGameResponse = await API.get("api", "/current-game", {});
      const gameId = result.currentGameId;
      setCurrentGameId(gameId);
      
      // If no game is selected, automatically select the current game
      if (!selectedGameId && gameId) {
        setSelectedGameId(gameId);
      }
      
      return gameId;
    } catch (error) {
      console.error("Failed to fetch current game:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch current game");
      return null;
    }
  };

  /**
   * Fetch game history from API
   */
  const fetchGameHistory = async () => {
    try {
      const result: GameHistoryResponse = await API.get("api", "/games/history", {});
      setGameHistory(result);
      return result;
    } catch (error) {
      console.error("Failed to fetch game history:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch game history");
      return null;
    }
  };

  /**
   * Refresh both current game and history
   */
  const refreshHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchCurrentGame(),
        fetchGameHistory()
      ]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Select the current active game
   */
  const selectCurrentGame = () => {
    if (currentGameId) {
      setSelectedGameId(currentGameId);
    }
  };

  /**
   * Load data on mount
   */
  useEffect(() => {
    refreshHistory();
  }, []);

  return {
    currentGameId,
    gameHistory,
    selectedGameId,
    loading,
    error,
    refreshHistory,
    setSelectedGameId,
    selectCurrentGame
  };
} 