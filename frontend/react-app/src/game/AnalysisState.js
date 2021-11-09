/**
 * For re-constructing a game's move from the DB's serialized moves.
 * This includes constructing display strings (standard algebraic notation
 * and Bughouse drops "P@f7").
 *
 * NOTE: Does NOT have to concern itself with validating moves. The server has
 * already done that.
 */

import { read, write } from "chessground/fen";
import { pos2key } from "chessground/util";
import Piece, { PIECES, LETTERS, NAMES } from "./Piece";
import { ResultKind } from "./BughouseGame";
import { FLAG } from "./ClockDisplay.react";

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

// assumes piece.role is KING
const isCastle = (move) =>
  move.src[1] === move.dest[1] &&
  Math.abs(move.src.charCodeAt(0) - move.dest.charCodeAt(0)) > 1;

class AnalysisBoard {
  constructor(timeCtrl, lastTime) {
    const ms = timeCtrlToMs(timeCtrl);
    this.timeCtrl = timeCtrl;
    this.holdings = [initHoldings(), initHoldings()]; // white black holdings
    this.clocks = [ms, ms];
    this.pieces = read("start");
    this.promos = new Map();
    this.toMove = "w";
    this.lastTime = lastTime;
    this.lastMove = [];
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
        if (piece.role === "king" && isCastle(move)) {
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
    const clockIdx = move.color === "white" ? 0 : 1;
    if (move.flag != null) {
      this.lastTime.val += this.clocks[clockIdx];
      this.clocks[clockIdx] = 0;
    } else {
      this.toMove = this.toMove === "w" ? "b" : "w";
      this.clocks[move.color === "white" ? 0 : 1] +=
        1000 * this.timeCtrl.inc - (move.ms - this.lastTime.val);
      this.lastTime.val = move.ms;
    }
    this.lastMove = [move.src, move.dest].filter((s) => s != null);
    return capturedPiece;
  }

  addHolding(piece) {
    if (piece == null) {
      return;
    }
    const holdings = this.holdings[piece.color === "white" ? 0 : 1];
    ++holdings[LETTERS[piece.role]];
  }

  _getHeldStr(holdings) {
    let str = "";
    for (const p in holdings) {
      for (let i = 0; i < holdings[p]; ++i) {
        str += p;
      }
    }
    return str;
  }

  getHoldingsStr() {
    const [white, black] = this.holdings.map((h) => this._getHeldStr(h));
    return white.toUpperCase() + black;
  }

  passTime(ms) {
    this.clocks[this.toMove === "w" ? 0 : 1] -= ms;
  }

  getState() {
    return {
      board: {
        lastMove: this.lastMove,
        fen: `${write(this.pieces)} ${this.toMove}`,
        white: { ms: this.clocks[0] },
        black: { ms: this.clocks[1] },
      },
      holdings: this.getHoldingsStr(),
    };
  }

  getAlgebraicNotation(move) {
    if (move.flag != null) {
      return FLAG;
    } else if (move.src == null) {
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
        if (capture == null && move.dest[0] === move.src[0]) {
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
        if (isCastle(move)) {
          return move.dest[0] === "g" ? "O-O" : "O-O-O";
        }
        return `${piece}${captureX}${move.dest}`;
      }
    }
  }
}

class AnalysisState {
  constructor(timeCtrl, result) {
    this._result = result;
    this._lastTime = { val: 0 };
    this._boards = [
      new AnalysisBoard(timeCtrl, this._lastTime),
      new AnalysisBoard(timeCtrl, this._lastTime),
    ];
  }

  toAnalysisMove(move) {
    const board = this._boards[move.boardID];
    const label = board.getAlgebraicNotation(move);
    const then = this._lastTime.val;
    const capturedPiece = board.makeMove(move);
    this._boards[1 - move.boardID].addHolding(capturedPiece);
    this._boards[1 - move.boardID].passTime(this._lastTime.val - then);
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

  makeFlag(moveNums) {
    const { board, winner } = this._result;
    const move = {
      flag: true,
      boardID: board,
      color: winner === 1 ? "white" : "black",
      num: Math.floor(moveNums[board] / 2) + 1,
    };
    return this.toAnalysisMove(move);
  }

  formMoves(serializedMoves) {
    // NOTE: keys *should* already come in sorted order, but w/e
    let moveNums = [0, 0];
    const moves = Object.keys(serializedMoves)
      .map((k) => parseInt(k))
      .sort((a, b) => a - b)
      .map((k) => this.deserialize(k, serializedMoves[k], moveNums));
    if (this._result.kind === ResultKind.CHECKMATE) {
      moves[moves.length - 1].label += "#";
    } else {
      moves.push(this.makeFlag(moveNums));
      moves[moves.length - 1].state.result = this._result;
    }
    return moves;
  }
}

export default AnalysisState;
