import { EventEmitter } from "events";
import BughouseGame from "./BughouseGame";
import { navigate } from "@reach/router";

let _singleton = null;

// TODO: This singleton is quite janky - listening to the socket and killing
// itself.  Perhaps turn this into a Provider?
class GameStatusSource extends EventEmitter {
  constructor(socket) {
    super();
    this._socket = socket;
    this._observing = {};
    this._games = {};

    this._socket.on("current_game",  this._onCurrentGame);
    this._socket.on("current_games", this._onCurrentGames);
    this._socket.on("game_row", this._onGameRow);
    this._socket.on("game_update", this._onGameUpdate);
    this._socket.on("game_end", this._onGameOver);
    this._socket.on("game_start", this._onGameStart);
    this._socket.on("form_table", this._onTable);
    this._socket.on("table", this._onTable);

    this._socket.on("destroy", this._onDestroy);
  }

  _onDestroy(data) {
    this._socket.off("current_game",  this._onCurrentGame);
    this._socket.off("current_games", this._onCurrentGames);
    this._socket.off("game_row", this._onGameRow);
    this._socket.off("game_update", this._onGameUpdate);
    this._socket.off("game_end", this._onGameOver);
    this._socket.off("game_start", this._onGameStart);
    this._socket.off("form_table", this._onTable);
    this._socket.off("table", this._onTable);
    _singleton = null;
  }

  _onCurrentGame = (data) => {
    if (data.add) {
      this._games[data.id] = BughouseGame.init(data);
    } else if (data.update) {
      this._games[data.id].update(data);
    } else if (data.rm) {
      delete this._games[data.id];
    }
    this.emit("current_game", data);
  }

  _onCurrentGames = ({ games }) => {
    for (const gid in games) {
      this._games[gid] = BughouseGame.init(games[gid]);
    }
    const bughouseGames = Object.keys(games).reduce(
      (m, id) => m.set(id, this._games[id]),
      new Map()
    );
    this.emit("current_games", { games: bughouseGames });
  }

  _onGameRow = (data) => {
    console.log(`GameStatusSource row ${JSON.stringify(data)}`);
    const game = this.getGame(data.id);
    game.setTimeControl(data.time_ctrl);
    game.setMoves(data.moves, data.result);
    game.setIsAnalysis(true);
    const [[aw, ab], [bw, bb]] = data.players;
    game.getBoardA().update({
      board: { white: aw, black: ab },
      // moves: data.moves[0],
    });
    game.getBoardB().update({
      board: { white: bw, black: bb },
      // moves: data.moves[1],
    });
    navigate(`/analysis/${data.id}`);
    this.emit("gameUpdate", this._games[data.id]);
  }

  _onGameUpdate = (data) => {
    console.log(`GameStatusSource boardUpdate ${JSON.stringify(data)}`);
    this.getGame(data.id).update(data);
    this.emit("gameUpdate", this._games[data.id]);
  }

  _onGameOver = (data) => {
    console.log(`GameStatusSource 'gameOver' ${JSON.stringify(data)}`);
    if (data.id in this._games) {
      this._games[data.id].onGameOver(data);
    }
    this.emit("gameOver", data);
  }

  _onTable = (data) => {
    console.log("onTable!");
    if (data.id in this._games) {
      this._games[data.id].update(data);
    } else {
      this._games[data.id] = BughouseGame.init(data);
    }
    if (data.kind === "form_table") {
      navigate(`/table/${data.id}`);
    }
  }

  _onGameStart = (data) => {
    console.log(`GSS._onGameStart navigating to arena/${data.id}`);
    this._games[data.id] = BughouseGame.init(data);
    navigate(`/arena/${data.id}`);
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
    console.log(`Observing ${id}`);
    if (!(id in this._observing)) {
      this._socket.sendEvent("observe", { id });
      this._observing[id] = 1;
    } else {
      this._socket.sendEvent("refresh", { id });
    }
  }
}

const GameStatusSourceGetter = {
  get(socket) {
    if (_singleton == null) {
      _singleton = new GameStatusSource(socket);
    }
    return _singleton;
  },
};
export default GameStatusSourceGetter;
