const Telnet = require('./node-telnet-client');

const invariant = require('invariant');
const events = require('events');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class FicsClient extends events.EventEmitter {
  constructor() {
    super();
    this._username = null;
    this._ready = false;
    this._connected = false;
    this._conn = new Telnet();
  }

  async login(creds) {
    if (this._connected) {
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
      console.log(`FicsClient.data '${result.substr(0,20)}...'`);
      this.emit('data', result);
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
    try {
      this._conn.on(
        'failedlogin',
        err => {
          console.error('FicsClient.failedlogin');
          this.emit('failedlogin', err);
        }
      );
      await this._conn.connect({
        port: 5000,
        host: 'freechess.org',
        shellPrompt: /^fics% $/m,
        timeout: 5000,
        echoLines: 0,
        passwordPrompt,
        username,
        password: creds.password || '',
      });
      this._connected = true;
      console.log('FicsClient connected');
    } catch (err) {
      this.emit('failedlogin', err.message);
      console.log(err);
    }
  }

  async send(cmd) {
    const result = await this._conn.send(cmd);
    return result;
  }

  getUsername() {
    return this._username;
  }

  isConnected() {
    return this._connected;
  }

  isReady() {
    return this._ready;
  }

  destroy() {
    this._ready = false;
    this._connected = false;
    this._username = null;
    this._conn.destroy();
    this._conn.removeAllListeners();
  }

}

module.exports = FicsClient;
