import { BingoCellProps } from '../../types/game';

/**
 * Corporate Assessment Cell Component
 * 
 * Represents a single terminology tracking zone in the assessment matrix.
 * 
 * Features:
 * - Multiple interaction states: untracked, tracked, processing
 * - Special designation for center "SYNERGY (FREE)" strategic zone
 * - Professional touch-friendly interaction design
 * - Enterprise accessibility compliance with proper ARIA support
 * 
 * @param word - The corporate terminology displayed in this assessment zone
 * @param isMarked - Whether this terminology has been successfully tracked
 * @param isMarking - Whether this terminology is currently being processed
 * @param onClick - Function executed when the assessment zone is activated
 * @param rowIndex - Row position for accessibility compliance
 * @param colIndex - Column position for accessibility compliance
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
      aria-label={`Assessment zone: ${word}${isMarked ? ', tracked' : ''}${isFreeSpace ? ', strategic center' : ''}`}
      aria-pressed={isMarked}
      title={isFreeSpace ? 'Strategic center - pre-activated' : `Click to track "${word}"`}
      data-row={rowIndex}
      data-col={colIndex}
    >
      {/* Processing indicator for tracking state */}
      {isMarking && (
        <div className="bingo-cell__spinner">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Processing...</span>
          </div>
        </div>
      )}
      
      {/* Terminology content */}
      <span className={`bingo-cell__text ${isMarking ? 'bingo-cell__text--hidden' : ''}`}>
        {isFreeSpace ? 'SYNERGY' : word}
      </span>
    </button>
  );
} 