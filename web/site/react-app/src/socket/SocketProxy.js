import { EventEmitter } from 'events';
import invariant from 'invariant';
import GamesStatusSource from '../game/GameStatusSource';
import PhoenixSocket  from './PhoenixSocket';

console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`SOCKET_URL: ${process.env.REACT_APP_SOCKET_URL}`);

const hostname = window.location.hostname;
const PROD_URL = 'wss://ws.bughouse.app/ws/';
const DEV_URL = `ws://${hostname}:8080/ws/`;
const WS_URL = process.env.REACT_APP_SOCKET_URL ||
  (process.env.NODE_ENV === 'production' ? PROD_URL : DEV_URL);

const _singleton = new EventEmitter();
const _cache = {};

const _ticker = new EventEmitter();
setInterval(() => { _ticker.emit('tick'); }, 5000);

/**
 * Proxy to our telnet connection that emits raw console output as well as
 * parsed game and environment data.
 */
class SocketProxy extends EventEmitter {
  constructor(user) {
    super();
    console.log(`new SocketProxy ${user.uid}`);
    this._user = user;
    this._initialized = false;
    this._loggedOut = true;
    this._connect();
    GamesStatusSource.get(this); // instantiate a listener
  }

  _onTick() {
    this._send('enq', {timestamp: Date.now()});
  }

  _send(kind, data) {
    this._sock && this._sock.send(JSON.stringify({...data, kind}));
  }

  _connect() {
    console.log(`${this._gcn()}  _connect`);
    invariant(this._user.getIdToken != null, 'WTF');
    this._user.getIdToken(/*force refresh*/ true).then(idToken => {
      this._idToken = idToken;
      const handlers = {}
      handlers['authenticated'] = (msg) => {
        console.log(`${this._gcn()}  authenticated!`);
        this.onTick = this._onTick.bind(this);
        _ticker.on('tick', this.onTick);
        this._initialized = true;
      };

      handlers['login'] = ({handle}) => {
        console.log(`${this._gcn()}  login`);
        this._handle = handle;
        if (handle == null) {
          this._logout();
          return;
        }
        this._emit('login', {uid: this._user.uid, handle: handle});
        this._sock.send('bugwho'); // request bughouse state from server
        this._sock.send('pending'); // request pending offers from server
      };
      handlers['logged_out'] = () => {
        console.log(`${this._gcn()}  received logged_out`);
        this._logout();
      };

      handlers['data'] = ({data})=> {
        const summary = data.substr(0,30).replace(/\s+/, ' ');
        console.log(`${this._gcn()}.emit('data'): ${summary}`);
        this.emit('data', data);
      };
      handlers['bugwho'] = bug => { this._emit('bugwho', bug); };
      handlers['pending'] = pending => {
        this._emit('pending', {user: this._user, pending});
      };
      handlers['unpartneredHandles'] = ({handles}) => {
        this._emit('unpartneredHandles', handles);
      };
      handlers['partners'] = ({partners}) => { this._emit('partners', partners); };

      handlers['incomingOffer'] = handle => {
        console.log(`${this._gcn()}.incomingOffer(${handle})`);
        this._emit('incomingOffer', {user: this._user, handle});
      };
      handlers['outgoingOfferCancelled'] = handle => {
        console.log(`${this._gcn()}.outgoingOfferCancelled(${handle})`);
        this._emit('outgoingOfferCancelled', {user: this._user, handle});
      };

      handlers['incomingChallenge'] = challenge => {
        this._emit('incomingChallenge', {user: this._user, challenge});
      };
      handlers['incomingPartnerChallenge'] = challenge => {
        this._emit('incomingPartnerChallenge', {user: this._user, challenge});
      };
      handlers['outgoingPartnerChallenge'] = challenge => {
        this._emit('outgoingPartnerChallenge', {user: this._user, challenge});
      };
      handlers['partnerAccepted'] = handle => {
        console.log(`${this._gcn()}.partnerAccepted(${handle})`);
        this._emit('partnerAccepted', {user: this._user, handle});
      };

      handlers['unpartnered'] = () => {
        console.log(`${this._gcn()}.unpartnered`);
        this._emit('unpartnered', {user: this._user});
      };

      handlers['games'] = ({games}) => {
        this._emit('games', {user: this._user, games});
      };

      handlers['gameStart'] = (game) => {
        this._emit('gameStart', {user: this._user, game});
      };

      handlers['gameOver'] = (board) => {
        this._emit('gameOver', {user: this._user, board});
      };

      handlers['boardUpdate'] = (board) => {
        this._emit('boardUpdate', {user: this._user, board});
      };

      handlers['err'] = err => {
        console.error(`${this._gcn()} socket error`);
        console.error(err);
        this.emit('err', err);
        if (err.err.kind === 'auth') {
          this.destroy();
          this._connect();
        }
      };

      // ping / pong latency handlers
      handlers['latency'] = msg => {
        this.emit('srv_latency', msg.ms);
        console.log(`server latency: ${msg.ms}ms`);
      };
      handlers['enq'] = msg => {
        this._send('ack', msg);
      };
      handlers['ack'] = msg => {
        // Round-trip-time / 2 == end-to-end delay (AKA latency)
        const latency = (Date.now() - msg.timestamp) / 2.0;
        this.emit('latency', latency);
        console.log(`client latency: ${latency}ms`);
      };

      for (const k in handlers) {
        handlers[k].bind(this);
      }
      const url = new URL(WS_URL);
      // url.searchParams.set('token', idToken);
      this._sock = new PhoenixSocket(url);
      this._sock.on('open', evt => {
        this._send('auth', {token: this._idToken});
      });
      this._sock.on('error', evt => {
        console.error('Socket error: %o', evt);
      });
      this._sock.on('message', evt => {
        console.debug(evt);
        try {
          const payload = evt.data[0] === '{' ? JSON.parse(evt.data) : evt.data;
          const key = payload.kind || evt.data;
          const handler = handlers[key];
          if (handler == null) {
            console.error('Unrecognized event: %s', evt);
            console.error('Unrecognized payload: %s', payload);
            return;
          }
          handler(payload);
        } catch (e) {
          console.error(e);
        }
      });

    }).catch(err => {
      console.error(err);
    });
  }

  _gcn() { return `SocketProxy`; }

  destroy() {
    console.log(`${this._gcn()} destroy`);
    this._logout();
    this._sock.removeAllListeners();
    _ticker.off('tick', this.onTick);
    this._sock.destroy();
    this._sock = null;
    console.log(`${this._gcn()} socket = null`);
    delete _cache[this._user.uid];
    this._emit('destroy', {user: this._user});
    this.removeAllListeners();
  }

  send(cmd) {
    this._send('cmd', {cmd});
  }

  sendEvent(name, data) {
    console.log(`${this._gcn()} sending '${name}' ${Date.now()}`);
    this._send(name, data);
  }

  login(creds) {
    console.log(`${this._gcn()}.login()`);
    this.emit('logging_in', {user: this._user});
    this._loggedOut = false;
    console.log(`${this._gcn()} creds: ${JSON.stringify(creds)}`);
    this._send('fics_login', creds);
    console.log(`Sent 'login' to socket`);
    return new Promise((resolve, reject) => {
      this._sock.once('login', resolve);
      this._sock.once('failedlogin', msg => {
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
    this._sock.send('fics_logout');
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
    return _cache[user.uid] || (_cache[user.uid] = new SocketProxy(user));
  }

  static singleton() {
    return _singleton;
  }

}

export default SocketProxy;
