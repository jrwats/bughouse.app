import { EventEmitter } from "events";
import invariant from "invariant";
import AnalysisState from "./AnalysisState";
import ScreenLock from "./ScreenLock";
import ChessBoard from "./ChessBoard";
import Piece from "./Piece";

export const ResultKind = {
  FLAGGED: 0,
  CHECKMATE: 1,
};

function _getColor(idx) {
  return idx === 0 ? "white" : "black";
}

class BughouseGame extends EventEmitter {
  constructor({ id, rated, delayStartMillis, a, b }) {
    super();
    this._isAnalysis = false;
    this._rated = rated;
    this._moves = [];
    this._result = null;
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
    if (delayStartMillis >= 0) {
      this._startTime = Date.now() + delayStartMillis;
    }
  }

  // TODO: This should not be necessary. Update Board.react.js
  // Force React to re-render
  forceUpdate() {
    this._a.forceUpdate();
    this._b.forceUpdate();
    this.emit("update", this);
  }

  update({ rated, result, delayStartMillis, a, b }) {
    console.log(`BughouseGame.update(${rated}, ${result}, ${delayStartMillis}, ...)`);
    this._result = result;
    this._rated = rated || this._rated;
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
  setMoves(serializedMoves, result) {
    const state = new AnalysisState(this._timeCtrl, result);
    this._moves = state.formMoves(serializedMoves);
    this.emit("update", this);
  }

  getMoves() {
    return this._moves.slice();
  }

  setTimeControl(timeCtrlStr) {
    this._timeCtrl = BughouseGame.deserializeTimeCtrl(timeCtrlStr);
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
    this._result = data.result;
    const boards = this._getBoards();
    boards[board].setWinner(_getColor(winner));
    boards[1 - board].setWinner(_getColor(1 - winner));
    this._reason = this._deriveReason(board, kind, winner);
    this._winner = winner === 0 ? "white" : "black";
    this.emit("gameOver", data);
    this.update(data);
    this.emit("update", data);
    ScreenLock.release();
  }

  static deserializeTimeCtrl(timeCtrlStr) {
    let [base, inc] = timeCtrlStr.split("|");
    return { base: parseInt(base), inc: parseInt(inc) };
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
