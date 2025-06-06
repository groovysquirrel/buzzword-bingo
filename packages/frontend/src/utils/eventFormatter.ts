import { GameEvent } from '../types/game';

/**
 * Centralized Event Management System
 * 
 * This module provides a unified approach to handling all WebSocket events and game activities.
 * It separates concerns between:
 * 
 * 1. EVENT TYPES: Centralized constants for all event types
 * 2. EVENT INTERFACES: Type-safe interfaces for different event categories
 * 3. SESSION ACTIONS: What should happen when events are received  
 * 4. EVENT FORMATTING: How events should be displayed to users
 * 
 * Benefits:
 * - Single source of truth for event handling logic
 * - Type safety across all event processing
 * - Consistent formatting and messaging
 * - Easy to extend with new event types
 * - Clear separation between events vs actions vs display
 * 
 * Usage:
 * - WebSocket handlers use getSessionAction() for business logic
 * - Display components use formatEventMessage() for user-facing text
 * - All components import EVENT_TYPES for consistency
 */

// Centralized WebSocket Event Types
export interface ActivityEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

export interface GameStateEvent {
  type: 'game_state_changed';
  gameId: string;
  previousState: string;
  newState: string;
  timestamp: string;
  reason?: string;
  winnerInfo?: {
    sessionId: string;
    nickname: string;
    bingoType: string;
    points: number;
    secretWord: string;
  };
}

export interface WrappedActivityEvent {
  type: 'activity_event';
  gameId: string;
  timestamp: string;
  event: ActivityEvent;
}

// Union type for all possible WebSocket events
export type WebSocketEvent = GameStateEvent | WrappedActivityEvent;

// Union type for events that can be displayed
type UnifiedEvent = GameEvent | ActivityEvent;

/**
 * Centralized Event Type Definitions
 */
export const EVENT_TYPES = {
  // Player Events
  PLAYER_JOINED: 'player_joined',
  WORD_MARKED: 'word_marked',
  BINGO_CALLED: 'bingo_called',
  BINGO_COMPLETED: 'bingo_completed',
  
  // Game Management Events  
  NEW_GAME: 'new_game',
  GAME_RESET: 'game_reset',
  GAME_STARTED: 'game_started',
  GAME_ENDED: 'game_ended',
  
  // Game State Changes
  GAME_STATE_CHANGED: 'game_state_changed'
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

/**
 * Session Management Actions - what should happen when an event is received
 */
export interface SessionAction {
  type: 'SWITCH_GAME' | 'SHOW_MESSAGE' | 'RESET_PROGRESS' | 'NONE';
  gameId?: string;
  message?: string;
  winnerInfo?: {
    sessionId: string;
    nickname: string;
    bingoType: string;
    points: number;
    secretWord: string;
  };
}

/**
 * Centralized Event Handler - determines what action to take for each event
 */
export const getSessionAction = (
  event: WebSocketEvent, 
  currentGameId: string
): SessionAction => {
  // Handle direct game state changes (like Start All)
  if (event.type === 'game_state_changed') {
    const { gameId, newState, winnerInfo } = event;
    
    // Handle game ending with winner information
    if (newState === 'ended' && winnerInfo) {
      return {
        type: 'SHOW_MESSAGE',
        message: `${winnerInfo.nickname} won BINGO with ${winnerInfo.points} points!`,
        gameId: gameId,
        winnerInfo: winnerInfo
      };
    }
    
    // Handle regular game switches (different game ID)
    if (newState === 'started' && gameId !== currentGameId) {
      return {
        type: 'SWITCH_GAME',
        gameId,
        message: `Game started! Switching to game ${gameId}`
      };
    }
    
    return { type: 'NONE' };
  }
  
  // Handle wrapped activity events
  if (event.type === 'activity_event') {
    const { type: eventType, data } = event.event;
    
    switch (eventType) {
      case EVENT_TYPES.NEW_GAME:
        if (data.newGameId) {
          return {
            type: 'SWITCH_GAME',
            gameId: data.newGameId,
            message: `New game started! Switching to game ${data.newGameId}`
          };
        }
        break;
        
      case EVENT_TYPES.GAME_RESET:
        if (data.gameId === currentGameId) {
          return {
            type: 'SHOW_MESSAGE',
            message: 'Game has been reset! Your progress has been cleared.'
          };
        }
        break;
    }
  }
  
  return { type: 'NONE' };
};

/**
 * Corporate Event Formatting Utilities
 * 
 * Centralized formatting for assessment platform events and activities.
 * Provides consistent corporate messaging across all dashboard components.
 */

/**
 * Normalize event to standardized corporate format
 */
export const normalizeEvent = (event: UnifiedEvent): ActivityEvent => {
  if ('eventId' in event) {
    // GameEvent format
    return {
      id: event.eventId,
      type: event.eventType,
      data: event.eventData || {},
      timestamp: event.timestamp
    };
  } else {
    // Already ActivityEvent format
    return event as ActivityEvent;
  }
};

/**
 * Format activity event into professional corporate messaging
 */
export const formatEventMessage = (event: UnifiedEvent): string => {
  const normalized = normalizeEvent(event);
  
  switch (normalized.type) {
    case EVENT_TYPES.PLAYER_JOINED:
      return `${normalized.data.nickname} joined Buzzword Bingo!`;
    case EVENT_TYPES.WORD_MARKED:
      return `${normalized.data.nickname} heard a buzzword: "${normalized.data.word}"`;
    case EVENT_TYPES.BINGO_CALLED:
      return `${normalized.data.nickname} called BINGO! (${normalized.data.bingoType}) - Awaiting verification`;
    case EVENT_TYPES.BINGO_COMPLETED:
      return `${normalized.data.nickname} achieved assessment completion milestone! BINGO!`;
    case EVENT_TYPES.GAME_RESET:
      return `Assessment session ${normalized.data.gameId} reset (${normalized.data.progressRecordsCleared} participant records archived)`;
    case EVENT_TYPES.NEW_GAME:
      return `New assessment started: ${normalized.data.newGameId}`;
    case EVENT_TYPES.GAME_STARTED:
      return `Assessment session commenced: ${normalized.data.gameId}`;
    case EVENT_TYPES.GAME_ENDED:
      return `Assessment session concluded - Top performer: ${normalized.data.winner || "Performance analysis pending"}`;
    default:
      return `System event: ${normalized.type} - ${JSON.stringify(normalized.data)}`;
  }
};

/**
 * Get corporate-appropriate icon for event classification
 */
export const getEventIcon = (type: string): string => {
  switch (type) {
    case EVENT_TYPES.PLAYER_JOINED: return "👤";
    case EVENT_TYPES.WORD_MARKED: return "📝";
    case EVENT_TYPES.BINGO_CALLED: return "🎯";
    case EVENT_TYPES.BINGO_COMPLETED: return "🏆";
    case EVENT_TYPES.GAME_RESET: return "🔄";
    case EVENT_TYPES.NEW_GAME: return "📈";
    default: return "📋";
  }
};

/**
 * Get professional color coding for event types
 */
export const getEventColor = (type: string): string => {
  switch (type) {
    case EVENT_TYPES.GAME_RESET:
    case EVENT_TYPES.NEW_GAME: 
      return "#DC2626";
    case EVENT_TYPES.BINGO_CALLED:
      return "#F59E0B";
    case EVENT_TYPES.BINGO_COMPLETED:
      return "#059669";
    case EVENT_TYPES.WORD_MARKED:
      return "#3b82f6";
    default:
      return "#1e293b";
  }
};

/**
 * Format timestamp for executive dashboard display
 */
export const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString();
}; 