import { EventEmitter } from "events";
import invariant from "invariant";
import ScreenLock from "./ScreenLock";
import ChessBoard from "./ChessBoard";

const ResultKind = {
  FLAGGED: 0,
  CHECKMAGE: 0,
};

function _getColor(idx) {
  return idx === 0 ? "white" : "black";
}

class BughouseGame extends EventEmitter {
  constructor({ id, rated, delayStartMillis, a, b }) {
    super();
    this._rated = rated;
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
