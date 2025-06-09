import { useState } from 'react';
import { Container, Row, Col, Card, Dropdown } from 'react-bootstrap';

// Import our types, hooks, and components for consistency
import { LeaderboardTable } from '../components/Leaderboard';
import { GameController } from '../components/GameController/GameController';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { useWebSocketLeaderboard } from '../hooks/useWebSocketLeaderboard';
import { useGameHistory } from '../hooks/useGameHistory';
import { useAppContext } from '../lib/contextLib';

import './StatusScreen.css';

/**
 * Corporate Assessment Platform Status Dashboard
 * 
 * Compact monitoring system for conference displays with real-time analytics.
 */
export default function StatusScreen() {
  const { isAuthenticated } = useAppContext();
  
  // Track game state changes from admin controls
  const [adminGameId, setAdminGameId] = useState<string | null>(null);
  const [adminGameStatus, setAdminGameStatus] = useState<string | null>(null);

  // Use game history hook to manage current game and history
  const {
    currentGameId,
    gameHistory,
    selectedGameId,
    loading: historyLoading,
    error: historyError,
    refreshHistory,
    setSelectedGameId,
    selectCurrentGame
  } = useGameHistory();

  // Use the selected game or admin override for WebSocket connection
  const effectiveGameId = adminGameId || selectedGameId;
  
  const { 
    leaderboard, 
    events,
    loading: leaderboardLoading,
    error: leaderboardError,
    isConnected,
    gameStatus: webSocketGameStatus
  } = useWebSocketLeaderboard(effectiveGameId);

  // Use admin-controlled game status if available, otherwise use WebSocket status
  const effectiveGameStatus = adminGameStatus || webSocketGameStatus || "unknown";

  /**
   * Handle game state changes from GameController (admin only)
   */
  const handleGameStateChange = (newGameId: string | null, newStatus: string) => {
    setAdminGameId(newGameId);
    setAdminGameStatus(newStatus);
    console.log("Status Screen: Game state changed via admin control:", newGameId, newStatus);
    
    // Refresh game history when a new game is created/started
    if (newGameId && (newStatus === 'playing' || newStatus === 'open')) {
      refreshHistory();
    }
  };

  /**
   * Handle game selection from dropdown
   */
  const handleGameSelection = (gameId: string) => {
    if (gameId === 'current') {
      selectCurrentGame();
    } else {
      setSelectedGameId(gameId);
    }
    // Clear admin overrides when manually selecting a game
    setAdminGameId(null);
    setAdminGameStatus(null);
  };

  /**
   * Format game display text for dropdown
   */
  const formatGameDisplay = (game: any) => {
    const status = game.status.toUpperCase();
    const date = new Date(game.startTime).toLocaleDateString();
    const isActive = ['OPEN', 'PLAYING', 'PAUSED', 'BINGO'].includes(status);
    return `${game.gameId} (${status} - ${date})${isActive ? ' 🟢' : ''}`;
  };

  // Determine overall loading state
  const loading = historyLoading || leaderboardLoading;

  // Use WebSocket error or history error
  const error = leaderboardError || historyError;

  // Show loading screen while enterprise data loads
  if (loading && !gameHistory) {
    return (
      <div className="status-screen-loading">
        <div className="status-screen-loading__content">
          <div className="spinner-border status-screen-loading__spinner"></div>
          <h5 className="status-screen-loading__text">Loading dashboard...</h5>
        </div>
      </div>
    );
  }

  return (
    <div className="status-screen-container">
      {/* Compact Header */}
      <div className="status-screen-header">
        <Container fluid>
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            {/* Title and Status on Same Line */}
            <div className="d-flex align-items-center flex-wrap gap-2 gap-md-3">
              <h1 className="status-screen-header__title mb-0">
                 Employee Performance Dashboard
              </h1>
              
              {/* Game Status Info - Responsive */}
              <div className="d-flex align-items-center gap-1 gap-md-2 status-screen-header__status-inline">
                <span className="status-info-inline">
                  {effectiveGameId}
                </span>
                <span className="status-divider">•</span>
                <span className={`status-connection ${isConnected ? 'status-connection--connected' : 'status-connection--disconnected'}`}>
                  {isConnected ? '🟢 Live' : '🔴 Offline'}
                </span>
                <span className="status-divider">•</span>
                <span className="status-game-inline">
                  {effectiveGameStatus.toUpperCase()}
                </span>
              </div>
            </div>
            
            {/* Game Selection Dropdown and Admin Controls */}
            <div className="d-flex align-items-center gap-2 gap-md-3 mt-2 mt-lg-0">
              {gameHistory && gameHistory.history.length > 0 && (
                <Dropdown>
                  <Dropdown.Toggle variant="outline-light" size="sm" id="game-selector">
                    Select Game
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {currentGameId && (
                      <>
                        <Dropdown.Item 
                          onClick={() => handleGameSelection('current')}
                          active={selectedGameId === currentGameId}
                        >
                          <strong> Current Game ({currentGameId})</strong>
                        </Dropdown.Item>
                        <Dropdown.Divider />
                      </>
                    )}
                    {gameHistory.history.slice(0, 10).map((game) => (
                      <Dropdown.Item
                        key={game.gameId}
                        onClick={() => handleGameSelection(game.gameId)}
                        active={selectedGameId === game.gameId}
                      >
                        {formatGameDisplay(game)}
                      </Dropdown.Item>
                    ))}
                    {gameHistory.history.length > 10 && (
                      <Dropdown.Item disabled>
                        ... and {gameHistory.history.length - 10} more
                      </Dropdown.Item>
                    )}
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={refreshHistory}>
                      🔄 Refresh List
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* Main Dashboard Content */}
      <div className="status-screen-content">
        <Container fluid>
          {/* System Alerts */}
          {error && (
            <div className="status-screen-alert mb-3">
              <strong>System Alert:</strong> {error}
            </div>
          )}

          {/* Main Dashboard Cards */}
          <Row className="g-3 status-dashboard-row">
            {/* Leaderboard */}
            <Col xs={12} lg={6}>
              <Card className="status-card">
                <Card.Header>
                  <h4 className="mb-0 text-center">Performance Metrics</h4>
                </Card.Header>
                <Card.Body className="status-card-body">
                  <LeaderboardTable
                    leaderboard={leaderboard || { 
                      gameId: effectiveGameId || '', 
                      timestamp: new Date().toISOString(), 
                      totalPlayers: 0, 
                      leaderboard: [] 
                    }}
                    showDetails={true}
                    isConnected={isConnected}
                    gameStatus={effectiveGameStatus}
                    gameId={effectiveGameId}
                    displayMode="status"
                    showTrackItems={false}
                    showStatusBar={false}
                  />
                </Card.Body>
              </Card>
            </Col>

            {/* Live Activity + Game Controller */}
            <Col xs={12} lg={6}>
              <div className="status-right-column">
                {/* Live Activity Card */}
                <Card className="status-card activity-card">
                  <Card.Header>
                    <h4 className="mb-0 text-center"> Productivity Measures</h4>
                  </Card.Header>
                  <Card.Body className="status-card-body activity-card-body">
                    <LiveActivityFeed events={events} />
                  </Card.Body>
                </Card>

                {/* Game Controller */}
                {isAuthenticated && (
                  <div className="game-controller-wrapper bg-white border rounded shadow-sm p-2">
                    <GameController 
                      onGameStateChange={handleGameStateChange}
                      className="game-controller-compact w-100"
                    />
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
} 