const log = require('./log');

class SocketManager {
  constructor(ficsMgr) {
    this._ficsMgr = ficsMgr;
    this._uid2socks = {};
  }

  emit(uid, ...rest) {
    if (!(uid in this._uid2socks)) {
      return;
    }
    for (const socketId in this._uid2socks[uid]) {
      const socket = this._uid2socks[uid][socketId];
      if (socket.connected) {
        socket.emit.apply(socket, rest);
      }
    }
  }

  dump(uid) {
    const handle = this._ficsMgr.getUsername(uid);
    let connections = {};
    for (const u in this._uid2socks) {
      for (const s in this._uid2socks[u]) {
        connections[s.id] = this._uid2socks[s].connected ? '1' : '0';
      }
    }
    log(`SocketMgr handle: ${handle}: ${JSON.stringify(connections)}`);
  }

  add(uid, clientSocket) {
    const socks = this._uid2socks[uid] || (this._uid2socks[uid] = {});
    socks[clientSocket.id] = clientSocket;
  }

  remove(uid, clientSocket) {
    log(`SocketMgr.removing ${uid} ${clientSocket.id}`);
    if (uid in this._uid2socks) {
      delete this._uid2socks[uid][clientSocket.id];
      for (const id in this._uid2socks[uid]) {
        return;
      }
      delete this._uid2socks[uid];
    }
    this._ficsMgr.onClientDisconnect(uid);
  }

  destroyAll(uid) {
    delete this._uid2socks[uid];
  }

}

let _instance = null;
module.exports = {
  get(ficsMgr) {
    return _instance || (_instance = new SocketManager(ficsMgr));
  }
};
