import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';

// Import our refactored hooks and components
import { useGameSession, useLeaderboard } from '../hooks';
import { LeaderboardTable } from '../components/Leaderboard';

/**
 * Leaderboard Container Component
 * 
 * Refactored to use custom hooks and reusable components.
 * This maintains all the original functionality while being much cleaner and more maintainable.
 */
export default function Leaderboard() {
  const navigate = useNavigate();
  
  // Custom hooks handle all the complex logic that was previously in this component
  const { session, loading: sessionLoading, gameStatusMessage } = useGameSession();
  const { 
    leaderboard, 
    loading: leaderboardLoading, 
    error,
    getCurrentPlayerRank,
    getCurrentPlayerEntry,
    clearError
  } = useLeaderboard(session);

  /**
   * Navigate back to the game
   */
  const handleBackToGame = () => {
    navigate('/play');
  };

  // Show loading screen while data loads
  if (sessionLoading || leaderboardLoading) {
    return (
      <div 
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{ background: "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)" }}
      >
        <div className="text-center">
          <div className="spinner-border text-warning mb-3" style={{ width: "3rem", height: "3rem" }}></div>
          <h5 style={{ color: "#1F2937" }}>Loading leaderboard...</h5>
        </div>
      </div>
    );
  }

  // Show error state if session is invalid
  if (!session) {
    return (
      <div 
        className="min-vh-100 d-flex align-items-center"
        style={{ background: "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)" }}
      >
        <Container>
          <Row className="justify-content-center">
            <Col xs={12} md={6}>
              <Alert variant="danger" className="text-center">
                <h5>Session expired!</h5>
                <p>Please join the game again.</p>
                <Button variant="warning" onClick={() => navigate("/")}>
                  Join Game
                </Button>
              </Alert>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  const userRank = getCurrentPlayerRank();
  const userEntry = getCurrentPlayerEntry();

  return (
    <div 
      className="min-vh-100"
      style={{ background: "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)" }}
    >
      {/* Header */}
      <div 
        className="py-3 shadow-sm"
        style={{ backgroundColor: "#F59E0B" }}
      >
        <Container>
          <Row className="align-items-center">
            <Col xs={12} className="text-center">
              <h1 className="h5 fw-bold mb-0 text-white">
                Leaderboard
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

        {/* Current Player's Rank Card */}
        {userEntry && (
          <Row className="justify-content-center mb-4">
            <Col xs={12} lg={8}>
              <Card 
                className="border-0 shadow-sm"
                style={{ 
                  borderRadius: "15px",
                  backgroundColor: "#1F2937"
                }}
              >
                <Card.Body className="p-4 text-center text-white">
                  <h5 className="fw-bold mb-3">Your Rank</h5>
                  <Row className="text-center">
                    <Col xs={4}>
                      <div className="h3 fw-bold mb-0" style={{ color: "#FCD34D" }}>
                        #{userRank}
                      </div>
                      <small className="opacity-75">Position</small>
                    </Col>
                    <Col xs={4}>
                      <div className="h3 fw-bold mb-0" style={{ color: "#FCD34D" }}>
                        {userEntry.points}
                      </div>
                      <small className="opacity-75">Points</small>
                    </Col>
                    <Col xs={4}>
                      <div className="h3 fw-bold mb-0" style={{ color: "#FCD34D" }}>
                        {userEntry.progressPercentage}%
                      </div>
                      <small className="opacity-75">Progress</small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Leaderboard Table - now using our reusable LeaderboardTable component */}
        <Row className="justify-content-center">
          <Col xs={12} lg={8}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: "15px" }}>
              <Card.Header 
                className="bg-transparent border-0 text-center py-3"
                style={{ borderRadius: "15px 15px 0 0" }}
              >
                <h5 className="fw-bold mb-0" style={{ color: "#1F2937" }}>
                  All Players
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                {leaderboard ? (
                  <LeaderboardTable
                    leaderboard={leaderboard}
                    currentSession={session}
                    showDetails={true}
                  />
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted mb-0">Loading player data...</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Back to Game Button */}
        <Row className="justify-content-center mt-4">
          <Col xs={12} lg={6}>
            <Button 
              variant="warning" 
              size="lg" 
              className="w-100"
              onClick={handleBackToGame}
            >
              Back to Game
            </Button>
          </Col>
        </Row>
      </Container>
    </div>
  );
}