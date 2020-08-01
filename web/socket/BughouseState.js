/**
 * Global bughouse state.  Central repository of players, games, and partnerships.
 */
const log = require('./log');
const {EventEmitter} = require('events');
const {
  status: _statusRE,
  rating: _ratingRE,
  handleCode: _handleCode,
} = require('./Regex');

const _bugRE = new RegExp([
    /(?<prefix>[\s\S]*)/,
    /Bughouse games in progress\s*/,
      /(?<games>[\s\S]*)\s+(?<numGames>\d+) games? displayed\.\s*/,
    /^Partnerships not playing bughouse\s*/,
      /(?<partnerships>[\s\S]*)\s+(?<numPartnerships>\d+)/,
      / partnerships? displayed\.\s*/,
    /^Unpartnered players with bugopen on\s*/,
      /(?<players>[\s\S]*?)\s+(?<numPlayers>\d+)/,
      / players? displayed.*$\s*/,
    /(?<suffix>[\s\S]*?)\s*/,
  ].map(r => r.source).join(''),
  'm'
);

// *         admin
// B         blindfold account
// C         computer account
// T         team account
// U         unregistered user
// CA        chess advisor
// SR        service representative
// TD        Tournament Director program or a bot of some sort
// TM        mamer manager

const _handleRE = /\w+/;

const _partnerRE = new RegExp(
  '(?<rating1>' + _ratingRE.source + ')' +
  '(?<status1>' + _statusRE.source + ')' +
  '(?<handle1>\\w+)' +
  '(?<handleCode1>(' + _handleCode.source + ')*)' +
  ' / ' +
  '(?<rating2>' + _ratingRE.source + ')' +
  '(?<status2>' + _statusRE.source + ')' +
  '(?<handle2>\\w+)' +
  '(?<handleCode2>(' + _handleCode.source + ')*)'
);

const _gameRE = new RegExp(
  '\\s*(?<id>\\d+)\\s*' +
  '(?<wRating>' + _ratingRE.source + ')\\s*' +
  '(?<wHandle>\\w+)\\s*' +
  '(?<bRating>' + _ratingRE.source + ')\\s*' +
  '(?<bHandle>\\w+)\\s*' +
  '\\[' +
    '(?<privacy>[p ])(?<type>[bBelLnsSuUxwz])(?<rated>[ru])\\s+' +
    '(?<mins>\\d+)\\s+(?<incr>\\d+)' +
  '\\]' +
  '\\s+(?<wTime>[0-9:]+) -\\s*(?<bTime>[0-9:]+)\\s+' +
  '\\(' +
    '\\s*(?<wMaterial>\\d+)' +
    '-' +
    '\\s*(?<bMaterial>\\d+)' +
  '\\)' +
  '\\s*(?<move>[BW]):\\s*' +
  '(?<moveNumber>\\d+)'
);

const statusRank = {
  ' ': 0, // not busy
  '#': 1, // examining a game
  '~': 2, // running a simul match
  '&': 3, // involved in a tournament
  '^': 4, // involved in a game
  '.': 5, // . inactive for 5 minutes or longer, or if "busy" is set
  ':': 6, // not open for a match
}

class BughouseState extends EventEmitter {
  constructor() {
    super();
    this._games = [];
    this._partners = [];
    this._unpartnered = [];
  }

  parseBugwho(cmdOutput) {
    const match = _bugRE.exec(cmdOutput);
    if (match == null) {
      console.error('BughouseState: parsing bughouse output failed');
      console.error(cmdOutput);
    }
    const {groups} = match;
    const gamesChanged = this._setGames(groups.games, groups.numGames);
    const partersChanged =
      this._setPartnerships(groups.partnerships, groups.numPartnerships);
    const playersChanged =
      this._setUnpartnered(groups.players, groups.numPlayers);
    const prefix = groups.prefix.trim() || null;
    const suffix =  groups.suffix.trim() || null;
    if (prefix) {
      log(`prefix: ${prefix}`);
    }
    if (suffix) {
      log(`suffix: ${suffix}`);
    }
    return [prefix, suffix];
  }

