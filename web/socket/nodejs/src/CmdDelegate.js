/**
 * Responsible for parsing FICS output relevant to playing a bughouse game
 * bugwho, partnering, challenges, game status, droppable pieces, messages, etc
 */
const emit = require('./emit');
const log = require('./log');
const {rating: ratingRE} = require('./Regex');
const Pending = require('./Pending');
const {EventEmitter} = require('events');

class SimpleHandler {
  constructor(re, onMatch) {
    this.re = re;
    this.onMatch = onMatch;
  }
  getMatch(text) {
    return this.re.exec(text);
  }
  stripMatch(match, text) {
    const idx = text.indexOf(match[0]);
    return (text.substr(0, idx) + text.substr(idx + match[0].length)).trim();
  }

}

const _handlers = [
  {
    // \u0007\n
    // \rfixerator offers to be your bughouse partner; type "partner fixerator" to accept.\n'
    // \rfics% ,
    re: /(\w+) offers to be your bughouse partner;.*$/m,
    onMatch: (match, ws) => {
      log(`CmdDelegate sock.emit('incomingOffer', ${match[1]})`);
      emit(ws, 'incomingOffer', {handle: match[1]});
    },
  },
  {
    re: /(\w+) agrees to be your partner.*$/m,
    onMatch: (match, ws) => {
      log(`CmdDelegate sock.send('partnerAccepted')`);
      emit(ws, 'partnerAccepted', {handle: match[1]});
    }
  },
  {
    re: /Partnership offer to (\w+) withdrawn.*$/m,
    onMatch: (match, ws) => {
      log(`CmdDelegate sock.send('outgoingPartnerCancelled)'`);
      emit(ws, 'outgoingOfferCancelled', {handle: match[1]});
    },
  },
  {
    re: /You no longer have a bughouse partner.*$/m,
    onMatch: (match, ws) => {
      log(`CmdDelegate sock.send('unpartnered)'`);
      emit(ws, 'unpartnered');
    }
  },
  {
    re: new RegExp('^Challenge: ' + Pending.challengeGameRE().source, 'm'),
    onMatch: (match, ws) => {
      const challenge = Pending.matchToGame(match);
      log(`CmdDelegate sock.send('incomingChallenge', ${JSON.stringify(challenge)})`);
      if (challenge.challenger.handle == null) {
        log(match);
      }
      emit(ws, 'incomingChallenge', {challenge});
    },
  },
  {
    // Your bughouse partner was challenged: GuestPYGY (----) GuestCDZP (----) unrated bughouse 5 0.
    // Your game will be: GuestLCVT (----) fixerator (----) unrated bughouse 5 0
    re: new RegExp(
      'Your bughouse partner was challenged: ' +
       Pending.challengeGameRE().source,
      'm'
    ),
    onMatch: (match, ws) => {
      const game = Pending.matchToGame(match);
      log(`CmdDelegate sock.send('challenge', ${game})`);
      emit(ws, 'incomingPartnerChallenge', {game});
    },
  },
  {
    // Your bughouse partner issues: GuestGFGL (----) GuestRKGH (----) unrated bughouse 2 12.
    // Your game will be: fixerator (----) GuestGYHC (----) unrated bughouse 2 12.
    re: new RegExp(
      '^Your bughouse partner issues: ' +
        Pending.challengeGameRE().source,
      'm'
    ),
    onMatch: (match, ws) => {
      const game = Pending.matchToGame(match);
      log(`CmdDelegate sock.send('challenge', ${game})`);
      emit(ws, 'outgoingPartnerChallenge', {game});
    },
  },
].map(({re, onMatch}) => {
  return new SimpleHandler(re, onMatch);
});

class CmdDelegate extends EventEmitter {

  constructor(ws, fics) {
    super();
    this._ws = ws;
    this._fics = fics;
    this._dataListener = this._onData.bind(this);
    fics.on('data', this._dataListener);
    this._handlers = [..._handlers];
  }

  onClose() {
    this._ws = null;
    this._fics.off('data', this._dataListener);
  }

  _onData(data) {
    if (this.handle(data)) {
      return;
    }
    log(`${Date.now()}: socket.emit('data', '${data.substr(0, 20)}...')`);
    if (this._ws != null) {
      emit(this._ws, 'data', {data});
    }
  }

  addHandler(handler) {
    this._handlers.push(handler);
  }

  handle(text) {
    let handled = false;
    // console.log(text);
    for (const handler of this._handlers) {
      const match = handler.getMatch(text);
      if (match != null) {
        handler.onMatch(match, this._socket);
        text = handler.stripMatch(match, text);
        handled = true;
      }
    }
    if (handled &&
        text.length > 0 &&
        text.replace(/\s*fics%\s*/mg, '').length != 0) {
      log(`CmdDelegate emitting 'data' '${text.substr(20)}...' (len: ${text.length})`);
      if (this._socket != null) {
        emit(this._ws, 'data', {data});
      }
    }
    return handled;
  }

}

module.exports = CmdDelegate;
