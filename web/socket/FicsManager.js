/**
 * FICS connection manager.  For every user connected clientside, we maintain a
 * telnet connection serverside to freechess.org on their behalf.
 */
const FicsClient = require('./FicsClient');
const log = require('./log');

// Global bughouse data data that should be poll'd on behalf of everyone
const bugwho = () => {
  const fics = _instance.getPollingConn();
  if (!fics) {
    return;
  }
  fics.bugPoll();
}
let _bugwhoPoller;

class FicsManager {

  constructor() {
    this._idx = 0;
    this._uids = [];
    this._uid2fics = {};
    this._uid2destroy = {};
  }

  get(uid) {
    if (uid in this._uid2destroy) {
      clearTimeout(this._uid2destroy[uid]);
      delete this._uid2destroy[uid];
    }
    if (!(uid in this._uid2fics)) {
      this._uid2fics[uid] = new FicsClient();
      if (this._uids.length === 0) {
        _bugwhoPoller = setInterval(bugwho, 5000);
      }
      this._uids = Object.keys(this._uid2fics);
    } else {
      const fics = this._uid2fics[uid];
      log(`Reusing FICS telnet connection for ${uid}, ${fics.getUsername()}`);
    }
    return this._uid2fics[uid];
  }

  getUsername(uid) {
    if (uid in this._uid2fics) {
      return this._uid2fics[uid].getUsername();
    };
    return null;
  }

  logout(uid) {
    let fics = this._uid2fics[uid];
    delete this._uid2destroy[uid];

    log(`Deleting FICS telnet connection for ${uid}`);
    if (fics != null) {
      delete this._uid2fics[uid];
      // TODO: computer scientists will tell you this should be a
      // doubly-linked list, instead of an array...
      // fancyRoundRobinListThing.remove(uid)
      this._uids = Object.keys(this._uid2fics);
      console.log(`this._uids.length: ${this._uids.length}`);
      if (this._uids.length === 0) {
        clearInterval(_bugwhoPoller);
      }
      fics.removeAllListeners();
      fics.destroy();
    }
  }

  onClientDisconnect(uid) {
    // In 30s delete our telnet connection
    this._uid2destroy[uid] = setTimeout(() => { this.logout(uid); }, 1000 * 30);
    log(`${uid} Waiting 30s to destroy FICS telnet conn of ${this.getUsername(uid)}`);
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
      return;
    }
    for (let idx = this._idx, count = 0; count++ < max; idx = (idx + 1) % max) {
      const conn = this._uid2fics[this._uids[idx]];
      if (conn.isLoggedIn()) {
        this._idx = idx;
        return conn;
      }
    }
    console.warn(`${Date.now()} No telnet connections (of ${this._uids.length}) are logged in`);
    console.warn(`${Object.keys(this._uid2fics)}`);
  }

  static get() {
    return _instance;
  }
}

const _instance = new FicsManager();

module.exports = FicsManager;
