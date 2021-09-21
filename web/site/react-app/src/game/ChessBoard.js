import { EventEmitter } from "events";

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
    console.log(`ChessBoard.update(...) ${this._id}: ${board.fen}`);
    // invariant(id === this._id, `ChessBoard id mismatch? ${id} != $[this._id}`);
    // deep merge
    const whiteHandle =
      "handle" in (board?.white || {})
        ? board.white.handle
        : this._board.white.handle;
    const blackHandle =
      "handle" in (board?.black || {})
        ? board.black.handle
        : this._board.black.handle;
    this._board = {
      fen: board.fen || this._board.fen,
      lastMove: board.lastMove?.slice(),
      white: {
        handle: whiteHandle,
        ms: board.white?.ms || this._board.white?.ms,
      },
      black: {
        handle: blackHandle,
        ms: board.black?.ms || this._board.black?.ms,
      },
    };

    // this._board = { ...this._board, ...board};
    this._holdings = holdings || "";
    this.emit("update", this);
    if (!this._initialized) {
      this._initialized = true;
      this.emit("init");
    }
  }

  forceUpdate() {
    this.emit("update", this);
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

  getLastMove() {
    return this._board.lastMove;
  }

  getBoardID() {
    return this._game.getBoardA() === this ? "A" : "B";
  }

  getBoardIdx() {
    return this._game.getBoardA() === this ? 0 : 1;
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
    if (color === "black") {
      piece = piece.toLowerCase();
    }
    const holdings = this._holdings;
    const idx = holdings.indexOf(piece);
    if (idx < 0) {
      console.error(`decrementing unheld piece?`);
    }
    const prevHoldings = holdings;
    this._holdings = holdings.substr(0, idx) + holdings.substr(idx + 1);
    this.emit("update", this);
  }

  getColorToMove() {
    const toMove = this._board.fen.split(/\s/g)[1];
    return toMove === "w" ? "white" : toMove === "b" ? "black" : null;
  }

  getHandles() {
    return [this._board.white.handle, this._board.black.handle];
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
    return this._finished || this._game.isFinished();
  }

  getWinner() {
    return this._winner;
  }

  setWinner(winnerColor) {
    this._winner = winnerColor;
    this.emit("update", this);
  }

  getReason() {
    return this._reason || this._game.getReason();
  }

  static init(game, id) {
    console.log(`ChessBoard.init() ${id}`);
    return new ChessBoard({
      game,
      id,
      board: {
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        white: { handle: "", ms: 0 },
        black: { handle: "", ms: 0 },
      },
      holdings: "",
    });
  }
  static WHITE = "white";
  static BLACK = "black";
}

export default ChessBoard;
