import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Alert, Modal } from 'react-bootstrap';

// Import our refactored hooks and components
import { useGameSession, useBingoGame, useWebSocketLeaderboard } from '../hooks';
import { BingoGrid } from '../components/BingoGrid';
import { PlayerStatus } from '../components/PlayerStatus';
import { MarkWordResponse } from '../types/game';

/**
 * BingoGame Container Component
 * 
 * Refactored to use custom hooks and reusable components.
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
      <div 
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{ background: "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)" }}
      >
        <div className="text-center">
          <div className="spinner-border text-warning mb-3" style={{ width: "3rem", height: "3rem" }}></div>
          <h5 style={{ color: "#1F2937" }}>Loading your bingo card...</h5>
        </div>
      </div>
    );
  }

  // Show error state if session is invalid
  if (!session || !bingoCard) {
    return (
      <div 
        className="min-vh-100 d-flex align-items-center"
        style={{ background: "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)" }}
      >
        <Container>
          <Row className="justify-content-center">
            <Col xs={12} md={6}>
              <Alert variant="danger" className="text-center">
                <h5>Something went wrong!</h5>
                <p>Unable to load your game session.</p>
                <Button variant="warning" onClick={() => navigate("/")}>
                  Join New Game
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
    <div 
      className="min-vh-100"
      style={{ background: "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)" }}
    >
      {/* Simplified Header */}
      <div 
        className="py-3 shadow-sm"
        style={{ backgroundColor: "#F59E0B" }}
      >
        <Container>
          <Row className="align-items-center">
            <Col xs={12} className="text-center">
              <h1 className="h5 fw-bold mb-0 text-white">
                {session.nickname}
              </h1>
            </Col>
          </Row>
        </Container>
      </div>

      <Container className="py-4">
        {/* Game Status Message - shows when automatically switched to new game */}
        {gameStatusMessage && (
          <Alert 
            variant="info" 
            className="mb-4"
          >
            <div className="d-flex align-items-center">
              <span className="me-2">🎮</span>
              <strong>Game Update:</strong>&nbsp;{gameStatusMessage}
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

        {/* Bingo Card - now using our reusable BingoGrid component */}
        <Row className="justify-content-center">
          <Col xs={12} lg={8}>
            <Card className="shadow-sm border-0" style={{ borderRadius: "15px" }}>
              <Card.Body className="p-3">
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
              variant="warning" 
              size="lg" 
              className="w-100"
              onClick={handleLeaderboard}
            >
              View Leaderboard
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
          <div className="mb-4">
            <span style={{ fontSize: "4rem" }}>🎉</span>
          </div>
          <h2 className="fw-bold mb-3" style={{ color: "#F59E0B" }}>
            BINGO!
          </h2>
          <p className="lead mb-3">
            Congratulations, {session.nickname}!
          </p>
          {bingoResult && (
            <div className="mb-4">
              <p className="mb-2">
                <strong>Type:</strong> {bingoResult.bingoType}
              </p>
              <p className="mb-2">
                <strong>Secret Word:</strong> {bingoResult.secretWord}
              </p>
              <p className="mb-0">
                <strong>Total Points:</strong> {bingoResult.points}
              </p>
            </div>
          )}
          <div className="d-grid gap-2">
            <Button 
              variant="warning" 
              size="lg"
              onClick={handleLeaderboard}
            >
              View Leaderboard
            </Button>
            <Button 
              variant="outline-secondary"
              onClick={() => setShowBingoModal(false)}
            >
              Continue Playing
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
} 