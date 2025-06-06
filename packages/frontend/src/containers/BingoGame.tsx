import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap';
import { API } from 'aws-amplify';

// Import our refactored hooks and components
import { useGameSession } from '../hooks/useGameSession';
import { useBingoGame } from '../hooks/useBingoGame';
import { useWebSocketLeaderboard } from '../hooks/useWebSocketLeaderboard';
import { BingoGrid, checkForBingo } from '../components/BingoGrid';
import { PlayerStatus } from '../components/PlayerStatus';
import { LeaderboardEntry, GameEvent } from '../types/game';
import { formatEventMessage, normalizeEvent } from '../utils/eventFormatter';
import './BingoGame.css';

/**
 * Corporate Assessment Game Container Component
 * 
 * Refactored to use custom hooks, reusable components, and clean CSS classes.
 * This maintains all the original functionality while being much cleaner and more maintainable.
 * Now uses real-time WebSocket game state updates instead of API polling.
 */
export default function BingoGame() {
  const navigate = useNavigate();
  
  // Custom hooks handle all the complex logic that was previously in this component
  const { session, loading: sessionLoading, gameStatusMessage, updateSession } = useGameSession();
  const {
    bingoCard,
    loading: gameLoading,
    markingWord,
    error: gameError,
    markWord,
    callBingo,
    clearError: clearGameError
  } = useBingoGame(session);

  // Get current player rank and real-time game status using WebSocket leaderboard (more efficient than SSE)
  const { leaderboard, events, gameStatus, winnerInfo } = useWebSocketLeaderboard(session);

  // Use real-time WebSocket game status, defaulting to "open" if not available
  const effectiveGameStatus = gameStatus || "open";

  const getCurrentPlayerRank = () => {
    if (!leaderboard || !session) return null;
    const userIndex = leaderboard.leaderboard.findIndex(
      (entry: LeaderboardEntry) => entry.sessionId === session.sessionId
    );
    return userIndex !== -1 ? userIndex + 1 : null;
  };
  
  // Local state for BINGO detection, celebration, and game transitions
  const [canCallBingo, setCanCallBingo] = useState(false);
  const [detectedBingo, setDetectedBingo] = useState<{ hasBingo: boolean; bingoType?: string; winningWords?: string[] } | null>(null);
  const [secretWord, setSecretWord] = useState<string | null>(null);
  const [_joiningNextGame, setJoiningNextGame] = useState(false);
  const [hasBingoCalled, setHasBingoCalled] = useState(false); // Track if current player called BINGO
  const [joinGameError, setJoinGameError] = useState<string | null>(null); // Error for join next game

  // Check for BINGO patterns whenever marked words change
  useEffect(() => {
    if (bingoCard) {
      const bingoCheck = checkForBingo(bingoCard.markedWords, bingoCard.words);
      setCanCallBingo(bingoCheck.hasBingo);
      if (bingoCheck.hasBingo) {
        setDetectedBingo(bingoCheck);
      } else {
        setDetectedBingo(null);
      }
    }
  }, [bingoCard?.markedWords]);

  // Reset BINGO-related state when game changes
  useEffect(() => {
    if (effectiveGameStatus !== "bingo") {
      setHasBingoCalled(false);
      setSecretWord(null);
    }
  }, [effectiveGameStatus]);

  /**
   * Handle joining the next game when current game is ended
   */
  const handleJoinNextGame = async () => {
    setJoiningNextGame(true);
    try {
      // Check for current active game via API
      const result = await API.get("api", "/current-game", {});
      
      if (result.currentGameId && result.status && ['open', 'started', 'paused'].includes(result.status)) {
        // There's an active game available - update session to join it
        const updatedSession = {
          ...session!,
          currentGameId: result.currentGameId
        };
        
        updateSession(updatedSession);
        
        // Clear any existing game state
        setSecretWord(null);
        setHasBingoCalled(false);
        
        console.log(`Joined active game: ${result.currentGameId} (status: ${result.status})`);
      } else {
        // No active game available
        setJoinGameError("No active game available to join. Please wait for an admin to start a new game.");
        console.log("No active game found when trying to join next game");
      }
    } catch (error) {
      console.error('Failed to join next game:', error);
      setJoinGameError("Unable to check for active games. Please try again later.");
    } finally {
      setJoiningNextGame(false);
    }
  };

  /**
   * Handle word marking with BINGO detection
   * Now much simpler thanks to the useBingoGame hook
   */
  const handleMarkWord = async (word: string) => {
    const result = await markWord(word);
    
    // Don't show celebration modal for regular word marking
    // Only show celebration after admin confirms BINGO
    if (result?.bingo) {
      // This shouldn't happen during normal word marking since BINGO is called separately
      console.log('Unexpected BINGO during word marking:', result);
    }
  };

  /**
   * Handle BINGO button click
   */
  const handleBingoCall = async () => {
    if (!detectedBingo || !detectedBingo.hasBingo) {
      return;
    }

    const result = await callBingo(
      detectedBingo.bingoType || 'Unknown',
      detectedBingo.winningWords || []
    );

    if (result && result.success) {
      // Store the secret word and mark that this player called BINGO
      setSecretWord(result.secretWord);
      setHasBingoCalled(true);
      
      // Store result for later use but don't show modal yet
      // The game status will change to "bingo" and the overlay will show "awaiting confirmation"
    }
  };

  /**
   * Navigate to leaderboard page
   */
  const handleLeaderboard = () => {
    navigate('/leaderboard');
  };

  // Get latest activity event for banner (excluding current player's events)
  const latestActivity = events && events.length > 0 
    ? events.find((event: GameEvent) => {
        // Normalize the event to get consistent data structure
        const normalizedEvent = normalizeEvent(event);
        const playerNickname = normalizedEvent.data?.nickname;
        return playerNickname && playerNickname !== session?.nickname;
      })
    : null;

  // Show loading screen while session or game data loads
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

  // Show error state if session is invalid
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

  const currentRank = getCurrentPlayerRank();

  console.log('BingoGame leaderboard data:', {
    session,
    currentRank,
    bingoCard
  });

  return (
    <div className="bingo-game-container">
      {/* Corporate Header */}
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
        {/* Game Status Message - shows when automatically switched to new game */}
        {gameStatusMessage && (
          <Alert variant="info" className="bingo-game-alert">
            <div className="d-flex align-items-center">
              <span className="bingo-game-alert__icon">📊</span>
              <strong>Platform Update:</strong>&nbsp;{gameStatusMessage}
            </div>
          </Alert>
        )}

        {/* Error Alert - now with dismiss functionality */}
        {gameError && (
          <Alert 
            variant="danger" 
            className="mb-4" 
            dismissible 
            onClose={clearGameError}
          >
            {gameError}
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

        {/* Assessment Grid - now using our reusable BingoGrid component */}
        <Row className="justify-content-center">
          <Col xs={12} lg={8}>
            <Card className="bingo-game-card shadow-sm border-0">
              <Card.Header className="bingo-game-card__header">
                <h6 className="bingo-game-card__title">
                  Real-time Communication Assessment Matrix
                </h6>
                <small className="bingo-game-card__subtitle">Tap corporate terminology you experience</small>
              </Card.Header>
              <Card.Body className="bingo-game-card__body">
                <BingoGrid
                  bingoCard={bingoCard}
                  markingWord={markingWord}
                  onMarkWord={handleMarkWord}
                  gameStatus={effectiveGameStatus}
                  secretWord={secretWord}
                  awaitingConfirmation={
                    markingWord === 'BINGO' || // During API call
                    (effectiveGameStatus === "bingo" && hasBingoCalled) // After call, awaiting admin confirmation
                  }
                  onJoinNextGame={handleJoinNextGame}
                  winnerInfo={winnerInfo}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Latest Activity Banner - positioned below bingo card */}
        {latestActivity && (
          <Row className="justify-content-center mt-3">
            <Col xs={12} lg={8}>
              <Alert variant="light" className="activity-banner">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <span className="activity-banner__icon">📢</span>
                    <span className="activity-banner__text">{formatEventMessage(latestActivity)}</span>
                  </div>
                  <Badge bg="secondary" className="activity-banner__badge">
                    Live
                  </Badge>
                </div>
              </Alert>
            </Col>
          </Row>
        )}

        {/* Player Status - now using our reusable PlayerStatus component */}
        <Row className="justify-content-center mt-4">
          <Col xs={12} lg={8}>
            <PlayerStatus
              bingoCard={bingoCard}
              rank={currentRank}
              showProgress={true}
            />
          </Col>
        </Row>

        {/* Action Buttons */}
        <Row className="justify-content-center mt-4">
          <Col xs={12} lg={6}>
            <div className="d-grid gap-2">
              {/* BINGO Button */}
              <Button 
                size="lg" 
                variant={canCallBingo && effectiveGameStatus === "started" ? "success" : "outline-secondary"}
                className="w-100"
                onClick={handleBingoCall}
                disabled={!canCallBingo || markingWord === 'BINGO' || effectiveGameStatus !== "started"}
              >
                {markingWord === 'BINGO' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Calling BINGO...
                  </>
                ) : canCallBingo && effectiveGameStatus === "started" ? (
                  <> BINGO!</>
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