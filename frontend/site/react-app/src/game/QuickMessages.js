const QuickMessages = {
  NEED_PAWN: "NEED_PAWN",
  NEED_BISHOP: "NEED_BISHOP",
  NEED_KNIGHT: "NEED_KNIGHT",
  NEED_ROOK: "NEED_ROOK",
  NEED_QUEEN: "NEED_QUEEN",
  NO_PAWN: "NO_PAWN",
  NO_BISHOP: "NO_BISHOP",
  NO_KNIGHT: "NO_KNIGHT",
  NO_ROOK: "NO_ROOK",
  NO_QUEEN: "NO_QUEEN",
  EXCHANGE: "EXCHANGE",
  MATES: "MATES",
  STALL: "STALL",
  WATCH_TIME: "WATCH_TIME",
};
export default QuickMessages;

export const QuickMessagesPiece = {
  NEED_PAWN: "pawn",
  NEED_BISHOP: "bishop",
  NEED_KNIGHT: "knight",
  NEED_ROOK: "rook",
  NEED_QUEEN: "queen",
  NO_PAWN: "pawn",
  NO_BISHOP: "bishop",
  NO_KNIGHT: "knight",
  NO_ROOK: "rook",
  NO_QUEEN: "queen",
};

export const QuickMessagesText = {
  EXCHANGE: "\u{2B83}", // rotating arrows
  MATES: "#",
  // STALL: "\u{23f8}",       // pause
  STALL: "\u{270b}", // raised hand
  WATCH_TIME: "\u{1f551}", // clock two-o-clock
};
