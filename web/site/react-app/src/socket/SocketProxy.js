import { EventEmitter } from "events";
import GamesStatusSource from "../game/GameStatusSource";
import PhoenixSocket from "./PhoenixSocket";

console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`SOCKET_URL: ${process.env.REACT_APP_SOCKET_URL}`);

const hostname = window.location.hostname;
const PROD_URL = "wss://ws.bughouse.app/ws/";
const DEV_URL = `ws://${hostname}:${process.env.WS_PORT || 8081}/ws/`;
const WS_URL =
  process.env.REACT_APP_SOCKET_URL ||
  (process.env.NODE_ENV === "production" ? PROD_URL : DEV_URL);

let _instance = null;
const _singleton = new EventEmitter();

const _ticker = new EventEmitter();
setInterval(() => {
  _ticker.emit("tick");
}, 5000);

const PASSTHRU_EVENTS = [
  "bugwho",
  "form_table",
  "current_games",
  "current_game",
  "game_end",
  "game_start",
  "game_msg",
  "game_row",
  "game_update",
  "incomingOffer",
  "incomingPartnerChallenge",
  "outgoingOfferCancelled",
  "online_players",
  "online_players_update",
  "partners",
  "pending",
  "public_tables",
  "public_table",
  "table",
  "unpartneredHandles",
];

const NOISY_EVENTS = {
  game_start: 1,
  game_row: 1,
  game_update: 1,
  public_table: 1,
};

/**
 * Proxy to our WebScocket connection that emits raw console output as well as
 * parsed game and environment data.
 *
 * This websocket *USED* to be a proxy to a a FICS telnet connection held on
 * the server, but not anymore.
 */
class SocketProxy extends EventEmitter {
  constructor(user) {
    super();
    this._authenticated = false;
    this._loggedOut = true;
    this._handle = null;
    this._isGuest = false;
    this._msgQueue = [];
    this._connect();
    GamesStatusSource.get(this); // instantiate a listener
  }

  _onTick() {
    this._send("enq", { timestamp: Date.now() });
  }

  setUser(user) {
    this._user = user;
    this._idToken = null;
    this._getToken();
  }

  _getToken() {
    if (this._user == null) {
      return;
    }
    this._user
      .getIdToken(/*force refresh*/ true)
      .then((idToken) => {
        this._idToken = idToken;
        this._authenticate();
      })
      .catch((err) => {
        console.error(err);
      });
  }

  _send(kind, data) {
    if (this._sock?.readyState() === WebSocket.OPEN) {
      this._sock.send(JSON.stringify({ ...data, kind }));
    } else {
      console.log(`queing ${kind} msg`);
      this._msgQueue.push([kind, data]);
    }
  }

