import { useState, useEffect } from 'react';
import { Board, ChessPiece, Position, getPieceSymbol, isValidMove, makeMove } from '../utils/chessLogic';
import { motion } from 'motion/react';

interface ChessBoardProps {
  board: Board;
  onMove: (from: Position, to: Position) => void;
  currentTurn: 'white' | 'black';
  playerColor?: 'white' | 'black';
  highlightedSquares?: Position[];
}

export default function ChessBoard({ 
  board, 
  onMove, 
  currentTurn, 
  playerColor,
  highlightedSquares = []
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);

  const handleSquareClick = (row: number, col: number) => {
    const piece = board[row][col];
    const clickedPos = { row, col };

    // If a square is already selected
    if (selectedSquare) {
      // Try to move to clicked square
      const selectedPiece = board[selectedSquare.row][selectedSquare.col];
      if (selectedPiece && isValidMove(board, selectedSquare, clickedPos, selectedPiece)) {
        onMove(selectedSquare, clickedPos);
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }
    }

    // Select new square
    if (piece && piece.color === currentTurn) {
      if (!playerColor || piece.color === playerColor) {
        setSelectedSquare(clickedPos);
        
        // Calculate valid moves
        const moves: Position[] = [];
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            if (isValidMove(board, clickedPos, { row: r, col: c }, piece)) {
              moves.push({ row: r, col: c });
            }
          }
        }
        setValidMoves(moves);
      }
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const isSquareHighlighted = (row: number, col: number) => {
    return highlightedSquares.some(pos => pos.row === row && pos.col === col);
  };

  const isValidMoveSquare = (row: number, col: number) => {
    return validMoves.some(pos => pos.row === row && pos.col === col);
  };

  const isSelected = (row: number, col: number) => {
    return selectedSquare?.row === row && selectedSquare?.col === col;
  };

  return (
    <div className="inline-block border-4 border-gray-800 rounded-lg shadow-2xl">
      <div className="grid grid-cols-8 gap-0">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const isLight = (rowIndex + colIndex) % 2 === 0;
            const highlighted = isSquareHighlighted(rowIndex, colIndex);
            const selected = isSelected(rowIndex, colIndex);
            const validMove = isValidMoveSquare(rowIndex, colIndex);

            return (
              <motion.div
                key={`${rowIndex}-${colIndex}`}
                className={`
                  w-16 h-16 flex items-center justify-center cursor-pointer relative
                  ${isLight ? 'bg-amber-100' : 'bg-amber-700'}
                  ${selected ? 'ring-4 ring-blue-500' : ''}
                  ${highlighted ? 'ring-4 ring-yellow-400' : ''}
                  hover:brightness-110 transition-all
                `}
                onClick={() => handleSquareClick(rowIndex, colIndex)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {validMove && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full ${piece ? 'ring-4 ring-green-500' : 'bg-green-500/50'}`} />
                  </div>
                )}
                
                {piece && (
                  <motion.div
                    className="text-5xl select-none"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    {getPieceSymbol(piece)}
                  </motion.div>
                )}

                {/* Coordinates */}
                {colIndex === 0 && (
                  <div className="absolute left-1 top-1 text-xs opacity-50">
                    {8 - rowIndex}
                  </div>
                )}
                {rowIndex === 7 && (
                  <div className="absolute right-1 bottom-1 text-xs opacity-50">
                    {String.fromCharCode(97 + colIndex)}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
