import { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import { Button, Modal } from 'react-bootstrap';
import { useWebSocketLeaderboard } from '../../hooks/useWebSocketLeaderboard';
import './GameController.css';

/**
 * Game Controller Component
 * 
 * This component provides administrative controls for managing buzzword bingo games.
 * It handles the complete game lifecycle through different states and provides
 * a user-friendly interface for game administration.
 * 
 * Game States Managed:
 * - open: Players can join the game
 * - started: Game is active, players can mark words  
 * - paused: Game is temporarily stopped
 * - bingo: Someone has called bingo, awaiting verification
 * - ended: Game completed with winner
 * - cancelled: Game terminated without completion
 */

/**
 * Interface for current game API response
 */
interface CurrentGameResponse {
  currentGameId: string | null;
  status: string;
  startTime: string;
  wordCount: number;
  timestamp: string;
  error?: string;
}

/**
 * Interface for game status API response
 */
interface GameStatusResponse {
  success: boolean;
  gameId: string;
  status: string;
  startTime: string;
  endTime?: string;
  duration: number | null;
  wordCount: number;
  updatedAt?: string;
  stateHistory: GameStateTransition[];
  timestamp: string;
}

/**
 * Interface for state transition history
 */
interface GameStateTransition {
  from: string;
  to: string;
  timestamp: string;
  reason?: string;
}

/**
 * Props for the GameController component
 */
interface GameControllerProps {
  onGameStateChange?: (gameId: string | null, status: string) => void;
  className?: string;
}



/**
 * Confirmation Modal Component
 */
interface ConfirmationModalProps {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  show,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  icon,
  onConfirm,
  onCancel
}) => {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="d-flex align-items-center">
          {icon && <span className="me-2" style={{ fontSize: '1.5rem' }}>{icon}</span>}
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="px-4 py-3">
        <p className="mb-0 text-muted">{message}</p>
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        <Button variant="outline-secondary" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm}>
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export const GameController: React.FC<GameControllerProps> = ({ 
  onGameStateChange, 
  className = "game-controller" 
}) => {
  // Component state
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<string>("open");
  const [isLoading, setIsLoading] = useState(false);
  const [gameDetails, setGameDetails] = useState<GameStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Live timer state
  const [liveDuration, setLiveDuration] = useState<number | null>(null);

  // Use WebSocket for real-time game state updates
  const { gameStatus: webSocketGameStatus } = useWebSocketLeaderboard(gameId);


  // Update local game status when WebSocket provides updates
  useEffect(() => {
    if (webSocketGameStatus && webSocketGameStatus !== gameStatus) {
      console.log(`GameController: WebSocket game status update: ${gameStatus} → ${webSocketGameStatus}`);
      setGameStatus(webSocketGameStatus);
      onGameStateChange?.(gameId, webSocketGameStatus);
      
      // Refresh game details when status changes
      if (gameId) {
        fetchGameDetails(gameId);
      }
    }
  }, [webSocketGameStatus, gameId]);

  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'primary' | 'success' | 'warning' | 'danger';
    icon?: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  /**
   * Update game state and notify parent component
   */
  const updateGameState = (newGameId: string | null, newStatus: string) => {
    setGameId(newGameId);
    setGameStatus(newStatus);
    setError(null);
    onGameStateChange?.(newGameId, newStatus);
  };

  /**
   * Fetch current game information from the API (always hits API, not WebSocket)
   */
  const fetchCurrentGame = async () => {
    try {
      setError(null);
      console.log("GameController: Fetching current game from API...");
      const result: CurrentGameResponse = await API.get("api", "/current-game", {});
      
      if (result.currentGameId) {
        console.log(`GameController: API returned game ${result.currentGameId} with status ${result.status}`);
        updateGameState(result.currentGameId, result.status);
        await fetchGameDetails(result.currentGameId);
      } else {
        console.log("GameController: No active game found via API");
        setError(result.error || "No active game found");
        updateGameState(null, "none");
      }
    } catch (error) {
      console.error("Failed to fetch current game:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch game");
      updateGameState(null, "none");
    }
  };

  /**
   * Fetch detailed game status information
   */
  const fetchGameDetails = async (targetGameId: string) => {
    try {
      const result: GameStatusResponse = await API.get("api", `/game/${targetGameId}/status`, {});
      if (result.success) {
        setGameDetails(result);
      }
    } catch (error) {
      console.error("Failed to fetch game details:", error);
    }
  };

  /**
   * Change the game state through the admin API
   */
  const changeGameState = async (newState: string, reason?: string, broadcast: boolean = true, action?: string) => {
    if (!gameId) {
      setError("No game ID available");
      return;
    }

    // Skip confirmation for pause action - execute immediately
    if (newState === 'paused') {
      setIsLoading(true);
      setError(null);

      try {
        const result = await API.post("api", `/admin/games/${gameId}/state`, {
          body: {
            newState,
            reason: reason || `Game paused via admin panel`,
            broadcast,
            action
          }
        });

        if (result.success) {
          updateGameState(gameId, newState);
          await fetchGameDetails(gameId);
          console.log(`Game paused: ${result.previousState} → ${newState}`);
        } else {
          setError(result.error || "Failed to pause game");
        }
      } catch (error) {
        console.error("Failed to pause game:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Skip confirmation for resume action (started state) - execute immediately  
    if (newState === 'started') {
      setIsLoading(true);
      setError(null);

      try {
        const result = await API.post("api", `/admin/games/${gameId}/state`, {
          body: {
            newState,
            reason: reason || `Game resumed via admin panel`,
            broadcast,
            action
          }
        });

        if (result.success) {
          updateGameState(gameId, newState);
          await fetchGameDetails(gameId);
          console.log(`Game resumed: ${result.previousState} → ${newState}`);
        } else {
          setError(result.error || "Failed to resume game");
        }
      } catch (error) {
        console.error("Failed to resume game:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Show confirmation for all other state changes
    const stateConfig = {
      'started': { 
        icon: broadcast ? '📢' : '▶️', 
        variant: 'success' as const, 
        title: broadcast ? 'Start All Players' : 'Start Host Only', 
        message: broadcast 
          ? 'Begin the buzzword bingo session for all players. This will broadcast to all connected clients and reset their screens.'
          : 'Start the game on the host side only. Players will need to manually click "Join Next Game" to participate.',
        confirmText: broadcast ? 'Start All' : 'Start Host'
      },
      'paused': { 
        icon: '⏸️', 
        variant: 'warning' as const, 
        title: 'Pause Game', 
        message: 'Temporarily pause the game. Players will not be able to mark words until resumed.',
        confirmText: 'Pause Game'
      },
      'ended': action === 'verify-bingo' ? {
        icon: '✅', 
        variant: 'success' as const, 
        title: 'Verify BINGO', 
        message: 'Confirm this BINGO call is valid and end the game. The winner will be announced to all players.',
        confirmText: 'Verify & End Game'
      } : { 
        icon: '🏁', 
        variant: 'primary' as const, 
        title: 'End Game', 
        message: 'Complete the game session. This will finalize scores and declare winners.',
        confirmText: 'End Game'
      }
    };

    const config = stateConfig[newState as keyof typeof stateConfig] || {
      icon: '⚡',
      variant: 'primary' as const,
      title: 'Change Game State',
      message: `Change game state to "${newState}"?`,
      confirmText: 'Confirm'
    };

    showConfirmation({
      ...config,
      onConfirm: async () => {
        hideConfirmation();

    setIsLoading(true);
        setError(null);

        try {
          const result = await API.post("api", `/admin/games/${gameId}/state`, {
            body: {
              newState,
              reason: reason || `Game state changed to ${newState} via admin panel`,
              broadcast,
              action
            }
          });

          if (result.success) {
            updateGameState(gameId, newState);
            await fetchGameDetails(gameId);
            console.log(`Game state changed: ${result.previousState} → ${newState}`);
          } else {
            setError(result.error || "Failed to change game state");
          }
    } catch (error) {
          console.error("Failed to change game state:", error);
          setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
      }
    });
  };

  /**
   * Create a new game and automatically start it
   */
  const createNewGame = async () => {
    setIsLoading(true);
    setError(null);

    // Use current game ID or create a new one
    const targetGameId = gameId || 'new';

    try {
      // Step 1: Create the new game
      const result = await API.post("api", `/admin/games/${targetGameId}/new`, {});
          
      if (result.success && result.newGameId) {
        console.log("New game created:", result.newGameId);
        
        // Step 2: Automatically start the host game
        const startResult = await API.post("api", `/admin/games/${result.newGameId}/state`, {
          body: {
            newState: 'started',
            reason: 'Host game started automatically after creation',
            broadcast: false // Don't broadcast start to avoid confusing players
          }
        });

        if (startResult.success) {
          // Update state to 'started' immediately
          updateGameState(result.newGameId, 'started');
          await fetchGameDetails(result.newGameId);
          
          console.log("New game created and started:", result.newGameId);
        } else {
          // If start failed, fall back to just creating the game
          updateGameState(result.newGameId, 'open');
          await fetchGameDetails(result.newGameId);
          setError("Game created but failed to start automatically");
        }
        
      } else {
        setError(result.error || "Failed to create new game");
      }
    } catch (error) {
      console.error("Failed to create and start new game:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format duration for display
   */
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "N/A";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Initialize component
  useEffect(() => {
    fetchCurrentGame();
  }, []);

  // Live duration timer
  useEffect(() => {
    if (gameDetails?.startTime && (gameStatus === 'started' || gameStatus === 'paused')) {
      const startTime = new Date(gameDetails.startTime).getTime();
      
      const updateTimer = () => {
        const now = Date.now();
        const duration = Math.floor((now - startTime) / 1000);
        setLiveDuration(duration);
      };

      // Update immediately
      updateTimer();
      
      // Update every second if game is active
      const interval = gameStatus === 'started' ? setInterval(updateTimer, 1000) : null;
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      setLiveDuration(gameDetails?.duration || null);
    }
  }, [gameDetails, gameStatus]);

  /**
   * Show confirmation modal
   */
  const showConfirmation = (config: {
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'primary' | 'success' | 'warning' | 'danger';
    icon?: string;
    onConfirm: () => void;
  }) => {
    setConfirmationModal({
      show: true,
      ...config
    });
  };

  /**
   * Hide confirmation modal
   */
  const hideConfirmation = () => {
    setConfirmationModal(prev => ({ ...prev, show: false }));
  };

  return (
    <div className={`game-controller ${className}`}>
      {/* Status Badge */}
      {gameId && (
        <span className={`status-badge status-badge--${gameStatus}`}>
          {gameStatus.toUpperCase()}
        </span>
      )}
      
      {/* Timer */}
      <div className="timer-display">
        {gameStatus === 'started' && liveDuration !== null
          ? formatDuration(liveDuration)
          : formatDuration(gameDetails?.duration || 0)}
        {gameStatus === 'started' && <span className="live-dot">●</span>}
      </div>

      {/* Action Buttons */}
      <button
        className="action-btn action-btn--new"
        onClick={createNewGame}
        disabled={isLoading}
        title="Create New Game"
      >
        ➕
      </button>

      {gameStatus === 'started' && (
        <button
          className="action-btn action-btn--pause"
          onClick={() => changeGameState('paused')}
          disabled={isLoading}
          title="Pause Game"
        >
          ⏸️
        </button>
      )}

      {gameStatus === 'paused' && (
        <button
          className="action-btn action-btn--resume"
          onClick={() => changeGameState('started')}
          disabled={isLoading}
          title="Resume Game"
        >
          ▶️
        </button>
      )}

      {(gameStatus === 'started' || gameStatus === 'paused') && (
        <button
          className="action-btn action-btn--end"
          onClick={() => showConfirmation({
            title: 'End Game',
            message: 'Are you sure you want to end this game? This cannot be undone.',
            confirmText: 'End Game',
            variant: 'danger',
            icon: '🏁',
            onConfirm: () => {
              hideConfirmation();
              changeGameState('ended');
            }
          })}
          disabled={isLoading}
          title="End Game"
        >
          🏁
        </button>
      )}

      {gameStatus === 'bingo' && (
        <>
          <button
            className="action-btn action-btn--confirm"
            onClick={() => showConfirmation({
              title: 'Confirm BINGO',
              message: 'Verify and end the game with this BINGO winner?',
              confirmText: 'Confirm BINGO',
              variant: 'success',
              icon: '✅',
              onConfirm: () => {
                hideConfirmation();
                changeGameState('ended', undefined, true, 'verify-bingo');
              }
            })}
            disabled={isLoading}
            title="Confirm BINGO & End Game"
          >
            ✅
          </button>

          <button
            className="action-btn action-btn--reject"
            onClick={() => showConfirmation({
              title: 'Reject BINGO',
              message: 'Reject this BINGO claim and continue the game?',
              confirmText: 'Reject BINGO',
              variant: 'warning',
              icon: '❌',
              onConfirm: () => {
                hideConfirmation();
                changeGameState('started');
              }
            })}
            disabled={isLoading}
            title="Reject BINGO & Continue"
          >
            ❌
          </button>
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          ⏳ Processing...
        </div>
      )}
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        show={confirmationModal.show}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText={confirmationModal.confirmText}
        variant={confirmationModal.variant}
        icon={confirmationModal.icon}
        onConfirm={confirmationModal.onConfirm}
        onCancel={hideConfirmation}
      />
    </div>
  );
};

export default GameController; 
