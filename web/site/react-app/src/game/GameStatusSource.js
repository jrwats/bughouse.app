import { EventEmitter } from 'events';
import ChessBoard from './ChessBoard';
import BughouseGame from './BughouseGame';
import { navigate } from "@reach/router";
import GamesListSource from './GamesListSource';

class GameStatusSource extends EventEmitter {
  constructor(socket) {
    super();
    this._socket = socket;
    this._observing = {};
    const uid = this._socket.getUid();
    this._socket.on('logout', () => { this._destroy(uid); });
    this._games = {};

    this._socket.on('gameUpdate', data => this._onGameUpdate(data));
    this._socket.on('gameOver', data => this._onGameOver(data));
    this._socket.on('gameStart', data => this._onGameStart(data));
  }

  _onGameUpdate(data) {
    console.log(`GameStatusSource boardUpdate ${JSON.stringify(data)}`);
    this.getGame(data.id).update(data);
    this.emit('gameUpdate', this._games[data.id]);
  }

  _onGameOver({board}) {
    console.log(`GameStatusSource 'gameOver' ${JSON.stringify(board)}`);
    if (board.id in this._boards) {
      this._boards[board.id].onGameOver(board);
    }
    // delete this._boards[board.id];
    // delete this._observing[board.id];
    this.emit('gameOver', board);
  }

  _onGameStart({game}) {
    if (game.path != null) {
      navigate(`/home/game/${game.path}`);
    } else {
      // FICS logic
      const gamePair = `${game.viewer.id}~${game.partner.id}`;
      navigate(`/home/fics_arena/${gamePair}`);
    }
  }

  _destroy(uid)  {
    delete _cache[uid];
  }

  getGame(id) {
    if (id == null) {
      return null;
    }
    if (id in this._games) {
      return this._games[id];
    }
    return (this._games[id] = BughouseGame.init(id));
  }

  unobserve(id) {
    this._socket.sendEvent('unobserve', {id});
    delete this._observing[id];
  }

  observe(id) {
    if (!(id in this._observing)) {
      this._socket.sendEvent('observe', {id});
      this._observing[id] = 1;
    } else {
      this._socket.sendEvent('refresh', {id});
    }
  }
}

const _cache = {};
const GameStatusSourceGetter = {
  get(socket) {
    const uid = socket.getUid();
    return _cache[uid] || (_cache[uid] = new GameStatusSource(socket));
  }
};
export default GameStatusSourceGetter;
