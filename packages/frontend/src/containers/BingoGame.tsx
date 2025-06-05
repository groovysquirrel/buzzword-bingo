import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Alert, Modal } from 'react-bootstrap';

// Import our refactored hooks and components
import { useGameSession, useBingoGame, useWebSocketLeaderboard } from '../hooks';
import { BingoGrid } from '../components/BingoGrid';
import { PlayerStatus } from '../components/PlayerStatus';
import { MarkWordResponse } from '../types/game';
import './BingoGame.css';

/**
 * Corporate Assessment Game Container Component
 * 
 * Refactored to use custom hooks, reusable components, and clean CSS classes.
 * This maintains all the original functionality while being much cleaner and more maintainable.
 */
export default function BingoGame() {
  const navigate = useNavigate();
  
  // Custom hooks handle all the complex logic that was previously in this component
  const { session, loading: sessionLoading, gameStatusMessage } = useGameSession();
  const {
    bingoCard,
    loading: gameLoading,
    markingWord,
    error: gameError,
    markWord,
    clearError: clearGameError
  } = useBingoGame(session);

  // Get current player rank using WebSocket leaderboard (more efficient than SSE)
  const { leaderboard } = useWebSocketLeaderboard(session);
  const getCurrentPlayerRank = () => {
    if (!leaderboard || !session) return null;
    const userIndex = leaderboard.leaderboard.findIndex(
      entry => entry.sessionId === session.sessionId
    );
    return userIndex !== -1 ? userIndex + 1 : null;
  };
  
  // Local state for BINGO celebration modal
  const [showBingoModal, setShowBingoModal] = useState(false);
  const [bingoResult, setBingoResult] = useState<MarkWordResponse | null>(null);

  /**
   * Handle word marking with BINGO detection
   * Now much simpler thanks to the useBingoGame hook
   */
  const handleMarkWord = async (word: string) => {
    const result = await markWord(word);
    
    if (result?.bingo) {
      setBingoResult(result);
      setShowBingoModal(true);
    }
  };

  /**
   * Navigate to leaderboard page
   */
  const handleLeaderboard = () => {
    navigate('/leaderboard');
  };

  // Show loading screen while session or game data loads
  if (sessionLoading || gameLoading) {
    return (
      <div className="bingo-game-loading">
        <div className="bingo-game-loading__content">
          <div className="spinner-border bingo-game-loading__spinner"></div>
          <h5 className="bingo-game-loading__text">Loading your assessment platform...</h5>
        </div>
      </div>
    );
  }

  // Show error state if session is invalid
  if (!session || !bingoCard) {
    return (
      <div className="bingo-game-error">
        <Container>
          <Row className="justify-content-center">
            <Col xs={12} md={6}>
              <Alert variant="danger" className="text-center">
                <h5>Platform Access Error</h5>
                <p>Unable to load your assessment session.</p>
                <Button variant="primary" onClick={() => navigate("/")}>
                  Return to Platform
                </Button>
              </Alert>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  const currentRank = getCurrentPlayerRank();

  console.log('BingoGame leaderboard data:', {
    session,
    currentRank,
    bingoCard
  });

  return (
    <div className="bingo-game-container">
      {/* Corporate Header */}
      <div className="bingo-game-header">
        <Container>
          <Row className="align-items-center">
            <Col xs={12}>
              <h1 className="bingo-game-header__title">
                Corporate Identifier: {session.nickname}
              </h1>
            </Col>
          </Row>
        </Container>
      </div>

      <Container className="bingo-game-content">
        {/* Game Status Message - shows when automatically switched to new game */}
        {gameStatusMessage && (
          <Alert variant="info" className="bingo-game-alert">
            <div className="d-flex align-items-center">
              <span className="bingo-game-alert__icon">📊</span>
              <strong>Platform Update:</strong>&nbsp;{gameStatusMessage}
            </div>
          </Alert>
        )}

        {/* Error Alert - now with dismiss functionality */}
        {gameError && (
          <Alert 
            variant="danger" 
            className="mb-4" 
            dismissible 
            onClose={clearGameError}
          >
            {gameError}
          </Alert>
        )}

        {/* Assessment Grid - now using our reusable BingoGrid component */}
        <Row className="justify-content-center">
          <Col xs={12} lg={8}>
            <Card className="bingo-game-card shadow-sm border-0">
              <Card.Header className="bingo-game-card__header">
                <h6 className="bingo-game-card__title">
                  Real-time Communication Assessment Matrix
                </h6>
                <small className="bingo-game-card__subtitle">Tap corporate terminology you experience</small>
              </Card.Header>
              <Card.Body className="bingo-game-card__body">
                <BingoGrid
                  bingoCard={bingoCard}
                  markingWord={markingWord}
                  onMarkWord={handleMarkWord}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Player Status - now using our reusable PlayerStatus component */}
        <Row className="justify-content-center mt-4">
          <Col xs={12} lg={8}>
            <PlayerStatus
              bingoCard={bingoCard}
              rank={currentRank}
              showProgress={true}
            />
          </Col>
        </Row>

        {/* Action Button */}
        <Row className="justify-content-center mt-4">
          <Col xs={12} lg={6}>
            <Button 
              size="lg" 
              className="w-100 bingo-game-button"
              onClick={handleLeaderboard}
            >
              View Performance Dashboard
            </Button>
          </Col>
        </Row>
      </Container>

      {/* BINGO Celebration Modal */}
      <Modal 
        show={showBingoModal} 
        onHide={() => setShowBingoModal(false)} 
        centered
      >
        <Modal.Body className="text-center p-4">
          <div className="bingo-game-modal__icon">🎯</div>
          <h2 className="bingo-game-modal__title">
            ASSESSMENT COMPLETE!
          </h2>
          <p className="lead bingo-game-modal__text">
            Excellent performance, {session.nickname}!
          </p>
          {bingoResult && (
            <div className="bingo-game-modal__details">
              <p className="bingo-game-modal__detail-item">
                <strong>Pattern Type:</strong> {bingoResult.bingoType}
              </p>
              <p className="bingo-game-modal__detail-item">
                <strong>Trigger Term:</strong> {bingoResult.secretWord}
              </p>
              <p className="bingo-game-modal__detail-item">
                <strong>Total Score:</strong> {bingoResult.points}
              </p>
            </div>
          )}
          <div className="d-grid gap-2">
            <Button 
              size="lg"
              className="bingo-game-modal__button--primary"
              onClick={handleLeaderboard}
            >
              View Performance Dashboard
            </Button>
            <Button 
              variant="outline-secondary"
              className="bingo-game-modal__button--secondary"
              onClick={() => setShowBingoModal(false)}
            >
              Continue Assessment
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
} 