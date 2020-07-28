const Telnet = require('./node-telnet-client');

const invariant = require('invariant');
const {EventEmitter} = require('events');
const BughouseState = require('./BughouseState');
const log = require('./log');

const _bughouseState = BughouseState.get();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class FicsClient extends EventEmitter {
  constructor() {
    super();
    this._username = null;
    this._ready = false;
    this._isLoggedIn = false;
    this._conn = new Telnet();
    this._bughousePoll = false;
  }

  login(creds) {
    if (this._isLoggedIn) {
      console.error(`already connected for ${this._username}`);
      return;
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
    console.log('FicsClient connecting...');
    this._conn.on('data', chunks => {
      const result = chunks.toString();
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
          this.emit('login', this._username);
        }
      }
      if (!this._bughousePoll) {
        this.emit('data', result);
      } else if (!result.match(BughouseState.regexp())) {
        log(`FicsClient suppressed (bugPoll): ${result.substr(0, 12)}...`);
      }
    });
    this._conn.on('ready', _ => {
      this._ready = true;
      console.log('FicsClient.ready');
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
        Promise.all(initCommands.map(cmd => this.send(cmd)));
        console.log('initialized FICS variables');
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
    this._bughousePoll = true;
    this.send(
      'bugwho',
      {waitfor: /\s*\d+ players? displayed\./m}
    ).then(result => {
      this._bughousePoll = false;
      const [prefix, suffix] = _bughouseState.parseBughouseCmd(result);

      // In the rare case that our telnet data came back with auxiliary data
      // (like game information, etc.) fire the standard 'data' event with it
      if (prefix != null) {
        console.log(`FicsClient bugPoll prefix: ${prefix.substr(30)}...`);
        this.emit('data', prefix);
      }
      if (suffix != null) {
        console.log(`FicsClient bugPoll suffix: ${suffix.substr(30)}...`);
        this.emit('data', suffix);
      }
    }).catch(err => {
      console.error(err);
    });
  }

  async send(cmd) {
    let result = null;
    try {
      result = await this._conn.send(cmd);
    } catch(err) {
      console.error(err);
    }
    return result;
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
    this._ready = false;
    this._isLoggedIn = false;
    this._username = null;
    this._conn.destroy();
    this._conn.removeAllListeners();
  }

}

module.exports = FicsClient;
