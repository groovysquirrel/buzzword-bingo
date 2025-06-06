import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


import { SessionInfo } from '../types/game';
import { WebSocketService } from '../lib/websocket';
import { 
  getSessionAction, 
  WebSocketEvent
} from '../utils/eventFormatter';



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
  const [winnerInfo, setWinnerInfo] = useState<any>(null);
  
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

    let wsService: WebSocketService | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;

    const setupWebSocketListener = async () => {
      try {
        // Try different environment variable patterns for different build systems
        const wsUrl = import.meta.env?.VITE_WEBSOCKET_URL 
                     
        if (!wsUrl) {
          console.log('WebSocket URL not configured, using polling fallback');
          pollingInterval = setupPollingFallback();
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
        pollingInterval = setupPollingFallback();
      }
    };

    const handleGameManagementEvent = (data: WebSocketEvent) => {
      // Use centralized event handler to determine action
      const action = getSessionAction(data, session.currentGameId);
      
      switch (action.type) {
        case 'SWITCH_GAME':
          if (action.gameId && action.message) {
            console.log('Switching to game:', action.gameId);
            setGameStatusMessage(action.message);
            
            // Update session to specific game
            const updatedSession: SessionInfo = {
              ...session,
              currentGameId: action.gameId
            };
            updateSession(updatedSession);
            
            // Clear message after 5 seconds
            setTimeout(() => setGameStatusMessage(null), 5000);
          }
          break;
          
        case 'SHOW_MESSAGE':
          if (action.message) {
            console.log('Showing message:', action.message);
            setGameStatusMessage(action.message);
            
            // Store winner info if provided
            if (action.winnerInfo) {
              setWinnerInfo(action.winnerInfo);
            }
            
            // Clear message after 5 seconds
            setTimeout(() => setGameStatusMessage(null), 5000);
          }
          break;
          
        case 'RESET_PROGRESS':
          // Handle progress reset if needed in the future
          console.log('Progress reset requested');
          break;
          
        case 'NONE':
        default:
          // No action needed for this event
          break;
      }
    };

    const setupPollingFallback = (): NodeJS.Timeout => {
      console.log('Polling fallback removed - using WebSocket-only with centralized event handling');
      // Return dummy timeout to maintain interface compatibility
      return setTimeout(() => {}, 0);
    };

    setupWebSocketListener();

    return () => {
      // Clean up WebSocket
      if (wsService) {
        wsService.disconnect();
      }
      
      // Clean up polling interval
      if (pollingInterval) {
        clearInterval(pollingInterval);
        console.log('Cleared polling interval');
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