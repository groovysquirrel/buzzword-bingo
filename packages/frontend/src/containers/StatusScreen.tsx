import { useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

// Import our types, hooks, and components for consistency
import { LeaderboardTable } from '../components/Leaderboard';
import { GameController } from '../components/GameController';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { useWebSocketLeaderboard } from '../hooks/useWebSocketLeaderboard';


import './StatusScreen.css';


/**
 * Corporate Assessment Platform Status Dashboard
 * 
 * A professional monitoring system designed for executive conference displays.
 * Real-time performance tracking and employee engagement analytics via enterprise WebSocket infrastructure.
 * 
 * Optimized for serverless deployment with advanced corporate monitoring capabilities.
 */
export default function StatusScreen() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<string>("standby");

  // Use WebSocket for real-time enterprise analytics
  const { 
    leaderboard, 
    events,
    loading,
    error,
    isConnected,
    
  } = useWebSocketLeaderboard(gameId);

  /**
   * Handle game state changes from GameController
   */
  const handleGameStateChange = (newGameId: string | null, newStatus: string) => {
    setGameId(newGameId);
    setGameStatus(newStatus);
  };

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
                  leaderboard={leaderboard || { gameId: '', timestamp: '', totalPlayers: 0, leaderboard: [] }}
                  showDetails={true}
                  isConnected={isConnected}
                  gameStatus={gameStatus}
                  gameId={gameId}
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

        {/* Executive Control Panel */}
        <Row className="mt-4">
          <Col xs={12}>
            <Card className="control-panel-card">
              <Card.Header className="control-panel-card__header">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="control-panel-card__title">
                    <h5 className="mb-0">🎯 Executive Control Panel</h5>
                    <small className="text-light opacity-75">Assessment Session Management</small>
                  </div>
                  <div className="control-panel-card__actions">
                    <GameController 
                      onGameStateChange={handleGameStateChange}
                      className="game-controller-horizontal"
                    />
                  </div>
                </div>
              </Card.Header>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
} 