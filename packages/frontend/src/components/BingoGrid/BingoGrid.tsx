import { BingoGridProps } from '../../types/game';
import { BingoCell } from './BingoCell';
import './BingoGrid.css';

/**
 * Detect grid size from card structure
 */
function detectGridSize(cardWords: string[][]): "3x3" | "4x4" | "5x5" {
  if (!cardWords || !cardWords[0]) return "5x5"; // fallback
  
  const rows = cardWords.length;
  const cols = cardWords[0].length;
  
  if (rows === 3 && cols === 3) return "3x3";
  if (rows === 4 && cols === 4) return "4x4";
  return "5x5"; // default/fallback
}

/**
 * Check if a bingo card has a winning pattern (supports dynamic grid sizes)
 * @param markedWords - Array of words that have been marked
 * @param cardWords - NxN grid of words
 * @returns Object containing whether there's a bingo and what type
 */
export function checkForBingo(markedWords: string[], cardWords: string[][]): { 
  hasBingo: boolean; 
  bingoType?: string; 
  winningWords?: string[] 
} {
  if (!cardWords || !cardWords[0]) {
    return { hasBingo: false };
  }


  const rows = cardWords.length;
  const cols = cardWords[0].length;
  
  // Add SYNERGY (FREE) space to marked words if it exists (only for odd grids)
  const allMarkedWords = new Set([...markedWords]);
  if (rows % 2 === 1) {
    allMarkedWords.add("SYNERGY (FREE)");
  }
  
  // Check rows
  for (let row = 0; row < rows; row++) {
    if (cardWords[row] && cardWords[row].every(word => allMarkedWords.has(word))) {
      return { 
        hasBingo: true, 
        bingoType: `Row ${row + 1}`, 
        winningWords: cardWords[row] 
      };
    }
  }
  
  // Check columns
  for (let col = 0; col < cols; col++) {
    const columnWords = cardWords.map(row => row[col]).filter(word => word !== undefined);
    if (columnWords.length === rows && columnWords.every(word => allMarkedWords.has(word))) {
      return { 
        hasBingo: true, 
        bingoType: `Column ${col + 1}`, 
        winningWords: columnWords 
      };
    }
  }
  
  // Check diagonals (only for square grids)
  if (rows === cols) {
    // Main diagonal (top-left to bottom-right)
    const diagonal1 = cardWords.map((row, index) => row[index]).filter(word => word !== undefined);
    if (diagonal1.length === rows && diagonal1.every(word => allMarkedWords.has(word))) {
      return { 
        hasBingo: true, 
        bingoType: 'Main Diagonal', 
        winningWords: diagonal1 
      };
    }
    
    // Anti-diagonal (top-right to bottom-left)
    const diagonal2 = cardWords.map((row, index) => row[cols - 1 - index]).filter(word => word !== undefined);
    if (diagonal2.length === rows && diagonal2.every(word => allMarkedWords.has(word))) {
      return { 
        hasBingo: true, 
        bingoType: 'Anti Diagonal', 
        winningWords: diagonal2 
      };
    }
  }
  
  return { hasBingo: false };
}

/**
 * Corporate Assessment Matrix Component
 * 
 * Displays a dynamic grid (3x3, 4x4, or 5x5) of corporate terminology for real-time communication analysis.
 * 
 * Features:
 * - Enterprise-responsive design optimized for all devices
 * - Touch-friendly interaction zones for mobile professionals
 * - Visual feedback system for tracked terminology
 * - Real-time loading states during term processing
 * - Special designation for center "SYNERGY (FREE)" assessment zone
 * - BINGO pattern detection and validation
 * - Game state overlays for non-active states
 * - Secret word display and confirmation states
 * 
 * @param bingoCard - The professional's assessment matrix data
 * @param markingWord - Currently processing term (shows activity indicator)
 * @param onMarkWord - Function executed when terminology is identified
 * @param onBingoDetected - Function called when a BINGO pattern is detected
 * @param gameStatus - Current game state (open, playing, paused, bingo, ended)
 * @param disabled - Whether the grid should be disabled (non-interactive)
 * @param secretWord - Secret word to display when BINGO is achieved
 * @param awaitingConfirmation - Whether player is awaiting BINGO confirmation
 * @param onJoinNextGame - Function called when the "Join Next Game" button is clicked
 * @param winnerInfo - Information about the winner
 */
