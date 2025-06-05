import { BingoGridProps } from '../../types/game';
import { BingoCell } from './BingoCell';
import './BingoGrid.css';

/**
 * BingoGrid Component
 * 
 * Displays a 5x5 grid of bingo words that players can mark when they hear them.
 * 
 * Features:
 * - Responsive design that works on mobile and desktop
 * - Touch-friendly cells for mobile users
 * - Visual feedback for marked words
 * - Loading states for words being marked
 * - Special styling for the center "SYNERGY (FREE)" square
 * 
 * @param bingoCard - The player's bingo card data
 * @param markingWord - Currently loading word (shows spinner)
 * @param onMarkWord - Function called when a word is clicked
 */
export function BingoGrid({ bingoCard, markingWord, onMarkWord }: BingoGridProps) {
  if (!bingoCard) {
    return (
      <div className="bingo-grid-placeholder">
        <div className="text-center text-muted">
          Loading bingo card...
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
      
      <div className="bingo-grid-hint">
        <small className="text-muted text-center d-block mt-2">
          Tap words you hear at the conference!
        </small>
      </div>
    </div>
  );
} 