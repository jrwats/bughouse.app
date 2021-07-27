import { EventEmitter } from "events";
import invariant from "invariant";
import ScreenLock from "./ScreenLock";
import ChessBoard from "./ChessBoard";

class BughouseGame extends EventEmitter {
  constructor({ id, delayStartMillis, a, b }) {
    super();
    this._startTime = Date.now() + delayStartMillis;
    this._id = id;

    let idA = id + "/a";
    let idB = id + "/b";
    this._a = a != null
      ? new ChessBoard({ ...a, game: this, id: idA })
      : ChessBoard.init(this, idA);
    this._b = b != null
      ? new ChessBoard({ ...b, game: this, id: idB })
      : ChessBoard.init(this, idB);
  }

  update({ id, a, b }) {
    this._a.update(a);
    this._b.update(b);
  }

  getID() { 
    return this.id; 
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

  onGameOver(data) {
    invariant(
      data.id === this._id,
      `Mismatched board IDs? ${data.id} ${this._id}`
    );
    let { board, color, kind } = data.result;
    console.log(data.result);
    this._finished = true;
    this._reason = data.reason;
    this._winner = data.result[0] === "1" ? "white" : "black";
    ScreenLock.release();
    this.emit("gameOver", data);
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
