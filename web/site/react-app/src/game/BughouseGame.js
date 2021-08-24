import { EventEmitter } from "events";
import invariant from "invariant";
import ScreenLock from "./ScreenLock";
import ChessBoard from "./ChessBoard";
import Piece from "./Piece";
import { pos2key, allKeys } from "chessground/util";

const ResultKind = {
  FLAGGED: 0,
  CHECKMAGE: 0,
};

function _getColor(idx) {
  return idx === 0 ? "white" : "black";
}

function toKey(sqIdx) {
  const file = sqIdx % 8;
  const rank = Math.floor(sqIdx / 8);
  return pos2key([file, rank]);
}

class BughouseGame extends EventEmitter {
  constructor({ id, rated, delayStartMillis, a, b }) {
    super();
    this._isAnalysis = false;
    this._rated = rated;
    this._moves = [];
    this._setStart(delayStartMillis);
    this._id = id;

    let idA = id + "/a";
    let idB = id + "/b";
    this._a =
      a != null
        ? new ChessBoard({ ...a, game: this, id: idA })
        : ChessBoard.init(this, idA);
    this._b =
      b != null
        ? new ChessBoard({ ...b, game: this, id: idB })
        : ChessBoard.init(this, idB);
  }

  _setStart(delayStartMillis) {
    if (delayStartMillis > 0) {
      this._startTime = Date.now() + delayStartMillis;
    }
  }

  update({ id, rated, delayStartMillis, a, b }) {
    console.log(`BughouseGame.update(...)`);
    this._rated = rated;
    this._setStart(delayStartMillis);
    this._a.update(a);
    this._b.update(b);
    this.emit("update", this);
  }

  isFinished() {
    return this._finished;
  }

  getID() {
    return this._id;
  }

  isRated() {
    return this._rated;
  }

  isAnalysis() {
    return this._isAnalysis;
  }

  setIsAnalysis(analysis) {
    this._isAnalysis = analysis;
  }

  // NOTE: Doing this on client for now to minimize work on server where possible
  // See GameRow::serialize/deserialize server-side
  // map<key, val>
  // key >> 1 = time in ms (since start of game)
  // key & 0x1 = board ID
  // val < 0 = drop move
  // val > 0 = normal move
  setMoves(serializedMoves) {
    // NOTE: keys already come in sorted order, but w/e
    let moveNums = [0, 0];
    this._moves = Object.keys(serializedMoves)
      .map(k => parseInt(k))
      .sort((a,b) => a - b)
      .map(k => {
        const boardID = k & 0x1;
        const ms = k >> 1; // milliseconds since start
        let serMove = serializedMoves[k];
        const num = Math.floor(moveNums[boardID] / 2) + 1;
        ++moveNums[boardID];
        let move = {boardID, num, ms};
        if (serMove < 1) {
          serMove = -serMove
          move.piece = Piece.fromIdx(serMove >> 6); // drop
          move.dest = toKey(serMove & 0x3f);
        } else {
          move.piece = Piece.fromIdx((serMove >> 6) & 0x7); // promo
          move.dest = toKey(serMove & 0x3f);
          move.src = toKey((serMove >> 9) & 0x3f);
        }
        return move;
    });
    this.emit("update", this);
  }

  getMoves() {
    return this._moves;
  }

  setTimeControl(timeCtrlStr) {
    let [base, inc] = timeCtrlStr.split('|');
    this._timeCtrl = {
      base: parseInt(base),
      inc: parseInt(inc)
    };
  }

  getStart() {
    return this._startTime;
  }

  getBoardA() {
    return this._a;
  }

  getBoardB() {
    return this._b;
  }

  _getBoards() {
    return [this._a, this._b];
  }

  _deriveReason(board, kind, winnerColor) {
    const boardLabel = board === 0 ? "A" : "B";
    const boards = this._getBoards();
    const srcBoard = boards[board];
    const handles = srcBoard.getHandles();
    const loser = handles[1 - winnerColor];
    if (kind === ResultKind.FLAGGED) {
      return `${loser} flagged on board ${boardLabel}`;
    }
    const winner = handles[winnerColor];
    return `${winner} checkmated ${loser}`;
  }

  getReason() {
    return this._reason;
  }

  getResult() {
    return this._result;
  }

  onGameOver(data) {
    invariant(
      data.id === this._id,
      `Mismatched board IDs? ${data.id} ${this._id}`
    );
    console.log(data.result);
    this._finished = true;
    const { board, kind, winner } = data.result;
    const boards = this._getBoards();
    boards[board].setWinner(_getColor(winner));
    boards[1 - board].setWinner(_getColor(1 - winner));
    this._reason = this._deriveReason(board, kind, winner);
    this._result = data.result;
    this._winner = data.result[0] === "1" ? "white" : "black";
    ScreenLock.release();
    this.emit("gameOver", data);
    this.emit("update", data);
  }

  static init({ id, delayStartMillis, a, b }) {
    return new BughouseGame({
      id,
      delayStartMillis,
      a,
      b,
    });
  }
}

export default BughouseGame;
