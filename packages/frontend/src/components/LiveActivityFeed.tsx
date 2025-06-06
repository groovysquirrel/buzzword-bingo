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

type UnifiedEvent = GameEvent | ActivityEvent;

interface LiveActivityFeedProps {
  events: UnifiedEvent[];
  className?: string;
}

/**
 * Corporate Assessment Platform Live Activity Feed
 * 
 * Real-time monitoring component for executive dashboard displays.
 * Provides professional formatting of assessment activities and system events.
 */
export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  events,
  className = "activity-feed"
}) => {
  // Deduplicate events based on ID and timestamp
  const deduplicatedEvents = React.useMemo(() => {
    const seen = new Set<string>();
    return events.filter((event) => {
      const normalized = normalizeEvent(event);
      const key = `${normalized.id}-${normalized.timestamp}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [events]);

  if (deduplicatedEvents.length === 0) {
    return (
      <div className="activity-empty">
        <span className="activity-empty__icon">📋</span>
        <h6 className="activity-empty__title">Monitoring System Active</h6>
        <small className="activity-empty__subtitle">Real-time events will appear as corporate activities occur</small>
      </div>
    );
  }

  return (
    <div className={className}>
      <ListGroup variant="flush">
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
    </div>
  );
};

export default LiveActivityFeed; 