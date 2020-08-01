
const _nullSocket = {
  emit() { return; }
};

class SocketManager {
  constructor() {
    this._uid2sock = {};
  }

  safeGet(uid) {
    return this.get(uid) || _nullSocket;
  }

  get(uid) {
    return this._uid2sock[uid];
  }

  add(uid, clientSocket) {
    this._uid2sock[uid] = clientSocket;
  }

  destroy(uid) {
    delete this._uid2sock[uid];
  }
}

let _instance = null;
module.exports = {
  get() {
    return _instance || (_instance = new SocketManager());
  }
};
