import { EventEmitter } from "events";
import ChessBoard from "./ChessBoard";
import { navigate } from "@reach/router";
import GamesListSource from "./GamesListSource";

function getTime(board) {
  const wMatch = /(\d+):(\d+)/.exec(board.white.time);
  const bMatch = /(\d+):(\d+)/.exec(board.black.time);
  return {
    white: { time: wMatch[1] * 60 + parseInt(wMatch[2]) },
    black: { time: bMatch[1] * 60 + parseInt(bMatch[2]) },
  };
}

class GameStatusSource extends EventEmitter {
  constructor(socket) {
    super();
    this._socket = socket;
    this._observing = {};
    const uid = this._socket.getUid();
    this._socket.on("logout", () => {
      this._destroy(uid);
    });
    this._boards = {};
    this._allGames = GamesListSource.get(socket);
    this._allGames.on("games", (games) => {
      for (const game of games) {
        const [board1, board2] = game;
        if (board1.id in this._boards) {
          this._boards[board1.id].updateTime(getTime(board1));
        }
        if (board2.id in this._boards) {
          this._boards[board2.id].updateTime(getTime(board2));
        }
      }
    });

    this._socket.on("boardUpdate", (data) => this._onBoardUpdate(data));
    this._socket.on("gameOver", (data) => this._onGameOver(data));
    this._socket.on("gameStart", (data) => this._onGameStart(data));
  }

  _onBoardUpdate({ board }) {
    console.log(`GameStatusSource boardUpdate ${JSON.stringify(board)}`);
    if (board.board == null) {
      console.error(`NULL board?`);
    }
    this.getBoard(board.id).update(board);
    this.emit("boardUpdate", this._boards[board.id]);
  }

  _onGameOver({ board }) {
    console.log(`GameStatusSource 'gameOver' ${JSON.stringify(board)}`);
    if (board.id in this._boards) {
      this._boards[board.id].onGameOver(board);
    }
    // delete this._boards[board.id];
    // delete this._observing[board.id];
    this.emit("gameOver", board);
  }

  _onGameStart({ game }) {
    if (game.path != null) {
      navigate(`/home/game/${game.path}`);
    } else {
      // At one point I thoughth about trying to ALSO host FICS games, but... meh
      const gamePair = `${game.viewer.id}~${game.partner.id}`;
      navigate(`/home/fics_arena/${gamePair}`);
    }
  }

  _destroy(uid) {
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
