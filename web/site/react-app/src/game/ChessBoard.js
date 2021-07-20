import { EventEmitter } from "events";
import invariant from "invariant";
import ScreenLock from "./ScreenLock";
import { Board, Color, GameResultType } from "./Constants.js";

class ChessBoard extends EventEmitter {
  constructor({ id, game, board, holdings }) {
    super();
    this._id = id;
    this._game = game;
    this._board = board;
    this._holdings = holdings;
    this._initialized = false;
    this._finished = false;
    this._reason = "";
    this._winner = null;
  }

  update({ board, holdings }) {
    // invariant(id === this._id, `ChessBoard id mismatch? ${id} != $[this._id}`);
    this._board = board;
    this._holdings = holdings;
    this.emit("update", this);
    if (!this._initialized) {
      this._initialized = true;
      this.emit("init");
    }
  }

  // TODO: delete? Was only used observing "global" games in FICS
  updateTime({ id, white, black }) {
    console.log(
      `ChessBoard updating time ${JSON.stringify(white)} ${JSON.stringify(
        black
      )}`
    );
    if (this._board.white != null) {
      this._board.white.ms = white.ms;
      this._board.black.ms = black.ms;
      this.emit("update", this);
    }
  }

  isInitialized() {
    return this._initialized;
  }

  getGame() {
    return this._game;
  }

  getID() {
    return this._id;
  }

  getHandleColor(handle) {
    if (handle === this._board?.white?.handle) {
      return "white";
    } else if (handle === this._board?.black?.handle) {
      return "black";
    }
    return null;
  }

  decrHolding({ color, piece }) {
    const holdings = this._holdings[color];
    const idx = holdings.indexOf(piece);
    if (idx < 0) {
      console.error(`decrementing unheld piece?`);
    }
    const prevHoldings = holdings;
    this._holdings[color] = holdings.substr(0, idx) + holdings.substr(idx + 1);
    console.log(
      `ChessBoard decrHolding ${prevHoldings} => ${this._holdings[color]}`
    );
    this.emit("update", this);
  }

  getColorToMove() {
    const toMove = this._board.fen.split(/\s/g)[1];
    return toMove === "w" ? "white" : toMove === "b" ? "black" : null;
  }

  getHandles() {
    return [this._board.white.handle, this._board.black.handle];
  }

  getGame() {
    return this._game;
  }

  getStart() {
    return this._game.getStart();
  }

  getBoard() {
    return this._board;
  }

  getHoldings() {
    return this._holdings;
  }

  isFinished() {
    return this._finished;
  }

  getWinner() {
    return this._winner;
  }

  getReason() {
    return this._reason;
  }

  static init(game, id) {
    console.log(`ChessBoard.init() ${id}`);
    return new ChessBoard({
      game,
      id,
      board: {
        fen: "rnbqkbnr/pppppppp/////PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        white: { handle: "", ms: 0 },
        black: { handle: "", ms: 0 },
      },
      holdings: {},
    });
  }
  static WHITE = "white";
  static BLACK = "black";
}

export default ChessBoard;
