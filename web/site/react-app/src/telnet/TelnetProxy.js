import io from "socket.io-client";
import { EventEmitter } from 'events';
import invariant from 'invariant';
import GamesStatusSource from '../game/GameStatusSource';

const URL = process.env.NODE_ENV === 'production'
  ? 'https://websocket-dot-bughouse-274816.nn.r.appspot.com'
  : 'https://localhost:7777';

const _singleton = new EventEmitter();
const _cache = {};

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

  _connect() {
    invariant(this._user.getIdToken != null, 'WTF');
    this._user.getIdToken(/*force refresh*/ true).then(idToken => {
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
          this._logout();
          return;
        }
        this._emit('login', {uid: this._user.uid, ficsHandle: username});
        this._socket.emit('bugwho'); // request bughouse state from server
        this._socket.emit('pending'); // request pending offers from server
      });
      this._socket.on('logged_out', () => {
        console.log('TelnetProxy received logged_out');
        this._logout();
      });

      this._socket.on('data', msg => {
        console.log(`TelnetProxy.emit('data')`);
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
        console.log(`TelnetProxy.incomingOffer(${handle})`);
        this._emit('incomingOffer', {user: this._user, handle});
      });
      this._socket.on('outgoingOfferCancelled', handle => {
        console.log(`TelnetProxy.outgoingOfferCancelled(${handle})`);
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
        console.log(`TelnetProxy.partnerAccepted(${handle})`);
        this._emit('partnerAccepted', {user: this._user, handle});
      });

      this._socket.on('unpartnered', () => {
        console.log(`TelnetProxy.unpartnered`);
        this._emit('unpartnered', {user: this._user});
      });

      this._socket.on('games', (games) => {
        this._emit('games', {user: this._user, games});
      });

      this._socket.on('gameStart', (game) => {
        this._emit('gameStart', {user: this._user, game: game});
      });

      this._socket.on('err', err => {
        console.error('TelnetProxy socket error');
        console.error(err);
        this.emit('err', err);
        if (err.type === 'auth') {
          this.destroy();
          this._connect();
        }
      });
      this._socket.on('pong', latency => {
        this.emit('latency', latency);
        console.log(`bughouse.app latency: ${latency}ms`);
      });
    }).catch(err => {
      console.error(err);
    });
  }

  destroy() {
    this._logout();
    this._socket.removeAllListeners();
    this._socket.close();
    this._socket = null;
    this.removeAllListeners();
    delete _cache[this._user.uid];
  }

  send(rawCmd) {
    this._socket.emit('cmd', rawCmd);
  }

  sendEvent(name, data) {
    this._socket.emit(name, data);
  }

  login(creds) {
    console.log('TelnetProxy.login()');
    this.emit('logging_in', {user: this._user});
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
    this._emit('logout', {user: this._user});
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

  getUid() {
    return this._user.uid;
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
