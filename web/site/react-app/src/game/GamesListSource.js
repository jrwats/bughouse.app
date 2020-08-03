import {EventEmitter} from 'events';
import TelnetProxy from '../telnet/TelnetProxy';

const proxy = TelnetProxy.singleton();

/**
 * Listens to the firebase DB 'online' table, and then individual listens to
 * each user to get their FICS data, display info, etc.
 */
class GamesListSource extends EventEmitter {
  constructor() {
    super();
    this._games = [];
    const onBugwho = bug => {
      if (bug.games == null) {
        console.error(`GamesListSource bug.games == null, ${bug}`);
        return;
      }
      onGames(bug);
    };
    const onGames = ({games}) => {
      // console.log(`GamesListSource 'games' ${games}`);
      // console.log(games);
      if (games == null || games.length == null) {
        debugger;
        console.error('wtf');
        throw new Error('games?');
      }
      this._games = games;
      this.emit('games', games);
    };

    proxy.on('bugwho', onBugwho);
    proxy.on('games', onGames);
  }

  getGames() {
    return this._games;
  }
}

const singleton = new GamesListSource();

export default { get() { return singleton; } };
