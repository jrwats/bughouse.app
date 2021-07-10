
import {EventEmitter} from 'events';
import invariant from 'invariant';
import ScreenLock from './ScreenLock';
import ChessBoard from './ChessBoard';

class BughouseGame extends EventEmitter {
  constructor({id, a, b}) {
    super();
    this._id = id;
    this._a = new ChessBoard(id, a);
    this._b = new ChessBoard(id, b);
  }

  update({id, a, b}) {
    this._a.update(a);
    this._b.update(b);
  }

  getBoardA() { 
    return this._a;
  }

  getBoardB() { 
    return this._b;
  }

  static init(id) {
    this._id = id;
    this._a = ChessBoard.init(id);
    this._b = ChessBoard.init(id);
  }
}
