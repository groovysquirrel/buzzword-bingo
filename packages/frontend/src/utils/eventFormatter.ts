import { GameEvent } from '../types/game';

interface ActivityEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

// Union type for events
type UnifiedEvent = GameEvent | ActivityEvent;

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
    case "player_joined":
      return `${normalized.data.nickname} connected to assessment platform`;
    case "word_marked":
      return `${normalized.data.nickname} identified corporate term: "${normalized.data.word}"`;
    case "bingo_completed":
      return `${normalized.data.nickname} achieved assessment completion milestone!`;
    case "game_reset":
      return `Assessment session ${normalized.data.gameId} reset (${normalized.data.progressRecordsCleared} participant records archived)`;
    case "new_game":
      return `New assessment session initiated: ${normalized.data.newGameId} (superseding ${normalized.data.previousGameId})`;
    case "game_started":
      return `Assessment session commenced: ${normalized.data.gameId}`;
    case "game_ended":
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
    case "player_joined": return "👤";
    case "word_marked": return "📊";
    case "bingo_completed": return "🎯";
    case "game_reset": return "🔄";
    case "new_game": return "📈";
    default: return "📋";
  }
};

/**
 * Get professional color coding for event types
 */
export const getEventColor = (type: string): string => {
  switch (type) {
    case "game_reset":
    case "new_game": 
      return "#DC2626";
    case "bingo_completed":
      return "#059669";
    case "word_marked":
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