import { useState, useEffect, useRef } from 'react';
import { SessionInfo, LeaderboardResponse, GameEvent } from '../types/game';
import { API } from 'aws-amplify';

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
 * Public token storage for status boards
 */
const PUBLIC_TOKEN_KEY = 'buzzword-bingo-public-token';
const DEVICE_ID_KEY = 'buzzword-bingo-device-id';

/**
 * Generate or retrieve public access token for status boards
 */
async function getPublicToken(): Promise<string | null> {
  try {
    // Check if we already have a valid token
    const existingToken = localStorage.getItem(PUBLIC_TOKEN_KEY);
    const existingDeviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (existingToken && existingDeviceId) {
      console.log('Using existing public token for device:', existingDeviceId);
      return existingToken;
    }

    // Generate new public token
    console.log('Generating new public token...');
    const response = await API.post('api', '/public/token', {
      body: {
        deviceId: existingDeviceId || undefined
      }
    });

    if (response.success) {
      // Store the token and device ID in localStorage
      localStorage.setItem(PUBLIC_TOKEN_KEY, response.publicToken);
      localStorage.setItem(DEVICE_ID_KEY, response.deviceId);
      
      console.log('Generated public token for device:', response.deviceId);
      return response.publicToken;
    } else {
      console.error('Failed to generate public token:', response.error);
      return null;
    }
  } catch (error) {
    console.error('Error getting public token:', error);
    return null;
  }
}

/**
 * WebSocket-based Leaderboard Hook
 * 
 * Provides real-time leaderboard updates via WebSocket instead of SSE polling
 * More efficient for serverless functions - persistent connection vs repeated invocations
 * 
 * Supports both authenticated user sessions and public status board access
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
  const userToken = typeof input === 'string' ? null : input?.signedToken;

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [gameId, userToken]);

  /**
   * Connect to WebSocket
   */
  const connectWebSocket = async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const wsUrl = process.env.NODE_ENV === 'development' 
        ? 'wss://ws-dev.buzzwordbingo.live'
        : 'wss://ws.buzzwordbingo.live';
      
      // Determine which token to use
      let token: string | null = null;
      let connectionType = '';

      if (userToken) {
        // User session - use provided token
        token = userToken;
        connectionType = 'user';
        console.log('Connecting to WebSocket with user token for:', typeof input === 'object' ? input?.nickname : 'user');
      } else {
        // Public access - get or generate public token
        token = await getPublicToken();
        connectionType = 'public';
        console.log('Connecting to WebSocket with public token for status board');
      }

      if (!token) {
        setError('Failed to obtain access token');
        setLoading(false);
        return;
      }
      
      const url = `${wsUrl}?token=${encodeURIComponent(token)}`;
      console.log(`WebSocket URL (${connectionType}):`, wsUrl); // Don't log the full URL with token for security
      
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`WebSocket connected successfully (${connectionType})`);
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        
        // Subscribe to game updates
        if (gameId) {
          console.log('Subscribing to game updates for:', gameId);
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
        console.log('WebSocket disconnected:', { 
          code: event.code, 
          reason: event.reason,
          wasClean: event.wasClean 
        });
        setIsConnected(false);
        wsRef.current = null;
        
        // Handle different close codes
        if (event.code === 1006) {
          setError('WebSocket connection failed - possibly authorization issue');
        } else if (event.code === 1002) {
          setError('WebSocket protocol error');
        } else if (event.code === 1003) {
          setError('WebSocket connection rejected');
        } else if (event.code === 1011) {
          setError('WebSocket server error');
        }
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error - check network connectivity');
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