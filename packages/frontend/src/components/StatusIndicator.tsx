interface StatusIndicatorProps {
  isConnected: boolean;
  gameStatus: string;
  className?: string;
}

/**
 * Corporate Assessment Platform Status Indicator
 * 
 * Displays real-time connection status and session state for executive monitoring.
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isConnected,
  gameStatus,
  className = "status-indicator"
}) => {
  /**
   * Get executive dashboard status display text
   */
  const getStatusDisplayText = (status: string): string => {
    switch (status) {
      case "open": return "OPEN";
      case "playing": return "ACTIVE SESSION";
      case "paused": return "PAUSED";
      case "bingo": return "EVALUATION PENDING";
      case "ended": return "SESSION COMPLETED";
      case "cancelled": return "CANCELLED";
      // Legacy mappings for compatibility
      case "standby": return "STANDBY";
      case "active": return "ACTIVE SESSION";
      case "evaluating": return "EVALUATION PENDING";
      case "completed": return "SESSION COMPLETED";
      default: return "STANDBY";
    }
  };

  return (
    <div className={className}>
      <div className="status-indicator__connection">
        <div className={`status-indicator__dot ${isConnected ? 'status-indicator__dot--connected' : 'status-indicator__dot--disconnected'}`}></div>
        <span className="status-indicator__label">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="status-indicator__session">
        <span className="status-indicator__session-label">Session Status:</span>
        <span className={`status-indicator__session-value status-indicator__session-value--${gameStatus}`}>
          {getStatusDisplayText(gameStatus)}
        </span>
      </div>
    </div>
  );
};

export default StatusIndicator; 