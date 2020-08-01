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
  }

  unsubscribeAll(uid) {
    if (!(uid in this._subscriber2gameIDs)) {
      return;
    }
    for (const gameID in this._subscriber2gameIDs[uid]) {
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
    return board == null && holdings == null
      ? null
      : {board, holdings, boardMatch, holdingsMatch};
  }

  getMatch(text) {
    return this.parse(text);
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
    this._notifySubscribers(id, {
      id,
      board: board,
      holdings: holdings,
    });
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
    log(`GameObserver notify ${JSON.stringify(board)}`);
    for (const uid in this._gameid2subscribers[gameID]) {
      this._socketMgr.safeGet(uid).emit('boardUpdate', board);
    }
  }

  _onLogout(uid) {
    this.unsubscribeAll(uid);
    if (uid in this._observer2gameIDs) {
      for (gameID in this._observer2gameIDs[uid]) {
        this._unobserve(uid, gameID);
      }
    }
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
    for (const uid in this._gameid2subscribers[gameID]) {
      this._ficsMgr.get(uid).send(`observe ${gameID}`);
      this._gameid2observer[gameID] = uid;
      const gameIDs = this._observer2gameIDs[uid] ||
        (this._observer2gameIDs[uid] = {});
      gameIDs[gameID] = 1;
      return;
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
