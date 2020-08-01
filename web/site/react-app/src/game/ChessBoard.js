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
    debugger;
    invariant(id === this._id);
    this._board = board;
    this._holdings = holdings;
    this.emit('update', this);
  }

  getID() {
    return this._id;
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
    return new ChessBoard({
      id,
      board: {},
      holdings: {},
    });
  }
}

export default ChessBoard;
