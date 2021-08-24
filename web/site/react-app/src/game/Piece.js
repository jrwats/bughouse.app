export const NAMES = {
  p: "pawn",
  P: "pawn",
  r: "rook",
  R: "rook",
  n: "knight",
  N: "knight",
  b: "bishop",
  B: "bishop",
  q: "queen",
  Q: "queen",
};

export const PIECES = {
  PAWN: "pawn",
  BISHOP: "bishop",
  KNIGHT: "knight",
  ROOK: "rook",
  QUEEN: "queen",
  KING: "king",
};

// Keep in sync with bughouse: https://crates.io/crates/bughouse 
const IDX_2_PIECE = ['p', 'n', 'b', 'r', 'q', 'k'];

export const fromIdx = (idx) => {
  return IDX_2_PIECE[idx] || null;
}

const Piece = {
  NAMES,
  PIECES,
  fromIdx
};

export default Piece;
