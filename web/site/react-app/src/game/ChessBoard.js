import {EventEmitter} from 'events';
import invariant from 'invariant';

class ChessBoard extends EventEmitter {
  constructor({id, board, holdings}) {
    super();
    this._id = id;
    this._board = board;
    this._holdings = holdings;
  }

  update({id, board, holdings}) {
    const initialized = this._board?.white?.handle !== board?.white.handle;
    invariant(id === this._id, 'WTF');
    this._board = board;
    this._holdings = holdings;
    this.emit('update', this);
    if (initialized) {
      this.emit('init');
    }
  }

  isInitialized() {
    return this._board?.white?.handle != null &&
      this._board?.black?.handle != null;
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

  getHandles() {
    return [this._board.white.handle, this._board.black.handle];
  }

  getBoard() {
    return this._board;
  }

  getHoldings() {
    return this._holdings;
  }

  ongameOver(data) {
    invariant(data.id === this._id);
    this.emit('gameOver', data);
  }

  static init(id) {
    console.log(`ChessBoard.init() ${id}`);
    return new ChessBoard({
      id,
      board: {fen: '/////// w KQkq - 0 1'},
      holdings: {},
    });
  }
  static WHITE = 'white';
  static BLACK = 'black';
}

export default ChessBoard;
