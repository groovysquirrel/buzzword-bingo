import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap';
import { API } from 'aws-amplify';

// Import our refactored hooks and components
import { useGameSession, clearAllLocalStorage } from '../hooks/useGameSession';
import { useBingoGame } from '../hooks/useBingoGame';
import { useWebSocketLeaderboard } from '../hooks/useWebSocketLeaderboard';
import { BingoGrid, checkForBingo } from '../components/BingoGrid';
import { PlayerStatus } from '../components/PlayerStatus';
import { LeaderboardEntry, GameEvent } from '../types/game';
import { formatEventMessage, normalizeEvent } from '../utils/eventFormatter';
import './BingoGame.css';

/**
 * BingoGame Container Component
 * 
 * Main game interface component that handles:
 * - Game session management and validation
 * - Bingo card display and word marking
 * - Real-time game state updates via WebSocket
 * - BINGO detection and calling
 * - Player status and leaderboard integration
 * - Error handling and recovery
 */
export default function BingoGame() {
  const navigate = useNavigate();
  
  // ============================================================================
  // HOOKS & DATA MANAGEMENT
  // ============================================================================
  
  /**
   * Core game session management
   * Handles user session, game joining, and session validation
   */
  const { session, loading: sessionLoading, gameStatusMessage, updateSession, clearSession } = useGameSession();
  
  /**
   * Bingo game logic and card management
   * Handles word marking, BINGO calling, and card state
   */
  const {
    bingoCard,
    loading: gameLoading,
    markingWord,
    error: gameError,
    markWord,
    callBingo,
    clearError: clearGameError
  } = useBingoGame(session);

  /**
   * Real-time game updates via WebSocket
   * Provides live leaderboard, events, game status, and winner info
   */
  const { leaderboard, events, gameStatus, winnerInfo } = useWebSocketLeaderboard(session);

  // ============================================================================
  // COMPONENT STATE
  // ============================================================================
  
  /**
   * BINGO Detection State
   * Tracks whether the current player has a valid BINGO pattern
   */
  const [canCallBingo, setCanCallBingo] = useState(false);
  const [detectedBingo, setDetectedBingo] = useState<{ 
    hasBingo: boolean; 
    bingoType?: string; 
    winningWords?: string[] 
  } | null>(null);
  
  /**
   * Game Flow State
   * Manages BINGO calls, secret words, and game transitions
   */
  const [secretWord, setSecretWord] = useState<string | null>(null);
  const [hasBingoCalled, setHasBingoCalled] = useState(false);
  
  /**
   * UI State
   * Handles loading states and error messages for user actions
   */
  const [_joiningNextGame, setJoiningNextGame] = useState(false);
  const [joinGameError, setJoinGameError] = useState<string | null>(null);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  /**
   * Current game status with sensible default
   * Uses WebSocket status or defaults to "open" for new games
   */
  const effectiveGameStatus = gameStatus || "open";
  
  /**
   * Get current player's rank in the leaderboard
   */
  const getCurrentPlayerRank = (): number | null => {
    if (!leaderboard || !session) return null;
    const userIndex = leaderboard.leaderboard.findIndex(
      (entry: LeaderboardEntry) => entry.sessionId === session.sessionId
    );
    return userIndex !== -1 ? userIndex + 1 : null;
  };

  /**
   * Get latest activity for the banner (excluding current player)
   */
  const getLatestActivity = (): GameEvent | null => {
    if (!events || events.length === 0) return null;
    
    return events.find((event: GameEvent) => {
      const normalizedEvent = normalizeEvent(event);
      const playerNickname = normalizedEvent.data?.nickname;
      return playerNickname && playerNickname !== session?.nickname;
    }) || null;
  };

  // ============================================================================
  // EFFECT HANDLERS
  // ============================================================================
  
  /**
   * Handle critical errors that require session reset
   * Monitors for game not found or session expired errors
   */
  useEffect(() => {
    if (!gameError || typeof gameError !== 'string') return;

    // Handle clear cache instruction from backend
    if (gameError.startsWith('CLEAR_CACHE|')) {
      console.log("🚨 Clear cache instruction received - redirecting");
      clearSession();
      navigate("/");
      return;
    }

    // Handle game not found (system reset)
    if (gameError.startsWith('GAME_NOT_FOUND|')) {
      console.log("🚨 Game not found - clearing session and redirecting");
      clearAllLocalStorage();
      clearSession();
      navigate("/");
      return;
    }
    
    // Handle session expired
    if (gameError.startsWith('SESSION_EXPIRED|')) {
      console.log("🚨 Session expired - clearing session and redirecting");
      clearSession();
      navigate("/");
      return;
    }
  }, [gameError, clearSession, navigate]);

  /**
   * Monitor bingo card for winning patterns
   * Automatically detects when player has a valid BINGO
   */
  useEffect(() => {
    if (!bingoCard) return;
    
    const bingoCheck = checkForBingo(bingoCard.markedWords, bingoCard.words);
    setCanCallBingo(bingoCheck.hasBingo);
    
    if (bingoCheck.hasBingo) {
      setDetectedBingo(bingoCheck);
    } else {
      setDetectedBingo(null);
    }
  }, [bingoCard?.markedWords]);

  /**
   * Reset BINGO-related state when game changes
   * Clears BINGO call state when game transitions away from "bingo" status
   */
  useEffect(() => {
    if (effectiveGameStatus !== "bingo") {
      setHasBingoCalled(false);
      setSecretWord(null);
    }
  }, [effectiveGameStatus]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  /**
   * Handle word marking on the bingo card
   * Marks/unmarks words and handles any resulting state changes
   */
  const handleMarkWord = async (word: string) => {
    const result = await markWord(word);
    
    // Log any unexpected BINGO results during word marking
    // (BINGO should be called separately via handleBingoCall)
    if (result?.bingo) {
      console.log('Unexpected BINGO during word marking:', result);
    }
  };

  /**
   * Handle BINGO button press
   * Calls BINGO with detected pattern and winning words
   */
  const handleBingoCall = async () => {
    if (!detectedBingo?.hasBingo) return;

    const result = await callBingo(
      detectedBingo.bingoType || 'Unknown',
      detectedBingo.winningWords || []
    );

    if (result?.success) {
      // Store secret word and mark that this player called BINGO
      setSecretWord(result.secretWord);
      setHasBingoCalled(true);
      
      console.log(`BINGO called successfully! Secret word: ${result.secretWord}`);
    }
  };

  /**
   * Handle joining the next game after current game ends
   * Checks for active games and updates session accordingly
   */
  const handleJoinNextGame = async () => {
    setJoiningNextGame(true);
    setJoinGameError(null);
    
    try {
      // Check for current active game
      const result = await API.get("api", "/current-game", {});
      
      if (result.currentGameId && result.status && ['open', 'playing', 'paused'].includes(result.status)) {
        // Join the active game
        const updatedSession = {
          ...session!,
          currentGameId: result.currentGameId
        };
        
        updateSession(updatedSession);
        
        // Reset game state for new game
        setSecretWord(null);
        setHasBingoCalled(false);
        
        console.log(`Joined active game: ${result.currentGameId} (status: ${result.status})`);
      } else {
        // No active game available
        setJoinGameError("No active game available to join. Please wait for an admin to start a new game.");
      }
    } catch (error) {
      console.error('Failed to join next game:', error);
      setJoinGameError("Unable to check for active games. Please try again later.");
    } finally {
      setJoiningNextGame(false);
    }
  };

  /**
   * Navigate to leaderboard page
   */
  const handleLeaderboard = () => {
    navigate('/leaderboard');
  };

  // ============================================================================
  // RENDER CONDITIONS
  // ============================================================================
  
  /**
   * Loading State
   * Show loading spinner while session or game data is being fetched
   */
  if (sessionLoading || gameLoading) {
    return (
      <div className="bingo-game-loading">
        <div className="bingo-game-loading__content">
          <div className="spinner-border bingo-game-loading__spinner"></div>
          <h5 className="bingo-game-loading__text">Loading your assessment platform...</h5>
        </div>
      </div>
    );
  }

  /**
   * Error State
   * Show error message if session is invalid or bingo card failed to load
   */
  if (!session || !bingoCard) {
    return (
      <div className="bingo-game-error">
        <Container>
          <Row className="justify-content-center">
            <Col xs={12} md={6}>
              <Alert variant="danger" className="text-center">
                <h5>Platform Access Error</h5>
                <p>Unable to load your assessment session.</p>
                <Button variant="primary" onClick={() => navigate("/")}>
                  Return to Platform
                </Button>
              </Alert>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  const currentRank = getCurrentPlayerRank();
  const latestActivity = getLatestActivity();

  return (
    <div className="bingo-game-container">
      {/* ========================================================================
          HEADER SECTION
          ======================================================================== */}
      <div className="bingo-game-header">
        <Container>
          <Row className="align-items-center">
            <Col xs={12}>
              <h1 className="bingo-game-header__title">
                UserId: {session.nickname}
              </h1>
              <div className="bingo-game-header__game-info">
                <span className="bingo-game-header__game-id">
                  Session: {session.currentGameId}
                </span>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <Container className="bingo-game-content">
        {/* ======================================================================
            ALERT MESSAGES
            ====================================================================== */}
        
        {/* Game Status Message */}
        {gameStatusMessage && (
          <Alert variant="info" className="bingo-game-alert">
            <div className="d-flex align-items-center">
              <span className="bingo-game-alert__icon">📊</span>
              <strong>Platform Update:</strong>&nbsp;{gameStatusMessage}
            </div>
          </Alert>
        )}

        {/* Game Error Alert */}
        {gameError && (
          <Alert 
            variant="danger" 
            className="mb-4" 
            dismissible 
            onClose={clearGameError}
          >
            {gameError.startsWith('GAME_NOT_FOUND|') 
              ? gameError.split('|')[1] || 'The game no longer exists. Please rejoin the game.'
              : gameError.startsWith('SESSION_EXPIRED|')
              ? gameError.split('|')[1] || 'Session expired. Please rejoin the game.'
              : gameError}
          </Alert>
        )}

        {/* Join Game Error Alert */}
        {joinGameError && (
          <Alert 
            variant="warning" 
            className="mb-4" 
            dismissible 
            onClose={() => setJoinGameError(null)}
          >
            {joinGameError}
          </Alert>
        )}

        {/* ======================================================================
            MAIN BINGO GRID
            ====================================================================== */}
        <Row className="justify-content-center">
          <Col xs={12} lg={8}>
            <Card className="bingo-game-card shadow-sm border-0">
              <Card.Header className="bingo-game-card__header">
                <h6 className="bingo-game-card__title">
                  Real-time Communication Assessment Matrix
                </h6>
                <small className="bingo-game-card__subtitle">
                  Tap corporate terminology you experience
                </small>
              </Card.Header>
              <Card.Body className="bingo-game-card__body">
                <BingoGrid
                  bingoCard={bingoCard}
                  markingWord={markingWord}
                  onMarkWord={handleMarkWord}
                  gameStatus={effectiveGameStatus}
                  secretWord={secretWord}
                  awaitingConfirmation={
                    markingWord === 'BINGO' || // During BINGO API call
                    (effectiveGameStatus === "bingo" && hasBingoCalled) // Awaiting admin confirmation
                  }
                  onJoinNextGame={handleJoinNextGame}
                  winnerInfo={winnerInfo}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ======================================================================
            ACTIVITY BANNER
            ====================================================================== */}
        {latestActivity && (
          <Row className="justify-content-center mt-3">
            <Col xs={12} lg={8}>
              <Alert variant="light" className="activity-banner">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <span className="activity-banner__icon">📢</span>
                    <span className="activity-banner__text">
                      {formatEventMessage(latestActivity)}
                    </span>
                  </div>
                  <Badge bg="secondary" className="activity-banner__badge">
                    Live
                  </Badge>
                </div>
              </Alert>
            </Col>
          </Row>
        )}

        {/* ======================================================================
            PLAYER STATUS
            ====================================================================== */}
        <Row className="justify-content-center mt-4">
          <Col xs={12} lg={8}>
            <PlayerStatus
              bingoCard={bingoCard}
              rank={currentRank}
              showProgress={true}
            />
          </Col>
        </Row>

        {/* ======================================================================
            ACTION BUTTONS
            ====================================================================== */}
        <Row className="justify-content-center mt-4">
          <Col xs={12} lg={6}>
            <div className="d-grid gap-2">
              {/* BINGO Button */}
              <Button 
                size="lg" 
                variant={canCallBingo && effectiveGameStatus === "playing" ? "success" : "outline-secondary"}
                className="w-100"
                onClick={handleBingoCall}
                disabled={!canCallBingo || markingWord === 'BINGO' || effectiveGameStatus !== "playing"}
              >
                {markingWord === 'BINGO' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Calling BINGO...
                  </>
                ) : canCallBingo && effectiveGameStatus === "playing" ? (
                  <>BINGO!</>
                ) : (
                  <>BINGO</>
                )}
              </Button>

              {/* Performance Dashboard Button */}
              <Button 
                size="lg" 
                className="w-100 bingo-game-button"
                onClick={handleLeaderboard}
              >
                View Performance Dashboard
              </Button>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
} 