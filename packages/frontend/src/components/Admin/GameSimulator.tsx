/**
 * GameSimulator Component
 * 
 * Multi-user game testing interface for conference administration.
 * Left panel for player management, main area for active player's bingo card and leaderboard.
 */

import { useState, useEffect } from "react";
import { API } from "aws-amplify";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import Alert from "react-bootstrap/Alert";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";

import { LeaderboardTable } from "../Leaderboard/LeaderboardTable";
import { BingoGrid } from "../BingoGrid/BingoGrid";
import { SessionInfo, BingoCard } from "../../types/game";
import { useWebSocketLeaderboard } from "../../hooks/useWebSocketLeaderboard";
import "./GameSimulator.css";

// Types - extending the standard SessionInfo for GameSimulator specific needs
interface GameSimulatorSessionInfo extends SessionInfo {
  // All properties come from the standard SessionInfo interface
}

// LocalStorage key for persisting test sessions
const GAME_SIMULATOR_SESSIONS_KEY = 'buzzword-bingo-game-simulator-sessions';

export default function GameSimulator() {
  // State management
  const [sessions, setSessions] = useState<GameSimulatorSessionInfo[]>([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState<number | null>(null);
  const [bingoCards, setBingoCards] = useState<{[sessionId: string]: BingoCard}>({});
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("bingo-card");

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
  const generateBingoCard = async (session: GameSimulatorSessionInfo) => {
    try {
      const result = await API.get("api", `/bingo/${session.currentGameId}`, {
        headers: {
          Authorization: `Bearer ${session.signedToken}`
        }
      });
      
      console.log("📄 Bingo card API response for", session.nickname, ":", result);
      console.log("📊 Words property type:", typeof result?.words);
      console.log("📊 Words property value:", result?.words);
      console.log("📊 Is words an array?", Array.isArray(result?.words));
      
      // Validate the bingo card structure
      if (!result || !result.words) {
        console.error("❌ Missing bingo card or words property:", result);
        setError(`Missing bingo card data for ${session.nickname}`);
        return;
      }
      
      // If words is an object (possibly a 5x5 object), try to convert it to array format
      let wordsArray;
      if (Array.isArray(result.words)) {
        wordsArray = result.words;
      } else if (typeof result.words === 'object' && result.words !== null) {
        console.log("🔄 Converting words object to array...");
        // Try to convert object to 2D array
        // Check if it's an object with numeric keys (like {"0": ["word1", "word2"], "1": [...], ...})
        const keys = Object.keys(result.words);
        console.log("📊 Object keys:", keys);
        
        if (keys.every(key => !isNaN(parseInt(key)))) {
          // Convert object with numeric keys to array
          wordsArray = keys.sort((a, b) => parseInt(a) - parseInt(b)).map(key => result.words[key]);
          console.log("✅ Converted object to array:", wordsArray);
        } else {
          console.error("❌ Cannot convert words object to array:", result.words);
          setError(`Cannot convert bingo card words for ${session.nickname}. Unknown object structure.`);
          return;
        }
      } else {
        console.error("❌ Invalid bingo card structure:", result);
        setError(`Invalid bingo card data for ${session.nickname}. Expected 'words' array but got: ${typeof result?.words}`);
        return;
      }
      
      // Validate the converted/original array
      if (!Array.isArray(wordsArray)) {
        console.error("❌ Failed to get valid words array:", wordsArray);
        setError(`Failed to process bingo card for ${session.nickname}`);
        return;
      }
      
      // Validate each row is an array
      const invalidRows = wordsArray.filter((row: any, index: number) => {
        if (!Array.isArray(row)) {
          console.error(`❌ Invalid row ${index}:`, row);
          return true;
        }
        return false;
      });
      
      if (invalidRows.length > 0) {
        console.error("❌ Invalid rows found:", invalidRows);
        setError(`Invalid bingo card rows for ${session.nickname}`);
        return;
      }
      
      // Store the bingo card with the corrected words array
      const correctedBingoCard = {
        ...result,
        words: wordsArray
      };
      
      setBingoCards(prev => ({
        ...prev,
        [session.sessionId]: correctedBingoCard
      }));
      
      console.log("✅ Successfully loaded bingo card for", session.nickname);
      
    } catch (error) {
      console.error("Generate bingo card error:", error);
      setError("Failed to generate bingo card for " + session.nickname + ": " + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(GAME_SIMULATOR_SESSIONS_KEY);
      if (saved) {
        const savedSessions: GameSimulatorSessionInfo[] = JSON.parse(saved);
        console.log('🔄 Loading saved game simulation sessions:', savedSessions.length);
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
        localStorage.setItem(GAME_SIMULATOR_SESSIONS_KEY, JSON.stringify(sessions));
        console.log('💾 Saved game simulation sessions to localStorage:', sessions.length);
      } catch (error) {
        console.error('Failed to save sessions:', error);
      }
    } else {
      // Clear localStorage when no sessions
      localStorage.removeItem(GAME_SIMULATOR_SESSIONS_KEY);
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
      const sessionInfo: GameSimulatorSessionInfo = {
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
      console.log("❌ Cannot mark word: missing session or bingo card");
      return;
    }

    // Ensure markedWords exists and is an array
    const currentMarkedWords = activeBingoCard.markedWords || [];
    
    // Don't mark if already marked or if it's the free space
    if (currentMarkedWords.includes(word) || word === "SYNERGY (FREE)") {
      console.log("ℹ️ Word already marked or is free space:", word);
      return;
    }

    try {
      console.log("🎯 Marking word:", word);
      
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
          markedWords: [...currentMarkedWords, word]
        }
      }));
      
      console.log("✅ Successfully marked word:", word);
      
    } catch (error) {
      console.error("Mark word error:", error);
      setError("Failed to mark word: " + word + " - " + (error instanceof Error ? error.message : String(error)));
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
      localStorage.removeItem(GAME_SIMULATOR_SESSIONS_KEY);
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
    <div className="game-simulator">
      <div className="container-fluid h-100">
        <div className="row h-100">
          {/* Left Panel - Player Management */}
          <div className="col-12 col-lg-3 col-xl-3 game-simulator__left-panel">
         

            {/* Add Player Form */}
            <div className="game-simulator__add-player">
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
                  className="game-simulator__add-btn"
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
              <div className="game-simulator__game-info">
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
            <div className="game-simulator__players-list">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0 small fw-bold">Players ({sessions.length})</h6>
                {sessions.length > 0 && (
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    onClick={clearAllPlayers}
                    className="game-simulator__clear-btn"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              
              {sessions.length === 0 ? (
                <div className="game-simulator__empty-state">
                  <div className="text-muted small text-center py-4">
                    Add players to start testing game interactions
                    <div className="mt-1 text-xs">
                      💾 Players persist across page refreshes
                    </div>
                  </div>
                </div>
              ) : (
                <div className="game-simulator__player-cards">
                  {sessions.map((session, index) => (
                    <div
                      key={session.sessionId}
                      className={`game-simulator__player-card ${
                        activeSessionIndex === index ? 'game-simulator__player-card--active' : ''
                      }`}
                      onClick={() => switchToPlayer(index)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="game-simulator__player-info">
                          <div className="game-simulator__player-name">{session.nickname}</div>
                          <div className="game-simulator__player-details">
                            {bingoCards[session.sessionId] ? (
                              <span className="text-success small">
                                ✓ {bingoCards[session.sessionId].markedWords?.length || 0}/24 words
                              </span>
                            ) : (
                              <span className="text-muted small">Loading card...</span>
                            )}
                          </div>
                        </div>
                        <div className="game-simulator__player-actions">
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
                            className="game-simulator__remove-btn"
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
          <div className="col-12 col-lg-9 col-xl-9 game-simulator__main-panel">
            {!activeSession ? (
              <div className="game-simulator__welcome">
                <div className="text-center py-5">
                  <h3 className="text-muted mb-3">🎯 Multi-User Game Simulation</h3>
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
              <div className="game-simulator__active-game">
                {/* Active Player Header */}
                <div className="game-simulator__active-header">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">
                    <div>
                      <h4 className="mb-1">🎲 {activeSession.nickname}'s View</h4>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge ${isConnected ? 'bg-success' : 'bg-danger'}`}>
                        {isConnected ? '🟢 Live' : '🔴 Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabbed Content */}
                <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || "bingo-card")}>
                  {/* Tab Navigation */}
                  <Nav variant="tabs" className="game-simulator__tabs mb-3">
                    <Nav.Item>
                      <Nav.Link eventKey="bingo-card" className="game-simulator__tab">
                        <span className="game-simulator__tab-icon">🎯</span>
                        Bingo Card
                        {activeBingoCard && activeBingoCard.markedWords && (
                          <Badge bg="primary" className="ms-2">
                            {activeBingoCard.markedWords.length}/24
                          </Badge>
                        )}
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="leaderboard" className="game-simulator__tab">
                        <span className="game-simulator__tab-icon">🏆</span>
                        Leaderboard
                        {leaderboard && (
                          <Badge bg="secondary" className="ms-2">
                            {leaderboard.leaderboard.length} players
                          </Badge>
                        )}
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>

                  {/* Tab Content */}
                  <Tab.Content className="game-simulator__tab-content">
                    {/* Bingo Card Tab */}
                    <Tab.Pane eventKey="bingo-card">
                      <div className="game-simulator__bingo-tab">
                        {activeBingoCard && activeBingoCard.words && Array.isArray(activeBingoCard.words) ? (
                          <div className="row justify-content-center">
                            <div className="col-12 col-lg-8 col-xl-6">
                              <BingoGrid
                                bingoCard={activeBingoCard}
                                markingWord={null}
                                onMarkWord={markWord}
                                gameStatus="playing"
                                disabled={false}
                              />
                              
                              {/* Progress Stats */}
                              <div className="game-simulator__bingo-stats mt-3">
                                <div className="row text-center">
                                  <div className="col-4">
                                    <div className="game-simulator__stat">
                                      <div className="game-simulator__stat-value text-primary">
                                        {activeBingoCard.markedWords ? activeBingoCard.markedWords.length : 0}
                                      </div>
                                      <div className="game-simulator__stat-label">Words Marked</div>
                                    </div>
                                  </div>
                                  <div className="col-4">
                                    <div className="game-simulator__stat">
                                      <div className="game-simulator__stat-value text-success">
                                        {activeBingoCard.markedWords ? activeBingoCard.markedWords.length * 10 : 0}
                                      </div>
                                      <div className="game-simulator__stat-label">Points</div>
                                    </div>
                                  </div>
                                  <div className="col-4">
                                    <div className="game-simulator__stat">
                                      <div className="game-simulator__stat-value text-info">
                                        {activeBingoCard.markedWords ? Math.round((activeBingoCard.markedWords.length / 24) * 100) : 0}%
                                      </div>
                                      <div className="game-simulator__stat-label">Progress</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : activeBingoCard ? (
                          <div className="game-simulator__error">
                            <div className="text-center py-4">
                              <div className="text-danger">
                                <p>⚠️ Invalid bingo card data</p>
                                <details>
                                  <summary>Debug Info</summary>
                                  <pre style={{fontSize: '0.75rem', textAlign: 'left'}}>
                                    {JSON.stringify(activeBingoCard, null, 2)}
                                  </pre>
                                </details>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="game-simulator__loading">
                            <div className="text-center py-4">
                              <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                              </div>
                              <p className="text-muted mt-2">Generating bingo card...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Tab.Pane>

                    {/* Leaderboard Tab */}
                    <Tab.Pane eventKey="leaderboard">
                      <div className="game-simulator__leaderboard-tab">
                        <div className="row justify-content-center">
                          <div className="col-12 col-lg-10 col-xl-8">
                            {leaderboard ? (
                              <div className="game-simulator__leaderboard-content">
                                <LeaderboardTable
                                  leaderboard={leaderboard}
                                  currentSession={activeSession as SessionInfo | undefined}
                                  showDetails={true}
                                  isConnected={isConnected}
                                  gameStatus={webSocketGameStatus || "active"}
                                  gameId={effectiveGameId}
                                  displayMode="personal"
                                />
                              </div>
                            ) : (
                              <div className="game-simulator__loading">
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
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Tab.Pane>
                  </Tab.Content>
                </Tab.Container>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
