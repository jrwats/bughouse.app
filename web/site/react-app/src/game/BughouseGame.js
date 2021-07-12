
import {EventEmitter} from 'events';
import invariant from 'invariant';
import ScreenLock from './ScreenLock';
import ChessBoard from './ChessBoard';

class BughouseGame extends EventEmitter {
  constructor({id, a, b}) {
    super();
    this._id = id;
    this._a = a;
    this._b = b;
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
    return new BughouseGame({
      id, 
      a: ChessBoard.init(id + '/a'),
      b: ChessBoard.init(id + '/b')
    });
  }
}

export default BughouseGame;
