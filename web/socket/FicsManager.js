/**
 * FICS connection manager.  For every user connected clientside, we maintain a
 * telnet connection serverside to freechess.org on their behalf.
 */
const FicsClient = require('./FicsClient');
const log = require('./log');
const {EventEmitter} = require('events');

// Global bughouse data data that should be poll'd on behalf of everyone
const bugwho = () => {
  const fics = _instance.getPollingConn();
  if (!fics) {
    return;
  }
  fics.bugPoll();

  const uid2handle = {};
  for (const k in _instance._uid2destroy) {
    uid2handle[k] = _instance._uid2fics[k].getHandle();
  }
  if (Object.keys(uid2handle).length > 0) {
    log(`FicsManager: pending destructions: ${JSON.stringify(uid2handle)}`);
  }
};

let _bugwhoPoller;

class FicsManager extends EventEmitter {

  constructor(db) {
    super();
    this._db = db;
    this._idx = 0;
    this._uids = [];
    this._uid2fics = {};
    this._uid2destroy = {};
    this._onClosedListener = ({uid, fics}) => {
      this._cleanup(uid, fics);
    };
  }

  unsafeGet(uid) {
    return this._uid2fics[uid];
  }

  get(uid) {
    if (uid in this._uid2destroy) {
      log(`Aborting destruction of ${uid} ${this.getHandle(uid)}`);
      clearTimeout(this._uid2destroy[uid]);
      delete this._uid2destroy[uid];
    }
    if (!(uid in this._uid2fics)) {
      const fics = this._uid2fics[uid] = new FicsClient(uid, this._db);
      fics.on('close', this._onClosedListener);
      fics.on('end', this._onClosedListener);
      if (_bugwhoPoller == null) {
        _bugwhoPoller = setInterval(bugwho, 5000);
      }
      this._uids = Object.keys(this._uid2fics);
    } else {
      const fics = this._uid2fics[uid];
      log(`Reusing FICS telnet connection for ${uid}, ${fics.getHandle()}`);
    }
    return this._uid2fics[uid];
  }

  getHandle(uid) {
    if (uid in this._uid2fics) {
      return this._uid2fics[uid].getHandle();
    };
    return null;
  }

  logout(uid) {
    this.emit('logout', uid);
    this._cleanup(uid,  this._uid2fics[uid]);
  }

  _cleanup(uid, fics) {
    log(`Deleting FICS telnet connection for ${uid}`);
    delete this._uid2destroy[uid];
    delete this._uid2fics[uid];
    // TODO: computer scientists will tell you this should be a hash =>
    // doubly-linked list data structure, instead of an array... (for O(1)
    // removal) fancyRoundRobinListThing.remove(uid)
    // When we're on the order of 1k concurrent users, this hardly matters
    this._uids = Object.keys(this._uid2fics);
    console.log(`this._uids.length: ${this._uids.length}`);
    if (this._uids.length === 0) {
      clearInterval(_bugwhoPoller);
      _bugwhoPoller = null;
    }
    if (fics != null) {
      fics.removeAllListeners();
      fics.destroy();
    }
  }

  onClientDisconnect(uid) {
    // In 30s delete our telnet connection
    this._uid2destroy[uid] = setTimeout(() => { this.logout(uid); }, 1000 * 30);
    log(`${uid} Waiting 30s to destroy FICS telnet conn of ${this.getHandle(uid)}`);
  }

  /**
   * Intended for queries for global "unvierse" state.  e.g. issuing calls to
   * `bugwho`, the result of which can be shared across all clients.  Performs a
   * simple round robin (to share the burden) across all connections
   */
  getPollingConn() {
    const max = this._uids.length;
    if (max === 0) {
      console.warn(`${Date.now()} No connections to use`);
      return null;
    }
    for (let idx = this._idx, count = 0; count < max; ++count) {
      idx = (idx + 1) % max;
      const conn = this._uid2fics[this._uids[idx]];
      if (conn && conn.isLoggedIn()) {
        log(`BughouseState polling with ${idx}, ${this._uids[idx]} ${Object.keys(this._uid2fics)}`);
        this._idx = idx;
        return conn;
      }
    }
    console.warn(`${Date.now()} No telnet connections (of ${this._uids.length}) are logged in`);
    console.warn(`${Object.keys(this._uid2fics)}`);
    return null;
  }

}

let _instance;

module.exports = {
  get(db) {
    return _instance || (_instance = new FicsManager(db));
  }
};