  getGames() {
    return this._games;
  }

  getPartners() {
    return this._partners;
  }

  getUnpartnered() {
    return this._unpartnered;
  }

  _setGames(gamesOutput, numGames) {
    const gameLines = gamesOutput.split('\n\r').filter(s => s.trim().length > 0);
    if (gameLines.length != numGames * 2) {
      console.error('BughouseState games count discrepancy. ' +
                    `Got ${games.length}. Expected ${numGames}`);
      console.error(gamesOutput);
      console.error(gameLines);
    }
    const games = gameLines.map(line => {
      const match = _gameRE.exec(line);
      if (match == null || match.groups == null) {
        console.error(`BughouseState games regexp error`);
        console.error(line);
        return null;
      }
      const {
        id, wRating, wHandle, bRating, bHandle, rated, mins, incr,
        wTime, bTime, wMaterial, bMaterial, move, moveNumber, type
      } = match.groups;
      return {
        id,
        white: {handle: wHandle, rating: wRating, time: wTime},
        black: {handle: bHandle, rating: bRating, time: bTime},
        rated: rated === 'r',
        timeControl: {
          mins: mins,
          incr: incr,
        },
        rated: rated === 'r',
        type,
        move,
        moveNumber,
      };
    });
    const bughousePairs = [];
    for (let i = 0; i < games.length; i += 2) {
      bughousePairs.push([games[i], games[i + 1]]);
    }
    if (JSON.stringify(this._games) !== JSON.stringify(bughousePairs)) {
      console.log(`BughouseState games: ${bughousePairs.length}`);
      this.emit('games', bughousePairs);
    }
    this._games = bughousePairs;
  }

  _setPartnerships(partnershipsOutput, numPartnerships) {
    const partnerships = partnershipsOutput.split('\n\r').filter(s => s.trim().length > 0);
    if (partnerships.length != numPartnerships) {
      console.error('BughouseState partnership count discrepancy. ' +
                    `Got ${partnerships.length}. Expected ${numPartnerships}`);
      console.error(partnershipsOutput);
      console.error(partnerships);
    }

    const partners = partnerships.map(line => {
      const match = _partnerRE.exec(line);
      if (match == null || match.groups == null) {
        console.error(`BughouseState partnership match error`);
        console.error(line);
      }
      const {rating1, status1, handle1, rating2, status2, handle2} = match.groups;
      return [
        {rating: rating1, status: status1, handle: handle1},
        {rating: rating2, status: status2, handle: handle2},
      ];
    });

    const changed = JSON.stringify(partners) !== JSON.stringify(this._partners);
    this._partners = partners;
    if (changed) {
      log(`partners: ${JSON.stringify(partners)}`);
      this.emit('partners', partners);
    }
    return changed;
  }

  _setUnpartnered(playerOutput, numPlayers) {
    const unpartnered =
      playerOutput.split(/\s\s+/)
     .filter(s => s.length > 0)
      .map(player => {
        const match = /([\d ]{1,4}|[+-]{4})([& \.#~^:])(\w+)/.exec(player);
        if (match == null) {
          console.error(`BughouseState ${player} didn't match regexp`);
        }
        const [_, rating, status, handle] = match;
        return {handle, rating, status};
      }).sort(
        (a, b) =>
          a.handle.toLowerCase().localeCompare(b.handle.toLowerCase())
      );
    const changed = JSON.stringify(unpartnered) !== JSON.stringify(this._unpartnered);
    this._unpartnered = unpartnered;
    if (changed) {
      this.emit('unpartnered', unpartnered);
    }
    return changed;
  }

  static get() {
    return _instance;
  }
}

const _instance = new BughouseState();

module.exports = {
  get() { return _instance; },
  regexp() { return _bugRE; }
};
