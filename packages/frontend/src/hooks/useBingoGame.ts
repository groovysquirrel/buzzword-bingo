import { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import { SessionInfo, BingoCard, MarkWordResponse } from '../types/game';
import { clearAllLocalStorage } from './useGameSession';

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

  // Clear marking state when session changes (safety cleanup)
  useEffect(() => {
    setMarkingWord(null);
  }, [session?.currentGameId]);

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
      const result: any = await API.get(
        'api', 
        `/bingo/${sessionInfo.currentGameId}`, 
        {
          headers: {
            Authorization: `Bearer ${sessionInfo.signedToken}`
          }
        }
      );
      
      // Check for clear cache instruction
      if (result.action === 'clear_cache') {
        console.log('🚨 CLEAR CACHE INSTRUCTION RECEIVED:', result.reason);
        console.log('🧹 Auto-clearing localStorage due to non-existent game');
        clearAllLocalStorage();
        
        setError('CLEAR_CACHE|' + (result.message || 'Game no longer exists. Please rejoin.'));
        return;
      }
      
      console.log('Loaded bingo card with marked words:', result.markedWords);
      setBingoCard(result);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load bingo card:', error);
      
      // Handle game not found (potential system reset)
      if (error.response?.status === 404) {
        console.warn("Bingo card load failed with 404 - game not found, system may have been reset");
        
        // Auto-clear localStorage and trigger redirect since game doesn't exist
        console.log("🧹 Auto-clearing localStorage due to non-existent game");
        clearAllLocalStorage();
        
        setError('GAME_NOT_FOUND|The game no longer exists. The system may have been reset. Please rejoin the game.');
        return;
      }
      
      // PURGE FIX: Clear invalid sessions
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn("Bingo card load failed with auth error - session likely invalid due to purge");
        setError('SESSION_EXPIRED|Session expired. Please rejoin the game.');
        // Let parent component handle the redirect by not setting a generic error
        return;
      }
      
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
    if (!session || !bingoCard || markingWord) {
      return null;
    }

    // Don't allow marking already marked words
    if (bingoCard.markedWords.includes(word)) {
      console.log(`⚠️ Word "${word}" is already marked, ignoring click`);
      return null;
    }

    console.log(`🎯 Marking word "${word}" for session ${session.sessionId} in game ${session.currentGameId}`);

    setMarkingWord(word);
    setError(null);

    try {
      const result: any = await API.post(
        'api', 
        `/bingo/${session.currentGameId}/mark`, 
        {
          headers: {
            Authorization: `Bearer ${session.signedToken}`
          },
          body: { word }
        }
      );

      // Check for clear cache instruction
      if (result.action === 'clear_cache') {
        console.log('🚨 CLEAR CACHE INSTRUCTION from mark word:', result.reason);
        console.log('🧹 Auto-clearing localStorage due to non-existent game during mark');
        clearAllLocalStorage();
        
        setError('CLEAR_CACHE|' + (result.message || 'Game no longer exists. Please rejoin.'));
        return null;
      }

      console.log(`✅ Mark word API response:`, result);
      console.log(`📊 Game ID used: ${session.currentGameId}, Response game ID: ${result.gameId}`);

      // Update the marked words locally for immediate feedback
      setBingoCard(prev => prev ? {
        ...prev,
        markedWords: [...prev.markedWords, word]
      } : null);

      return result;
    } catch (error: any) {
      console.error('❌ Failed to mark word:', error);
      console.error('🔍 Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        gameId: session.currentGameId,
        sessionId: session.sessionId
      });
      
      // Handle game not found (potential system reset)
      if (error.response?.status === 404) {
        console.warn("Mark word failed with 404 - game not found, system may have been reset");
        
        // Auto-clear localStorage and trigger redirect since game doesn't exist
        console.log("🧹 Auto-clearing localStorage due to non-existent game (mark word)");
        clearAllLocalStorage();
        
        setError('GAME_NOT_FOUND|The game no longer exists. The system may have been reset. Please rejoin the game.');
        return null;
      }
      
      // PURGE FIX: Handle invalid sessions
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn("Mark word failed with auth error - session likely invalid due to purge");
        setError('SESSION_EXPIRED|Session expired. Please rejoin the game.');
        return null;
      }
      
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
   * Call BINGO when player achieves a winning pattern
   * @param bingoType - Type of BINGO pattern achieved
   * @param winningWords - Array of words that formed the winning pattern
   * @returns Promise that resolves to the BINGO response, or null if failed
   */
  const callBingo = async (bingoType: string, winningWords: string[]) => {
    if (!session || !bingoCard || markingWord) {
      return null;
    }

    console.log(`🎯 Calling BINGO! Type: ${bingoType}, Pattern: ${winningWords.join(', ')}`);

    setMarkingWord('BINGO'); // Use special marking state
    setError(null);

    try {
      const result: any = await API.post(
        'api', 
        `/bingo/${session.currentGameId}/call`, 
        {
          headers: {
            Authorization: `Bearer ${session.signedToken}`
          },
          body: { bingoType, winningWords }
        }
      );

      // Check for clear cache instruction
      if (result.action === 'clear_cache') {
        console.log('🚨 CLEAR CACHE INSTRUCTION from BINGO call:', result.reason);
        console.log('🧹 Auto-clearing localStorage due to non-existent game during BINGO');
        clearAllLocalStorage();
        
        setError('CLEAR_CACHE|' + (result.message || 'Game no longer exists. Please rejoin.'));
        return null;
      }

      console.log(`✅ BINGO call response:`, result);
      return result;
    } catch (error: any) {
      console.error('❌ Failed to call BINGO:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        setError('Session expired. Please rejoin the game.');
        return null;
      }
      
      setError(error.response?.data?.message || 'Failed to call BINGO. Please try again.');
      return null;
    } finally {
      setMarkingWord(null);
    }
  };

  return {
    bingoCard,
    loading,
    markingWord,
    error,
    markWord,
    callBingo,
    calculateProgress,
    calculatePoints,
    clearError: () => setError(null),
    clearMarkingWord: () => setMarkingWord(null) // Debug/recovery function
  };
} 