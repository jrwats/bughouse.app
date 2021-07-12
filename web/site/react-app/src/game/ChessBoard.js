import {EventEmitter} from 'events';
import invariant from 'invariant';
import ScreenLock from './ScreenLock';

class ChessBoard extends EventEmitter {
  constructor({id, board, holdings}) {
    super();
    this._id = id;
    this._board = board;
    this._holdings = holdings;
    this._initialized = false;
    this._finished = false;
    this._reason = '';
    this._winner = null;
  }

  update({board, holdings}) {
    // invariant(id === this._id, `ChessBoard id mismatch? ${id} != $[this._id}`);
    this._board = board;
    this._holdings = holdings;
    this.emit('update', this);
    if (!this._initialized) {
      this._initialized = true;
      this.emit('init');
    }
  }

  updateTime({id, white, black}) {
    console.log(`ChessBoard updating time ${JSON.stringify(white)} ${JSON.stringify(black)}`);
    if (this._board.white != null) {
      this._board.white.time = white.time;
      this._board.black.time = black.time;
      this.emit('update', this);
    }
  }

  isInitialized() {
    return this._initialized;
  }

  getID() {
    return this._id;
  }

  getHandleColor(handle) {
    if (handle === this._board?.white?.handle) {
      return 'white';
    } else if (handle === this._board?.black?.handle) {
      return 'black';
    }
    return null;
  }

  decrHolding({color, piece}) {
    const holdings = this._holdings[color];
    const idx = holdings.indexOf(piece);
    if (idx < 0) {
      console.error(`decrementing unheld piece?`);
    }
    const prevHoldings = holdings;
    this._holdings[color] = holdings.substr(0, idx) + holdings.substr(idx + 1);
    console.log(`ChessBoard decrHolding ${prevHoldings} => ${this._holdings[color]}`);
    this.emit('update', this);
  }

  getColorToMove() {
    const {toMove} = this._board;
    return toMove === 'W' ? 'white' : (toMove === 'B' ? 'black' : null);
  }

  getHandles() {
    return [this._board.white.handle, this._board.black.handle];
  }

  getBoard() {
    return this._board;
  }

  getHoldings() {
    return this._holdings;
  }

  onGameOver(data) {
    invariant(data.id === this._id, `Mismatched board IDs? ${data.id} ${this._id}`);
    this._finished = true;
    this._reason = data.reason;
    this._winner = data.result[0] === '1' ? 'white' : 'black';
    ScreenLock.release();
    this.emit('gameOver', data);
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

  static init(id) {
    console.log(`ChessBoard.init() ${id}`);
    return new ChessBoard({
      id,
      board: {
        fen: 'rnbqkbnr/pppppppp/////PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        white: {handle: '', time: 0},
        black: {handle: '', time: 0},
      },
      holdings: {},
    });
  }
  static WHITE = 'white';
  static BLACK = 'black';
}

export default ChessBoard;
