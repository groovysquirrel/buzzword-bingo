import { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import { Card, Row, Col, Button, Badge, Container, Modal } from 'react-bootstrap';
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
 * Valid game states and their descriptions
 */
const GAME_STATES = {
  open: 'Players can join',
  started: 'Game is active',
  paused: 'Game is paused', 
  bingo: 'BINGO called!',
  ended: 'Game completed',
  cancelled: 'Game cancelled'
} as const;

/**
 * State transition buttons and their styling
 */
const STATE_ACTIONS = {
  started: {
    pause: { label: 'Pause Game', icon: '⏸️', class: 'warning', newState: 'paused' },
    end: { label: 'End Game', icon: '🏁', class: 'primary', newState: 'ended' }
  },
  paused: {
    resume: { label: 'Resume Game', icon: '▶️', class: 'success', newState: 'started' }
  },
  bingo: {
    verify: { label: 'Verify & End', icon: '✅', class: 'success', newState: 'ended', action: 'verify-bingo' },
    reject: { label: 'Reject BINGO', icon: '↩️', class: 'warning', newState: 'started' }
  },
  ended: {
    new: { label: 'New Game', icon: '🎲', class: 'primary', newState: 'new' }
  },
  cancelled: {
    new: { label: 'New Game', icon: '🎲', class: 'primary', newState: 'new' }
  }
};

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
  
  // New state for editing and live timer
  const [isEditingGameId, setIsEditingGameId] = useState(false);
  const [editedGameId, setEditedGameId] = useState<string>("");
  const [liveDuration, setLiveDuration] = useState<number | null>(null);

  // Use WebSocket for real-time game state updates
  const { gameStatus: webSocketGameStatus } = useWebSocketLeaderboard(gameId);

  // Check if this is a compact horizontal layout
  const isCompact = className?.includes('horizontal');

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

    // Use edited game ID if available, otherwise use current game ID  
    const targetGameId = editedGameId.trim() 
      ? editedGameId.trim()
      : gameId || 'new';

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
        
        // Clear editing state after successful creation
        setIsEditingGameId(false);
        setEditedGameId("");
        
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
   * Get available action buttons for current state
   */
  const getActionButtons = () => {
    if (!gameStatus || gameStatus === "none") {
        return (
        <Col xs={12} sm={6} md={4} key="create-game">
          <Button
            onClick={createNewGame}
            disabled={isLoading}
            variant="primary"
            size="lg"
            className="w-100 game-action-btn--primary"
          >
            <span className="me-2">🎲</span>
            Create New Game
          </Button>
        </Col>
      );
    }

    const actions = STATE_ACTIONS[gameStatus as keyof typeof STATE_ACTIONS];
    if (!actions) return null;

    return Object.entries(actions).map(([actionKey, action]) => (
      <Col xs={12} sm={6} md={4} key={actionKey}>
        <Button
          onClick={() => {
            if (action.newState === 'new') {
              createNewGame();
            } else {
              const broadcast = 'broadcast' in action ? Boolean(action.broadcast) : true;
              const actionParam = 'action' in action ? action.action as string : undefined;
              changeGameState(action.newState, undefined, broadcast, actionParam);
            }
          }}
          disabled={isLoading}
          variant={action.class === 'success' ? 'success' : 
                  action.class === 'warning' ? 'warning' : 
                  action.class === 'danger' ? 'danger' : 
                  action.class === 'primary' ? 'primary' : 'secondary'}
          size="lg"
          className={`w-100 game-action-btn--${action.class}`}
        >
          <span className="me-2">{action.icon}</span>
          {action.label}
        </Button>
      </Col>
    ));
  };

  /**
   * Get compact action buttons for horizontal layout
   */
  const getCompactActionButtons = () => {
    if (!gameStatus || gameStatus === "none") {
        return (
        <Button
          onClick={createNewGame}
          disabled={isLoading}
          variant="primary"
          size="sm"
          className="compact-action-btn"
        >
          🎲 New Game
        </Button>
      );
    }

    const buttons = [];

    // Special handling for bingo state
    if (gameStatus === 'bingo') {
      buttons.push(
        <Button
          key="confirm-bingo"
          onClick={() => changeGameState('ended', undefined, true, 'verify-bingo')}
          disabled={isLoading}
          variant="success"
          size="sm"
          className="compact-action-btn"
          title="Confirm BINGO and end game"
        >
          ✅ Confirm Bingo
        </Button>
      );
      buttons.push(
        <Button
          key="reject-bingo"
          onClick={() => changeGameState('started')}
          disabled={isLoading}
          variant="warning"
          size="sm"
          className="compact-action-btn"
          title="Reject BINGO and continue game"
        >
          ↩️ Reject
        </Button>
      );
    } else {
      // Standard action buttons based on current state
      const actions = STATE_ACTIONS[gameStatus as keyof typeof STATE_ACTIONS];
      if (actions) {
        Object.entries(actions).forEach(([actionKey, action]) => {
          buttons.push(
            <Button
              key={actionKey}
              onClick={() => {
                if (action.newState === 'new') {
                  createNewGame();
                } else {
                  const broadcast = 'broadcast' in action ? Boolean(action.broadcast) : true;
                  const actionParam = 'action' in action ? action.action as string : undefined;
                  changeGameState(action.newState, undefined, broadcast, actionParam);
                }
              }}
              disabled={isLoading}
              variant={action.class === 'success' ? 'success' : 
                      action.class === 'warning' ? 'warning' : 
                      action.class === 'danger' ? 'danger' : 
                      action.class === 'primary' ? 'primary' : 'secondary'}
              size="sm"
              className="compact-action-btn"
              title={action.label}
            >
              {action.icon} {action.label.split(' ').slice(0, 2).join(' ')}
            </Button>
          );
        });
      }
    }

    return buttons;
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

  /**
   * Clear localStorage session (for debugging and after purges)
   */
  const clearLocalSession = () => {
    showConfirmation({
      title: 'Clear Session Data',
      message: 'This will clear all browser session data and log out the current user. The page will reload automatically.',
      confirmText: 'Clear & Reload',
      variant: 'danger',
      icon: '🗑️',
      onConfirm: () => {
        hideConfirmation();
        localStorage.removeItem('buzzword-bingo-session');
        localStorage.removeItem('buzzword-bingo-public-token');
        localStorage.removeItem('buzzword-bingo-device-id');
        console.log('✅ Cleared all localStorage session data');
        window.location.reload();
      }
    });
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
   * Handle game ID editing
   */
  const handleEditGameId = () => {
    setEditedGameId(gameId || "");
    setIsEditingGameId(true);
  };

  const handleSaveGameId = async () => {
    if (!editedGameId.trim() || editedGameId === gameId) {
      setIsEditingGameId(false);
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Implement game rename API call
      console.log("Renaming game from", gameId, "to", editedGameId);
      
      // For now, just update local state
      setGameId(editedGameId);
      setIsEditingGameId(false);
      
      // Notify parent component
      onGameStateChange?.(editedGameId, gameStatus);
    } catch (error) {
      console.error("Failed to rename game:", error);
      setError("Failed to rename game");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingGameId(false);
    setEditedGameId("");
  };

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
    <Container fluid className={`${className} p-0`}>
      {isCompact ? (
        // Compact Horizontal Layout for StatusScreen
        <div className={`game-controller-compact ${isLoading ? 'loading' : ''}`}>
          {/* Top row with metadata and timer */}
          <div className="gc-top-row">
            <div className="gc-meta-row">
              <span>
                <span className="gc-meta-label">Game ID:</span>
                {isEditingGameId ? (
                  <>
                  <input
                    type="text"
                    className="gc-meta-input"
                    value={editedGameId}
                    onChange={(e) => setEditedGameId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveGameId();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                  />
                    <span
                      className="gc-meta-edit gc-meta-confirm"
                      onClick={handleSaveGameId}
                      title="Confirm Game ID"
                    >
                      ✓
                    </span>
                    <span
                      className="gc-meta-edit gc-meta-cancel"
                      onClick={handleCancelEdit}
                      title="Cancel Edit"
                    >
                      ✕
                    </span>
                  </>
                ) : (
                  <>
                  <span className="gc-meta-value">{gameId || "-"}</span>
                <span
                  className="gc-meta-edit"
                      onClick={handleEditGameId}
                  title="Edit Game ID"
                >
                  ✏️
                </span>
                  </>
                )}
              </span>
            </div>

            <div className="gc-timer">
              {gameStatus === 'started' && liveDuration !== null
                ? formatDuration(liveDuration)
                : formatDuration(gameDetails?.duration || 0)}
              {gameStatus === 'started' && <span className="live-indicator">●</span>}
            </div>
          </div>

          {/* Bottom row with info and buttons */}
          <div className="gc-bottom-row">
            <div className="gc-words-info">
              Using {gameDetails?.wordCount || 0} words in a 5x5 game
            </div>
            <div className="gc-btn-row">
              {getCompactActionButtons()}
            </div>
          </div>
        </div>
      ) : (
        // Full Card Layout
        <Card className="game-controller-card border-0 shadow-lg">
          <Card.Header className="game-controller__header border-0">
            <Row className="align-items-center">
              <Col xs={12} md={8}>
                <h3 className="game-controller__title mb-0">
                  <span className="game-controller__title-icon me-2">🎮</span>
                  Game Controller
                </h3>
              </Col>
              <Col xs={12} md={4} className="text-md-end mt-3 mt-md-0">
                <Button 
                  variant="outline-light"
                  size="sm"
                  onClick={fetchCurrentGame}
                  className="game-controller__refresh"
                  disabled={isLoading}
                >
                  🔄 <span className="ms-1">Refresh</span>
                </Button>
              </Col>
            </Row>
          </Card.Header>

          <Card.Body className="p-0">
            {/* Game Status Grid */}
            <Row className="g-0">
              {/* Main Status Section */}
              <Col xs={12} lg={8} className="game-status__main">
                <div className="p-4">
                  {/* Game ID Display */}
                    <div className="game-id-display mb-4">
                      <div className="game-id-display__label">Game Session ID</div>
                    <div className="game-id-display__value d-flex align-items-center">
                      {isEditingGameId ? (
                        <>
                          <input
                            type="text"
                            className="form-control me-2"
                            value={editedGameId}
                            onChange={(e) => setEditedGameId(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveGameId();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                            style={{ maxWidth: '200px' }}
                          />
                          <button
                            className="btn btn-sm btn-success me-1"
                            onClick={handleSaveGameId}
                            title="Confirm Game ID"
                          >
                            ✓
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={handleCancelEdit}
                            title="Cancel Edit"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="me-2">{gameId}</span>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={handleEditGameId}
                            title="Edit Game ID"
                          >
                            ✏️
                          </button>
                        </>
                  )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  {gameId && (
                    <Badge 
                      className={`game-status-badge game-status-badge--${gameStatus} mb-4`}
                      pill
                    >
                      <span className="game-status-badge__icon me-2">
                        {gameStatus === 'started' && '▶️'}
                        {gameStatus === 'open' && '🟢'}
                        {gameStatus === 'paused' && '⏸️'}
                        {gameStatus === 'bingo' && '🎯'}
                        {gameStatus === 'ended' && '🏁'}
                        {gameStatus === 'cancelled' && '❌'}
                        {!['started', 'open', 'paused', 'bingo', 'ended', 'cancelled'].includes(gameStatus) && '⚪'}
                      </span>
                      {GAME_STATES[gameStatus as keyof typeof GAME_STATES] || gameStatus}
                    </Badge>
                  )}

                  {/* No Game State */}
                  {!gameId && (
                    <div className="text-center py-4">
                      <div className="mb-3">
                        <span style={{ fontSize: '3rem' }}>🎲</span>
                      </div>
                      <h5 className="text-muted">No Active Game</h5>
                      <p className="text-muted mb-3">Create a new game to get started</p>
                      
                      {/* Game ID Input for New Game */}
                      <div className="game-id-input mb-3">
                        <label className="form-label text-muted">Game ID for New Game:</label>
                        <div className="d-flex align-items-center justify-content-center">
                          {isEditingGameId ? (
                            <>
                              <input
                                type="text"
                                className="form-control me-2"
                                value={editedGameId}
                                onChange={(e) => setEditedGameId(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveGameId();
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                                placeholder="Enter game ID or leave empty for auto-generated"
                                autoFocus
                                style={{ maxWidth: '300px' }}
                              />
                              <button
                                className="btn btn-sm btn-success me-1"
                                onClick={handleSaveGameId}
                                title="Confirm Game ID"
                              >
                                ✓
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={handleCancelEdit}
                                title="Cancel Edit"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="me-2 text-muted">
                                {editedGameId || 'Auto-generated'}
                              </span>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={handleEditGameId}
                                title="Set Custom Game ID"
                              >
                                ✏️
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Col>

              {/* Sidebar Stats */}
              {gameId && gameDetails && (
                <Col xs={12} lg={4} className="game-status__sidebar border-start">
                  <div className="p-4">
                    <h6 className="text-muted mb-3 text-uppercase">Game Statistics</h6>
                    <div className="game-stats">
                      <Row className="game-stat align-items-center py-2">
                        <Col>
                          <span className="game-stat__label">Duration</span>
                        </Col>
                        <Col xs="auto">
                          <span className="game-stat__value">
                            {gameStatus === 'started' && liveDuration !== null ? 
                              formatDuration(liveDuration) : 
                              formatDuration(gameDetails.duration)
                            }
                            {gameStatus === 'started' && <span className="live-indicator ms-1">●</span>}
                          </span>
                        </Col>
                      </Row>
                      <Row className="game-stat align-items-center py-2">
                        <Col>
                          <span className="game-stat__label">Word Count</span>
                        </Col>
                        <Col xs="auto">
                          <span className="game-stat__value">{gameDetails.wordCount}</span>
                        </Col>
                      </Row>
                      {gameDetails.updatedAt && (
                        <Row className="game-stat align-items-center py-2">
                          <Col>
                            <span className="game-stat__label">Last Updated</span>
                          </Col>
                          <Col xs="auto">
                            <span className="game-stat__value">
                              {new Date(gameDetails.updatedAt).toLocaleTimeString()}
                            </span>
                          </Col>
                        </Row>
                      )}
                    </div>
                  </div>
                </Col>
              )}
            </Row>

            {/* Error Display */}
            {error && (
              <div className="px-4 pb-4">
                <div className="alert alert-danger d-flex align-items-center mb-0" role="alert">
                  <span className="me-2">⚠️</span>
                  <div>{error}</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="game-actions border-top bg-light">
              <Container>
                <Row className="py-4 g-3 justify-content-center">
                  {getActionButtons()}
                </Row>
                
                {/* Debug/Admin Tools */}
                <Row className="border-top pt-3 pb-2">
                  <Col xs={12} className="text-center">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={clearLocalSession}
                      className="game-action-btn--debug"
                    >
                      <span className="me-1">🗑️</span>
                      Clear Session
                    </Button>
                  </Col>
                </Row>
              </Container>
            </div>
          </Card.Body>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="game-loading position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
              <div className="text-center">
                <div className="game-loading__spinner mb-2">⏳</div>
                <span className="game-loading__text">Processing...</span>
              </div>
    </div>
          )}
        </Card>
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
    </Container>
  );
};

export default GameController; 
