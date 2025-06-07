import { ListGroup, Badge } from 'react-bootstrap';
import { LeaderboardProps } from '../../types/game';
import './LeaderboardTable.css';

interface ExtendedLeaderboardProps extends LeaderboardProps {
  isConnected?: boolean;
  gameStatus?: string;
  gameId?: string | null;
  displayMode?: 'personal' | 'status';
  showTrackItems?: boolean;
  showStatusBar?: boolean;
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
 * Calculate which players to display based on the display mode and current user position
 */
const getDisplayedPlayers = (
  allPlayers: any[], 
  currentSession: any, 
  displayMode: 'personal' | 'status'
) => {
  if (displayMode === 'status') {
    // Status screen: show top 10
    const MAX_DISPLAYED_STATUS = 10;
    return allPlayers.slice(0, MAX_DISPLAYED_STATUS);
  }
  
  // Personal view: smart positioning with 5 players total
  const MAX_DISPLAYED_PERSONAL = 5;
  
  if (!currentSession) {
    // No current user, show top 5
    return allPlayers.slice(0, MAX_DISPLAYED_PERSONAL);
  }
  
  const currentUserIndex = allPlayers.findIndex(player => player.sessionId === currentSession.sessionId);
  
  if (currentUserIndex === -1) {
    // Current user not found, show top 5
    return allPlayers.slice(0, MAX_DISPLAYED_PERSONAL);
  }
  
  if (allPlayers.length <= MAX_DISPLAYED_PERSONAL) {
    // Less than 5 total players, show all
    return allPlayers;
  }
  
  const currentUserRank = currentUserIndex + 1; // 1-based rank
  const totalPlayers = allPlayers.length;
  
  if (currentUserRank <= 5) {
    // User is in top 5, show top 5
    return allPlayers.slice(0, MAX_DISPLAYED_PERSONAL);
  } else if (currentUserRank > totalPlayers - 3) {
    // User is in bottom 3, show the 4 players ahead of them + current user
    // This ensures we show 5 players total
    const startIndex = Math.max(0, totalPlayers - MAX_DISPLAYED_PERSONAL);
    return allPlayers.slice(startIndex);
  } else {
    // User is not in top 5 and not in bottom 3
    // Show current position with 2 ahead and 2 behind
    const startIndex = Math.max(0, currentUserIndex - 2);
    const endIndex = Math.min(totalPlayers, startIndex + MAX_DISPLAYED_PERSONAL);
    
    // Adjust start if we're near the end (to always show 5 players)
    const adjustedStartIndex = Math.max(0, endIndex - MAX_DISPLAYED_PERSONAL);
    
    return allPlayers.slice(adjustedStartIndex, endIndex);
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
 * - Smart display limiting: 10 players for status view, 5 players for personal view
 * - Personal view positioning: Top 5 if user in top 5, otherwise user + 2 ahead/behind
 * 
 * @param leaderboard - Complete performance dashboard data
 * @param currentSession - Current professional's session (for highlighting)
 * @param showDetails - Whether to display detailed performance analytics
 * @param isConnected - WebSocket connection status
 * @param gameStatus - Current assessment session status
 * @param gameId - Current game session identifier
 * @param displayMode - 'personal' for 5-player user-centered view, 'status' for top 10 view
 */
export function LeaderboardTable({ 
  leaderboard, 
  currentSession, 
  showDetails = true,
  isConnected = true,
  gameStatus = "standby",
  gameId = null,
  displayMode = 'personal',
  showTrackItems = true,
  showStatusBar = true
}: ExtendedLeaderboardProps) {
  if (!leaderboard || leaderboard.leaderboard.length === 0) {
    return (
      <div className="leaderboard-empty">
        <div className="text-center text-muted py-4">
          <p className="mb-0">No active participants yet!</p>
          <small>Be the first to access the assessment platform.</small>
        </div>
        
        {/* Status Bar for Empty State */}
        {showStatusBar && (
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
        )}
      </div>
    );
  }

  // Get the players to display based on the mode
  const displayedPlayers = getDisplayedPlayers(leaderboard.leaderboard, currentSession, displayMode);
  
  // Calculate if we're showing a subset and need to indicate truncation
  const totalPlayers = leaderboard.leaderboard.length;
  const isShowingSubset = displayedPlayers.length < totalPlayers;
  const firstDisplayedRank = leaderboard.leaderboard.findIndex(p => p.sessionId === displayedPlayers[0].sessionId) + 1;

  return (
    <div className="leaderboard-table">
      {/* Subtle Status Bar */}
      {showStatusBar && (
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
      )}

      {/* Show truncation indicator if displaying subset and not starting from rank 1 */}
      {displayMode === 'personal' && isShowingSubset && firstDisplayedRank > 1 && (
        <div className="leaderboard-truncation-indicator">
          <small className="text-muted text-center d-block py-2">
            ... {firstDisplayedRank - 1} player{firstDisplayedRank - 1 !== 1 ? 's' : ''} above ...
          </small>
        </div>
      )}

      <ListGroup variant="flush">
        {displayedPlayers.map((player) => {
          const isCurrentPlayer = currentSession?.sessionId === player.sessionId;
          // Calculate actual rank from full leaderboard
          const rank = leaderboard.leaderboard.findIndex(p => p.sessionId === player.sessionId) + 1;
          
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
                    {/* Medal icons for top 3 players */}
                    {rank === 1 && <span className="medal-icon">🥇</span>}
                    {rank === 2 && <span className="medal-icon">🥈</span>}
                    {rank === 3 && <span className="medal-icon">🥉</span>}
                    {player.nickname}
                    {isCurrentPlayer && (
                      <Badge bg="primary" className="ms-2">You</Badge>
                    )}
                  </span>
                  
                  {showDetails && showTrackItems && (
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

      {/* Show truncation indicator if there are more players below */}
      {displayMode === 'personal' && isShowingSubset && (firstDisplayedRank + displayedPlayers.length - 1) < totalPlayers && (
        <div className="leaderboard-truncation-indicator">
          <small className="text-muted text-center d-block py-2">
            ... {totalPlayers - (firstDisplayedRank + displayedPlayers.length - 1)} more player{totalPlayers - (firstDisplayedRank + displayedPlayers.length - 1) !== 1 ? 's' : ''} below ...
          </small>
        </div>
      )}
      
      {/* Simplified Analytics Summary */}
      <div className="leaderboard-footer-simple">
        <small>
          📊 {leaderboard.totalPlayers} participant{leaderboard.totalPlayers !== 1 ? 's' : ''} in assessment
          {displayMode === 'status' && isShowingSubset && ` (Showing Top ${displayedPlayers.length})`}
          {displayMode === 'personal' && isShowingSubset && ` (showing ${displayedPlayers.length})`}
        </small>
      </div>
    </div>
  );
} 