import { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import './GameController.css';

interface CurrentGameResponse {
  currentGameId: string | null;
  status: string;
  startTime: string;
  wordCount: number;
  timestamp: string;
  error?: string;
}

interface GameControllerProps {
  onGameStateChange?: (gameId: string | null, status: string) => void;
  className?: string;
}

/**
 * Corporate Assessment Platform Game Controller
 * 
 * Centralized state management for assessment session lifecycle.
 * Handles all executive actions and session state transitions.
 */
export const GameController: React.FC<GameControllerProps> = ({ 
  onGameStateChange, 
  className = "game-controller" 
}) => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<string>("standby");
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Map backend status to professional assessment states
   */
  const mapGameStatus = (backendStatus: string): string => {
    switch (backendStatus) {
      case "active": return "active";
      case "complete": return "completed";
      case "paused": return "standby";
      case "pending_bingo": return "evaluating";
      default: return "standby";
    }
  };

  /**
   * Update game state and notify parent component
   */
  const updateGameState = (newGameId: string | null, newStatus: string) => {
    setGameId(newGameId);
    setGameStatus(newStatus);
    onGameStateChange?.(newGameId, newStatus);
  };

  /**
   * Fetch current assessment session information
   */
  const fetchCurrentGame = async () => {
    try {
      const result: CurrentGameResponse = await API.get("api", "/current-game", {});
      
      if (result.currentGameId && result.currentGameId !== gameId) {
        updateGameState(result.currentGameId, mapGameStatus(result.status));
        console.log("Updated to current assessment session:", result.currentGameId, "status:", result.status);
      } else if (!result.currentGameId && result.error) {
        console.warn("No active assessment session found:", result.error);
        updateGameState("assessment-001", "standby"); // Professional fallback
      }
    } catch (error) {
      console.error("Failed to fetch current assessment session:", error);
      if (!gameId) {
        updateGameState("assessment-001", "standby");
      }
    }
  };

  /**
   * Initialize new assessment session
   */
  const startNewGame = async () => {
    if (!gameId) {
      alert("No current assessment session available.");
      return;
    }

    const confirmMessage = `🚀 Initialize New Assessment Session

This executive action will:
• Deploy fresh assessment matrices for all participants
• Archive previous performance data
• Reset enterprise analytics dashboard
• Activate real-time monitoring protocols

Confirm to proceed with session initialization?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await API.post("api", `/admin/games/${gameId}/new`, {});
      
      console.log("New assessment session initialized:", result);
      
      // Update to the new session
      if (result.newGameId) {
        updateGameState(result.newGameId, "active");
        
        alert(`🎉 Assessment session successfully initialized!\n\nSession ID: ${result.newGameId}\n\nParticipants may now access the platform and commence assessment activities!`);
      }
    } catch (error) {
      console.error("Failed to initialize new assessment session:", error);
      alert("Failed to initialize assessment session: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Suspend current assessment session
   */
  const pauseGame = async () => {
    if (!gameId) return;

    const confirmMessage = `⏸️ Suspend Assessment Session

This administrative action will:
• Pause current assessment activities
• Maintain participant access to view assessment matrices
• Disable term identification functionality
• Set platform status to STANDBY

Confirm suspension of assessment session?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    try {
      // We'll need to implement a pause endpoint, for now simulate it
      // const result = await API.post("api", `/admin/games/${gameId}/pause`, {});
      
      updateGameState(gameId, "standby");
      alert(`⏸️ Assessment session suspended!\n\nClick "Activate Session" to resume assessment activities.`);
    } catch (error) {
      console.error("Failed to suspend assessment session:", error);
      alert("Failed to suspend session: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resume/activate current assessment session
   */
  const resumeGame = async () => {
    if (!gameId) return;

    setIsLoading(true);
    try {
      // We'll need to implement a resume endpoint, for now simulate it
      // const result = await API.post("api", `/admin/games/${gameId}/resume`, {});
      
      updateGameState(gameId, "active");
      alert(`🚀 Assessment session activated!\n\nParticipants can now identify corporate terminology and engage with assessment protocols!`);
    } catch (error) {
      console.error("Failed to activate assessment session:", error);
      alert("Failed to activate session: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get appropriate administrative action button based on session status
   */
  const getActionButton = () => {
    const buttonProps = {
      disabled: !gameId || isLoading
    };

    switch (gameStatus) {
      case "standby":
        return (
          <button
            {...buttonProps}
            onClick={gameId === "assessment-001" ? startNewGame : resumeGame}
            className="game-action-btn game-action-btn--success"
            title={gameId === "assessment-001" ? "Initialize new assessment session" : "Resume current session"}
          >
            <span className="game-action-btn__icon">🚀</span>
            <span className="game-action-btn__text">
              {gameId === "assessment-001" ? "Initialize Session" : "Activate Session"}
            </span>
          </button>
        );
      
      case "active":
        return (
          <button
            {...buttonProps}
            onClick={pauseGame}
            className="game-action-btn game-action-btn--primary"
            title="Suspend current assessment session"
          >
            <span className="game-action-btn__icon">⏸️</span>
            <span className="game-action-btn__text">Suspend Session</span>
          </button>
        );
      
      case "evaluating":
        return (
          <button
            {...buttonProps}
            disabled
            className="game-action-btn game-action-btn--info"
            title="Performance evaluation in progress"
          >
            <span className="game-action-btn__icon">🔍</span>
            <span className="game-action-btn__text">Evaluating Performance...</span>
          </button>
        );
      
      case "completed":
        return (
          <button
            {...buttonProps}
            onClick={startNewGame}
            className="game-action-btn game-action-btn--primary"
            title="Initialize new assessment session"
          >
            <span className="game-action-btn__icon">📈</span>
            <span className="game-action-btn__text">New Session</span>
          </button>
        );
      
      default:
        return null;
    }
  };

  // Initialize game state on mount
  useEffect(() => {
    fetchCurrentGame();
  }, []);

  return (
    <div className={className}>
      {getActionButton()}
    </div>
  );
};

export default GameController; 