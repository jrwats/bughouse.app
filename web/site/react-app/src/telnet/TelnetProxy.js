import { io } from "socket.io-client";
import { EventEmitter } from 'events';
import invariant from 'invariant';
import GamesStatusSource from '../game/GameStatusSource';

console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`SOCKET_URL: ${process.env.REACT_APP_SOCKET_URL}`);

const PROD_URL = 'https://ws.bughouse.app';
const DEV_URL = 'https://localhost:7777';
const URL = process.env.REACT_APP_SOCKET_URL ||
  (process.env.NODE_ENV === 'production' ? PROD_URL : DEV_URL);

const _singleton = new EventEmitter();
const _cache = {};

const _ticker = new EventEmitter();
setInterval(() => { _ticker.emit('tick'); }, 5000);

const _dontLogAny = {
  ack: true,
};

/**
 * Proxy to our telnet connection that emits raw console output as well as
 * parsed game and environment data.
 */
class TelnetProxy extends EventEmitter {
  constructor(user) {
    super();
    console.log(`new TelnetProxy ${user.uid}`);
    this._user = user;
    this._initialized = false;
    this._loggedOut = true;
    this._socket = null;
    this._connect();
    GamesStatusSource.get(this); // instantiate a listener
  }

  _onTick() {
    this._socket && this._socket.emit('enq', {timestamp: Date.now()});
  }

  _connect() {
    console.log(`${this._gcn()}  _connect`);
    invariant(this._user.getIdToken != null, 'WTF');
    this._user.getIdToken(/*force refresh*/ true).then(idToken => {
      this._idToken = idToken;
      this._socket = io(URL, {
        autoConnect: false,
        secure: true,
        reconnect: true,
        // ca:
        rejectUnauthorized: !/localhost/.test(URL),
        query: {token: idToken},
        timeout: 10000, // 10s
        transports: ["websocket"],
      });

      this._socket.onAny((event, ...args) => {
        if (_dontLogAny[event]) {
          return;
        }
        console.debug(event, args);
      });

      this._socket.on('authenticated', (msg) => {
        console.log(`${this._gcn()}  authenticated!`);
        this.onTick = this._onTick.bind(this);
        _ticker.on('tick', this.onTick);
        this._initialized = true;
      });

      this._socket.on('login', (handle) => {
        console.log(`${this._gcn()}  login`);
        this._handle = handle;
        if (handle == null) {
          this._logout();
          return;
        }
        this._emit('login', {uid: this._user.uid, ficsHandle: handle});
        this._socket.emit('bugwho'); // request bughouse state from server
        this._socket.emit('pending'); // request pending offers from server
      });
      this._socket.on('logged_out', () => {
        console.log(`${this._gcn()}  received logged_out`);
        this._logout();
      });

      this._socket.on('data', msg => {
        const summary = msg.substr(0,30).replace(/\s+/, ' ');
        console.log(`${this._gcn()}.emit('data'): ${summary}`);
        this.emit('data', msg);
      });
      this._socket.on('bugwho', bug => { this._emit('bugwho', bug); });
      this._socket.on('pending', pending => {
        this._emit('pending', {user: this._user, pending});
      });
      this._socket.on('unpartneredHandles', bug => {
        this._emit('unpartneredHandles', bug);
      });
      this._socket.on('partners', bug => { this._emit('partners', bug); });

      this._socket.on('incomingOffer', handle => {
        console.log(`${this._gcn()}.incomingOffer(${handle})`);
        this._emit('incomingOffer', {user: this._user, handle});
      });
      this._socket.on('outgoingOfferCancelled', handle => {
        console.log(`${this._gcn()}.outgoingOfferCancelled(${handle})`);
        this._emit('outgoingOfferCancelled', {user: this._user, handle});
      });

      this._socket.on('incomingChallenge', challenge => {
        this._emit('incomingChallenge', {user: this._user, challenge});
      });
      this._socket.on('incomingPartnerChallenge', challenge => {
        this._emit('incomingPartnerChallenge', {user: this._user, challenge});
      });
      this._socket.on('outgoingPartnerChallenge', challenge => {
        this._emit('outgoingPartnerChallenge', {user: this._user, challenge});
      });
      this._socket.on('partnerAccepted', handle => {
        console.log(`${this._gcn()}.partnerAccepted(${handle})`);
        this._emit('partnerAccepted', {user: this._user, handle});
      });

      this._socket.on('unpartnered', () => {
        console.log(`${this._gcn()}.unpartnered`);
        this._emit('unpartnered', {user: this._user});
      });

      this._socket.on('games', (games) => {
        this._emit('games', {user: this._user, games});
      });

      this._socket.on('gameStart', (game) => {
        this._emit('gameStart', {user: this._user, game});
      });

      this._socket.on('gameOver', (board) => {
        this._emit('gameOver', {user: this._user, board});
      });

      this._socket.on('boardUpdate', (board) => {
        this._emit('boardUpdate', {user: this._user, board});
      });

      this._socket.on('err', err => {
        console.error(`${this._gcn()}  socket error`);
        console.error(err);
        this.emit('err', err);
        if (err.type === 'auth') {
          this.destroy();
          this._connect();
        }
      });
      this._socket.on('ack', msg => {
        const latency = Date.now() - msg.timestamp;
        this.emit('latency', latency);
        console.log(`bughouse.app latency: ${latency}ms`);
      });
      this._socket.connect();
    }).catch(err => {
      console.error(err);
    });
  }

  _gcn() { return `TelnetProxy`; }

  destroy() {
    console.log(`${this._gcn()} destroy`);
    this._logout();
    this._socket.removeAllListeners();
    _ticker.off('tick', this.onTick);
    this._socket.close();
    this._socket = null;
    console.log(`${this._gcn()} socket = null`);
    delete _cache[this._user.uid];
    this._emit('destroy', {user: this._user});
    this.removeAllListeners();
  }

  send(rawCmd) {
    this._socket.emit('cmd', rawCmd);
  }

  sendEvent(name, data) {
    console.log(`${this._gcn()} sending '${name}' ${Date.now()}`);
    this._socket.emit(name, data);
  }

  login(creds) {
    console.log(`${this._gcn()}.login()`);
    this.emit('logging_in', {user: this._user});
    this._loggedOut = false;
    console.log(`${this._gcn()} creds: ${JSON.stringify(creds)}`);
    this._socket.emit('fics_login', creds);
    console.log(`Sent 'login' to socket`);
    return new Promise((resolve, reject) => {
      this._socket.once('login', resolve);
      this._socket.once('failedlogin', msg => {
        console.error('failedlogin', msg);
        this._loggedOut = true;
        reject(msg);
      });
    });
  }

  _logout() {
    this._loggedOut = true;
    this._handle = null;
    this._emit('logout', {user: this._user});
  }

  logout() {
    console.log(`${this._gcn()}.logout`);
    this._socket.emit('fics_logout');
    this._logout();
  }

  isLoggedIn() {
    return this._handle != null;
  }

  isLoggedOut() {
    return this._loggedOut && this._handle == null;
  }

  isInitialized() {
    return this._initialized;
  }

  getSocket() {
    return this._socket;
  }

  getUid() {
    return this._user.uid;
  }

  getHandle() {
    return this._handle;
  }

  _emit(event, data) {
    this.emit(event, data);
    _singleton.emit(event, data);
  }

  static get(user) {
    return _cache[user.uid] || (_cache[user.uid] = new TelnetProxy(user));
  }

  static singleton() {
    return _singleton;
  }

}

export default TelnetProxy;
