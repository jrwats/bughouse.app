import { EventEmitter } from "events";
import ChessBoard from "./ChessBoard";
import BughouseGame from "./BughouseGame";
import { navigate } from "@reach/router";
import GamesListSource from "./GamesListSource";

class GameStatusSource extends EventEmitter {
  constructor(socket) {
    super();
    this._socket = socket;
    this._observing = {};
    const uid = this._socket.getUid();
    this._socket.on("logout", () => {
      this._destroy(uid);
    });
    this._games = {};

    this._socket.on("game_update", (data) => this._onGameUpdate(data));
    this._socket.on("game_over", (data) => this._onGameOver(data));
    this._socket.on("game_start", (data) => this._onGameStart(data));
    this._socket.on("form_table", (data) => this._onTable(data));
    this._socket.on("table", (data) => this._onTable(data));
  }

  _onGameUpdate(data) {
    console.log(`GameStatusSource boardUpdate ${JSON.stringify(data)}`);
    this.getGame(data.id).update(data);
    this.emit("gameUpdate", this._games[data.id]);
  }

  _onGameOver(data) {
    console.log(`GameStatusSource 'gameOver' ${JSON.stringify(data)}`);
    if (data.id in this._games) {
      this._games[data.id].onGameOver(data);
    }
    this.emit("gameOver", data);
  }

  _onTable(data) {
    console.log('onTable!'); 
    if (data.id in this._games) {
      this._games[data.id].update(data)
    } else {
     this._games[data.id] = BughouseGame.init(data);
    }
    navigate(`/home/table/${data.id}`);
  }

  _onGameStart(data) {
    this._games[data.id] = BughouseGame.init(data);
    navigate(`/home/game/${data.id}`);
  }

  _destroy(uid) {
    delete _cache[uid];
  }

  getGame(id) {
    if (id == null) {
      return null;
    }
    if (id in this._games) {
      return this._games[id];
    }
    return (this._games[id] = BughouseGame.init({ id }));
  }

  unobserve(id) {
    this._socket.sendEvent("unobserve", { id });
    delete this._observing[id];
  }

  observe(id) {
    if (!(id in this._observing)) {
      this._socket.sendEvent("observe", { id });
      this._observing[id] = 1;
    } else {
      this._socket.sendEvent("refresh", { id });
    }
  }
}

const _cache = {};
const GameStatusSourceGetter = {
  get(socket) {
    const uid = socket.getUid();
    return _cache[uid] || (_cache[uid] = new GameStatusSource(socket));
  },
};
export default GameStatusSourceGetter;
