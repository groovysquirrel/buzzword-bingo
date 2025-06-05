import { useState, useEffect, useRef } from 'react';
import { SessionInfo, LeaderboardResponse, GameEvent } from '../types/game';

interface UseWebSocketLeaderboardResult {
  leaderboard: LeaderboardResponse | null;
  events: GameEvent[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdate: string | null;
  clearError: () => void;
}

/**
 * WebSocket-based Leaderboard Hook
 * 
 * Provides real-time leaderboard updates via WebSocket instead of SSE polling
 * More efficient for serverless functions - persistent connection vs repeated invocations
 */
export function useWebSocketLeaderboard(input: SessionInfo | string | null): UseWebSocketLeaderboardResult {
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Extract gameId and token from input
  const gameId = typeof input === 'string' ? input : input?.currentGameId;
  const token = typeof input === 'string' ? null : input?.signedToken;

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [gameId, token]);

  /**
   * Connect to WebSocket
   */
  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const wsUrl = process.env.NODE_ENV === 'development' 
        ? 'wss://ws-dev.buzzwordbingo.live'
        : 'wss://ws.buzzwordbingo.live';
      
      // Add token as query parameter for authentication
      const url = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;
      
      console.log('Connecting to WebSocket:', url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        
        // Subscribe to game updates
        if (gameId) {
          ws.send(JSON.stringify({
            action: 'subscribe',
            gameId: gameId
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to connect to real-time updates');
      setLoading(false);
    }
  };

  /**
   * Disconnect from WebSocket
   */
  const disconnectWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
    
    setIsConnected(false);
  };

  /**
   * Schedule reconnection attempt
   */
  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff, max 30s
    console.log(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttempts.current++;
      connectWebSocket();
    }, delay);
  };

  /**
   * Handle incoming WebSocket messages
   */
  const handleWebSocketMessage = (data: any) => {
    console.log('WebSocket message:', data);
    setLastUpdate(new Date().toISOString());

    switch (data.type) {
      case 'leaderboard_update':
        if (data.leaderboard) {
          setLeaderboard({
            gameId: data.gameId,
            timestamp: data.timestamp,
            totalPlayers: data.leaderboard.length,
            leaderboard: data.leaderboard
          });
        }
        setLoading(false);
        break;

      case 'activity_event':
        if (data.event) {
          setEvents(prev => [data.event, ...prev.slice(0, 49)]); // Keep last 50 events
        }
        break;

      case 'subscribed':
        console.log('Successfully subscribed to game updates');
        setLoading(false);
        break;

      case 'error':
        console.error('WebSocket error message:', data.message);
        setError(data.message);
        setLoading(false);
        break;

      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  return {
    leaderboard,
    events,
    loading,
    error,
    isConnected,
    lastUpdate,
    clearError
  };
} 