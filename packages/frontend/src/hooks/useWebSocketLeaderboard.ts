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
  gameStatus: string | null;
  winnerInfo: any | null;
}

/**
 * Public token storage for status boards
 */
const PUBLIC_TOKEN_KEY = 'buzzword-bingo-public-token';
const DEVICE_ID_KEY = 'buzzword-bingo-device-id';

/**
 * WebSocket Connection Pool
 * Prevents duplicate connections for the same gameId/token combination
 */
interface PooledConnection {
  ws: WebSocket;
  gameId: string;
  connectionKey: string;
  subscribers: Set<string>;
  reconnectAttempts: number;
}

const connectionPool = new Map<string, PooledConnection>();
const subscriberCallbacks = new Map<string, (data: any) => void>();

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
 * Get or create a pooled WebSocket connection
 */
async function getPooledConnection(gameId: string, token: string, connectionType: string): Promise<PooledConnection | null> {
  const connectionKey = `${gameId}-${token.substring(0, 8)}`;
  
  // Return existing connection if available
  if (connectionPool.has(connectionKey)) {
    const connection = connectionPool.get(connectionKey)!;
    if (connection.ws.readyState === WebSocket.OPEN) {
      console.log(`♻️ Reusing existing WebSocket connection for ${gameId} (${connectionType})`);
      return connection;
    } else {
      // Clean up dead connection
      connectionPool.delete(connectionKey);
    }
  }

  // Create new connection
  console.log(`🔌 Creating new pooled WebSocket connection for ${gameId} (${connectionType})`);
  
  const wsUrl = process.env.NODE_ENV === 'development' 
    ? 'wss://ws-dev.buzzwordbingo.live'
    : 'wss://ws.buzzwordbingo.live';
  
  const url = `${wsUrl}?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);
  
  const connection: PooledConnection = {
    ws,
    gameId,
    connectionKey,
    subscribers: new Set(),
    reconnectAttempts: 0
  };

  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      console.log(`✅ Pooled WebSocket connected for ${gameId} (${connectionType})`);
      
      // Subscribe to game updates
      ws.send(JSON.stringify({
        action: 'subscribe',
        gameId: gameId
      }));
      
      // Store in pool
      connectionPool.set(connectionKey, connection);
      resolve(connection);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Broadcast to all subscribers of this connection
        connection.subscribers.forEach(subscriberId => {
          const callback = subscriberCallbacks.get(subscriberId);
          if (callback) {
            callback(data);
          }
        });
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log(`❌ Pooled WebSocket disconnected for ${gameId}:`, { 
        code: event.code, 
        reason: event.reason 
      });
      
      // Remove from pool
      connectionPool.delete(connectionKey);
      
      // Notify all subscribers of disconnection
      connection.subscribers.forEach(subscriberId => {
        const callback = subscriberCallbacks.get(subscriberId);
        if (callback) {
          callback({ type: 'connection_lost' });
        }
      });
    };

    ws.onerror = (error) => {
      console.error(`❌ Pooled WebSocket error for ${gameId}:`, error);
      reject(error);
    };
  });
}

/**
 * WebSocket-based Leaderboard Hook with Connection Pooling
 * 
 * Now uses a connection pool to prevent duplicate WebSocket connections
 * for the same game/token combination, dramatically reducing connection count.
 */
export function useWebSocketLeaderboard(input: SessionInfo | string | null): UseWebSocketLeaderboardResult {
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<string | null>(null);
  const [winnerInfo, setWinnerInfo] = useState<any | null>(null);
  
  const subscriberIdRef = useRef<string>(Math.random().toString(36).substr(2, 9));
  const connectionRef = useRef<PooledConnection | null>(null);

  // Extract gameId and token from input
  const gameId = typeof input === 'string' ? input : input?.currentGameId;
  const userToken = typeof input === 'string' ? null : input?.signedToken;

  useEffect(() => {
    if (!gameId) {
      console.log('🔍 useWebSocketLeaderboard: No gameId provided, stopping');
      setLoading(false);
      return;
    }

    console.log(`🎮 useWebSocketLeaderboard: Starting for gameId: ${gameId} (subscriber: ${subscriberIdRef.current})`);
    connectToPooledWebSocket();

    return () => {
      disconnectFromPool();
    };
  }, [gameId, userToken]);

  /**
   * Connect to pooled WebSocket
   */
  const connectToPooledWebSocket = async () => {
    try {
      // Determine which token to use
      let token: string | null = null;
      let connectionType = '';

      if (userToken) {
        token = userToken;
        connectionType = 'user';
        console.log('🔐 Connecting with user token for:', typeof input === 'object' ? input?.nickname : 'user');
      } else {
        token = await getPublicToken();
        connectionType = 'public';
        console.log('🌐 Connecting with public token for status board');
      }

      if (!token) {
        setError('Failed to obtain access token');
        setLoading(false);
        return;
      }

      // Get pooled connection
      const connection = await getPooledConnection(gameId!, token, connectionType);
      if (!connection) {
        setError('Failed to establish WebSocket connection');
        setLoading(false);
        return;
      }

      connectionRef.current = connection;
      
      // Add this subscriber to the connection
      connection.subscribers.add(subscriberIdRef.current);
      
      // Set up message callback for this subscriber
      subscriberCallbacks.set(subscriberIdRef.current, handleWebSocketMessage);
      
      setIsConnected(true);
      setError(null);
      
      console.log(`🔗 Subscribed to pooled connection for ${gameId} (total subscribers: ${connection.subscribers.size})`);

    } catch (error) {
      console.error('Failed to connect to pooled WebSocket:', error);
      setError('Failed to connect to real-time updates');
      setLoading(false);
    }
  };

  /**
   * Disconnect from pooled WebSocket
   */
  const disconnectFromPool = () => {
    if (connectionRef.current) {
      // Remove this subscriber from the connection
      connectionRef.current.subscribers.delete(subscriberIdRef.current);
      
      console.log(`🔗 Unsubscribed from pooled connection for ${gameId} (remaining subscribers: ${connectionRef.current.subscribers.size})`);
      
      // If no more subscribers, close the connection
      if (connectionRef.current.subscribers.size === 0) {
        console.log(`🔌 Closing unused pooled connection for ${gameId}`);
        connectionRef.current.ws.close(1000, 'No more subscribers');
        connectionPool.delete(connectionRef.current.connectionKey);
      }
      
      connectionRef.current = null;
    }
    
    // Clean up callback
    subscriberCallbacks.delete(subscriberIdRef.current);
    setIsConnected(false);
  };

  /**
   * Handle incoming WebSocket messages
   */
  const handleWebSocketMessage = (data: any) => {
    if (data.type === 'connection_lost') {
      setIsConnected(false);
      return;
    }

    console.log(`📨 WebSocket message received (${subscriberIdRef.current}):`, data);
    setLastUpdate(new Date().toISOString());

    switch (data.type) {
      case 'leaderboard_update':
        console.log(`📊 Leaderboard update for game ${data.gameId}:`, {
          totalPlayers: data.leaderboard?.length || 0,
          players: data.leaderboard?.map((p: any) => ({ nickname: p.nickname, sessionId: p.sessionId, points: p.points })) || []
        });
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
        console.log(`🎭 Activity event:`, data.event);
        if (data.event) {
          setEvents(prev => [data.event, ...prev.slice(0, 49)]); // Keep last 50 events
        }
        break;

      case 'game_state_changed':
        console.log(`🎮 Game state changed from ${data.previousState} to ${data.newState}`);
        setGameStatus(data.newState);
        setWinnerInfo(data.winnerInfo);
        break;

      case 'subscribed':
        console.log(`✅ Successfully subscribed to game updates for: ${gameId}`);
        setLoading(false);
        break;

      case 'error':
        console.error('❌ WebSocket error message:', data.message);
        setError(data.message);
        setLoading(false);
        break;

      default:
        console.log('❓ Unknown WebSocket message type:', data.type);
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
    clearError,
    gameStatus,
    winnerInfo
  };
} 