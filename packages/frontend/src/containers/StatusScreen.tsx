import { useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

// Import our types, hooks, and components for consistency
import { LeaderboardTable } from '../components/Leaderboard';
import { GameController } from '../components/GameController/GameController';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { useWebSocketLeaderboard } from '../hooks/useWebSocketLeaderboard';
import { useAppContext } from '../lib/contextLib';

import './StatusScreen.css';

/**
 * Corporate Assessment Platform Status Dashboard
 * 
 * A professional monitoring system designed for executive conference displays.
 * Real-time performance tracking and employee engagement analytics via enterprise WebSocket infrastructure.
 * 
 * Now uses WebSocket-based game status updates instead of API polling for better real-time performance.
 */
export default function StatusScreen() {
  const { isAuthenticated } = useAppContext();
  
  // Track game state changes from admin controls
  const [adminGameId, setAdminGameId] = useState<string | null>(null);
  const [adminGameStatus, setAdminGameStatus] = useState<string | null>(null);

  // Use WebSocket for real-time enterprise analytics with fallback to a default game
  const fallbackGameId = adminGameId || "game-001"; // Use admin game or fallback
  
  const { 
    leaderboard, 
    events,
    loading: leaderboardLoading,
    error: leaderboardError,
    isConnected,
    gameStatus: webSocketGameStatus
  } = useWebSocketLeaderboard(fallbackGameId);

  // Use admin-controlled game status if available, otherwise use WebSocket status
  const effectiveGameStatus = adminGameStatus || webSocketGameStatus || "unknown";

  /**
   * Handle game state changes from GameController (admin only)
   */
  const handleGameStateChange = (newGameId: string | null, newStatus: string) => {
    setAdminGameId(newGameId);
    setAdminGameStatus(newStatus);
    console.log("Status Screen: Game state changed via admin control:", newGameId, newStatus);
  };

  // Determine overall loading state
  const loading = leaderboardLoading;

  // Use WebSocket error
  const error = leaderboardError;

  // Show loading screen while enterprise data loads
  if (loading) {
    return (
      <div className="status-screen-loading">
        <div className="status-screen-loading__content">
          <div className="spinner-border status-screen-loading__spinner"></div>
          <h5 className="status-screen-loading__text">Loading corporate assessment dashboard...</h5>
        </div>
      </div>
    );
  }

  return (
    <div className="status-screen-container">
      {/* Executive Dashboard Header */}
      <div className="status-screen-header">
        <Container>
          <Row>
            <Col xs={12}>
              <h1 className="status-screen-header__title">
                Corporate Assessment Platform
              </h1>
              <p className="status-screen-header__subtitle">
                Real-time Professional Development Analytics Dashboard
              </p>

            </Col>
          </Row>
        </Container>
      </div>

      {/* Corporate Dashboard Content */}
      <Container className="status-screen-content">
        {/* System Alerts */}
        {error && (
          <Row className="mb-4">
            <Col xs={12}>
              <div className="alert status-screen-alert" role="alert">
                <strong>System Alert:</strong> {error}
              </div>
            </Col>
          </Row>
        )}

        <Row className="g-4">
          {/* Performance Analytics */}
          <Col xs={12} lg={6}>
            <Card className="dashboard-card">
              <Card.Header className="dashboard-card__header">
                <h4 className="dashboard-card__title">
                  📊 Performance Dashboard
                </h4>
              </Card.Header>
              
              <Card.Body className="dashboard-card__body">
                <LeaderboardTable
                  leaderboard={leaderboard || { 
                    gameId: fallbackGameId || '', 
                    timestamp: new Date().toISOString(), 
                    totalPlayers: 0, 
                    leaderboard: [] 
                  }}
                  showDetails={true}
                  isConnected={isConnected}
                  gameStatus={effectiveGameStatus}
                  gameId={fallbackGameId}
                />
              </Card.Body>
            </Card>
          </Col>

          {/* Real-time Activity Monitor */}
          <Col xs={12} lg={6}>
            <Card className="dashboard-card">
              <Card.Header className="dashboard-card__header">
                <h4 className="dashboard-card__title">
                  📈 Live Activity Feed
                </h4>
              </Card.Header>
              <Card.Body className="dashboard-card__body">
                <LiveActivityFeed events={events} />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Executive Control Panel - Only visible to authenticated users */}
        {isAuthenticated && (
          <Row className="mt-4">
            <Col xs={12}>
              <GameController 
                onGameStateChange={handleGameStateChange}
                className="game-controller-horizontal"
              />
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
} 