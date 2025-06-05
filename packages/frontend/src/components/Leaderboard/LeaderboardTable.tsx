import { ListGroup, Badge } from 'react-bootstrap';
import { LeaderboardProps } from '../../types/game';
import './LeaderboardTable.css';

/**
 * LeaderboardTable Component
 * 
 * Displays a ranked list of players with their statistics.
 * 
 * Features:
 * - Highlights the current player's entry
 * - Shows rank, nickname, progress, and points
 * - Responsive design for mobile and desktop
 * - Clean, easy-to-read layout
 * 
 * @param leaderboard - Complete leaderboard data
 * @param currentSession - Current player's session (for highlighting)
 * @param showDetails - Whether to show detailed statistics
 */
export function LeaderboardTable({ 
  leaderboard, 
  currentSession, 
  showDetails = true 
}: LeaderboardProps) {
  if (!leaderboard || leaderboard.leaderboard.length === 0) {
    return (
      <div className="leaderboard-empty">
        <div className="text-center text-muted py-4">
          <p className="mb-0">No players yet!</p>
          <small>Be the first to join the game.</small>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-table">
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
                {/* Rank */}
                <div className="leaderboard-item__rank">
                  <span className="rank-number">#{rank}</span>
                </div>
                
                {/* Player Info */}
                <div className="leaderboard-item__player">
                  <span className="player-nickname">
                    {player.nickname}
                    {isCurrentPlayer && (
                      <Badge bg="warning" className="ms-2">You</Badge>
                    )}
                  </span>
                  
                  {showDetails && (
                    <div className="player-details">
                      <small className="text-muted">
                        {player.wordsMarked}/{player.totalWords} words
                      </small>
                    </div>
                  )}
                </div>
                
                {/* Statistics */}
                <div className="leaderboard-item__stats">
                  <div className="stat-group">
                    <span className="stat-value">{player.points}</span>
                    <span className="stat-label">pts</span>
                  </div>
                  
                  {showDetails && (
                    <div className="stat-group">
                      <span className="stat-value">{player.progressPercentage}%</span>
                      <span className="stat-label">done</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Progress Bar (optional) */}
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
      
      {/* Footer Info */}
      <div className="leaderboard-footer">
        <small className="text-muted text-center d-block">
          {leaderboard.totalPlayers} player{leaderboard.totalPlayers !== 1 ? 's' : ''} total
        </small>
      </div>
    </div>
  );
} 