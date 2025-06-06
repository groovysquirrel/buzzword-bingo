import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';

// Import our refactored hooks and components
import { useGameSession } from '../hooks/useGameSession';
import { useWebSocketLeaderboard } from '../hooks/useWebSocketLeaderboard';
import { useBingoGame } from '../hooks/useBingoGame';
import { LeaderboardTable } from '../components/Leaderboard/LeaderboardTable';
import { PlayerStatus } from '../components/PlayerStatus';
import { LeaderboardEntry } from '../types/game';
import './Leaderboard.css';

/**
 * Professional Performance Dashboard Container Component
 * 
 * Real-time performance tracking and analytics platform for corporate assessment participants.
 * Uses WebSocket for efficient real-time updates and game status information.
 */
export default function Leaderboard() {
  const navigate = useNavigate();
  
  // Custom hooks handle all the complex logic that was previously in this component
  const { session, loading: sessionLoading, gameStatusMessage } = useGameSession();
  const { bingoCard, loading: gameLoading } = useBingoGame(session);
  
  // Use session game ID if available, otherwise use fallback
  const effectiveGameId = session?.currentGameId || "error";
  
  const {
    leaderboard,
    loading: leaderboardLoading,
    error,
    isConnected,
    clearError,
    gameStatus: webSocketGameStatus
  } = useWebSocketLeaderboard(effectiveGameId);

  // Use WebSocket game status
  const effectiveGameStatus = webSocketGameStatus || "unknown";

  // Calculate user's rank from leaderboard data
  const userRank = leaderboard && session ? 
    leaderboard.leaderboard.findIndex((entry: LeaderboardEntry) => entry.sessionId === session.sessionId) + 1 : null;

  /**
   * Navigate back to the assessment platform
   */
  const handleBackToAssessment = () => {
    navigate('/play');
  };

  // Show loading screen while data loads
  if (sessionLoading || leaderboardLoading || gameLoading) {
    return (
      <div className="leaderboard-loading">
        <div className="leaderboard-loading__content">
          <div className="spinner-border leaderboard-loading__spinner"></div>
          <h5 className="leaderboard-loading__text">Loading performance dashboard...</h5>
        </div>
      </div>
    );
  }

  // Show error state if session is invalid
  if (!session) {
    return (
      <div className="leaderboard-error">
        <Container>
          <Row className="justify-content-center">
            <Col xs={12} md={6}>
              <Alert variant="danger" className="text-center">
                <h5>Platform Access Error</h5>
                <p>Your assessment session has expired. Please reconnect to the platform.</p>
                <Button variant="primary" onClick={() => navigate("/")}>
                  Access Platform
                </Button>
              </Alert>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      {/* Corporate Header */}
      <div className="leaderboard-header">
        <Container>
          <Row className="align-items-center">
            <Col xs={12}>
              <h1 className="leaderboard-header__title">
                📊 Performance Analytics
               </h1>

            </Col>
          </Row>
        </Container>
      </div>

      <Container className="leaderboard-content">
        {/* Platform Status Message - shows when automatically switched to new assessment */}
        {gameStatusMessage && (
          <Alert 
            variant="info" 
            className="leaderboard-alert"
          >
            <div className="d-flex align-items-center">
              <span className="leaderboard-alert__icon">📈</span>
              <strong>Platform Update:</strong>&nbsp;{gameStatusMessage}
            </div>
          </Alert>
        )}

        {/* Error Alert - now with dismiss functionality */}
        {error && (
          <Alert 
            variant="danger" 
            className="mb-4" 
            dismissible 
            onClose={clearError}
          >
            {error}
          </Alert>
        )}

        {/* Current Professional's Performance - Reusing PlayerStatus component */}
        {bingoCard && (
          <Row className="justify-content-center mb-4">
            <Col xs={12} lg={8}>
              <PlayerStatus
                bingoCard={bingoCard}
                rank={userRank}
                showProgress={true}
              />
            </Col>
          </Row>
        )}

        {/* Performance Dashboard Table - now using our reusable LeaderboardTable component */}
        <Row className="justify-content-center">
          <Col xs={12} lg={8}>
            <Card className="leaderboard-table-card border-0 shadow-sm">
              <Card.Header className="leaderboard-table-card__header">
                <div className="leaderboard-table-card__header-content">
                  <h5 className="leaderboard-table-card__title">
                    Peer Performance
                  </h5>
                  
                </div>
              </Card.Header>
              <Card.Body className="leaderboard-table-card__body">
                {leaderboard ? (
                  <LeaderboardTable
                    leaderboard={leaderboard}
                    currentSession={session}
                    showDetails={true}
                    isConnected={isConnected}
                    gameStatus={effectiveGameStatus}
                    gameId={effectiveGameId}
                  />
                ) : (
                  <div className="leaderboard-table-card__loading">
                    <p className="mb-0">Loading participant performance data...</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Back to Assessment Button */}
        <Row className="justify-content-center mt-4">
          <Col xs={12} lg={6}>
            <Button 
              size="lg" 
              className="w-100 leaderboard-button"
              onClick={handleBackToAssessment}
            >
              Return to Assessment Platform
            </Button>
          </Col>
        </Row>
      </Container>
    </div>
  );
}