// {Game 58 (fixerator vs. GuestGTWN) Creating unrated bughouse match\\.}
// Your partner is playing game 59 (GuestXYBH vs. GuestVBTD).
const log = require('./log');

const re = new RegExp(
  '\\{Game (\\d+) \\((\\w+) vs. (\\w+)\\) ' +
  'Creating ((?:un)?rated) bughouse match\\.\\}\\s+' +
  'Your partner is playing game (\\d+) \\((\\w+) vs. (\\w+)\\)\\.'
);

class GameStartParser {
  constructor(uid, gameObserver) {
    this._uid = uid;
    this._gameObserver = gameObserver;
  }

  static parseStart(text) {
    const match = re.exec(text);
    if (match == null) {
      return null;
    }
    log(`!!!!!!!! got game over match !!!!!!`);
    const [_, id1, w1, b1, rated, id2, w2, b2] = match;
    return {
      viewer: {
        id: id1,
        white: w1,
        black: b1,
      },
      partner: {
        id: id2,
        white: w2,
        black: b2,
      },
    };
  }

  getMatch(text) {
    return GameStartParser.parseStart(text);
  }

  onMatch(match, clientSocket) {
    this._gameObserver.addPlayer(this._uid, match.viewer.id);
    if (clientSocket != null) {
      clientSocket.emit('gameStart', match);
    }
  }

  // Go ahead and let this thru to the client console
  stripMatch(_, text) {
    return text;
  }

}

module.exports = GameStartParser;
