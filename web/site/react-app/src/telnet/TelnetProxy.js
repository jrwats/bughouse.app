import io from "socket.io-client";
const events = require('events');

const URL = process.env.NODE_ENV === 'production'
  ? 'https://websocket-dot-bughouse-274816.nn.r.appspot.com'
  : 'https://localhost:7777';

const _singleton = new events.EventEmitter();
const _cache = {};

/**
 * Proxy to our telnet connection that emits raw console output as well as
 * parsed game and environment data.
 */
class TelnetProxy extends events.EventEmitter {
  constructor(user) {
    super();
    console.log(`new TelnetProxy ${user.uid}`);
    this._user = user;
    this._initialized = false;
    this._loggedOut = true;
    user.getIdToken(/*force refresh*/ true).then(idToken => {
      this._idToken = idToken;
      this._socket = io(URL, {
        secure: true,
        reconnect: true,
        // ca:
        rejectUnauthorized: process.env.NODE_ENV !== 'production',
        query: {token: idToken},
      });

      this._socket.on('authenticated', (msg) => {
        console.log('TelnetProxy authenticated!');
        this._initialized = true;
      });

      this._socket.on('login', (username) => {
        this._username = username;
        if (username == null) {
          return this._logout();
        }
        this._emit('login', {uid: user.uid, ficsUsername: username});
        this._socket.emit('players'); // request bughouse state from server
      });
      this._socket.on('logged_out', () => {
        console.log('TelnetProxy received logged_out');
        this._logout();
      });

      this._socket.on('data', msg => {
        console.log(`TelnetProxy.emit('data')`);
        this.emit('data', msg);
      });
      this._socket.on('players', (ficsHandles) => {
        this._emit('players', ficsHandles);
      });

      this._socket.on('err', err => {
        console.error('TelnetProxy socket error');
        console.error(err);
        this.emit('err', err);
      });
      this._socket.on('pong', latency => {
        this.emit('latency', latency);
        console.log(`bughouse.app latency: ${latency}ms`);
      });
    }).catch(err => {
      console.error(err);
    });
  }

  send(rawCmd) {
    this._socket.emit('cmd', rawCmd);
  }

  login(creds) {
    console.log('TelnetProxy.login()');
    this.emit('logging_in', {uid: this._user.uid});
    this._loggedOut = false;
    console.log(`TelnetProxy creds: ${JSON.stringify(creds)}`);
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
    this._username = null;
    this._emit('logout', {uid: this._user.uid});
  }

  logout() {
    console.log(`TelnetProxy.logout`);
    this._socket.emit('fics_logout');
    this._logout();
  }

  isLoggedIn() {
    return this._username != null;
  }

  isLoggedOut() {
    return this._loggedOut && this._username == null;
  }

  isInitialized() {
    return this._initialized;
  }

  getSocket() {
    return this._socket;
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
