const {EventEmitter} = require('events');
const BoardParser = require('./BoardParser');
const log = require('./log');

class GameObserver extends EventEmitter {
  constructor(socketMgr, ficsMgr) {
    super();
    this._socketMgr = socketMgr;
    this._ficsMgr = ficsMgr;

    // "Observers" are those FICS connections that we've ensured have
    // issued an "observe" command on behalf of the gameid
    this._observer2gameIDs = {}; // "delegate" uid => gameids
    this._gameid2observer = {}; // "delegate" uid 2 gameids

    // "subscribers" are anyone also interestedd in viewing the game, and using
    // our stashed data from the "observer's"
    this._subscriber2gameIDs = {};
    this._gameid2subscribers = {};
    this._ficsMgr.on('logout', uid => { this._onLogout(uid); });
    this._boards = {};
    this._holdings = {};
  }

  subscribe(uid, gameID) {
    const gameIDs = this._subscriber2gameIDs[uid] ||
      (this._subscriber2gameIDs[uid] = {});
    gameIDs[gameID] = 1;
    const uids = this._gameid2subscribers[gameID] ||
      (this._gameid2subscribers[gameID] = {});
    uids[uid] = 1;
    if (!(gameID in this._gameid2observer)) {
      this._observe(gameID);
    }
    if (gameID in this._boards) {
      this._socketMgr.emit(uid, 'boardUpdate', {
        id: gameID,
        board: this._boards[gameID],
        holdings: this._holdings[gameID],
      });
    }
    this._refreshGame(gameID);
  }

  dump() {
    log(`
observer2game: ${JSON.stringify(this._observer2gameIDs)}
gameid2observer: ${JSON.stringify(this._gameid2observer)}
subscriber2game: ${JSON.stringify(this._subscriber2gameIDs)}
gameid2subscribers: ${JSON.stringify(this._gameid2subscribers)}
boards: ${JSON.stringify(this._boards)}
holdings: ${JSON.stringify(this._holdings)}
`);
  }

  unsubscribeAll(uid) {
    for (const gameID in (this._subscriber2gameIDs[uid] || {})) {
      this.unsubscribe(uid, gameID);
    }
  }

  unsubscribe(uid, gameID) {
    if (this._subscriber2gameIDs[uid]) {
      delete this._subscriber2gameIDs[uid][gameID];
    }
    if (this._gameid2subscribers[gameID]) {
      delete this._gameid2subscribers[gameID][uid];
    }
    this._unobserve(uid, gameID);
    this._clearCache(gameID);
  }

  _clearCache(gameID) {
    // If there are no subscribers remaining delete stored boards/holdings
    for (const uid in this._gameid2subscribers[gameID]) {
      return;
    }
    log(`GameObserver clearing ${gameID}`);
    delete this._boards[gameID];
    delete this._holdings[gameID];
  }

  parse(text) {
    const {board, match: boardMatch} = BoardParser.parseBoard(text);
    if (board != null) {
      this._boards[board.id] = board;
    }
    const {holdings, match: holdingsMatch} = BoardParser.parseHoldings(text);
    if (holdings != null) {
      this._holdings[holdings.id] = holdings;
    }
    // log(`GameObserver parsed ${board} ${holdings}`);
    return board == null && holdings == null
      ? null
      : {board, holdings, boardMatch, holdingsMatch};
  }

  getMatch(text) {
    return this.parse(text);
  }

  getBoard(id) {
    return {
      id,
      board: this._boards[id],
      holdings: this._holdings[id],
    };
  }

  refresh(id, socket) {
    if (!(id in this._boards)) {
      console.error(`GameObserver ${id} not yet cached`);
      return;
    }
    log(`GameObserver 'refresh' of ${id} to ${socket.id}`);
    socket.emit('boardUpdate', this.getBoard(id));
    this._refreshGame(id);
  }

  _refreshGame(gameID) {
    log(`GameObserver calling refresh for ${gameID}`);
    const observer = this._gameid2observer[gameID];
    this._ficsMgr.get(observer).send(`refresh ${gameID}`);
  }

  onMatch({board, holdings}) {
    if (board != null) {
      this._boards[board.id] = board;
    } else {
      board = this._boards[holdings.id];
      if (board == null) {
        console.error(`NULL board? ${holdings.id}`);
      }
    }

    if (holdings != null) {
      this._holdings[holdings.id] = holdings;
    } else {
      holdings = this._holdings[board.id];
      if (holdings == null) {
        console.error(`NULL holdings? ${board.id}`);
      }
    }
    const id = board == null ? holdings.id : board.id;
    this._notifySubscribers(id, {id, board, holdings});
  }

  stripMatch({boardMatch, holdingsMatch}, text) {
    if (boardMatch != null) {
      const idx1 = text.indexOf(boardMatch[0]);
      text = (text.substr(0, idx1) + text.substr(idx1 + boardMatch[0].length));
    }
    if (holdingsMatch != null) {
      const idx2 = text.indexOf(holdingsMatch[0]);
      text = text.substr(0, idx2) + text.substr(idx2 + holdingsMatch[0].length);
    }
    return text.trim();
  }

  _notifySubscribers(gameID, board) {
    log(`!!! GameObserver notifying ${gameID}: ${JSON.stringify(this._gameid2subscribers[gameID])} ${JSON.stringify(board)}`);
    for (const uid in this._gameid2subscribers[gameID]) {
      this._socketMgr.emit(uid, 'boardUpdate', board);
    }
  }

  msgSubscribers(boardID, event, data) {
    log(`!!! GameObserver messaging ${boardID}: ${event} ${JSON.stringify(data)}`);
    for (const uid in this._gameid2subscribers[boardID]) {
      this._socketMgr.emit(uid, event, data);
    }
  }

  _onLogout(uid) {
    this.unsubscribeAll(uid);
  }

  // We know uid is playing gameID and can rely on the viewer for "free"
  // observation
  addPlayer(uid, gameID) {
    if (!(gameID in this._gameid2observer)) {
      // We don't yet have an observer.  Add this uid
      this._gameid2observer[gameID] = uid;
      const gameIDs = this._observer2gameIDs[uid] ||
        (this._observer2gameIDs[uid] = {});
      gameIDs[gameID] = 1;
    }
    this.subscribe(uid, gameID);
  }

  _observe(gameID) {
    if (gameID in this._gameid2observer) {
      console.error(`GameObserver ${gameID} already observed?`);
    }
    // pick first associated subscriber, issue an 'observe' command, and stash
    // this uid away as our 'observer'
    for (const uid in (this._gameid2subscribers[gameID] || {})) {
      const fics = this._ficsMgr.unsafeGet(uid);
      if (fics != null) {
        fics.send(`observe ${gameID}`);
        this._gameid2observer[gameID] = uid;
        const gameIDs = this._observer2gameIDs[uid] ||
              (this._observer2gameIDs[uid] = {});
        gameIDs[gameID] = 1;
        return;
      }
    }
  }

  _unobserve(uid, gameID) {
    if (uid in this._observer2gameIDs &&
        gameID in this._observer2gameIDs[uid]) {
      delete this._gameid2observer[gameID];
      delete this._observer2gameIDs[uid][gameID];
      // This is a FICS connection on which we're relying to produce game
      // updates.  If it's the only subscriber, do nothing.  Otherwise, use
      // another subscriber's connection to begin observing.
      this._observe(gameID);
    }
  }

}

let _instance = null;
module.exports = {
  get(socketMgr, ficsManager) {
    return _instance || (_instance = new GameObserver(socketMgr, ficsManager));
  }
}
