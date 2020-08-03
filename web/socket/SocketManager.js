
const _nullSocket = {
  emit() { return; }
};

class SocketManager {
  constructor(ficsMgr) {
    this._ficsMgr = ficsMgr;
    this._ficsMgr.on('logout', (uid) => { this.destroyAll(uid); });
    this._uid2socks = {};
  }

  emit(uid, ...rest) {
    if (!(uid in this._uid2socks)) {
      return;
    }
    for (const socketId in this._uid2socks[uid]) {
      const socket = this._uid2socks[uid][socketId];
      socket.emit.apply(socket, rest);
    }
  }

  getSocks(uid) {
    return this._uid2socks[uid];
  }

  add(uid, clientSocket) {
    const socks = this._uid2socks[uid] || (this._uid2socks[uid] = {});
    socks[clientSocket.id] = clientSocket;
  }

  remove(uid, clientSocket) {
    if (uid in this._uid2socks) {
      delete this._uid2socks[uid][clientSocket.id];
    }
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