export function BingoGrid({ 
  bingoCard, 
  markingWord, 
  onMarkWord, 
  onBingoDetected, 
  gameStatus = "playing",
  disabled = false,
  secretWord = null,
  awaitingConfirmation = false,
  onJoinNextGame,
  winnerInfo
}: BingoGridProps) {
  if (!bingoCard) {
    return (
      <div className="bingo-grid-placeholder">
        <div className="text-center text-muted">
          Initializing assessment matrix...
        </div>
      </div>
    );
  }

  // Detect grid size for CSS classes and bingo checking
  const gridSize = detectGridSize(bingoCard.words);
  
  // Check for BINGO whenever marked words change
  const bingoResult = checkForBingo(bingoCard.markedWords, bingoCard.words);
  
  // Notify parent if BINGO is detected and callback is provided
  if (bingoResult.hasBingo && onBingoDetected) {
    onBingoDetected(bingoResult);
  }

  // Determine if grid should be interactive
  const isInteractive = gameStatus === "playing" && !disabled && !awaitingConfirmation;

  // Get overlay content based on current state
  const getOverlayContent = () => {
    // Priority: Awaiting confirmation > Secret word > Game status
    if (awaitingConfirmation) {
      return {
        icon: '⏳',
        message: 'AWAITING CONFIRMATION',
        subMessage: 'Admin is verifying your BINGO...',
        showJoinButton: false
      };
    }
    
    if (secretWord) {
      return {
        icon: '🏆',
        message: 'CONGRATULATIONS!',
        subMessage: `Your Secret Word: ${secretWord}`,
        showJoinButton: false
      };
    }
    
    // Standard game status overlays
    switch (gameStatus) {
      case "open": 
        return { icon: '⏳', message: 'WAITING TO START', showJoinButton: false };
      case "paused": 
        return { icon: '⏸️', message: 'GAME PAUSED', showJoinButton: false };
      case "bingo": 
        return { icon: '🎯', message: 'BINGO CALLED', showJoinButton: false };
      case "ended": 
        // Check if current player won vs someone else won
        if (winnerInfo) {
          const isWinner = winnerInfo.sessionId === bingoCard.sessionId;
          if (isWinner) {
            return {
              icon: '🏆',
              message: 'YOU WON!',
              subMessage: `Your secret word: <strong>${winnerInfo.secretWord}</strong>`,
              showJoinButton: true,
              useHtml: true
            };
          } else {
            return {
              icon: '🏁',
              message: 'GAME OVER',
              subMessage: `${winnerInfo.nickname} won with ${winnerInfo.points} BUZZWORD points!`,
              showJoinButton: true
            };
          }
        } else {
          // Fallback if no winner info available
          return { 
            icon: '🏁', 
            message: 'GAME OVER',
            showJoinButton: true
          };
        }
      case "cancelled": 
        return { 
          icon: '❌', 
          message: 'GAME CANCELLED',
          showJoinButton: true
        };
      case "no_games":
        return {
          icon: '🎮',
          message: 'NO ACTIVE GAMES',
          subMessage: 'Please wait for an admin to create a new game',
          showJoinButton: false
        };
      default: 
        return null;
    }
  };

  const overlayContent = getOverlayContent();
  const showOverlay = !isInteractive && overlayContent;

  return (
    <div className="bingo-grid-container">
      <div className={`bingo-grid bingo-grid--${gridSize} ${!isInteractive ? 'bingo-grid--disabled' : ''}`}>
        {bingoCard.words.map((row, rowIndex) => (
          <div key={rowIndex} className="bingo-row">
            {row.map((word, colIndex) => (
              <BingoCell
                key={`${rowIndex}-${colIndex}`}
                word={word}
                isMarked={bingoCard.markedWords.includes(word) || word === 'SYNERGY (FREE)'}
                isMarking={markingWord === word}
                onClick={isInteractive ? onMarkWord : () => {}} // Disable clicking when not interactive
                rowIndex={rowIndex}
                colIndex={colIndex}
              />
            ))}
          </div>
        ))}
        
        {/* Game Status Overlay */}
        {showOverlay && (
          <div className="bingo-grid-overlay">
            <div className="bingo-grid-overlay__content">
              <div className="bingo-grid-overlay__icon">
                {overlayContent.icon}
              </div>
              <div className="bingo-grid-overlay__message">
                {overlayContent.message}
              </div>
              {overlayContent.subMessage && (
                <div className="bingo-grid-overlay__submessage">
                  {overlayContent.useHtml ? (
                    <span dangerouslySetInnerHTML={{ __html: overlayContent.subMessage }} />
                  ) : (
                    overlayContent.subMessage
                  )}
                </div>
              )}
              {overlayContent.showJoinButton && onJoinNextGame && (
                <button 
                  className="bingo-grid-overlay__join-button"
                  onClick={onJoinNextGame}
                >
                  Join Next Game
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 