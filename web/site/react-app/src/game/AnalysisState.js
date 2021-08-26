/**
 * For re-constructing a game's move from the DB's serialized moves.
 * This includes constructing display strings (standard algebraic notation
 * and Bughouse drops "P@f7").
 *
 * NOTE: Does NOT have to concern itself with validating moves. The server has
 * already done that.
 */

import { read, write } from "chessground/fen";
import { distanceSq, key2pos, pos2key, allKeys } from "chessground/util";
import Piece, { PIECES, LETTERS, NAMES } from "./Piece";

function timeCtrlToMs(timeCtrl) {
  return timeCtrl.base * 60 * 1000 + timeCtrl.inc * 1000;
}

function initHoldings() {
  return Object.values(LETTERS).reduce((agg, k) => {
    agg[k] = 0;
    return agg;
  }, {});
}

function toKey(sqIdx) {
  const file = sqIdx % 8;
  const rank = Math.floor(sqIdx / 8);
  return pos2key([file, rank]);
}

class AnalysisBoard {
  constructor(timeCtrl) {
    const ms = timeCtrlToMs(timeCtrl);
    this.timeCtrl = timeCtrl;
    this.holdings = [initHoldings(), initHoldings()]; // white black holdings
    this.clocks = [ms, ms];
    this.pieces = read("start");
    this.promos = new Map();
    this.toMove = "w";
    this.lastTime = 0;
  }

  makeMove(move) {
    let capturedPiece =
      this.promos.get(move.dest) || this.pieces.get(move.dest);
    if (move.src == null) {
      // drop
      this.holdings[move.boardID][move.piece]--;
      this.pieces.set(move.dest, {
        role: NAMES[move.piece],
        color: move.color,
      });
    } else {
      // move
      // If a captured piece is a promo, it goes back as a pawn
      if (move.piece != null) {
        // promo
        this.pieces.set(move.dest, {
          role: NAMES[move.piece],
          color: move.color,
        });
        this.promos.set(move.dest, { role: "pawn", color: move.color });
      } else {
        const piece = this.pieces.get(move.src);
        if (
          piece.role === "king" &&
          distanceSq(key2pos(move.src), key2pos(move.dest)) > 1
        ) {
          // Castling: also move the rook
          const rookSrc = `${move.dest[0] === "g" ? "h" : "a"}${move.dest[1]}`;
          const rookDest = `${move.dest[0] === "g" ? "f" : "d"}${move.dest[1]}`;
          this.pieces.set(rookDest, this.pieces.get(rookSrc));
          this.pieces.delete(rookSrc);
        } else if (
          piece.role === "pawn" &&
          move.dest[0] !== move.src[0] &&
          capturedPiece == null
        ) {
          // en-passant - capture square just "under" destination
          const capturedKey = `${move.dest[0]}${move.src[1]}`;
          capturedPiece =
            this.promos.get(capturedKey) || this.pieces.get(capturedKey);
          this.pieces.delete(capturedKey);
        }
        this.promos.set(move.dest, this.promos.get(move.src));
        this.pieces.set(move.dest, this.pieces.get(move.src));
      }
      this.pieces.delete(move.src);
      this.promos.delete(move.src);
    }
    this.toMove = this.toMove === "w" ? "b" : "w";
    this.clocks[move.color === "white" ? 0 : 1] +=
      1000 * this.timeCtrl.inc - (move.ms - this.lastTime);
    this.lastTime = move.ms;
    return capturedPiece;
  }

  addHolding(piece) {
    if (piece == null) {
      return;
    }
    const holdings = this.holdings[piece.color === "white" ? 0 : 1];
    ++holdings[LETTERS[piece.role]];
  }

  getHoldingsStr() {
    let str = "";
    for (const holdings of this.holdings) {
      for (const p in holdings) {
        for (let i = 0; i < holdings[p]; ++i) {
          str += p;
        }
      }
    }
    return str;
  }

  getState() {
    return {
      board: {
        fen: `${write(this.pieces)} ${this.toMove}`,
        white: { ms: this.clocks[0] },
        black: { ms: this.clocks[1] },
      },
      holdings: this.getHoldingsStr(),
    };
  }

  getAlgebraicNotation(move) {
    if (move.src == null) {
      return `${move.piece.toUpperCase()}@${move.dest}`;
    }
    // TODO egregiously incomplete (not handling ambiguities)
    const srcPiece = this.pieces.get(move.src);
    const capture = this.pieces.get(move.dest);
    const captureX = capture ? "x" : "";
    const piece = LETTERS[srcPiece.role].toUpperCase();
    switch (srcPiece.role) {
      case PIECES.PAWN:
        // comparing columns handles en-passant case
        if (capture == null && move.dest[0] == move.src[0]) {
          return move.dest;
        } else {
          // TODO enable "shorthand"
          return `${move.src[0]}x${move.dest}`;
        }
      case PIECES.KNIGHT:
      case PIECES.BISHOP:
      case PIECES.ROOK:
      case PIECES.QUEEN:
        return `${piece}${captureX}${move.dest}`;
      case PIECES.KING: {
        if (distanceSq(key2pos(move.src), key2pos(move.dest)) > 1) {
          return move.dest[0] === "g" ? "O-O" : "O-O-O";
        }
        return `${piece}${captureX}${move.dest}`;
      }
    }
  }
}

class AnalysisState {
  constructor(timeCtrl) {
    this._boards = [new AnalysisBoard(timeCtrl), new AnalysisBoard(timeCtrl)];
  }

  toAnalysisMove(move) {
    const board = this._boards[move.boardID];
    const label = board.getAlgebraicNotation(move);
    const capturedPiece = board.makeMove(move);
    this._boards[1 - move.boardID].addHolding(capturedPiece);
    return {
      ...move,
      label,
      state: {
        a: this._boards[0].getState(),
        b: this._boards[1].getState(),
      },
    };
  }

  deserialize(key, serMove, moveNums) {
    const boardID = key & 0x1;
    const ms = key >> 1; // milliseconds since start
    const num = Math.floor(moveNums[boardID] / 2) + 1;
    ++moveNums[boardID];
    const color = moveNums[boardID] % 2 === 1 ? "white" : "black";
    let move = { boardID, color, num, ms };
    if (serMove < 1) {
      serMove = -serMove;
      move.piece = Piece.fromIdx(serMove >> 6); // drop
      move.dest = toKey(serMove & 0x3f);
    } else {
      move.piece = Piece.fromIdx((serMove >> 6) & 0x7); // promo
      move.dest = toKey(serMove & 0x3f);
      move.src = toKey((serMove >> 9) & 0x3f);
    }
    return this.toAnalysisMove(move);
  }

  formMoves(serializedMoves) {
    // NOTE: keys *should* already come in sorted order, but w/e
    let moveNums = [0, 0];
    const self = this;
    return Object.keys(serializedMoves)
      .map((k) => parseInt(k))
      .sort((a, b) => a - b)
      .map((k) => self.deserialize(k, serializedMoves[k], moveNums));
  }
}

export default AnalysisState;
