import { ListGroup, Badge } from 'react-bootstrap';
import { LeaderboardProps } from '../../types/game';
import './LeaderboardTable.css';

interface ExtendedLeaderboardProps extends LeaderboardProps {
  isConnected?: boolean;
  gameStatus?: string;
  gameId?: string | null;
}

/**
 * Get executive dashboard status display text
 */
const getStatusDisplayText = (status: string): string => {
  switch (status) {
    case "open": return "OPEN";
    case "started": return "ACTIVE";
    case "paused": return "PAUSED";
    case "bingo": return "BINGO PENDING";
    case "ended": return "GAME COMPLETE";
    case "cancelled": return "CANCELLED";
    default: return "---";
  }
};

/**
 * Corporate Performance Dashboard Component
 * 
 * Displays real-time rankings of assessment participants with comprehensive metrics.
 * 
 * Features:
 * - Highlights current professional's performance entry
 * - Shows ranking, identifier, progress metrics, and performance scores
 * - Enterprise-responsive design for all device types
 * - Clean, professional data visualization layout
 * - Subtle connection and session status indicators
 * 
 * @param leaderboard - Complete performance dashboard data
 * @param currentSession - Current professional's session (for highlighting)
 * @param showDetails - Whether to display detailed performance analytics
 * @param isConnected - WebSocket connection status
 * @param gameStatus - Current assessment session status
 * @param gameId - Current game session identifier
 */
export function LeaderboardTable({ 
  leaderboard, 
  currentSession, 
  showDetails = true,
  isConnected = true,
  gameStatus = "standby",
  gameId = null
}: ExtendedLeaderboardProps) {
  if (!leaderboard || leaderboard.leaderboard.length === 0) {
    return (
      <div className="leaderboard-empty">
        <div className="text-center text-muted py-4">
          <p className="mb-0">No active participants yet!</p>
          <small>Be the first to access the assessment platform.</small>
        </div>
        
        {/* Status Bar for Empty State */}
        <div className="leaderboard-status-bar">
          <div className="leaderboard-status-bar__item">
            <span className="leaderboard-status-bar__label">ID:</span>
            <span className="leaderboard-status-bar__value">{gameId || "..."}</span>
          </div>
          <div className="leaderboard-status-bar__item">
            <span className={`leaderboard-status-bar__dot ${isConnected ? 'leaderboard-status-bar__dot--connected' : 'leaderboard-status-bar__dot--disconnected'}`}></span>
            <span className="leaderboard-status-bar__value">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
          <div className="leaderboard-status-bar__item">
            <span className="leaderboard-status-bar__value leaderboard-status-bar__value--status">{getStatusDisplayText(gameStatus)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-table">
      {/* Subtle Status Bar */}
      <div className="leaderboard-status-bar">
        <div className="leaderboard-status-bar__item">
          <span className="leaderboard-status-bar__label">ID:</span>
          <span className="leaderboard-status-bar__value">{gameId || "..."}</span>
        </div>
        <div className="leaderboard-status-bar__item">
          <span className={`leaderboard-status-bar__dot ${isConnected ? 'leaderboard-status-bar__dot--connected' : 'leaderboard-status-bar__dot--disconnected'}`}></span>
          <span className="leaderboard-status-bar__value">{isConnected ? 'Live' : 'Offline'}</span>
        </div>
        <div className="leaderboard-status-bar__item">
          <span className="leaderboard-status-bar__value leaderboard-status-bar__value--status">{getStatusDisplayText(gameStatus)}</span>
        </div>
      </div>

      <ListGroup variant="flush">
        {leaderboard.leaderboard.map((player, index) => {
          const isCurrentPlayer = currentSession?.sessionId === player.sessionId;
          const rank = index + 1;
          
          return (
            <ListGroup.Item
              key={player.sessionId}
              className={`leaderboard-item ${isCurrentPlayer ? 'leaderboard-item--current' : ''}`}
            >
              <div className="leaderboard-item__content">
                {/* Performance Ranking */}
                <div className="leaderboard-item__rank">
                  <span className="rank-number">#{rank}</span>
                </div>
                
                {/* Professional Information */}
                <div className="leaderboard-item__player">
                  <span className="player-nickname">
                    {player.nickname}
                    {isCurrentPlayer && (
                      <Badge bg="primary" className="ms-2">You</Badge>
                    )}
                  </span>
                  
                  {showDetails && (
                    <div className="player-details">
                      <small className="text-muted">
                        {player.wordsMarked}/{player.totalWords} terms tracked
                      </small>
                    </div>
                  )}
                </div>
                
                {/* Performance Analytics */}
                <div className="leaderboard-item__stats">
                  <div className="stat-group">
                    <span className="stat-value">{player.points}</span>
                    <span className="stat-label">score</span>
                  </div>
                  
                  {showDetails && (
                    <div className="stat-group">
                      <span className="stat-value">{player.progressPercentage}%</span>
                      <span className="stat-label">progress</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Progress Tracking (optional) */}
              {showDetails && (
                <div className="leaderboard-item__progress">
                  <div 
                    className="progress-bar"
                    style={{ width: `${player.progressPercentage}%` }}
                  />
                </div>
              )}
            </ListGroup.Item>
          );
        })}
      </ListGroup>
      
      {/* Simplified Analytics Summary */}
      <div className="leaderboard-footer-simple">
        <small>
          📊 {leaderboard.totalPlayers} active participant{leaderboard.totalPlayers !== 1 ? 's' : ''} in assessment
        </small>
      </div>
    </div>
  );
} 