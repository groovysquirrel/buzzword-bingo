import { Card, Row, Col } from 'react-bootstrap';
import { PlayerStatusProps } from '../../types/game';
import './PlayerStatus.css';

/**
 * PlayerStatus Component
 * 
 * Displays the current player's game statistics and progress.
 * 
 * Features:
 * - Progress bar showing completion percentage
 * - Points, rank, and progress statistics
 * - Responsive design for mobile and desktop
 * - Clean, card-based layout
 * 
 * @param bingoCard - Player's bingo card data
 * @param rank - Player's current rank
 * @param showProgress - Whether to show detailed progress bar
 */
export function PlayerStatus({ 
  bingoCard, 
  rank, 
  showProgress = true 
}: PlayerStatusProps) {
  if (!bingoCard) {
    return (
      <Card className="player-status player-status--loading">
        <Card.Body className="text-center">
          <div className="spinner-border text-warning mb-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mb-0">Loading your stats...</p>
        </Card.Body>
      </Card>
    );
  }

  const markedWordsCount = bingoCard.markedWords.length;
  const totalWords = 24; // 25 total - 1 free space
  const progressPercentage = Math.round((markedWordsCount / totalWords) * 100);
  const points = markedWordsCount * 10;

  return (
    <Card className="player-status border-0 shadow-sm">
      <Card.Body className="p-3 p-md-4">
        {/* Progress Bar */}
        {showProgress && (
          <div className="progress-section mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="progress-label">Progress</span>
              <span className="progress-text">{markedWordsCount}/{totalWords} words</span>
            </div>
            <div className="progress-container">
              <div
                className="progress-fill"
                style={{ width: `${progressPercentage}%` }}
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progress: ${progressPercentage}% complete`}
              />
            </div>
          </div>
        )}
        
        {/* Statistics Grid */}
        <Row className="text-center g-2">
          <Col xs={4}>
            <div className="stat-item">
              <div className="stat-value stat-value--points">
                {points}
              </div>
              <div className="stat-label">Points</div>
            </div>
          </Col>
          
          <Col xs={4}>
            <div className="stat-item">
              <div className="stat-value stat-value--progress">
                {progressPercentage}%
              </div>
              <div className="stat-label">Complete</div>
            </div>
          </Col>
          
          <Col xs={4}>
            <div className="stat-item">
              <div className="stat-value stat-value--rank">
                #{rank || "?"}
              </div>
              <div className="stat-label">Rank</div>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
} 