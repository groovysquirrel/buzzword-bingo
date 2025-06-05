import { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import { SessionInfo, BingoCard, MarkWordResponse } from '../types/game';

/**
 * Custom hook for managing bingo game state
 * 
 * Handles:
 * - Loading bingo card from API
 * - Marking words with immediate local updates
 * - Error handling
 * - Real-time state via WebSocket (no polling needed)
 * 
 * This encapsulates all bingo game logic so components
 * focus on rendering and user interaction.
 */
export function useBingoGame(session: SessionInfo | null) {
  const [bingoCard, setBingoCard] = useState<BingoCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingWord, setMarkingWord] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load bingo card when session is available
  useEffect(() => {
    if (session) {
      loadBingoCard(session);
    }
  }, [session]);

  // Note: Removed auto-refresh polling since we now have:
  // 1. WebSocket real-time updates for leaderboard changes
  // 2. Local state updates when marking words for immediate feedback
  // 3. No need to poll for bingo card changes every 10 seconds

  /**
   * Load bingo card from the API
   * @param sessionInfo - Player's session information
   * @param showLoading - Whether to show loading state (default: true)
   */
  const loadBingoCard = async (sessionInfo: SessionInfo, showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      const result: BingoCard = await API.get(
        'api', 
        `/bingo/${sessionInfo.currentGameId}`, 
        {
          headers: {
            Authorization: `Bearer ${sessionInfo.signedToken}`
          }
        }
      );
      
      console.log('Loaded bingo card with marked words:', result.markedWords);
      setBingoCard(result);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load bingo card:', error);
      setError('Failed to load your bingo card. Please try refreshing the page.');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  /**
   * Mark a word on the bingo card
   * @param word - The word to mark
   * @returns Promise that resolves to the mark response, or null if failed
   */
  const markWord = async (word: string): Promise<MarkWordResponse | null> => {
    if (!session || !bingoCard || markingWord || bingoCard.markedWords.includes(word)) {
      return null;
    }

    setMarkingWord(word);
    setError(null);

    try {
      const result: MarkWordResponse = await API.post(
        'api', 
        `/bingo/${session.currentGameId}/mark`, 
        {
          headers: {
            Authorization: `Bearer ${session.signedToken}`
          },
          body: { word }
        }
      );

      // Update the marked words locally for immediate feedback
      setBingoCard(prev => prev ? {
        ...prev,
        markedWords: [...prev.markedWords, word]
      } : null);

      return result;
    } catch (error: any) {
      console.error('Failed to mark word:', error);
      setError(error.response?.data?.message || 'Failed to mark word. Please try again.');
      return null;
    } finally {
      setMarkingWord(null);
    }
  };

  /**
   * Calculate progress percentage (0-100)
   * Based on 24 markable words (excluding center "SYNERGY (FREE)")
   */
  const calculateProgress = (): number => {
    if (!bingoCard) return 0;
    return Math.round((bingoCard.markedWords.length / 24) * 100);
  };

  /**
   * Calculate total points (10 points per marked word)
   */
  const calculatePoints = (): number => {
    if (!bingoCard) return 0;
    return bingoCard.markedWords.length * 10;
  };

  /**
   * Force refresh the bingo card
   */
  const refreshCard = () => {
    if (session) {
      loadBingoCard(session);
    }
  };

  return {
    bingoCard,
    loading,
    markingWord,
    error,
    markWord,
    calculateProgress,
    calculatePoints,
    refreshCard,
    clearError: () => setError(null)
  };
} 