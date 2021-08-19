const QuickMessages = {
  NEED_PAWN: 1,
  NEED_BISHOP: 2,
  NEED_KNIGHT: 3,
  NEED_ROOK: 4,
  NEED_QUEEN: 5,
  NO_PAWN: 6,
  NO_BISHOP: 7,
  NO_KNIGHT: 8,
  NO_ROOK: 9,
  NO_QUEEN: 10,
  EXCHANGE: 11,
  MATES: 12,
  STALL: 13,
  WATCH_TIME: 14,
};
export default QuickMessages;

export const QuickMessagesPiece = {
  NEED_PAWN: 'pawn',
  NEED_BISHOP: 'bishop',
  NEED_KNIGHT: 'knight',
  NEED_ROOK: 'rook',
  NEED_QUEEN: 'queen',
  NO_PAWN: 'pawn',
  NO_BISHOP: 'bishop',
  NO_KNIGHT: 'knight',
  NO_ROOK: 'rook',
  NO_QUEEN: 'queen',
};

export const QuickMessagesText = {
  EXCHANGE: "\u{21c4}",   // rotating arrows
  MATES: "#",
  // STALL: "\u{23f8}",       // pause
  STALL: "\u{270b}",       // raised hand
  WATCH_TIME: "\u{1f551}", // clock two-o-clock
};
