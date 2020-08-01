const Telnet = require('./node-telnet-client');

const invariant = require('invariant');
const {EventEmitter} = require('events');
const BughouseState = require('./BughouseState');
const log = require('./log');

const _bughouseState = BughouseState.get();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class FicsClient extends EventEmitter {
  constructor(uid, db) {
    super();
    this._uid = uid;
    this._db = db;
    this._username = null;
    this._ready = false;
    this._initialized = false;
    this._isLoggedIn = false;
    this._conn = new Telnet();
    this._inflight = false;
    this._isPolling = false;
    this._sendQueue = [];
    this._queuedCmds = {}; // cmd => idx
  }

  login(creds) {
    if (this._isLoggedIn) {
      console.error(`already connected for ${this._username}`);
      return Promise.resolve();
    }
    const username = creds.username || 'guest';
    invariant(
      username === 'guest' || creds.password != null,
      'must provide password'
    );
    const passwordPrompt = username === 'guest'
      ? /Press return to enter the server as "\w+":/
      : /password:/i;
    this._conn.removeAllListeners();
    log('FicsClient connecting...');
    this._conn.on('data', chunks => {
      const result = chunks.toString();
      // log(`FicsClient ${this._username} on 'data' '${result.substr(0,20)}...'`);
      if (this._username == null) {
        if (username !== 'guest') {
          this._username = username;
        } else {
          let match = /Logging you in as "(\w+)";/.exec(result);
          if (match != null) {
            this._username = match[1];
          }
        }
        if (this._username != null) {
          const ref = this._db.ref(`users/${this._uid}/ficsHandle`);
          ref.set(this._username);
          ref.onDisconnect().remove();
          this.emit('login', this._username);
        }
      }
      if (this._isPolling && result.match(BughouseState.regexp())) {
        const lines = result.split('\n\r');
        const msg = lines[0] + '\\n...\\n' + lines.slice(-3).join('\\n');
        log(`FicsClient suppressed (bugPoll): ${msg}`);
      } else {
        log(`FicsClient emitting 'data' '${result.substr(0,20)}...'`);
        this.emit('data', result);
      }
    });
    this._conn.on('ready', _ => {
      this._ready = true;
      log('FicsClient.ready');
      sleep(500).then(() => {
        const initCommands = ['set style 12'];
        if (username === 'guest') {
          [].push.apply(initCommands, [
            'set ctell 0',
            'set formula bughouse',
            'set bugopen 1',
            '+channel 24',
            '+channel 93',
            '-channel 4',
            '-channel 53',
          ]);;
        }
        log('FicsClient: initializing FICS variables...');
        this._inflight = true;
        Promise.all(
          initCommands.map(cmd => this._conn.send(cmd)),
        ).then((results) => {
          log('FicsClient Initialized FICS variables');
        }).catch(err => {
          console.error(`FicsClient init error`);
        }).finally(() => {
          this._initialized = true;
          this._inflight = false;
          this._dequeue();
        });
      });
    });
    this._conn.on('failedlogin', err => {
      console.error('FicsClient.failedlogin');
      this.emit('failedlogin', err);
    });
    return this._conn.connect({
      port: 5000,
      host: 'freechess.org',
      shellPrompt: /^fics% $/m,
      timeout: 5000,
      echoLines: 0,
      passwordPrompt,
      username,
      password: creds.password || '',
    }).then(result => {
      this._isLoggedIn = true;
    }).catch(err => {
      this.emit('failedlogin', err.message);
      console.log(err);
    });
  }

  // send `bughouse` command for global bughouse state
  bugPoll() {
    const onResult = result => {
      // log(`FicsClient bugPoll result`);
      this._isPolling = false;
      const [prefix, suffix] = _bughouseState.parseBugwho(result);

      // In the rare case that our telnet data came back with auxiliary data
      // (like game information, etc.) fire the standard 'data' event with it
      if (prefix != null) {
        log(`FicsClient bugPoll prefix: ${prefix.substr(30)}...`);
        this.emit('data', prefix);
      }
      if (suffix != null) {
        console.error(`FicsClient bugPoll suffix: ${suffix.substr(30)}...`);
        this.emit('data', suffix);
      }
    };

    if ('bugwho' in this._queuedCmds) {
      log(`FicsClient 'bugwho' already queued...`);
      log(`  idx: ${this._queuedCmds['bugwho']}`);
      log(`  sendQueue: ${this._sendQueue.length}`);
      this._dequeue();
      return;
    }
    this.send(
      'bugwho',
      {waitfor: /\s*\d+ players? displayed/m},
      () => { this._isPolling = true; },
    ).then(onResult)
      .catch(err => { console.error(err); });
  }

  async send(cmd, opts, preSend) {
    let result = null;
    try {
      if (this._inflight || !this._initialized) {
        log(`FicsClient queueing '${cmd}' inflight: ${this._inflight}...`);
        result = await this._queue(cmd, opts, preSend);
      } else {
        log(`FicsClient sending '${cmd}'`);
        preSend && preSend();
        this._inflight = true;
        result = await this._conn.send(cmd, opts);
        this._inflight = false;
        this._dequeue();
      }
    } catch(err) {
      console.error(err);
    }
    return result;
  }

  _dedupe(cmd) {
    return false; // let all commands thru (no deduping)
  }

  _queue(cmd, opts, preSend) {
    if (this._dedupe(cmd) && (cmd in this._queuedCmds)) {
      log(`FicsClient '${cmd}' already queued`);
      return Promise.reject('redundant');
    }
    return new Promise((_resolve, reject) => {
      const resolve = (result) => {
        _resolve(result);
        this._dequeue();
      };
      this._queuedCmds[cmd] =
        this._sendQueue.push({cmd, opts, preSend, resolve, reject}) - 1;
    });
  }

  async _dequeue() {
    // log(`FicsClient _dequeue: ${this._sendQueue.length}`);
    if (this._sendQueue.length === 0) {
      return;
    }

    const {cmd, opts, preSend, resolve} = this._sendQueue.shift();
    log(`FicsClient dequeued '${cmd}'. inflight: ${this._inflight}`);
    delete this._queuedCmds[cmd];
    preSend && preSend();
    this._inflight = true;
    log(`FicsClient dequeued.send '${cmd}'`);
    const result = await this._conn.send(cmd, opts);
    log(`FicsClient resolving '${cmd}' in dequeue`);
    this._inflight = false;
    resolve(result);
    this._dequeue();
  }

  async _processQueue() {
    while (this._sendQueue.length > 0) {
      await this._dequeue();
    }
  }

  getUsername() {
    return this._username;
  }

  isLoggedIn() {
    return this._isLoggedIn;
  }

  isReady() {
    return this._ready;
  }

  destroy() {
    const ref = this._db.ref(`users/${this._uid}/ficsHandle`);
    ref.set(null);
    log(`setting ${this._username} to null`);
    // ref.remove();
    this._ready = false;
    this._isLoggedIn = false;
    this._username = null;
    this._conn.destroy();
    this._conn.removeAllListeners();
  }

}

module.exports = FicsClient;