  _connect() {
    console.log(`${this._gcn()}  _connect`);
    this._getToken();
    const handlers = {};
    handlers["authenticated"] = (msg) => {
      console.log(`${this._gcn()}  authenticated!`);
      this.onTick = this._onTick.bind(this);
      _ticker.on("tick", this.onTick);
      this._authenticated = true;
    };

    handlers["login"] = (data) => {
      console.log(`${this._gcn()}  login`);
      this._handle = data.handle;
      this._isGuest = data.guest;
      if (data.handle == null) {
        this._logout();
        return;
      }
      this._emit("login", data);
      // TODO: delete old FICS logic
      // this._sock.send("bugwho"); // request bughouse state from server
      this._sock.send("pending"); // request pending offers from server
    };
    handlers["logged_out"] = () => {
      console.log(`${this._gcn()}  received logged_out`);
      this._logout();
    };

    handlers["data"] = ({ data }) => {
      const summary = data.substr(0, 30).replace(/\s+/, " ");
      console.log(`${this._gcn()}.emit('data'): ${summary}`);
      this.emit("data", data);
    };
    for (const event of PASSTHRU_EVENTS) {
      handlers[event] = function (data) {
        if (NOISY_EVENTS[event]) {
          console.log(`${event} !!!`);
          console.log(data);
        }
        // console.log(`${event}: ${JSON.stringify(data, null, ' ')}`);
        this._emit(event, data);
      };
    }

    handlers["incomingChallenge"] = (challenge) => {
      this._emit("incomingChallenge", { user: this?._user, challenge });
    };
    handlers["incomingPartnerChallenge"] = (challenge) => {
      this._emit("incomingPartnerChallenge", {
        user: this?._user,
        challenge,
      });
    };
    handlers["outgoingPartnerChallenge"] = (challenge) => {
      this._emit("outgoingPartnerChallenge", {
        user: this?._user,
        challenge,
      });
    };
    handlers["partnerAccepted"] = (handle) => {
      console.log(`${this._gcn()}.partnerAccepted(${handle})`);
      this._emit("partnerAccepted", { user: this?._user, handle });
    };

    handlers["unpartnered"] = () => {
      console.log(`${this._gcn()}.unpartnered`);
      this._emit("unpartnered", { user: this?._user });
    };

    // FICS
    handlers["games"] = ({ games }) => {
      this._emit("games", { user: this?._user, games });
    };

    handlers["boardUpdate"] = (board) => {
      this._emit("boardUpdate", { user: this?._user, board });
    };

    handlers["err"] = (err) => {
      console.error(`${this._gcn()} socket error: ${JSON.stringify(err)}`);
      this.emit("err", err);
      if (err.err?.kind === "auth") {
        this.destroy();
        this._connect();
      }
    };

    // ping / pong latency handlers
    handlers["latency"] = (msg) => {
      this.emit("srv_latency", msg.ms);
      window.__serverLatency = msg.ms;
      // console.log(`server latency: ${msg.ms}ms`);
    };
    handlers["enq"] = (msg) => {
      this._send("ack", msg);
    };
    handlers["ack"] = (msg) => {
      // Round-trip-time / 2 == end-to-end delay (AKA latency)
      const latency = (Date.now() - msg.timestamp) / 2.0;
      this.emit("latency", latency);
      console.log(`client latency: ${latency}ms`);
    };

    const url = new URL(WS_URL);
    this._sock = new PhoenixSocket(url);
    this._sock.on("open", (evt) => {
      for (const args of this._msgQueue) {
        this._send.apply(this, args);
      }
      this._msgQueue = [];
      this._authenticate();
    });

    this._sock.on("error", (evt) => {
      console.error("Socket error: %o", evt);
    });
    this._sock.on("message", (evt) => {
      if (!/"kind":"(ack|enq|latency)"/.test(evt.data)) {
        console.debug(evt);
      }
      try {
        const payload = evt.data[0] === "{" ? JSON.parse(evt.data) : evt.data;
        const key = payload.kind || evt.data;
        const handler = handlers[key];
        if (handler == null) {
          debugger;
          console.error("Unrecognized event: %s", evt);
          console.error(
            "Unrecognized payload: %s",
            JSON.stringify(payload, null, " ")
          );
          return;
        }
        handler.call(this, payload);
      } catch (e) {
        console.error(e);
      }
    });
  }

  _authenticate() {
    if (this._idToken != null) {
      this._send("auth", { token: this._idToken });
    }
  }

  _gcn() {
    return `SocketProxy`;
  }

  destroy() {
    console.log(`${this._gcn()} destroy`);
    this._logout();
    this._sock.removeAllListeners();
    _ticker.off("tick", this.onTick);
    this._sock.destroy();
    this._sock = null;
    console.log(`${this._gcn()} socket = null`);
    // delete _cache[this._user.uid];
    this._emit("destroy", { user: this._user });
    this.removeAllListeners();
    _instance = null;
  }

  send(cmd) {
    this._send("cmd", { cmd });
  }

  sendEvent(name, data) {
    console.log(`${this._gcn()} sending '${name}' ${Date.now()}`);
    this._send(name, data);
  }

  login(creds) {
    console.log(`${this._gcn()}.login()`);
    this.emit("logging_in", { user: this._user });
    this._loggedOut = false;
    console.log(`${this._gcn()} creds: ${JSON.stringify(creds)}`);
    console.log(`Sent 'login' to socket`);
    return new Promise((resolve, reject) => {
      this._sock.once("login", resolve);
      this._sock.once("failedlogin", (msg) => {
        console.error("failedlogin", msg);
        this._loggedOut = true;
        reject(msg);
      });
    });
  }

  _logout() {
    this._loggedOut = true;
    this._handle = null;
    this._emit("logout", { user: this._user });
  }

  logout() {
    console.log(`${this._gcn()}.logout`);
    this._logout();
  }

  isLoggedIn() {
    return this._handle != null;
  }

  isLoggedOut() {
    return this._loggedOut && this._handle == null;
  }

  isAuthed() {
    return this._authenticated;
  }

  getUid() {
    return this._user?.uid;
  }

  isGuest() {
    return this._isGuest;
  }

  getHandle() {
    return this._handle;
  }

  _emit(event, data) {
    this.emit(event, data);
    _singleton.emit(event, data);
  }

  static get() {
    if (_instance == null) {
      _instance = new SocketProxy();
    }
    return _instance;
    // const uid = user?.uid || 'anonymous';
    // return _cache[uid] || (_cache[uid] = new SocketProxy(user));
  }

  static singleton() {
    return _singleton;
  }
}

export default SocketProxy;
