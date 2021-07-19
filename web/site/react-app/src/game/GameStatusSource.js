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

    this._socket.on("gameUpdate", (data) => this._onGameUpdate(data));
    this._socket.on("gameOver", (data) => this._onGameOver(data));
    this._socket.on("gameStart", (data) => this._onGameStart(data));
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

  _onGameStart({ id, a, b }) {
    this._games[id] = new BughouseGame({
      id,
      a: new ChessBoard({ ...a, id: id + "/a" }),
      b: new ChessBoard({ ...b, id: id + "/b" }),
    });
    navigate(`/home/game/${id}`);
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
    return (this._games[id] = BughouseGame.init(id));
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
