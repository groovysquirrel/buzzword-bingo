import { useState, useRef, useEffect } from "react";
import { API } from "aws-amplify";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import Table from "react-bootstrap/Table";
import Alert from "react-bootstrap/Alert";
import ListGroup from "react-bootstrap/ListGroup";
import { WebSocketService, getPublicToken } from "../lib/websocket";

interface SessionInfo {
  sessionId: string;
  signedToken: string;
  nickname: string;
  currentGameId: string;
}

interface BingoCard {
  gameId: string;
  sessionId: string;
  words: string[][];
  markedWords: string[];
}

interface LeaderboardEntry {
  nickname: string;
  sessionId: string;
  progressPercentage: number;
  wordsMarked: number;
  totalWords: number;
  points: number;
}

interface LeaderboardResponse {
  gameId: string;
  timestamp: string;
  totalPlayers: number;
  leaderboard: LeaderboardEntry[];
}

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

interface WebSocketMessage {
  timestamp: string;
  type: string;
  data: any;
  source: 'user' | 'public';
}

interface PublicTokenResponse {
  success: boolean;
  deviceId: string;
  publicToken: string;
  permissions: string[];
  expiresAt: string | null;
  timestamp: string;
}

export default function BingoTest() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState<number | null>(null);
  const [bingoCard, setBingoCard] = useState<BingoCard | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistoryResponse | null>(null);
  const [nickname, setNickname] = useState("");
  const [testResults, setTestResults] = useState<any>(null);
  const [adminResults, setAdminResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // WebSocket testing state
  const [_wsUserService, setWsUserService] = useState<WebSocketService | null>(null);
  const [_wsPublicService, setWsPublicService] = useState<WebSocketService | null>(null);
  const [wsUserStatus, setWsUserStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [wsPublicStatus, setWsPublicStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [wsMessages, setWsMessages] = useState<WebSocketMessage[]>([]);
  const [publicTokenData, setPublicTokenData] = useState<PublicTokenResponse | null>(null);
  const [wsErrors, setWsErrors] = useState<string[]>([]);
  const [wsStatusMessages, setWsStatusMessages] = useState<string[]>([]);

  const wsUserRef = useRef<WebSocketService | null>(null);
  const wsPublicRef = useRef<WebSocketService | null>(null);

  const activeSession = activeSessionIndex !== null ? sessions[activeSessionIndex] : null;

  // Cleanup WebSocket connections on unmount
  useEffect(() => {
    return () => {
      if (wsUserRef.current) {
        wsUserRef.current.disconnect();
      }
      if (wsPublicRef.current) {
        wsPublicRef.current.disconnect();
      }
    };
  }, []);

  const addWsMessage = (type: string, data: any, source: 'user' | 'public') => {
    const message: WebSocketMessage = {
      timestamp: new Date().toISOString(),
      type,
      data,
      source
    };
    setWsMessages(prev => [message, ...prev.slice(0, 49)]); // Keep last 50 messages
  };

  const addWsError = (error: string) => {
    setWsErrors(prev => [error, ...prev.slice(0, 9)]); // Keep last 10 errors
  };

  const addWsStatus = (status: string) => {
    setWsStatusMessages(prev => [status, ...prev.slice(0, 9)]); // Keep last 10 status messages
  };

  const generatePublicToken = async () => {
    setLoading(true);
    try {
      const token = await getPublicToken();
      if (token) {
        // Get the device ID from localStorage
        const deviceId = localStorage.getItem('buzzword-bingo-device-id') || 'unknown';
        
        setPublicTokenData({
          success: true,
          deviceId,
          publicToken: token,
          permissions: ['read_leaderboard', 'read_events'],
          expiresAt: null,
          timestamp: new Date().toISOString()
        });
        console.log('Generated public token for device:', deviceId);
      } else {
        throw new Error('Failed to generate public token');
      }
    } catch (error) {
      console.error('Public token generation error:', error);
      addWsError(`Public token generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    setLoading(false);
  };

  const connectUserWebSocket = async () => {
    if (!activeSession) {
      alert('Please select an active player first');
      return;
    }

    if (wsUserRef.current?.isConnected()) {
      console.log('User WebSocket already connected');
      return;
    }

    try {
      // Disconnect existing connection if any
      if (wsUserRef.current) {
        wsUserRef.current.disconnect();
      }

      setWsUserStatus('connecting');
      addWsStatus('User WebSocket: Connecting...');

      const wsUrl = process.env.NODE_ENV === 'development' 
        ? 'wss://ws-dev.buzzwordbingo.live'
        : 'wss://ws.buzzwordbingo.live';
      
      console.log('Creating user WebSocket service');
      
      const service = new WebSocketService({
        url: wsUrl,
        token: activeSession.signedToken,
        maxReconnectAttempts: 3,
        reconnectDelay: 1000
      });

      // Set up event listeners
      service.on('connectionChange', (isConnected: boolean) => {
        setWsUserStatus(isConnected ? 'connected' : 'disconnected');
        addWsMessage('connection', { 
          status: isConnected ? 'connected' : 'disconnected', 
          user: activeSession.nickname 
        }, 'user');
      });

      service.on('message', (data: any) => {
        console.log('User WebSocket message:', data);
        addWsMessage('message', data, 'user');
        
        // Handle leaderboard updates automatically
        if (data.type === 'leaderboard_update' && data.leaderboard) {
          const leaderboardResponse: LeaderboardResponse = {
            gameId: data.gameId,
            timestamp: data.timestamp,
            totalPlayers: data.totalPlayers || data.leaderboard.length,
            leaderboard: data.leaderboard
          };
          setLeaderboard(leaderboardResponse);
          console.log('Updated leaderboard from WebSocket:', leaderboardResponse);
        }
      });

      service.on('error', (error: Error) => {
        console.error('User WebSocket error:', error);
        setWsUserStatus('error');
        addWsError(`User WebSocket error: ${error.message}`);
      });

      service.on('statusUpdate', (status: string) => {
        addWsStatus(`User WebSocket: ${status}`);
      });

      // Store service reference
      wsUserRef.current = service;
      setWsUserService(service);

      // Connect
      await service.connect();
      
      // Subscribe to game updates if connected
      if (service.isConnected()) {
        service.sendMessage({
          action: 'subscribe',
          gameId: activeSession.currentGameId
        });
      }

    } catch (error) {
      console.error('Failed to create user WebSocket:', error);
      setWsUserStatus('error');
      addWsError(`Failed to create user WebSocket: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const connectPublicWebSocket = async () => {
    if (!publicTokenData) {
      await generatePublicToken();
      return;
    }

    if (wsPublicRef.current?.isConnected()) {
      console.log('Public WebSocket already connected');
      return;
    }

    try {
      // Disconnect existing connection if any
      if (wsPublicRef.current) {
        wsPublicRef.current.disconnect();
      }

      setWsPublicStatus('connecting');
      addWsStatus('Public WebSocket: Connecting...');

      const wsUrl = process.env.NODE_ENV === 'development' 
        ? 'wss://ws-dev.buzzwordbingo.live'
        : 'wss://ws.buzzwordbingo.live';
      
      console.log('Creating public WebSocket service');
      
      const service = new WebSocketService({
        url: wsUrl,
        token: publicTokenData.publicToken,
        maxReconnectAttempts: 3,
        reconnectDelay: 1000
      });

      // Set up event listeners
      service.on('connectionChange', (isConnected: boolean) => {
        setWsPublicStatus(isConnected ? 'connected' : 'disconnected');
        addWsMessage('connection', { 
          status: isConnected ? 'connected' : 'disconnected', 
          deviceId: publicTokenData.deviceId 
        }, 'public');
      });

      service.on('message', (data: any) => {
        console.log('Public WebSocket message:', data);
        addWsMessage('message', data, 'public');
        
        // Handle leaderboard updates automatically
        if (data.type === 'leaderboard_update' && data.leaderboard) {
          const leaderboardResponse: LeaderboardResponse = {
            gameId: data.gameId,
            timestamp: data.timestamp,
            totalPlayers: data.totalPlayers || data.leaderboard.length,
            leaderboard: data.leaderboard
          };
          setLeaderboard(leaderboardResponse);
          console.log('Updated leaderboard from WebSocket (public):', leaderboardResponse);
        }
      });

      service.on('error', (error: Error) => {
        console.error('Public WebSocket error:', error);
        setWsPublicStatus('error');
        addWsError(`Public WebSocket error: ${error.message}`);
      });

      service.on('statusUpdate', (status: string) => {
        addWsStatus(`Public WebSocket: ${status}`);
      });

      // Store service reference
      wsPublicRef.current = service;
      setWsPublicService(service);

      // Connect
      await service.connect();
      
      // Subscribe to game updates if connected and we have a game
      if (service.isConnected() && sessions.length > 0) {
        service.sendMessage({
          action: 'subscribe',
          gameId: sessions[0].currentGameId
        });
      }

    } catch (error) {
      console.error('Failed to create public WebSocket:', error);
      setWsPublicStatus('error');
      addWsError(`Failed to create public WebSocket: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const disconnectUserWebSocket = () => {
    if (wsUserRef.current) {
      wsUserRef.current.disconnect();
      wsUserRef.current = null;
      setWsUserService(null);
    }
    setWsUserStatus('disconnected');
  };

  const disconnectPublicWebSocket = () => {
    if (wsPublicRef.current) {
      wsPublicRef.current.disconnect();
      wsPublicRef.current = null;
      setWsPublicService(null);
    }
    setWsPublicStatus('disconnected');
  };

  const clearWebSocketLogs = () => {
    setWsMessages([]);
    setWsErrors([]);
    setWsStatusMessages([]);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'error': return 'danger';
      default: return 'secondary';
    }
  };

  const clearLocalStorage = () => {
    localStorage.removeItem("buzzword-bingo-session");
    alert("Local storage cleared! You can now test the join flow from scratch.");
  };

  const testAPI = async () => {
    setLoading(true);
    try {
      const result = await API.get("api", "/admin/test", {});
      setTestResults(result);
    } catch (error) {
      console.error("Test API error:", error);
      setTestResults({ error: error instanceof Error ? error.message : String(error) });
    }
    setLoading(false);
  };

  const joinGame = async () => {
    if (!nickname.trim()) {
      alert("Please enter a nickname");
      return;
    }

    setLoading(true);
    try {
      const result = await API.post("api", "/join", {
        body: { nickname: nickname.trim() }
      });
      
      // Add new session to the list
      setSessions(prev => [...prev, result]);
      setActiveSessionIndex(sessions.length); // Set as active session
      setNickname(""); // Clear input for next player
      
      console.log("Joined game:", result);
    } catch (error) {
      console.error("Join game error:", error);
      alert("Failed to join game: " + (error instanceof Error ? error.message : String(error)));
    }
    setLoading(false);
  };

  const getBingoCard = async () => {
    if (!activeSession) {
      alert("Please select an active player first");
      return;
    }

    setLoading(true);
    try {
      const result = await API.get("api", `/bingo/${activeSession.currentGameId}`, {
        headers: {
          Authorization: `Bearer ${activeSession.signedToken}`
        }
      });
      setBingoCard(result);
      console.log("Got bingo card:", result);
    } catch (error) {
      console.error("Get bingo card error:", error);
      alert("Failed to get bingo card: " + (error instanceof Error ? error.message : String(error)));
    }
    setLoading(false);
  };

  const markWord = async (word: string) => {
    if (!activeSession || !bingoCard) {
      alert("Please get a bingo card first");
      return;
    }

    try {
      const result = await API.post("api", `/bingo/${activeSession.currentGameId}/mark`, {
        headers: {
          Authorization: `Bearer ${activeSession.signedToken}`
        },
        body: { word }
      });
      
      // Update the marked words locally
      setBingoCard(prev => prev ? {
        ...prev,
        markedWords: [...prev.markedWords, word]
      } : null);
      
      console.log("Marked word:", result);
    } catch (error) {
      console.error("Mark word error:", error);
      alert("Failed to mark word: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const getLeaderboard = async () => {
    if (sessions.length === 0) {
      alert("Please add some players first");
      return;
    }

    setLoading(true);
    try {
      const gameId = sessions[0].currentGameId; // Use first session's game ID
      // Use the SSE endpoint which provides the same data plus events
      const result = await API.get("api", `/leaderboard/${gameId}/stream`, {});
      
      // Transform SSE response to match the expected format
      if (result.type === "leaderboard_update") {
        const leaderboardResponse = {
          gameId: result.gameId,
          timestamp: result.timestamp,
          totalPlayers: result.leaderboard?.length || 0,
          leaderboard: result.leaderboard || []
        };
        setLeaderboard(leaderboardResponse);
        console.log("Got leaderboard:", leaderboardResponse);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Get leaderboard error:", error);
      alert("Failed to get leaderboard: " + (error instanceof Error ? error.message : String(error)));
    }
    setLoading(false);
  };

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

  const resetGame = async () => {
    if (sessions.length === 0) {
      alert("Please add some players first");
      return;
    }

    if (!confirm("Are you sure you want to reset the game? This will clear all progress.")) {
      return;
    }

    setLoading(true);
    try {
      const gameId = sessions[0].currentGameId;
      const result = await API.post("api", `/admin/games/${gameId}/reset`, {});
      setAdminResults(result);
      
      // Clear local state
      setBingoCard(null);
      setLeaderboard(null);
      
      console.log("Game reset:", result);
      alert("Game has been reset! All progress cleared.");
    } catch (error) {
      console.error("Reset game error:", error);
      alert("Failed to reset game: " + (error instanceof Error ? error.message : String(error)));
    }
    setLoading(false);
  };

  const startNewGame = async () => {
    if (sessions.length === 0) {
      alert("Please add some players first");
      return;
    }

    if (!confirm("Are you sure you want to start a new game? This will generate new bingo cards and clear all progress.")) {
      return;
    }

    setLoading(true);
    try {
      const currentGameId = sessions[0].currentGameId;
      const result = await API.post("api", `/admin/games/${currentGameId}/new`, {});
      setAdminResults(result);
      
      // Update all sessions with new game ID
      if (result.newGameId) {
        setSessions(prev => prev.map(session => ({
          ...session,
          currentGameId: result.newGameId
        })));
      }
      
      // Clear local state
      setBingoCard(null);
      setLeaderboard(null);
      
      console.log("New game started:", result);
      alert(`New game started! Game ID: ${result.newGameId}`);
    } catch (error) {
      console.error("Start new game error:", error);
      alert("Failed to start new game: " + (error instanceof Error ? error.message : String(error)));
    }
    setLoading(false);
  };

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
      setAdminResults(result);
      
      // Clear all local state
      setSessions([]);
      setActiveSessionIndex(null);
      setBingoCard(null);
      setLeaderboard(null);
      setGameHistory(null);
      setTestResults(null);
      
      console.log("System purge completed:", result);
      alert(`🚨 SYSTEM PURGED! Deleted ${result.totalItemsDeleted} total records from all tables.`);
    } catch (error) {
      console.error("System purge error:", error);
      alert("Failed to purge system: " + (error instanceof Error ? error.message : String(error)));
    }
    setLoading(false);
  };

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
    <div 
      className="min-vh-100"
      style={{ background: "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)" }}
    >
      <Container className="py-4">
        {/* Header */}
        <Row className="mb-4">
          <Col xs={12}>
            <Card className="border-0 shadow-sm text-center" style={{ borderRadius: "15px" }}>
              <Card.Body className="py-4">
                <div className="mb-3">
                  <img src="/bee.png" alt="Buzzword Bingo" height="60" />
                </div>
                <h1 className="h2 fw-bold mb-2" style={{ color: "#1F2937" }}>
                  Buzzword Bingo Test Interface
                </h1>
                <p className="text-muted mb-0">
                  Test the game mechanics and real-time features
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* API Test */}
        <Row className="mb-4">
          <Col xs={12}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: "15px" }}>
              <Card.Header 
                className="border-0 py-3"
                style={{ backgroundColor: "#F59E0B", borderRadius: "15px 15px 0 0" }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 text-white fw-bold">
                    🔧 1. API Connectivity Test
                  </h5>
                  <Button 
                    onClick={clearLocalStorage} 
                    disabled={loading}
                    variant="outline-light"
                    size="sm"
                  >
                    🗑️ Clear Storage
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                <Button 
                  onClick={testAPI} 
                  disabled={loading}
                  variant="outline-dark"
                  className="mb-3"
                >
                  {loading ? "Testing..." : "Test API Connection"}
                </Button>
                {testResults && (
                  <Alert variant={testResults.error ? "danger" : "success"}>
                    <pre className="mb-0" style={{ fontSize: "0.875rem" }}>
                      {JSON.stringify(testResults, null, 2)}
                    </pre>
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Add Players */}
        <Row className="mb-4">
          <Col xs={12}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: "15px" }}>
              <Card.Header 
                className="border-0 py-3"
                style={{ backgroundColor: "#1F2937", borderRadius: "15px 15px 0 0" }}
              >
                <h5 className="mb-0 text-white fw-bold">
                  👥 2. Add Test Players
                </h5>
              </Card.Header>
              <Card.Body>
                <Row className="align-items-end mb-3">
                  <Col xs={12} md={8}>
                    <Form.Label className="fw-semibold">Player Nickname</Form.Label>
                    <Form.Control
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Enter nickname"
                      style={{ borderColor: "#F59E0B" }}
                    />
                  </Col>
                  <Col xs={12} md={4} className="mt-3 mt-md-0">
                    <Button 
                      onClick={joinGame} 
                      disabled={loading}
                      style={{ backgroundColor: "#F59E0B", borderColor: "#F59E0B" }}
                      className="w-100"
                    >
                      {loading ? "Adding..." : "Add Player"}
                    </Button>
                  </Col>
                </Row>
                
                {sessions.length > 0 && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0 fw-bold">
                        Players ({sessions.length})
                      </h6>
                      <Badge bg="warning" text="dark">
                        Game: {sessions[0]?.currentGameId}
                      </Badge>
                    </div>
                    <Row className="g-2">
                      {sessions.map((session, index) => (
                        <Col xs={12} sm={6} md={4} key={session.sessionId}>
                          <Card
                            className={`h-100 cursor-pointer ${activeSessionIndex === index ? 'border-warning' : 'border-light'}`}
                            style={{ 
                              cursor: "pointer",
                              backgroundColor: activeSessionIndex === index ? "#FEF3C7" : "white"
                            }}
                            onClick={() => setActiveSessionIndex(index)}
                          >
                            <Card.Body className="p-3">
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <h6 className="mb-1 fw-bold">{session.nickname}</h6>
                                  <small className="text-muted">
                                    {session.sessionId.slice(0, 8)}...
                                  </small>
                                </div>
                                {activeSessionIndex === index && (
                                  <Badge bg="warning" text="dark">ACTIVE</Badge>
                                )}
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Get Bingo Card */}
        <Row className="mb-4">
          <Col xs={12}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: "15px" }}>
              <Card.Header 
                className="border-0 py-3"
                style={{ backgroundColor: "#1F2937", borderRadius: "15px 15px 0 0" }}
              >
                <h5 className="mb-0 text-white fw-bold">
                  🎲 3. Get Bingo Card
                </h5>
              </Card.Header>
              <Card.Body>
                <Button 
                  onClick={getBingoCard} 
                  disabled={loading || !activeSession}
                  variant="outline-dark"
                  className="mb-3"
                >
                  {loading ? "Loading..." : "Get Bingo Card"}
                </Button>
                {activeSession && <p>Active Player: <strong>{activeSession.nickname}</strong></p>}
                
                {bingoCard && (
                  <div className="mt-3">
                    <strong>Bingo Card for {activeSession?.nickname}:</strong>
                    <Table striped bordered hover>
                      <tbody>
                        {bingoCard.words.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((word, colIndex) => (
                              <td
                                key={colIndex}
                                style={{
                                  border: "1px solid black",
                                  padding: "8px",
                                  cursor: word !== "SYNERGY (FREE)" ? "pointer" : "default",
                                  backgroundColor: bingoCard.markedWords.includes(word) || word === "SYNERGY (FREE)" 
                                    ? "#90EE90" : "white",
                                  textAlign: "center",
                                  fontSize: "12px"
                                }}
                                onClick={() => word !== "SYNERGY (FREE)" && !bingoCard.markedWords.includes(word) && markWord(word)}
                              >
                                {word === "SYNERGY (FREE)" ? "🚀 SYNERGY" : word}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    <p>Marked words: {bingoCard.markedWords.length}/24 | Points: {bingoCard.markedWords.length * 10}</p>
                    <p>Click on words to mark them!</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Leaderboard */}
        <Row className="mb-4">
          <Col xs={12}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: "15px" }}>
              <Card.Header 
                className="border-0 py-3"
                style={{ backgroundColor: "#1F2937", borderRadius: "15px 15px 0 0" }}
              >
                <h5 className="mb-0 text-white fw-bold">
                  📊 4. Leaderboard
                </h5>
              </Card.Header>
              <Card.Body>
                <Button 
                  onClick={getLeaderboard} 
                  disabled={loading || sessions.length === 0}
                  variant="outline-dark"
                  className="mb-3"
                >
                  {loading ? "Loading..." : "Get Leaderboard"}
                </Button>
                
                {leaderboard && (
                  <div className="mt-3">
                    <h6>Leaderboard ({leaderboard.totalPlayers} players)</h6>
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Nickname</th>
                          <th>Points</th>
                          <th>Words Marked</th>
                          <th>Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.leaderboard.map((entry, index) => (
                          <tr key={entry.sessionId}>
                            <td>{index + 1}</td>
                            <td><strong>{entry.nickname}</strong></td>
                            <td>{entry.points}</td>
                            <td>{entry.wordsMarked}/{entry.totalWords}</td>
                            <td>{entry.progressPercentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    <p className="text-muted">
                      Last updated: {new Date(leaderboard.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* WebSocket Testing */}
        <Row className="mb-4">
          <Col xs={12}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: "15px" }}>
              <Card.Header 
                className="border-0 py-3"
                style={{ backgroundColor: "#059669", borderRadius: "15px 15px 0 0" }}
              >
                <h5 className="mb-0 text-white fw-bold">
                  🔌 4.5. WebSocket Connection Testing
                </h5>
              </Card.Header>
              <Card.Body>
                {/* Public Token Generation */}
                <Row className="mb-4">
                  <Col xs={12}>
                    <h6 className="fw-bold mb-3">📱 Public Token (Status Boards)</h6>
                    <div className="d-flex gap-2 mb-3">
                      <Button 
                        onClick={generatePublicToken} 
                        disabled={loading}
                        variant="outline-success"
                        size="sm"
                      >
                        {loading ? "Generating..." : "Generate Public Token"}
                      </Button>
                      {publicTokenData && (
                        <Badge bg="success">Token Generated</Badge>
                      )}
                    </div>
                    {publicTokenData && (
                      <Alert variant="success" className="mb-3">
                        <div className="mb-2">
                          <strong>Device ID:</strong> {publicTokenData.deviceId}
                        </div>
                        <div className="mb-2">
                          <strong>Permissions:</strong> {publicTokenData.permissions.join(', ')}
                        </div>
                        <div className="mb-2">
                          <strong>Token:</strong> <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                            {publicTokenData.publicToken.substring(0, 50)}...
                          </code>
                        </div>
                      </Alert>
                    )}
                  </Col>
                </Row>

                {/* WebSocket Connections */}
                <Row>
                  {/* User WebSocket */}
                  <Col xs={12} md={6} className="mb-3">
                    <Card className="h-100">
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold">👤 User WebSocket</span>
                        <Badge bg={getStatusBadgeVariant(wsUserStatus)}>
                          {wsUserStatus.toUpperCase()}
                        </Badge>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-flex gap-2 mb-3">
                          <Button 
                            onClick={connectUserWebSocket} 
                            disabled={loading || !activeSession || wsUserStatus === 'connected'}
                            variant="outline-primary"
                            size="sm"
                          >
                            Connect
                          </Button>
                          <Button 
                            onClick={disconnectUserWebSocket} 
                            disabled={wsUserStatus !== 'connected'}
                            variant="outline-danger"
                            size="sm"
                          >
                            Disconnect
                          </Button>
                        </div>
                        {activeSession ? (
                          <p className="mb-0 small text-muted">
                            Active Player: <strong>{activeSession.nickname}</strong>
                          </p>
                        ) : (
                          <p className="mb-0 small text-warning">
                            ⚠️ Select an active player first
                          </p>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Public WebSocket */}
                  <Col xs={12} md={6} className="mb-3">
                    <Card className="h-100">
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold">🌐 Public WebSocket</span>
                        <Badge bg={getStatusBadgeVariant(wsPublicStatus)}>
                          {wsPublicStatus.toUpperCase()}
                        </Badge>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-flex gap-2 mb-3">
                          <Button 
                            onClick={connectPublicWebSocket} 
                            disabled={loading || wsPublicStatus === 'connected'}
                            variant="outline-success"
                            size="sm"
                          >
                            {!publicTokenData ? 'Generate & Connect' : 'Connect'}
                          </Button>
                          <Button 
                            onClick={disconnectPublicWebSocket} 
                            disabled={wsPublicStatus !== 'connected'}
                            variant="outline-danger"
                            size="sm"
                          >
                            Disconnect
                          </Button>
                        </div>
                        {publicTokenData ? (
                          <p className="mb-0 small text-muted">
                            Device: <strong>{publicTokenData.deviceId.split('-')[1]}</strong>
                          </p>
                        ) : (
                          <p className="mb-0 small text-warning">
                            ⚠️ Generate public token first
                          </p>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* WebSocket Message Log */}
                <Row className="mt-4">
                  <Col xs={12}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0 fw-bold">📋 Real-Time Message Log</h6>
                      <Button 
                        onClick={clearWebSocketLogs} 
                        variant="outline-secondary"
                        size="sm"
                      >
                        Clear Logs
                      </Button>
                    </div>

                    {/* Error Messages */}
                    {wsErrors.length > 0 && (
                      <Alert variant="danger" className="mb-3">
                        <div className="fw-bold mb-2">🚨 Recent Errors:</div>
                        {wsErrors.slice(0, 3).map((error, index) => (
                          <div key={index} className="small">
                            • {error}
                          </div>
                        ))}
                      </Alert>
                    )}

                    {/* Status Messages */}
                    {wsStatusMessages.length > 0 && (
                      <Alert variant="info" className="mb-3">
                        <div className="fw-bold mb-2">ℹ️ Connection Status:</div>
                        {wsStatusMessages.slice(0, 3).map((status, index) => (
                          <div key={index} className="small">
                            • {status}
                          </div>
                        ))}
                      </Alert>
                    )}

                    {/* Message List */}
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {wsMessages.length > 0 ? (
                        <ListGroup>
                          {wsMessages.slice(0, 20).map((message, index) => (
                            <ListGroup.Item 
                              key={index}
                              className="d-flex justify-content-between align-items-start"
                            >
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <Badge bg={message.source === 'user' ? 'primary' : 'success'}>
                                    {message.source}
                                  </Badge>
                                  <Badge bg="secondary">{message.type}</Badge>
                                  <small className="text-muted">
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                  </small>
                                </div>
                                <pre className="mb-0 small" style={{ 
                                  fontSize: '0.75rem', 
                                  backgroundColor: '#f8f9fa',
                                  padding: '0.5rem',
                                  borderRadius: '4px',
                                  maxHeight: '100px',
                                  overflowY: 'auto'
                                }}>
                                  {JSON.stringify(message.data, null, 2)}
                                </pre>
                              </div>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      ) : (
                        <Alert variant="info" className="text-center">
                          No WebSocket messages yet. Connect to see real-time updates!
                        </Alert>
                      )}
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Game History */}
        <Row className="mb-4">
          <Col xs={12}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: "15px" }}>
              <Card.Header 
                className="border-0 py-3"
                style={{ backgroundColor: "#1F2937", borderRadius: "15px 15px 0 0" }}
              >
                <h5 className="mb-0 text-white fw-bold">
                  🕒 5. Game History
                </h5>
              </Card.Header>
              <Card.Body>
                <Button 
                  onClick={getGameHistory} 
                  disabled={loading}
                  variant="outline-dark"
                  className="mb-3"
                >
                  {loading ? "Loading..." : "Get Game History"}
                </Button>
                
                {gameHistory && (
                  <div className="mt-3">
                    <h6>Game History ({gameHistory.totalGames} total games)</h6>
                    <p>
                      <strong>Completed:</strong> {gameHistory.completedGames} | 
                      <strong> Active:</strong> {gameHistory.activeGames}
                    </p>
                    
                    {gameHistory.history.length > 0 ? (
                      <Table striped bordered hover>
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
                              <td>{game.gameId}</td>
                              <td>
                                <strong>{game.status.toUpperCase()}</strong>
                              </td>
                              <td>{formatDateTime(game.startTime)}</td>
                              <td>{game.endTime ? formatDateTime(game.endTime) : "—"}</td>
                              <td>{formatDuration(game.startTime, game.endTime)}</td>
                              <td>
                                {game.winner ? (
                                  <strong>{game.winner.nickname}</strong>
                                ) : (
                                  <span className="text-muted">No winner</span>
                                )}
                              </td>
                              <td>{game.winner ? game.winner.secretWord : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <p>No games found.</p>
                    )}
                    
                    <p className="text-muted">
                      Last updated: {new Date(gameHistory.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Status Board Link */}
        <Row className="mb-4">
          <Col xs={12}>
            <Alert variant="info" className="border-0 shadow-sm" style={{ borderRadius: "15px" }}>
              <Row className="align-items-center">
                <Col xs={12} md={8}>
                  <h5 className="mb-2 fw-bold">📊 Real-Time Status Board</h5>
                  <p className="mb-0">
                    Open the status board in a new tab to see real-time updates as you play!
                  </p>
                </Col>
                <Col xs={12} md={4} className="text-center text-md-end mt-3 mt-md-0">
                  <Button 
                    onClick={() => window.open('/status', '_blank')}
                    size="lg"
                    style={{ backgroundColor: "#059669", borderColor: "#059669" }}
                  >
                    🚀 Open Status Board
                  </Button>
                </Col>
              </Row>
              <hr className="my-3" />
              <small className="text-muted">
                Updates every 3 seconds with leaderboard changes and activity events
              </small>
            </Alert>
          </Col>
        </Row>

        {/* Admin Tools */}
        <Row className="mb-4">
          <Col xs={12}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: "15px" }}>
              <Card.Header 
                className="border-0 py-3"
                style={{ backgroundColor: "#1F2937", borderRadius: "15px 15px 0 0" }}
              >
                <h5 className="mb-0 text-white fw-bold">
                  🔧 6. Admin Tools
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Button 
                    onClick={resetGame} 
                    disabled={loading || sessions.length === 0}
                    variant="outline-dark"
                    className="me-2"
                  >
                    {loading ? "Resetting..." : "Reset Game"}
                  </Button>
                  <span className="text-muted">Clears all progress but keeps the same bingo cards</span>
                </div>
                
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Button 
                    onClick={startNewGame} 
                    disabled={loading || sessions.length === 0}
                    variant="outline-dark"
                    className="me-2"
                  >
                    {loading ? "Starting..." : "Start New Game"}
                  </Button>
                  <span className="text-muted">Generates new bingo cards and clears all progress</span>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Button 
                    onClick={clearLocalStorage} 
                    disabled={loading}
                    variant="outline-dark"
                    className="me-2"
                  >
                    {loading ? "Clearing..." : "Clear Local Storage"}
                  </Button>
                  <span className="text-muted">Clears all local storage data</span>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Button 
                    onClick={systemPurge} 
                    disabled={loading}
                    variant="outline-danger"
                    className="me-2"
                  >
                    {loading ? "Purging..." : "🚨 PURGE SYSTEM"}
                  </Button>
                  <span className="text-muted">⚠️ DANGER: Deletes ALL data from ALL tables permanently</span>
                </div>

                {adminResults && (
                  <div className="mt-3">
                    <h6>Admin Action Result:</h6>
                    <pre className="mb-0" style={{ fontSize: "0.875rem" }}>
                      {JSON.stringify(adminResults, null, 2)}
                    </pre>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
} 