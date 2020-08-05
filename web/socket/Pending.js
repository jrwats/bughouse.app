const log = require('./log');
const {rating: ratingRE} = require('./Regex');

const pendingRE = new RegExp(
  '^(?:There are no offers pending to other players\\.|' +
    'Offers to other players:\\s+([\\s\\S]+))\\s+' +
  '^(?:There are no offers pending from other players\\.|' +
    'Offers from other players:\\s+([\\s\\S]+))',
  'm'
);

const incomingOffersRE = /\s*(\d+): (\w+) is offering to be bughouse partners\./;
const outgoingOffersRE = /\s*(\d+): You are offering (\w+) be bughouse partners\./;

const _ratingRE = /[\d ]{1,4}|[+-]{4}/;

const _challengeRE = new RegExp(
  '(?<challenger>\\w+) \\((?<challengerRating>' + ratingRE.source + ')\\) ' +
  '(?<challengee>\\w+) \\((?<challengeeRating>' + ratingRE.source + ')\\) ' +
  '(?<rated>(?:un)?rated) bughouse (?<mins>\\d+) (?<incr>\\d+).*$'
);

const incomingChallengesRE = new RegExp(
  '^\\s*(?<id>\\d+): \\w+ is offering a challenge: ' +
  _challengeRE.source,
  'm'
);

const outgoingChallengesRE = new RegExp(
  '\\s*(?<id>\\d+): You are offering \\w+ a challenge: ' +
    _challengeRE.source,
  'm'
);

const _instances = {};

const empty = () => ({
  incoming: {offers: [], challenges: []},
  outgoing: {offers: [], challenges: []},
});

function matchToGame(match) {
  if (match == null) {
    return null;
  }
  const {
    challenger,
    challengerRating,
    challengee,
    challengeeRating,
    rated,
    mins,
    incr
  } = match.groups;
  return {
    challenger: {handle: challenger, rating: challengerRating},
    challengee: {handle: challengee, rating: challengeeRating},
    rated: rated === 'rated',
    mins,
    incr,
  };
}

class Pending {
  constructor(uid) {
    this._uid = uid;
    this._pending = empty();
    this.re = pendingRE;
  }

  destroy() {
    delete _instances[this._uid];
  }

  parse(pendingOutput) {
    const match = this.getMatch(pendingOutput);
    return match == null ? empty() : match.pending;
  }

  getMatch(pendingOutput) {
    const match = pendingRE.exec(pendingOutput);
    if (match == null) {
      return null;
    }
    this._pending = this._parseMatch(match);
    return {pending: this._pending, match};
  }

  // TODO: consolidate this copypasta from CmdDelegate.js
  stripMatch({match}, text) {
    const idx = text.indexOf(match[0]);
    return (text.substr(0, idx) + text.substr(idx + match[0].length)).trim();
  }

  _parseMatch(match) {
    const outgoingLines = match[1] != null ? match[1].split('\n\r') : [];
    const outgoingOffers = outgoingLines
      .map(line => outgoingOffersRE.exec(line))
      .filter(result => result != null)
      .map(match => ({id: match[1], handle: match[2]}));
    const outgoingChallenges = outgoingLines
      .map(line => outgoingChallengesRE.exec(line))
      .filter(result => result != null)
      .map(match => {
        return Object.assign({id: match.groups.id}, matchToGame(match));
      });

    const incomingLines = match[2] != null ? match[2].split('\n\r') : [];
    const incomingOffers = incomingLines
      .map(line => incomingOffersRE.exec(line))
      .filter(result => result != null)
      .map(match => ({id: match[1], handle: match[2]}));
    const incomingChallenges = incomingLines
      .map(line => incomingChallengesRE.exec(line))
      .filter(result => result != null)
      .map(match =>  ({...matchToGame(match), id: match.groups.id}));
    return {
      incoming: {
        offers: incomingOffers,
        challenges: incomingChallenges,
      },
      outgoing: {
        offers: outgoingOffers,
        challenges: outgoingChallenges
      },
    };
  }

  getPending() {
    return this._pending;
  }

  onMatch({pending, match}, clientSocket) {
    log(`Pending cmdDelegate ${JSON.stringify(pending)}`);
    if (clientSocket != null) {
      clientSocket.emit('pending', pending);
    }
  }
}

const factory = {
  challengeGameRE() {
    return _challengeRE;
  },

  matchToGame,

  get(uid) {
    return _instances[uid] || (_instances[uid] = new Pending(uid));
  }
};

module.exports = factory;
