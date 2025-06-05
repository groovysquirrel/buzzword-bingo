import { BingoGridProps } from '../../types/game';
import { BingoCell } from './BingoCell';
import './BingoGrid.css';

/**
 * Corporate Assessment Matrix Component
 * 
 * Displays a 5x5 grid of corporate terminology for real-time communication analysis.
 * 
 * Features:
 * - Enterprise-responsive design optimized for all devices
 * - Touch-friendly interaction zones for mobile professionals
 * - Visual feedback system for tracked terminology
 * - Real-time loading states during term processing
 * - Special designation for center "SYNERGY (FREE)" assessment zone
 * 
 * @param bingoCard - The professional's assessment matrix data
 * @param markingWord - Currently processing term (shows activity indicator)
 * @param onMarkWord - Function executed when terminology is identified
 */
export function BingoGrid({ bingoCard, markingWord, onMarkWord }: BingoGridProps) {
  if (!bingoCard) {
    return (
      <div className="bingo-grid-placeholder">
        <div className="text-center text-muted">
          Initializing assessment matrix...
        </div>
      </div>
    );
  }

  return (
    <div className="bingo-grid-container">
      <div className="bingo-grid">
        {bingoCard.words.map((row, rowIndex) => (
          <div key={rowIndex} className="bingo-row">
            {row.map((word, colIndex) => (
              <BingoCell
                key={`${rowIndex}-${colIndex}`}
                word={word}
                isMarked={bingoCard.markedWords.includes(word) || word === 'SYNERGY (FREE)'}
                isMarking={markingWord === word}
                onClick={onMarkWord}
                rowIndex={rowIndex}
                colIndex={colIndex}
              />
            ))}
          </div>
        ))}
      </div>
      

    </div>
  );
} 