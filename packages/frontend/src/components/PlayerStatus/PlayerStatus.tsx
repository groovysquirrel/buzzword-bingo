import { Card, Row, Col } from 'react-bootstrap';
import { PlayerStatusProps } from '../../types/game';
import './PlayerStatus.css';

/**
 * Professional Performance Status Component
 * 
 * Displays comprehensive assessment metrics and progress analytics for current professional.
 * 
 * Features:
 * - Progress tracking bar showing completion percentage
 * - Performance scores, ranking, and progress analytics
 * - Enterprise-responsive design for all device types
 * - Clean, professional dashboard-style layout
 * 
 * @param bingoCard - Professional's assessment matrix data
 * @param rank - Professional's current performance ranking
 * @param showProgress - Whether to display detailed progress analytics
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
          <div className="spinner-border mb-2" role="status" style={{ borderColor: "#3b82f6", borderRightColor: "transparent" }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mb-0" style={{ color: "#475569", fontWeight: "600" }}>Loading performance analytics...</p>
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
        {/* Progress Analytics */}
        {showProgress && (
          <div className="progress-section mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="progress-label">Assessment Progress</span>
              <span className="progress-text">{markedWordsCount}/{totalWords} terms identified</span>
            </div>
            <div className="progress-container">
              <div
                className="progress-fill"
                style={{ width: `${progressPercentage}%` }}
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Assessment progress: ${progressPercentage}% complete`}
              />
            </div>
          </div>
        )}
        
        {/* Performance Metrics Grid */}
        <Row className="text-center g-2">
          <Col xs={4}>
            <div className="stat-item">
              <div className="stat-value stat-value--points">
                {points}
              </div>
              <div className="stat-label">Performance Score</div>
            </div>
          </Col>
          
          <Col xs={4}>
            <div className="stat-item">
              <div className="stat-value stat-value--progress">
                {progressPercentage}%
              </div>
              <div className="stat-label">Completed</div>
            </div>
          </Col>
          
          <Col xs={4}>
            <div className="stat-item">
              <div className="stat-value stat-value--rank">
                #{rank || "—"}
              </div>
              <div className="stat-label">Current Rank</div>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
} 