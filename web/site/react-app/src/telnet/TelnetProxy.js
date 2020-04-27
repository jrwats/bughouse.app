import io from "socket.io-client";
const events = require('events');

const URL = process.env.NODE_ENV === 'production'
  ? 'https://websocket-dot-bughouse-274816.nn.r.appspot.com'
  : 'https://localhost:7777';

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
        rejectUnauthorized: process.env.NODE_ENV !== 'production',
        query: {token: idToken},
      });
      this._socket.emit('chat message', 'TelnetProxy-client test');

      this._socket.on('authenticated', (msg) => {
        console.log('ZOMG authenticated!');
        this._initialized = true;
      });

      this._socket.on('login', (username) => {
        console.log(`TelnetProxy.login`);
        this._username = username;
        this.emit('login', username);
      });

      this._socket.on('data', (msg) => {
        console.log(`TelnetProxy.emit('data')`);
        this.emit('data', msg);
      });
      this._socket.on('err', (msg) => {
        console.error(msg);
      });
    });
  }

  send(rawCmd) {
    this._socket.emit('cmd', rawCmd);
  }

  login(creds) {
    this._loggedOut = false;
    this._socket.emit('login', creds);
    return new Promise((resolve, reject) => {
      this._socket.once('login', resolve);
      this._socket.once('login_failed', msg => {
        this._loggedOut = true;
        reject(msg);
      });
    });
  }

  logout() {
    console.log(`TelnetProxy.logout`);
    this._socket.emit('logout');
    this._loggedOut = true;
    this._username = null;
    this.emit('logout');
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
}

export default TelnetProxy;
