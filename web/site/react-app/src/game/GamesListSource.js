import {EventEmitter} from 'events';

/**
 * Listens to the firebase DB 'online' table, and then individual listens to
 * each user to get their FICS data, display info, etc.
 */
class GamesListSource extends EventEmitter {
  constructor(telnet) {
    super();
    this._telnet = telnet;
    this._games = [];
    const onBugwho = bug => {
      if (bug.games == null) {
        console.error(`GamesListSource bug.games == null, ${bug}`);
        return;
      }
      onGames(bug);
    };
    const onGames = ({games}) => {
      this._games = games;
      this.emit('games', games);
    };

    telnet.on('bugwho', onBugwho);
    telnet.on('games', onGames);
  }

  getGames() {
    return this._games;
  }
}

const _cache = {};
const GamesListSourceGetter = {
  get(telnet) {
    const uid = telnet.getUid();
    return _cache[uid] || (_cache[uid] = new GamesListSource(telnet));
  }
};
export default GamesListSourceGetter;
