import { BingoCellProps } from '../../types/game';

/**
 * BingoCell Component
 * 
 * Represents a single cell in the bingo grid.
 * 
 * Features:
 * - Shows different states: unmarked, marked, marking (loading)
 * - Special styling for the center "SYNERGY (FREE)" square
 * - Touch-friendly size and interaction
 * - Accessibility support with proper roles and labels
 * 
 * @param word - The word displayed in this cell
 * @param isMarked - Whether this word has been marked
 * @param isMarking - Whether this word is currently being marked (loading)
 * @param onClick - Function called when the cell is clicked
 * @param rowIndex - Row position for accessibility
 * @param colIndex - Column position for accessibility
 */
export function BingoCell({ 
  word, 
  isMarked, 
  isMarking, 
  onClick, 
  rowIndex, 
  colIndex 
}: BingoCellProps) {
  const isFreeSpace = word === 'SYNERGY (FREE)';
  const isClickable = !isFreeSpace && !isMarked && !isMarking;
  
  const handleClick = () => {
    if (isClickable) {
      onClick(word);
    }
  };

  const getCellClasses = () => {
    const baseClasses = ['bingo-cell'];
    
    if (isMarked) baseClasses.push('bingo-cell--marked');
    if (isFreeSpace) baseClasses.push('bingo-cell--free');
    if (isMarking) baseClasses.push('bingo-cell--marking');
    if (isClickable) baseClasses.push('bingo-cell--clickable');
    
    return baseClasses.join(' ');
  };

  return (
    <button
      className={getCellClasses()}
      onClick={handleClick}
      disabled={!isClickable}
      aria-label={`Bingo cell: ${word}${isMarked ? ', marked' : ''}${isFreeSpace ? ', free space' : ''}`}
      aria-pressed={isMarked}
      title={isFreeSpace ? 'Free space - already marked' : `Click to mark "${word}"`}
      data-row={rowIndex}
      data-col={colIndex}
    >
      {/* Loading spinner for marking state */}
      {isMarking && (
        <div className="bingo-cell__spinner">
          <div className="spinner-border spinner-border-sm text-warning" role="status">
            <span className="visually-hidden">Marking...</span>
          </div>
        </div>
      )}
      
      {/* Word content */}
      <span className={`bingo-cell__text ${isMarking ? 'bingo-cell__text--hidden' : ''}`}>
        {isFreeSpace ? '🚀 SYNERGY' : word}
      </span>
    </button>
  );
} 