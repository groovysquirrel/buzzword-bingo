import { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import { SessionInfo, LeaderboardResponse, LeaderboardEntry } from '../types/game';

interface ActivityEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

/**
 * Unified leaderboard hook that works for both authenticated and public access
 * 
 * This hook can accept either:
 * - A session object (for authenticated users on /leaderboard)
 * - A gameId string (for public status screens on /status)
 * 
 * Both will call the exact same API endpoint and return identical data.
 */
export function useLeaderboard(input: SessionInfo | string | null) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // Determine the gameId from input (session or direct gameId)
  const gameId = typeof input === 'string' ? input : input?.currentGameId;
  const session = typeof input === 'object' ? input : null;

  // Load leaderboard when gameId is available
  useEffect(() => {
    if (gameId) {
      loadLeaderboard(gameId);
    }
  }, [gameId]);

  // Set up real-time updates
  useEffect(() => {
    if (!gameId) return;
    
    const interval = setInterval(() => {
      loadLeaderboard(gameId, false);
    }, 3000); // 3 second intervals
    
    return () => clearInterval(interval);
  }, [gameId]);

  /**
   * Load leaderboard data and events from the SSE stream API
   * @param currentGameId - Game ID to load leaderboard for
   * @param showLoading - Whether to show loading state (default: true)
   */
  const loadLeaderboard = async (currentGameId: string, showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      // Use the public SSE stream endpoint - works for both authenticated and public access
      const result = await API.get(
        'api', 
        `/leaderboard/${currentGameId}/stream`, 
        {}
      );
      
      // Transform SSE response to LeaderboardResponse format
      if (result.type === "leaderboard_update") {
        const leaderboardResponse: LeaderboardResponse = {
          gameId: result.gameId,
          timestamp: result.timestamp,
          totalPlayers: result.leaderboard?.length || 0,
          leaderboard: result.leaderboard || []
        };
        
        setLeaderboard(leaderboardResponse);
        
        // Update events as well
        if (result.events) {
          setEvents(prev => {
            const existingIds = new Set(prev.map(e => e.id));
            const newEvents = result.events.filter((e: ActivityEvent) => !existingIds.has(e.id));
            const combined = [...newEvents, ...prev].slice(0, 20);
            return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          });
        }
        
        setLastUpdate(result.timestamp);
        setIsConnected(true);
        setError(null);
      } else if (result.type === "error") {
        console.warn('API returned error:', result.error);
        setError(`API Error: ${result.error}`);
        setIsConnected(false);
      }
    } catch (error: any) {
      console.error('Failed to load leaderboard:', error);
      if (error?.response?.status === 404) {
        setError('Game not found. It may have been deleted.');
      } else {
        setError('Failed to load leaderboard. Please try again.');
      }
      setIsConnected(false);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  /**
   * Get the current player's rank (1-based) - only works if session is provided
   * @returns Player's rank or null if not found
   */
  const getCurrentPlayerRank = (): number | null => {
    if (!leaderboard || !session) return null;
    
    const userIndex = leaderboard.leaderboard.findIndex(
      entry => entry.sessionId === session.sessionId
    );
    
    return userIndex !== -1 ? userIndex + 1 : null;
  };

  /**
   * Get the current player's leaderboard entry - only works if session is provided
   * @returns Player's entry or null if not found
   */
  const getCurrentPlayerEntry = (): LeaderboardEntry | null => {
    if (!leaderboard || !session) return null;
    
    return leaderboard.leaderboard.find(
      entry => entry.sessionId === session.sessionId
    ) || null;
  };

  /**
   * Get the top N players from the leaderboard
   * @param count - Number of top players to return
   * @returns Array of top players
   */
  const getTopPlayers = (count: number): LeaderboardEntry[] => {
    if (!leaderboard) return [];
    
    return leaderboard.leaderboard.slice(0, count);
  };

  /**
   * Force refresh the leaderboard
   */
  const refreshLeaderboard = () => {
    if (gameId) {
      loadLeaderboard(gameId);
    }
  };

  return {
    leaderboard,
    events,
    loading,
    error,
    isConnected,
    lastUpdate,
    getCurrentPlayerRank,
    getCurrentPlayerEntry,
    getTopPlayers,
    refreshLeaderboard,
    clearError: () => setError(null)
  };
} 