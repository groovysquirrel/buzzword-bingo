import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionInfo } from '../types/game';

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
      validateAndCorrectGameId();
    }
  }, [session]);

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
    localStorage.removeItem('buzzword-bingo-session');
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
   * Enhanced validation that checks if session is valid with backend
   */
  const validateAndCorrectGameId = async () => {
    // Removed - game state is now managed by WebSocket and GameController
    // No need to poll current-game endpoint
    console.log('Game ID validation removed - using WebSocket and GameController');
    return;
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