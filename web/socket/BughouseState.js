/**
 * Global bughouse state.  Central repository of players, games, and partnerships.
 */
const log = require('./log')
const {EventEmitter} = require('events');

// Status codes:
//   ^   involved in a game
//   ~   running a simul match
//   :   not open for a match
//   #   examining a game
//   .   inactive for 5 minutes or longer, or if "busy" is set
//       not busy
//   &   involved in a tournament

// Unpartnered players with bugopen on
//
// 1763^letsgetiton    ----.adenin         ----.jlojedaf       ----.SereneThought
// 1662 Drukkarg       ---- alextheseaman  ----^Kraehe         ----^THEBIRDS
// 1616^Allnovice      ----^allegories     ----.kukiriza       ----:Tingum
// 1607.nirbak         ----^amedved        ----.LeeLody        ---- tinoman
// 1603 networc        ----.benaguasil     ----^Luciopwm       ----.toodlebug
// 1418.brucrigiov     ----.benzebest      ---- Lusitania      ----:torie
// 1258^clementi       ----^Bkosuta        ----^maienberger    ----.trynottolaugh
// 1204.RICHARDEUR     ----.brainsoup      ----^manoah         ----.UrGameOver
// 1139^sadurang       ---- bricola        ----^mdeleon        ----.Urobe
// 1138.Ishtaire       ----^chiefien       ----^pedda          ----^WANGDAYE
//  875 skeckler       ---- floare         ----.petpet         ++++ GuestKBSJ(U)
//  735.abdragan       ----^flyingpawn     ----^richardmario
//  673^JoeO           ----^FOWARDL        ----^RikTheKing
//  623^wycliff        ---- HAKARI         ----.SenTimo
//
//  53 players displayed (of 607). (*) indicates system administrator.

const _bugRE = new RegExp([
    /(?<prefix>.*)/,
    /^Bughouse games in progress\s*/,
      /(?<games>[\s\S]*)\s+(?<numGames>\d+) games? displayed\.\s*/,
    /^Partnerships not playing bughouse\s*/,
      /(?<partnerships>[\s\S]*)\s+(?<numPartnerships>\d+)/,
      / partnerships? displayed\.\s*/,
    /^Unpartnered players with bugopen on\s*/,
      /(?<players>[\s\S]*?)\s+(?<numPlayers>\d+)/,
      / players? displayed.*$\s*/,
    /(?<suffix>.*?)\s*/,
  ].map(r => r.source).join(''),
  'm'
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
    this._partnerships = [];
    this._players = [];
  }

  parseBughouseCmd(cmdOutput) {
    const match = _bugRE.exec(cmdOutput);
    if (match == null) {
      console.error('BughouseState: parsing bughouse output failed');
      console.error(cmdOutput);
    }
    const {groups} = match;
    const gamesChanged = this._setGames(groups.game, groups.numGames);
    const partersChanged =
      this._setPartnerships(groups.partnerships, groups.numPartnerships);
    const playersChanged =
      this._setPlayers(groups.players, groups.numPlayers);
    return [groups.prefix.trim() || null, groups.suffix.trim() || null];
  }

  _setGames(gamesOutput, numGames) {
  }

  _setPartnerships(partnershipsOutput, numPartnerships) {
  }

  _setPlayers(playersOutput, numPlayers) {
    const players =
      playersOutput.split(/\s\s+/)
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
    const changed = JSON.stringify(players) !== JSON.stringify(this._players);
    this._players = players;
    if (changed) {
      this.emit('players', players);
    }
    return changed;
  }

  getPlayers() {
    return this._players;
  }

  static regexp() {
    return _bugRE;
  }

  static get() {
    return _instance;
  }
}

const _instance = new BughouseState();

module.exports = BughouseState;
