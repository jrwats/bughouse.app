import { EventEmitter } from 'events';
import ChessBoard from './ChessBoard';
import { navigate } from "@reach/router";

class GameStatusSource extends EventEmitter {
  constructor(telnet) {
    super();
    this._telnet = telnet;
    this._observing = {};
    const uid = this._telnet.getUid();
    this._telnet.on('logout', () => { this._destroy(uid); });
    this._boards = {};
    this._telnet.on('boardUpdate', data => this._onBoardUpdate(data));
    this._telnet.on('gameOver', data => this._onGameOver(data));
    this._telnet.on('gameStart', data => this._onGameStart(data));
  }

  _onBoardUpdate({board}) {
    console.log(`GameStatusSource boardUpdate ${JSON.stringify(board)}`);
    if (board.board == null) {
      console.error(`NULL board?`);
    }
    if (!(board.id in this._boards)) {
      this._boards[board.id] = new ChessBoard(board);
    } else {
      this._boards[board.id].update(board);
    }
    this.emit('boardUpdate', this._boards[board.id]);
  }

  _onGameOver({boards}) {
    for (const b of boards) {
      if (b.id in this._boards) {
        this._boards[b.id].onGameOver(b);
      }
      delete this._boards[b.id];
      delete this._observing[b.id];
    }
    this.emit('gameOver', boards);
  }

  _onGameStart({game}) {
    const gamePair = `${game.viewer.id}~${game.partner.id}`;
    navigate(`/home/arena/${gamePair}`);
  }

  _destroy(uid)  {
    delete _cache[uid];
  }

  getBoard(id) {
    if (id == null) {
      return null;
    }
    if (id in this._boards) {
      return this._boards[id];
    }
    return (this._boards[id] = ChessBoard.init(id));
  }

  unobserve(id) {
    this._telnet.sendEvent('unobserve', {id});
    delete this._observing[id];
  }

  observe(id) {
    if (!(id in this._observing)) {
      this._telnet.sendEvent('observe', {id});
      this._observing[id] = 1;
    } else {
      this._telnet.sendEvent('refresh', {id});
    }
  }
}

const _cache = {};
export default {
  get(telnet) {
    const uid = telnet.getUid();
    return _cache[uid] || (_cache[uid] = new GameStatusSource(telnet));
  }
};
