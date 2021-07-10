import { EventEmitter } from 'events';
import ChessBoard from './ChessBoard';
import BughouseGame from './BughouseGame';
import { navigate } from "@reach/router";
import GamesListSource from './GamesListSource';

class GameStatusSource extends EventEmitter {
  constructor(telnet) {
    super();
    this._telnet = telnet;
    this._observing = {};
    const uid = this._telnet.getUid();
    this._telnet.on('logout', () => { this._destroy(uid); });
    this._games = {};

    this._telnet.on('gameUpdate', data => this._onGameUpdate(data));
    this._telnet.on('gameOver', data => this._onGameOver(data));
    this._telnet.on('gameStart', data => this._onGameStart(data));
  }

  _onGameUpdate({game}) {
    console.log(`GameStatusSource boardUpdate ${JSON.stringify(game)}`);
    this.getGame(id).update(game);
    this.emit('gameUpdate', this._games[game.id]);
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
const GameStatusSourceGetter = {
  get(telnet) {
    const uid = telnet.getUid();
    return _cache[uid] || (_cache[uid] = new GameStatusSource(telnet));
  }
};
export default GameStatusSourceGetter;
