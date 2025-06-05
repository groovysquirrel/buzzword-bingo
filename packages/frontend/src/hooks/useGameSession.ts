import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from 'aws-amplify';
import { SessionInfo } from '../types/game';
import { WebSocketService } from '../lib/websocket';

interface GameStatusResponse {
  currentGameId: string;
  activeGameId: string;
  gameIsActive: boolean;
  needsGameSwitch: boolean;
  sessionId: string;
  nickname: string;
  message: string;
  timestamp: string;
}

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
  const [gameStatusMessage, setGameStatusMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSession();
  }, [navigate]);

  // Listen for WebSocket game management events instead of polling
  useEffect(() => {
    if (!session) return;

    let wsService: WebSocketService | null = null;

    const setupWebSocketListener = async () => {
      try {
        const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;
        if (!wsUrl) {
          console.log('WebSocket URL not configured, skipping game status listener');
          return;
        }

        wsService = new WebSocketService({
          url: wsUrl,
          token: session.signedToken,
          maxReconnectAttempts: 3,
          reconnectDelay: 5000
        });

        wsService.on('message', (data: any) => {
          handleGameManagementEvent(data);
        });

        await wsService.connect();
        console.log('WebSocket connected for game status monitoring');
      } catch (error) {
        console.error('Failed to connect WebSocket for game status:', error);
        // Fallback to polling if WebSocket fails
        setupPollingFallback();
      }
    };

    const handleGameManagementEvent = (data: any) => {
      if (data.type === 'activity_event' && data.event) {
        const { type: eventType, data: eventData } = data.event;
        
        if (eventType === 'new_game' && eventData.newGameId) {
          console.log('New game detected via WebSocket:', eventData.newGameId);
          setGameStatusMessage(`New game started! Switching to game ${eventData.newGameId}`);
          
          // Update session to new game
          const updatedSession: SessionInfo = {
            ...session,
            currentGameId: eventData.newGameId
          };
          updateSession(updatedSession);
          
          // Clear message after 5 seconds
          setTimeout(() => setGameStatusMessage(null), 5000);
        } else if (eventType === 'game_reset' && eventData.gameId === session.currentGameId) {
          console.log('Game reset detected via WebSocket');
          setGameStatusMessage('Game has been reset! Your progress has been cleared.');
          
          // Clear message after 5 seconds
          setTimeout(() => setGameStatusMessage(null), 5000);
        }
      }
    };

    const setupPollingFallback = () => {
      console.log('Setting up polling fallback for game status');
      
      const checkGameStatus = async () => {
        try {
          const result: GameStatusResponse = await API.get("api", `/game/${session.currentGameId}/status`, {
            headers: {
              Authorization: `Bearer ${session.signedToken}`
            }
          });

          if (result.needsGameSwitch) {
            console.log("Game switch needed:", result.message);
            setGameStatusMessage(result.message);
            
            // Auto-update session to new active game
            const updatedSession: SessionInfo = {
              ...session,
              currentGameId: result.activeGameId
            };
            
            updateSession(updatedSession);
            
            // Clear message after a few seconds
            setTimeout(() => setGameStatusMessage(null), 5000);
          } else {
            setGameStatusMessage(null);
          }
        } catch (error) {
          console.error("Failed to check game status:", error);
          // Don't show error to user, just log it
        }
      };

      // Check immediately, then every 60 seconds (increased interval since it's fallback)
      checkGameStatus();
      const interval = setInterval(checkGameStatus, 60000);

      return () => clearInterval(interval);
    };

    setupWebSocketListener();

    return () => {
      if (wsService) {
        wsService.disconnect();
      }
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

  return {
    session,
    loading,
    gameStatusMessage,
    clearSession,
    updateSession,
    refreshSession: loadSession
  };
} 