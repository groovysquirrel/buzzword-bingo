/**
 * SystemTester Component
 * 
 * Multi-user game testing interface for conference administration.
 * Left panel for player management, main area for active player's bingo card and leaderboard.
 */

import { useState,  useEffect } from "react";
import { API } from "aws-amplify";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import Alert from "react-bootstrap/Alert";

import { LeaderboardTable } from "./Leaderboard/LeaderboardTable";
import { SessionInfo, BingoCard } from "../types/game";
import { useWebSocketLeaderboard } from "../hooks/useWebSocketLeaderboard";
import "./SystemTester.css";

// Types - extending the standard SessionInfo for SystemTester specific needs
interface SystemTesterSessionInfo extends SessionInfo {
  // All properties come from the standard SessionInfo interface
}

// LocalStorage key for persisting test sessions
const SYSTEM_TESTER_SESSIONS_KEY = 'buzzword-bingo-system-tester-sessions';

export default function SystemTester() {
  // State management
  const [sessions, setSessions] = useState<SystemTesterSessionInfo[]>([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState<number | null>(null);
  const [bingoCards, setBingoCards] = useState<{[sessionId: string]: BingoCard}>({});
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);

  // WebSocket for real-time updates - use the effective game ID
  const effectiveGameId = gameId || (sessions.length > 0 ? sessions[0].currentGameId : null);
  
  // Use the same WebSocket leaderboard hook as the main Leaderboard component
  const {
    leaderboard,
    loading: leaderboardLoading,
    error: leaderboardError,
    isConnected,
    clearError: clearLeaderboardError,
    gameStatus: webSocketGameStatus
  } = useWebSocketLeaderboard(effectiveGameId);

  const activeSession = activeSessionIndex !== null ? sessions[activeSessionIndex] : null;
  const activeBingoCard = activeSession ? bingoCards[activeSession.sessionId] : null;

  // Generate bingo card for a session
  const generateBingoCard = async (session: SystemTesterSessionInfo) => {
    try {
      const result = await API.get("api", `/bingo/${session.currentGameId}`, {
        headers: {
          Authorization: `Bearer ${session.signedToken}`
        }
      });
      
      setBingoCards(prev => ({
        ...prev,
        [session.sessionId]: result
      }));
      
    } catch (error) {
      console.error("Generate bingo card error:", error);
      setError("Failed to generate bingo card for " + session.nickname);
    }
  };

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SYSTEM_TESTER_SESSIONS_KEY);
      if (saved) {
        const savedSessions: SystemTesterSessionInfo[] = JSON.parse(saved);
        console.log('🔄 Loading saved test sessions:', savedSessions.length);
        setSessions(savedSessions);
        
        if (savedSessions.length > 0) {
          setActiveSessionIndex(0);
          setGameId(savedSessions[0].currentGameId);
          
          // Load bingo cards for all saved sessions
          savedSessions.forEach(session => {
            generateBingoCard(session);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load saved sessions:', error);
    }
  }, []);

  // Save sessions to localStorage whenever sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      try {
        localStorage.setItem(SYSTEM_TESTER_SESSIONS_KEY, JSON.stringify(sessions));
        console.log('💾 Saved test sessions to localStorage:', sessions.length);
      } catch (error) {
        console.error('Failed to save sessions:', error);
      }
    } else {
      // Clear localStorage when no sessions
      localStorage.removeItem(SYSTEM_TESTER_SESSIONS_KEY);
    }
  }, [sessions]);

  // Add a new player
  const addPlayer = async () => {
    if (!nickname.trim()) {
      setError("Please enter a nickname");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Join the game
      const result = await API.post("api", "/join", {
        body: { nickname: nickname.trim() }
      });
      
      // Add joinedAt timestamp to match SessionInfo interface
      const sessionInfo: SystemTesterSessionInfo = {
        ...result,
        joinedAt: new Date().toISOString()
      };
      
      // Add to sessions
      const newSessions = [...sessions, sessionInfo];
      setSessions(newSessions);
      
      // Set as active if it's the first player
      if (sessions.length === 0) {
        setActiveSessionIndex(0);
        setGameId(sessionInfo.currentGameId);
      } else {
        setActiveSessionIndex(newSessions.length - 1);
      }
      
      // Generate bingo card for the new player
      await generateBingoCard(sessionInfo);
      
      setNickname("");
      
    } catch (error) {
      console.error("Add player error:", error);
      setError("Failed to add player: " + (error instanceof Error ? error.message : String(error)));
    }
    setLoading(false);
  };

  // Mark a word on the bingo card
  const markWord = async (word: string) => {
    if (!activeSession || !activeBingoCard) {
      return;
    }

    // Don't mark if already marked or if it's the free space
    if (activeBingoCard.markedWords.includes(word) || word === "SYNERGY (FREE)") {
      return;
    }

    try {
      await API.post("api", `/bingo/${activeSession.currentGameId}/mark`, {
        headers: {
          Authorization: `Bearer ${activeSession.signedToken}`
        },
        body: { word }
      });
      
      // Update local state
      setBingoCards(prev => ({
        ...prev,
        [activeSession.sessionId]: {
          ...prev[activeSession.sessionId],
          markedWords: [...prev[activeSession.sessionId].markedWords, word]
        }
      }));
      
    } catch (error) {
      console.error("Mark word error:", error);
      setError("Failed to mark word: " + word);
    }
  };

  // Switch to a different player
  const switchToPlayer = async (index: number) => {
    setActiveSessionIndex(index);
    const session = sessions[index];
    
    // Generate bingo card if we don't have one yet
    if (!bingoCards[session.sessionId]) {
      await generateBingoCard(session);
    }
  };

  // Remove a player
  const removePlayer = (index: number) => {
    const sessionToRemove = sessions[index];
    const newSessions = sessions.filter((_, i) => i !== index);
    setSessions(newSessions);
    
    // Remove their bingo card
    setBingoCards(prev => {
      const newCards = { ...prev };
      delete newCards[sessionToRemove.sessionId];
      return newCards;
    });
    
    // Adjust active index
    if (activeSessionIndex === index) {
      setActiveSessionIndex(newSessions.length > 0 ? 0 : null);
    } else if (activeSessionIndex !== null && activeSessionIndex > index) {
      setActiveSessionIndex(activeSessionIndex - 1);
    }
    
    // Update gameId if needed
    if (newSessions.length > 0) {
      setGameId(newSessions[0].currentGameId);
    } else {
      setGameId(null);
    }
  };

  // Clear all players
  const clearAllPlayers = () => {
    if (confirm("Remove all players and start fresh?")) {
      setSessions([]);
      setBingoCards({});
      setActiveSessionIndex(null);
      setGameId(null);
      setError(null);
      localStorage.removeItem(SYSTEM_TESTER_SESSIONS_KEY);
    }
  };

  // Clear any errors
  const clearError = () => {
    setError(null);
    if (leaderboardError) {
      clearLeaderboardError();
    }
  };

  // Combine errors
  const combinedError = error || leaderboardError;

  return (
    <div className="system-tester">
      <div className="container-fluid h-100">
        <div className="row h-100">
          {/* Left Panel - Player Management */}
          <div className="col-12 col-lg-3 col-xl-3 system-tester__left-panel">
            <div className="system-tester__panel-header">
              <h4 className="system-tester__panel-title">Game Testing</h4>
              <p className="system-tester__panel-subtitle">
                Add players to test multi-user interactions
              </p>
            </div>

            {/* Add Player Form */}
            <div className="system-tester__add-player">
              <Form.Label className="fw-semibold small mb-2">Add Player</Form.Label>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter nickname"
                  size="sm"
                  disabled={loading}
                  onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                />
                <Button 
                  onClick={addPlayer} 
                  disabled={loading || !nickname.trim()}
                  size="sm"
                  className="system-tester__add-btn"
                >
                  {loading ? "..." : "Add"}
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {combinedError && (
              <Alert variant="danger" className="py-2 small mt-3" dismissible onClose={clearError}>
                {combinedError}
              </Alert>
            )}

            {/* Game Info */}
            {gameId && (
              <div className="system-tester__game-info">
                <div className="small text-muted">
                  <strong>Game ID:</strong> {gameId}
                </div>
                <div className="small text-muted">
                  <strong>Players:</strong> {sessions.length}
                </div>
                <div className="small text-muted">
                  <strong>WebSocket:</strong> <span className={isConnected ? "text-success" : "text-danger"}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
            )}

            {/* Players List */}
            <div className="system-tester__players-list">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0 small fw-bold">Players ({sessions.length})</h6>
                {sessions.length > 0 && (
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    onClick={clearAllPlayers}
                    className="system-tester__clear-btn"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              
              {sessions.length === 0 ? (
                <div className="system-tester__empty-state">
                  <div className="text-muted small text-center py-4">
                    Add players to start testing game interactions
                    <div className="mt-1 text-xs">
                      💾 Players persist across page refreshes
                    </div>
                  </div>
                </div>
              ) : (
                <div className="system-tester__player-cards">
                  {sessions.map((session, index) => (
                    <div
                      key={session.sessionId}
                      className={`system-tester__player-card ${
                        activeSessionIndex === index ? 'system-tester__player-card--active' : ''
                      }`}
                      onClick={() => switchToPlayer(index)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="system-tester__player-info">
                          <div className="system-tester__player-name">{session.nickname}</div>
                          <div className="system-tester__player-details">
                            {bingoCards[session.sessionId] ? (
                              <span className="text-success small">
                                ✓ {bingoCards[session.sessionId].markedWords.length}/24 words
                              </span>
                            ) : (
                              <span className="text-muted small">Loading card...</span>
                            )}
                          </div>
                        </div>
                        <div className="system-tester__player-actions">
                          {activeSessionIndex === index && (
                            <Badge bg="primary" className="me-2 small">Active</Badge>
                          )}
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePlayer(index);
                            }}
                            className="system-tester__remove-btn"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Panel - Game Content */}
          <div className="col-12 col-lg-9 col-xl-9 system-tester__main-panel">
            {!activeSession ? (
              <div className="system-tester__welcome">
                <div className="text-center py-5">
                  <h3 className="text-muted mb-3">🎯 Multi-User Game Testing</h3>
                  <p className="text-muted">
                    Add players on the left to start testing bingo card interactions, 
                    point scoring, and real-time leaderboard updates.
                  </p>
                  <p className="text-muted small">
                    💾 Test players are automatically saved and restored when you refresh the page.
                  </p>
                </div>
              </div>
            ) : (
              <div className="system-tester__active-game">
                {/* Active Player Header */}
                <div className="system-tester__active-header">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">
                    <div>
                      <h4 className="mb-1">🎲 {activeSession.nickname}'s Bingo Card</h4>
                      <p className="text-muted small mb-0">
                        Tap words to mark them and see points update in real-time
                      </p>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge ${isConnected ? 'bg-success' : 'bg-danger'}`}>
                        {isConnected ? '🟢 Live' : '🔴 Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Game Content - Responsive Layout */}
                <div className="row g-3">
                  {/* Bingo Card Section */}
                  <div className="col-12 col-xl-7">
                    <div className="system-tester__bingo-container">
                      {activeBingoCard ? (
                        <div className="system-tester__bingo-section">
                          <div className="system-tester__bingo-table-container">
                            <table className="system-tester__bingo-table">
                              <tbody>
                                {activeBingoCard.words.map((row, rowIndex) => (
                                  <tr key={rowIndex}>
                                    {row.map((word, colIndex) => (
                                      <td
                                        key={colIndex}
                                        className={`system-tester__bingo-cell ${
                                          activeBingoCard.markedWords.includes(word) || word === "SYNERGY (FREE)" 
                                            ? word === "SYNERGY (FREE)" 
                                              ? 'system-tester__bingo-cell--free' 
                                              : 'system-tester__bingo-cell--marked'
                                            : ''
                                        }`}
                                        onClick={() => markWord(word)}
                                      >
                                        {word === "SYNERGY (FREE)" ? "🚀 FREE" : word}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          <div className="system-tester__bingo-stats">
                            <div className="row text-center">
                              <div className="col-4">
                                <div className="fw-bold text-primary">
                                  {activeBingoCard.markedWords.length}
                                </div>
                                <div className="small text-muted">Words Marked</div>
                              </div>
                              <div className="col-4">
                                <div className="fw-bold text-success">
                                  {activeBingoCard.markedWords.length * 10}
                                </div>
                                <div className="small text-muted">Points</div>
                              </div>
                              <div className="col-4">
                                <div className="fw-bold text-info">
                                  {Math.round((activeBingoCard.markedWords.length / 24) * 100)}%
                                </div>
                                <div className="small text-muted">Progress</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="system-tester__loading">
                          <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="text-muted mt-2">Generating bingo card...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Leaderboard Section */}
                  <div className="col-12 col-xl-5">
                    <div className="system-tester__leaderboard-container">
                      <div className="system-tester__leaderboard-section">
                        <h5 className="mb-3">🏆 Leaderboard</h5>
                        <div className="system-tester__leaderboard-content">
                          {leaderboard ? (
                            <LeaderboardTable
                              leaderboard={leaderboard}
                              currentSession={activeSession as SessionInfo | undefined}
                              showDetails={true}
                              isConnected={isConnected}
                              gameStatus={webSocketGameStatus || "active"}
                              gameId={effectiveGameId}
                              displayMode="personal"
                            />
                          ) : (
                            <div className="text-center py-4">
                              <div className="text-muted">
                                {leaderboardLoading ? (
                                  <>
                                    <div className="spinner-border spinner-border-sm text-primary mb-2" role="status">
                                      <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <div>Loading leaderboard...</div>
                                  </>
                                ) : (
                                  <>
                                    <div className="mb-2">📊</div>
                                    <div>No leaderboard data available</div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
