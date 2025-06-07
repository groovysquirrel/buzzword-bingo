import React from 'react';
import { ListGroup } from 'react-bootstrap';
import { GameEvent } from '../types/game';
import { 
  ActivityEvent,
  normalizeEvent, 
  formatEventMessage, 
  getEventIcon, 
  getEventColor, 
  formatTime 
} from '../utils/eventFormatter';
import './LiveActivityFeed.css';

type UnifiedEvent = GameEvent | ActivityEvent;

interface LiveActivityFeedProps {
  events: UnifiedEvent[];
  className?: string;
}

/**
 * Live Activity Feed Component
 * 
 * Professional real-time activity monitoring for corporate dashboards.
 */
export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  events,
  className = "activity-feed"
}) => {
  // Deduplicate events based on ID and timestamp, limit to 100 items
  const deduplicatedEvents = React.useMemo(() => {
    const seen = new Set<string>();
    const filtered = events.filter((event) => {
      const normalized = normalizeEvent(event);
      const key = `${normalized.id}-${normalized.timestamp}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    
    // Limit to 100 most recent items
    return filtered.slice(0, 100);
  }, [events]);

  return (
    <div className={className}>
      {/* Status Indicator */}
      <div className="activity-status-bar">
        <span className="activity-status-text">
          Monitoring activity...
          <span className="activity-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </span>
        <span className="activity-count">
          {deduplicatedEvents.length} events
        </span>
      </div>

      {/* Activity Feed Content */}
      <div className="activity-feed-content">
        {deduplicatedEvents.length === 0 ? (
          <div className="activity-empty-state">
            <div className="activity-empty-state__content">
              <span className="activity-empty-state__icon">📊</span>
              <span className="activity-empty-state__text">
                Real-time events will appear here
              </span>
            </div>
          </div>
        ) : (
          <ListGroup variant="flush" className="activity-list">
            {deduplicatedEvents.map((event, index) => {
              const normalized = normalizeEvent(event);
              return (
                <ListGroup.Item 
                  key={`${normalized.id}-${normalized.timestamp}`}
                  className={`activity-item ${index % 2 === 0 ? 'activity-item--even' : ''}`}
                >
                  <div className="d-flex align-items-start gap-3">
                    <div 
                      className="activity-item__icon"
                      style={{ color: getEventColor(normalized.type) }}
                    >
                      {getEventIcon(normalized.type)}
                    </div>
                    <div className="activity-item__content">
                      <div className="activity-item__message">
                        {formatEventMessage(event)}
                      </div>
                      <small className="activity-item__time">
                        {formatTime(normalized.timestamp)}
                      </small>
                    </div>
                  </div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        )}
      </div>
    </div>
  );
};

export default LiveActivityFeed; 