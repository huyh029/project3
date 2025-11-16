export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceColor = 'white' | 'black';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

export interface Position {
  row: number;
  col: number;
}

export type Board = (ChessPiece | null)[][];

const pieceSymbols: { [key in PieceColor]: { [key in PieceType]: string } } = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙'
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟'
  }
};

export function getPieceSymbol(piece: ChessPiece): string {
  return pieceSymbols[piece.color][piece.type];
}

export function initializeBoard(): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

  // Pawns
  for (let i = 0; i < 8; i++) {
    board[1][i] = { type: 'pawn', color: 'black' };
    board[6][i] = { type: 'pawn', color: 'white' };
  }

  // Rooks
  board[0][0] = { type: 'rook', color: 'black' };
  board[0][7] = { type: 'rook', color: 'black' };
  board[7][0] = { type: 'rook', color: 'white' };
  board[7][7] = { type: 'rook', color: 'white' };

  // Knights
  board[0][1] = { type: 'knight', color: 'black' };
  board[0][6] = { type: 'knight', color: 'black' };
  board[7][1] = { type: 'knight', color: 'white' };
  board[7][6] = { type: 'knight', color: 'white' };

  // Bishops
  board[0][2] = { type: 'bishop', color: 'black' };
  board[0][5] = { type: 'bishop', color: 'black' };
  board[7][2] = { type: 'bishop', color: 'white' };
  board[7][5] = { type: 'bishop', color: 'white' };

  // Queens
  board[0][3] = { type: 'queen', color: 'black' };
  board[7][3] = { type: 'queen', color: 'white' };

  // Kings
  board[0][4] = { type: 'king', color: 'black' };
  board[7][4] = { type: 'king', color: 'white' };

  return board;
}

export function isValidMove(
  board: Board,
  from: Position,
  to: Position,
  piece: ChessPiece
): boolean {
  const { row: fromRow, col: fromCol } = from;
  const { row: toRow, col: toCol } = to;

  // Can't move to same position
  if (fromRow === toRow && fromCol === toCol) return false;

  // Can't capture own piece
  const targetPiece = board[toRow][toCol];
  if (targetPiece && targetPiece.color === piece.color) return false;

  // Out of bounds
  if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;

  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  switch (piece.type) {
    case 'pawn':
      const direction = piece.color === 'white' ? -1 : 1;
      const startRow = piece.color === 'white' ? 6 : 1;

      // Forward move
      if (fromCol === toCol && !targetPiece) {
        if (toRow === fromRow + direction) return true;
        if (fromRow === startRow && toRow === fromRow + 2 * direction) {
          return !board[fromRow + direction][fromCol];
        }
      }

      // Capture
      if (colDiff === 1 && toRow === fromRow + direction && targetPiece) {
        return true;
      }
      return false;

    case 'rook':
      if (fromRow !== toRow && fromCol !== toCol) return false;
      return isPathClear(board, from, to);

    case 'knight':
      return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

    case 'bishop':
      if (rowDiff !== colDiff) return false;
      return isPathClear(board, from, to);

    case 'queen':
      if (fromRow !== toRow && fromCol !== toCol && rowDiff !== colDiff) return false;
      return isPathClear(board, from, to);

    case 'king':
      return rowDiff <= 1 && colDiff <= 1;

    default:
      return false;
  }
}

function isPathClear(board: Board, from: Position, to: Position): boolean {
  const rowStep = Math.sign(to.row - from.row);
  const colStep = Math.sign(to.col - from.col);

  let currentRow = from.row + rowStep;
  let currentCol = from.col + colStep;

  while (currentRow !== to.row || currentCol !== to.col) {
    if (board[currentRow][currentCol]) return false;
    currentRow += rowStep;
    currentCol += colStep;
  }

  return true;
}

export function getAllValidMoves(board: Board, color: PieceColor): { from: Position; to: Position }[] {
  const moves: { from: Position; to: Position }[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMove(board, { row, col }, { row: toRow, col: toCol }, piece)) {
              moves.push({ from: { row, col }, to: { row: toRow, col: toCol } });
            }
          }
        }
      }
    }
  }

  return moves;
}

export function makeMove(board: Board, from: Position, to: Position): Board {
  const newBoard = board.map(row => [...row]);
  newBoard[to.row][to.col] = newBoard[from.row][from.col];
  newBoard[from.row][from.col] = null;
  return newBoard;
}

export function getRandomMove(board: Board, color: PieceColor): { from: Position; to: Position } | null {
  const validMoves = getAllValidMoves(board, color);
  if (validMoves.length === 0) return null;
  return validMoves[Math.floor(Math.random() * validMoves.length)];
}

export function isKingInCheck(board: Board, color: PieceColor): boolean {
  // Find king position
  let kingPos: Position | null = null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        kingPos = { row, col };
        break;
      }
    }
    if (kingPos) break;
  }

  if (!kingPos) return false;

  // Check if any opponent piece can capture the king
  const opponentColor = color === 'white' ? 'black' : 'white';
  const opponentMoves = getAllValidMoves(board, opponentColor);

  return opponentMoves.some(move => 
    move.to.row === kingPos!.row && move.to.col === kingPos!.col
  );
}
