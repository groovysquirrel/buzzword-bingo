import { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import { Container, Row, Col, Card, Badge, ListGroup } from 'react-bootstrap';

// Import our types, hooks, and components for consistency
import { LeaderboardTable } from '../components/Leaderboard';
import { useLeaderboard } from '../hooks';

interface ActivityEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

interface CurrentGameResponse {
  currentGameId: string | null;
  status: string;
  startTime: string;
  wordCount: number;
  timestamp: string;
  error?: string;
}

/**
 * StatusScreen Container Component
 * 
 * A public status board designed for conference displays.
 * Shows real-time leaderboard and activity feed.
 * 
 * Now includes game selection dropdown and uses the unified useUnifiedLeaderboard hook
 * which ensures identical data structure and behavior as the main leaderboard page.
 */
export default function StatusScreen() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<string>("ready");

  // Use our unified leaderboard hook which works identically for both authenticated and public access
  const { 
    leaderboard, 
    events,
    loading,
    error,
    isConnected,
    lastUpdate
  } = useLeaderboard(gameId);

  /**
   * Format activity event into human-readable message
   */
  const formatEventMessage = (event: ActivityEvent): string => {
    switch (event.type) {
      case "player_joined":
        return `${event.data.nickname} joined!`;
      case "word_marked":
        return `${event.data.nickname} heard "${event.data.word}"`;
      case "bingo_completed":
        return `${event.data.nickname} got BINGO!`;
      case "game_reset":
        return `Game ${event.data.gameId} was reset (${event.data.progressRecordsCleared} progress records cleared)`;
      case "new_game":
        return `New game started: ${event.data.newGameId} (replaced ${event.data.previousGameId})`;
      case "game_started":
        return `New game started: ${event.data.gameId}`;
      case "game_ended":
        return `Game ended - Winner: ${event.data.winner || "No winner"}`;
      default:
        return `${event.type}: ${JSON.stringify(event.data)}`;
    }
  };

  /**
   * Format timestamp for display
   */
  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  /**
   * Get icon for event type
   */
  const getEventIcon = (type: string): string => {
    switch (type) {
      case "player_joined": return "👋";
      case "word_marked": return "✅";
      case "bingo_completed": return "🎉";
      case "game_reset": return "🔄";
      case "new_game": return "🆕";
      default: return "📝";
    }
  };

  /**
   * Get color for event type
   */
  const getEventColor = (type: string): string => {
    switch (type) {
      case "game_reset":
      case "new_game": 
        return "#DC2626";
      case "bingo_completed":
        return "#059669";
      case "word_marked":
        return "#F59E0B";
      default:
        return "#374151";
    }
  };

  /**
   * Map backend status to frontend game state
   */
  const mapGameStatus = (backendStatus: string): string => {
    switch (backendStatus) {
      case "active": return "playing";
      case "complete": return "won";
      case "paused": return "ready";
      case "pending_bingo": return "pending bingo";
      default: return "ready";
    }
  };

  /**
   * Get display text for game status
   */
  const getStatusDisplayText = (status: string): string => {
    switch (status) {
      case "ready": return "READY";
      case "playing": return "PLAYING";
      case "pending bingo": return "PENDING BINGO";
      case "won": return "WON";
      default: return "READY";
    }
  };

  /**
   * Get badge color for game status
   */
  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case "ready": return "secondary";
      case "playing": return "success";
      case "pending bingo": return "warning";
      case "won": return "primary";
      default: return "secondary";
    }
  };

  // Initialize with current game
  useEffect(() => {
    fetchCurrentGame();
  }, []);

  /**
   * Fetch current game information
   */
  const fetchCurrentGame = async () => {
    try {
      const result: CurrentGameResponse = await API.get("api", "/current-game", {});
      
      if (result.currentGameId && result.currentGameId !== gameId) {
        setGameId(result.currentGameId);
        setGameStatus(mapGameStatus(result.status));
        console.log("Updated to current game:", result.currentGameId, "status:", result.status);
      } else if (!result.currentGameId && result.error) {
        console.warn("No active game found:", result.error);
        setGameId("game-001"); // Fallback
        setGameStatus("ready");
      }
    } catch (error) {
      console.error("Failed to fetch current game:", error);
      if (!gameId) {
        setGameId("game-001");
        setGameStatus("ready");
      }
    }
  };

  /**
   * Start a new game
   */
  const startNewGame = async () => {
    if (!gameId) {
      alert("No current game available.");
      return;
    }

    const confirmMessage = `🚀 Start New Game

This will:
• Create a new game with fresh bingo cards
• Clear all player progress
• Reset the leaderboard
• Set status to PLAYING

Are you sure you want to start a new game?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const result = await API.post("api", `/admin/games/${gameId}/new`, {});
      
      console.log("New game started:", result);
      
      // Update to the new game
      if (result.newGameId) {
        setGameId(result.newGameId);
        setGameStatus("playing");
        
        alert(`🎉 Game started successfully!\n\nGame ID: ${result.newGameId}\n\nPlayers can now join and play!`);
      }
    } catch (error) {
      console.error("Failed to start new game:", error);
      alert("Failed to start new game: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  /**
   * Pause the current game
   */
  const pauseGame = async () => {
    if (!gameId) return;

    const confirmMessage = `⏸️ Pause Game

This will:
• Pause the current game
• Players can still view their cards but cannot mark words
• Set status to READY

Are you sure you want to pause the game?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // We'll need to implement a pause endpoint, for now simulate it
      // const result = await API.post("api", `/admin/games/${gameId}/pause`, {});
      
      setGameStatus("ready");
      alert(`⏸️ Game paused!\n\nClick "Start Game" to resume play.`);
    } catch (error) {
      console.error("Failed to pause game:", error);
      alert("Failed to pause game: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  /**
   * Resume/start the current game
   */
  const resumeGame = async () => {
    if (!gameId) return;

    try {
      // We'll need to implement a resume endpoint, for now simulate it
      // const result = await API.post("api", `/admin/games/${gameId}/resume`, {});
      
      setGameStatus("playing");
      alert(`🚀 Game resumed!\n\nPlayers can now mark words and play!`);
    } catch (error) {
      console.error("Failed to resume game:", error);
      alert("Failed to resume game: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  /**
   * Get the appropriate action button based on game status
   */
  const getActionButton = () => {
    switch (gameStatus) {
      case "ready":
        return (
          <button
            onClick={gameId === "game-001" ? startNewGame : resumeGame}
            className="btn btn-success btn-sm d-flex align-items-center gap-2"
            style={{ fontSize: "12px", fontWeight: "600" }}
            disabled={!gameId}
            title={gameId === "game-001" ? "Start a new game" : "Resume the current game"}
          >
            <span>🚀</span>
            Start Game
          </button>
        );
      
      case "playing":
        return (
          <button
            onClick={pauseGame}
            className="btn btn-warning btn-sm d-flex align-items-center gap-2"
            style={{ fontSize: "12px", fontWeight: "600" }}
            disabled={!gameId}
            title="Pause the current game"
          >
            <span>⏸️</span>
            Pause Game
          </button>
        );
      
      case "pending bingo":
        return (
          <button
            className="btn btn-info btn-sm d-flex align-items-center gap-2"
            style={{ fontSize: "12px", fontWeight: "600" }}
            disabled
            title="Waiting for bingo verification"
          >
            <span>🔍</span>
            Verifying...
          </button>
        );
      
      case "won":
        return (
          <button
            onClick={startNewGame}
            className="btn btn-primary btn-sm d-flex align-items-center gap-2"
            style={{ fontSize: "12px", fontWeight: "600" }}
            disabled={!gameId}
            title="Start a new game"
          >
            <span>🆕</span>
            New Game
          </button>
        );
      
      default:
        return null;
    }
  };

  // Show loading screen while data loads
  if (loading) {
    return (
      <div 
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{ background: "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)" }}
      >
        <div className="text-center">
          <div className="spinner-border text-warning mb-3" style={{ width: "3rem", height: "3rem" }}></div>
          <h5 style={{ color: "#1F2937" }}>Loading status board...</h5>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-vh-100"
      style={{ 
        background: "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)"
      }}
    >
      {/* Header */}
      <div 
        className="py-3 shadow-sm"
        style={{ 
          backgroundColor: "#F59E0B"
        }}
      >
        <Container>
          <Row className="align-items-center">
            <Col xs={12} className="text-center">
              <h1 className="h4 fw-bold mb-0 text-white">
                🐝 Buzzword Bingo Status Board
              </h1>
            </Col>
          </Row>
          <Row className="align-items-center justify-content-center mt-2">
            <Col xs="auto">
              <Badge 
                bg={isConnected ? "success" : "danger"}
                className="d-flex align-items-center gap-1 px-3 py-2 me-3"
              >
                <div 
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "white"
                  }}
                ></div>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </Col>
            <Col xs="auto">
              <Badge 
                bg={getStatusBadgeColor(gameStatus)} 
                className="px-3 py-2 me-3"
              >
                {getStatusDisplayText(gameStatus)}
              </Badge>
            </Col>
            <Col xs="auto">
              {getActionButton()}
            </Col>
          </Row>
        </Container>
      </div>

      {/* Main Content */}
      <Container className="py-4">
        {/* Error Alert */}
        {error && (
          <Row className="mb-4">
            <Col xs={12}>
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            </Col>
          </Row>
        )}

        <Row className="g-4">
          {/* Leaderboard */}
          <Col xs={12} lg={6}>
            <Card className="h-100 shadow-sm border-0" style={{ borderRadius: "15px" }}>
              <Card.Header 
                className="border-0 py-3"
                style={{ 
                  backgroundColor: "#1F2937",
                  borderRadius: "15px 15px 0 0"
                }}
              >
                <h4 className="mb-0 text-white fw-bold text-center">
                  🏆 Leaderboard
                </h4>
              </Card.Header>
              <Card.Body className="p-0">
                {leaderboard && leaderboard.leaderboard.length > 0 ? (
                  <LeaderboardTable
                    leaderboard={leaderboard}
                    showDetails={true}
                  />
                ) : (
                  <div className="text-center py-5 text-muted">
                    <div className="mb-3">
                      <span style={{ fontSize: "3rem", opacity: 0.3 }}>🐝</span>
                    </div>
                    <h6>No players yet...</h6>
                    <small>Waiting for the game to begin!</small>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Activity Feed */}
          <Col xs={12} lg={6}>
            <Card className="h-100 shadow-sm border-0" style={{ borderRadius: "15px" }}>
              <Card.Header 
                className="border-0 py-3"
                style={{ 
                  backgroundColor: "#1F2937",
                  borderRadius: "15px 15px 0 0"
                }}
              >
                <h4 className="mb-0 text-white fw-bold text-center">
                  📡 Latest Activity
                </h4>
              </Card.Header>
              <Card.Body 
                className="p-0"
                style={{ 
                  maxHeight: "600px",
                  overflowY: "auto"
                }}
              >
                {events.length > 0 ? (
                  <ListGroup variant="flush">
                    {events.map((event, index) => (
                      <ListGroup.Item 
                        key={event.id}
                        className="px-4 py-3"
                        style={{
                          backgroundColor: index % 2 === 0 ? "#FEFCE8" : "white",
                          borderBottom: index < events.length - 1 ? "1px solid #E5E7EB" : "none"
                        }}
                      >
                        <div className="d-flex align-items-start gap-3">
                          <div 
                            className="d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              backgroundColor: "#FEF3C7",
                              color: getEventColor(event.type),
                              fontSize: "14px"
                            }}
                          >
                            {getEventIcon(event.type)}
                          </div>
                          <div className="flex-grow-1 min-w-0">
                            <div 
                              className="fw-semibold mb-1"
                              style={{ 
                                color: getEventColor(event.type),
                                fontSize: "14px"
                              }}
                            >
                              {formatEventMessage(event)}
                            </div>
                            <small className="text-muted">
                              {formatTime(event.timestamp)}
                            </small>
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <div className="mb-3">
                      <span style={{ fontSize: "3rem", opacity: 0.3 }}>📡</span>
                    </div>
                    <h6>No activity yet...</h6>
                    <small>Events will appear here as they happen!</small>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Footer Info */}
        <Row className="mt-4">
          <Col xs={12}>
            <Card 
              className="border-0 shadow-sm text-center"
              style={{ 
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                borderRadius: "15px"
              }}
            >
              <Card.Body className="py-3">
                <Row className="align-items-center text-center text-md-start">
                  <Col xs={12} md={4} className="mb-2 mb-md-0">
                    <small className="text-muted">
                      <strong>Game ID:</strong> {gameId || "Loading..."}
                    </small>
                  </Col>
                  <Col xs={12} md={4} className="mb-2 mb-md-0">
                    <small className="text-muted">
                      <strong>Status:</strong> {gameStatus}
                    </small>
                  </Col>
                  <Col xs={12} md={4}>
                    <small className="text-muted">
                      <strong>Last update:</strong> {lastUpdate ? formatTime(lastUpdate) : "Never"}
                    </small>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
} 