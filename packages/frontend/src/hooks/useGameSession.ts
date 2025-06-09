import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from 'aws-amplify';
import { SessionInfo } from '../types/game';

/**
 * Clear all buzzword-bingo related localStorage items
 * This handles the system reset scenario comprehensively
 */
const clearAllLocalStorage = () => {
  console.log('🧹 Clearing all buzzword-bingo localStorage items');
  
  // Clear known localStorage keys
  localStorage.removeItem('buzzword-bingo-session');
  localStorage.removeItem('buzzword-bingo-public-token');
  localStorage.removeItem('buzzword-bingo-device-id');
  localStorage.removeItem('buzzword-bingo-system-tester-sessions');
  
  // Clear any other app-related localStorage items
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("buzzword-bingo")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

/**
 * Custom hook for managing game session state
 * 
 * Handles:
 * - Loading session from localStorage
 * - Session validation
 * - Navigation when session is invalid
 * - Real-time detection of new active games via WebSocket
 * - Session updates when game switches occur
 * 
 * This encapsulates all session management logic so components
 * don't need to handle localStorage directly.
 */
export function useGameSession() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameStatusMessage, _setGameStatusMessage] = useState<string | null>(null);
  const [winnerInfo, _setWinnerInfo] = useState<any>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadSession();
  }, [navigate]);

  // Validate session's game ID and auto-correct if needed
  useEffect(() => {
    if (session) {
      // Only validate once when session first loads, not on every change
      validateAndCorrectGameId();
    }
  }, [session?.sessionId]); // Only run when sessionId changes, not on every session update

  // Listen for WebSocket game management events instead of polling
  useEffect(() => {
    if (!session) return;

    // Disable WebSocket connection in useGameSession to prevent conflicts with useWebSocketLeaderboard
    // Game state changes are now handled by the main WebSocket connection in useWebSocketLeaderboard
    console.log('🔧 useGameSession: WebSocket disabled to prevent conflicts with useWebSocketLeaderboard');
    
    return () => {
      // No cleanup needed since no connections are made
    };
  }, [session]);

  /**
   * Load and validate session from localStorage
   * Redirects to join page if session is invalid
   */
  const loadSession = () => {
    try {
      const sessionData = localStorage.getItem('buzzword-bingo-session');
      
      if (!sessionData) {
        navigate('/');
        return;
      }

      const parsedSession: SessionInfo = JSON.parse(sessionData);
      
      // Validate session structure
      if (isValidSession(parsedSession)) {
        setSession(parsedSession);
      } else {
        console.warn('Invalid session structure, clearing session');
        clearSession();
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to parse session data:', error);
      clearSession();
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validate that a session object has all required fields
   */
  const isValidSession = (session: any): session is SessionInfo => {
    return session && 
           typeof session.sessionId === 'string' &&
           typeof session.signedToken === 'string' &&
           typeof session.nickname === 'string' &&
           typeof session.currentGameId === 'string' &&
           typeof session.joinedAt === 'string';
  };

  /**
   * Clear the current session from localStorage
   */
  const clearSession = () => {
    clearAllLocalStorage();
    setSession(null);
  };

  /**
   * Update session data in both state and localStorage
   */
  const updateSession = (newSession: SessionInfo) => {
    setSession(newSession);
    localStorage.setItem('buzzword-bingo-session', JSON.stringify(newSession));
  };

  /**
   * Validate that the current session's game still exists
   * If not, assume system was purged and automatically reset
   */
  const validateAndCorrectGameId = async () => {
    if (!session) return;

    try {
      // Try to fetch the bingo card for the current game
      // This will fail if the game doesn't exist (post-purge scenario)
      const result: any = await API.get(
        'api', 
        `/bingo/${session.currentGameId}`, 
        {
          headers: {
            Authorization: `Bearer ${session.signedToken}`
          }
        }
      );
      
      // Check for clear cache instruction
      if (result.action === 'clear_cache') {
        console.log('🚨 CLEAR CACHE INSTRUCTION from session validation:', result.reason);
        console.log('🧹 Auto-clearing localStorage and redirecting');
        clearAllLocalStorage();
        setSession(null);
        navigate('/');
        return;
      }
      
      // Game exists, all good
      console.log('✅ Session game validation passed');
    } catch (error: any) {
      // Check if this is a "game not found" error (likely post-purge)
      if (error.response?.status === 404) {
        console.log('🚨 Session references non-existent game - system was likely purged');
        console.log('🧹 Automatically clearing localStorage and redirecting to join page');
        
        // Clear everything and redirect - this handles the post-purge scenario
        clearAllLocalStorage();
        setSession(null);
        navigate('/');
        return;
      }
      
      // For auth errors (401/403), also clear session as it's likely invalid
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🚨 Session authentication failed - clearing session');
        clearSession();
        navigate('/');
        return;
      }
      
      // For other errors, log but don't automatically clear
      console.warn('Session validation failed, but keeping session:', error.response?.status);
    }
  };

  return {
    session,
    loading,
    gameStatusMessage,
    winnerInfo,
    clearSession,
    updateSession,
    refreshSession: loadSession
  };
}

// Export utility function for use in other components
export { clearAllLocalStorage }; 