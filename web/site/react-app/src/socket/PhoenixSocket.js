import { EventEmitter } from "events";

/**
 * A wrapper around WebSocket that automatically reconnects.
 * When it finally gives up, we emit a 'disconect' event.
 */
class PhoenixSocket extends EventEmitter {
  static DEFAULT_INTERVAL = 5000;
  static DEFAULT_MAX_RETRIES = 5;

  constructor(url, opts = {}) {
    super();
    this._url = url.toString();
    this._createSocket();
    this._totalRetries = 0;
    this._retries = 0;
    this._maxRetries = opts.maxRetries || PhoenixSocket.DEFAULT_MAX_RETRIES;
    const interval = opts.interval || PhoenixSocket.DEFAULT_INTERVAL;
    this.onInterval = this._onInterval.bind(this);
    this._tickerID = setInterval(this.onInterval, interval);
  }

  _onInterval() {
    if (this._socket.readyState !== WebSocket.CLOSED 
        && this._socket.readyState !== WebSocket.CONNECTING) {
      return;
    }
    if (++this._retries > this._maxRetries) {
      console.error(`PhoenixSocket DISCONNECT`);
      this.emit("disconnect", "Maximum retries exceeded");
      return;
    }
    ++this._totalRetries;
    this.emit("reconnect", { retry: this._retries });
    console.debug(`totalRetries: ${this._totalRetries}, retries: ${this._retries}`);
    this._createSocket();
  }

  readyState() {
    return this._socket?.readyState;
  }

  destroy() {
    clearInterval(this._tickerID);
    this._socket.close();
    this.removeAllListeners();
  }

  send(msg) {
    if (this._socket.readyState === WebSocket.OPEN) {
      this._socket.send(msg);
      return true;
    }
    return false;
  }

  getTotalRetries() {
    return this._totalRetries;
  }

  _createSocket() {
    const sock = this._socket;
    if (sock) {
      sock.onmessage = sock.onclose = sock.onopen = sock.onerror = null;
    }
    this._socket = new WebSocket(this._url);
    this._socket.onopen = this._onOpen.bind(this);
    this._socket.onclose = this._onClose.bind(this);
    this._socket.onerror = this._onError.bind(this);
    this._socket.onmessage = this._onMessage.bind(this);
  }

  _onOpen(evt) {
    console.debug("onopen: %o", evt);
    console.debug(`readyState: ${this._socket.readyState}`);
    this.emit("open", evt);
    this._retries = 0;
  }

  _onClose(evt) {
    console.warn("onclose: %o", evt);
    this.emit("close", evt);
    this._createSocket();
  }

  _onError(evt) {
    this.emit("error", evt);
    console.error("onerror: %o", evt);
  }

  _onMessage(evt) {
    this.emit("message", evt);
    // console.debug('onmessage: %o', evt);
  }
}

export default PhoenixSocket;
