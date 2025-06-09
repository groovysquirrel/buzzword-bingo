import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../lib/contextLib";
import { API } from "aws-amplify";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import Button from "react-bootstrap/Button";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";

import SystemTester from "../components/Admin/SystemTester";
import GameSimulator from "../components/Admin/GameSimulator";
import WordManager from "../components/Admin/WordManager";
import GameCreator from "../components/Admin/GameCreator";
import "./Admin.css";

interface GameHistoryEntry {
  gameId: string;
  startTime: string;
  endTime: string | null;
  status: string;
  winner: {
    nickname: string;
    completedAt: string;
    secretWord: string;
  } | null;
  totalWords: number;
}

interface GameHistoryResponse {
  totalGames: number;
  completedGames: number;
  activeGames: number;
  timestamp: string;
  history: GameHistoryEntry[];
}

export default function Admin() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppContext();
  const [activeTab, setActiveTab] = useState("system-tester");
  const [loading, setLoading] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameHistoryResponse | null>(null);
  const [purgeResults, setPurgeResults] = useState<any>(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate("/login?redirect=/admin");
      return;
    }
  }, [isAuthenticated, navigate]);

  // Show loading/redirect state while checking authentication
  if (!isAuthenticated) {
    return null;
  }

  // Game History functions
  const getGameHistory = async () => {
    setLoading(true);
    try {
      const result = await API.get("api", "/games/history", {});
      setGameHistory(result);
      console.log("Got game history:", result);
    } catch (error) {
      console.error("Get game history error:", error);
      alert("Failed to get game history: " + (error instanceof Error ? error.message : String(error)));
    }
    setLoading(false);
  };

  // System Purge functions
  const systemPurge = async () => {
    const confirmMessage = `🚨 DANGER ZONE 🚨

This will permanently DELETE ALL DATA from the system:
• All player names and sessions
• All game history
• All bingo progress
• All completed bingo records
• All activity events
• All bingo cards

This action CANNOT be undone!

Are you absolutely sure you want to proceed?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    // Double confirmation for safety
    if (!confirm("⚠️ FINAL WARNING: This will delete EVERYTHING. Type 'DELETE' to confirm:") || 
        prompt("Type 'DELETE' to confirm system purge:") !== "DELETE") {
      alert("System purge cancelled.");
      return;
    }

    setLoading(true);
    try {
      const result = await API.post("api", "/admin/system/purge", {});
      setPurgeResults(result);
      
      console.log("System purge completed:", result);
      alert(`🚨 SYSTEM PURGED! Deleted ${result.totalItemsDeleted} total records from all tables.`);
    } catch (error) {
      console.error("System purge error:", error);
      alert("Failed to purge system: " + (error instanceof Error ? error.message : String(error)));
      setPurgeResults({ error: error instanceof Error ? error.message : String(error) });
    }
    setLoading(false);
  };

  // Utility functions
  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return "Ongoing";
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="admin-dashboard-container">
      <Container className="py-4">
        {/* Clean Header */}
        <div className="admin-header">
          <div className="admin-header__content">
            
            <h1 className="admin-header__title">Synergistic Enterprise Management Portal</h1>
            <p className="admin-header__subtitle">
              Buzzword Bingo administration tools and system management
            </p>
          </div>
                </div>

        {/* Main Interface */}
        <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || "system-tester")}>
          <div className="admin-nav-container">
            <Nav className="admin-nav">
                    <Nav.Item>
                      <Nav.Link 
                  eventKey="system-tester"
                  className={activeTab === "system-tester" ? "active" : ""}
                      >
                  🔧 System Tester
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link 
                  eventKey="game-simulator"
                  className={activeTab === "game-simulator" ? "active" : ""}
                      >
                  🎯 Game Simulator
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link 
                  eventKey="system-purge"
                  className={activeTab === "system-purge" ? "active" : ""}
                      >
                  🚨 System Purge
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link 
                  eventKey="game-history"
                  className={activeTab === "game-history" ? "active" : ""}
                      >
                  📚 Game History
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link 
                  eventKey="word-manager"
                  className={activeTab === "word-manager" ? "active" : ""}
                      >
                  📝 Word Manager
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link 
                  eventKey="game-creator"
                  className={activeTab === "game-creator" ? "active" : ""}
                      >
                  🎮 Game Creator
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>
          </div>

          <div className="admin-content">
                  <Tab.Content>
              {/* System Tester Tab */}
              <Tab.Pane eventKey="system-tester">
                <div className="admin-content__body">
                  <h2 className="admin-section-title">System Testing Interface</h2>
                  <p className="admin-section-subtitle">
                    Backend API testing tools for username validation and word management
                  </p>
                  <SystemTester />
                </div>
              </Tab.Pane>

              {/* Game Simulator Tab */}
              <Tab.Pane eventKey="game-simulator">
                <div className="admin-content__body">
                  <h2 className="admin-section-title">Multi-User Game Simulator</h2>
                  <p className="admin-section-subtitle">
                    Test multi-player game interactions, bingo card functionality, and real-time leaderboard updates
                  </p>
                  <GameSimulator />
                </div>
              </Tab.Pane>

              {/* System Purge Tab */}
              <Tab.Pane eventKey="system-purge">
                <div className="admin-content__body">
                  <h2 className="admin-section-title">System Purge</h2>
                  <p className="admin-section-subtitle">
                    Dangerous operations that permanently delete all system data
                  </p>

                  <div className="admin-alert admin-alert-danger">
                    <div className="admin-alert__title">⚠️ DANGER ZONE</div>
                    <p className="mb-2">
                      System purge will permanently delete ALL data from ALL database tables. 
                      This includes player sessions, game history, bingo progress, activity events, 
                      and all related records.
                    </p>
                    <p className="mb-0">
                      <strong>This action cannot be undone!</strong> Use only for complete system reset 
                      or during development/testing phases.
                    </p>
                  </div>

                  <Row>
                    <Col md={8}>
                      <div className="admin-card">
                        <div className="admin-card__body">
                          <h3 className="admin-card__title">System Data Purge</h3>
                          <p className="admin-card__description">
                            This operation will delete all data from the following tables:
                          </p>
                          <ul className="mb-4" style={{ color: '#64748b' }}>
                            <li>Player sessions and authentication tokens</li>
                            <li>Game state and bingo card data</li>
                            <li>Leaderboard and progress tracking</li>
                            <li>Activity events and notifications</li>
                            <li>Game history and completion records</li>
                          </ul>
                                <Button 
                            onClick={systemPurge} 
                            disabled={loading}
                            className="admin-btn admin-btn-danger w-100"
                                  size="lg"
                                >
                            {loading ? "🔄 Purging System..." : "🚨 PURGE ALL SYSTEM DATA"}
                                </Button>
                        </div>
                      </div>
                              </Col>
                    <Col md={4}>
                      <div className="admin-card">
                        <div className="admin-card__body">
                          <h3 className="admin-card__title">📊 Quick Links</h3>
                          <div className="admin-quick-links">
                            <a 
                              href="/status" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="admin-quick-link"
                            >
                              <span className="admin-quick-link__icon">📺</span>
                              Status Board
                            </a>
                            <a 
                              href="/leaderboard" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="admin-quick-link"
                            >
                              <span className="admin-quick-link__icon">🏆</span>
                              Leaderboard
                            </a>
                            <a 
                              href="/" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="admin-quick-link"
                            >
                              <span className="admin-quick-link__icon">🎯</span>
                              Game Portal
                            </a>
                          </div>
                        </div>
                      </div>
                          </Col>
                        </Row>

                  {/* Purge Results */}
                  {purgeResults && (
                    <div className="admin-card">
                      <div className="admin-card__body">
                        <h3 className="admin-card__title">Purge Operation Results</h3>
                        <div className={`admin-alert ${purgeResults.error ? 'admin-alert-danger' : 'admin-alert-success'}`}>
                          <pre style={{ fontSize: "0.875rem", margin: 0 }}>
                            {JSON.stringify(purgeResults, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                      </div>
                    </Tab.Pane>

              {/* Game History Tab */}
              <Tab.Pane eventKey="game-history">
                <div className="admin-content__body">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                      <h2 className="admin-section-title mb-2">Game History</h2>
                      <p className="admin-section-subtitle mb-0">
                        Historical data and analytics for all completed and active games
                      </p>
                    </div>
                    <Button 
                      onClick={getGameHistory} 
                      disabled={loading}
                      className="admin-btn admin-btn-primary"
                    >
                      {loading ? "Loading..." : "🔄 Refresh"}
                    </Button>
                  </div>

                  {gameHistory && (
                    <Row className="mb-4">
                      <Col sm={4}>
                        <div className="admin-stat-card">
                          <div className="admin-stat-card__icon">📊</div>
                          <div className="admin-stat-card__title">Total Games</div>
                          <div className="admin-stat-card__value">{gameHistory.totalGames}</div>
                        </div>
                      </Col>
                      <Col sm={4}>
                        <div className="admin-stat-card">
                          <div className="admin-stat-card__icon">✅</div>
                          <div className="admin-stat-card__title">Completed</div>
                          <div className="admin-stat-card__value">{gameHistory.completedGames}</div>
                        </div>
                      </Col>
                      <Col sm={4}>
                        <div className="admin-stat-card">
                          <div className="admin-stat-card__icon">🎮</div>
                          <div className="admin-stat-card__title">Active</div>
                          <div className="admin-stat-card__value">{gameHistory.activeGames}</div>
                        </div>
                      </Col>
                    </Row>
                  )}

                  {gameHistory?.history && gameHistory.history.length > 0 ? (
                    <div className="admin-card">
                      <div className="admin-card__body">
                        <h3 className="admin-card__title">Game Records</h3>
                        <div className="table-responsive">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Game ID</th>
                                <th>Status</th>
                                <th>Start Time</th>
                                <th>End Time</th>
                                <th>Duration</th>
                                <th>Winner</th>
                                <th>Secret Word</th>
                              </tr>
                            </thead>
                            <tbody>
                              {gameHistory.history.map((game) => (
                                <tr key={game.gameId}>
                                  <td>
                                    <code style={{ fontSize: '0.75rem' }}>{game.gameId}</code>
                                  </td>
                                  <td>
                                    <span className={`badge ${game.status === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                                      {game.status.toUpperCase()}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: '0.8rem' }}>
                                    {formatDateTime(game.startTime)}
                                  </td>
                                  <td style={{ fontSize: '0.8rem' }}>
                                    {game.endTime ? formatDateTime(game.endTime) : "—"}
                                  </td>
                                  <td style={{ fontSize: '0.8rem' }}>
                                    {formatDuration(game.startTime, game.endTime)}
                                  </td>
                                  <td>
                                    {game.winner ? (
                                      <strong>{game.winner.nickname}</strong>
                                    ) : (
                                      <span style={{ color: '#9ca3af' }}>No winner</span>
                                    )}
                                  </td>
                                  <td>
                                    <span className="badge bg-secondary">
                                      {game.winner ? game.winner.secretWord : "—"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {gameHistory && (
                          <p style={{ color: '#9ca3af', margin: '1rem 0 0 0', fontSize: '0.875rem' }}>
                            Last updated: {new Date(gameHistory.timestamp).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : gameHistory ? (
                    <div className="admin-alert admin-alert-info">
                      <div className="admin-alert__title">No game history found</div>
                      <p className="mb-0">No games have been played yet. Start testing the system to generate history data.</p>
                    </div>
                  ) : (
                    <div className="admin-alert admin-alert-info">
                      <div className="admin-alert__title">Game History</div>
                      <p className="mb-0">Click "Refresh" to load game analytics and historical data.</p>
                    </div>
                  )}
                      </div>
                    </Tab.Pane>

              {/* Word Manager Tab */}
              <Tab.Pane eventKey="word-manager">
                <div className="admin-content__body">
                  <h2 className="admin-section-title">Word Manager</h2>
                  <p className="admin-section-subtitle">
                    Manage buzzwords, categories, and game content for bingo card generation
                  </p>
                  <WordManager />
                      </div>
                    </Tab.Pane>

              {/* Game Creator Tab */}
              <Tab.Pane eventKey="game-creator">
                <div className="admin-content__body">
                  <h2 className="admin-section-title">Game Creator</h2>
                  <p className="admin-section-subtitle">
                    Create new games with configurable settings, word categories, and grid sizes
                  </p>
                  <GameCreator />
                      </div>
                    </Tab.Pane>
                  </Tab.Content>
          </div>
            </Tab.Container>
      </Container>
    </div>
  );
} 