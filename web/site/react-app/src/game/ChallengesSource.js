import firebase from 'firebase/app';
import {EventEmitter} from 'events';
import TelnetProxy from '../telnet/TelnetProxy';
import OnlineUsers from '../user/OnlineUsers';

const onlineUsers = OnlineUsers.get();
const proxy = TelnetProxy.singleton();

/**
 * Listens to the game challenges send from the web socket / telnet proxy
 */
class ChallengesSource extends EventEmitter {
  constructor() {
    super();
    this._challenges = {};
    this._partnerChallenges = {};

    proxy.on('incomingChallenge', ({user, challenge}) => {
      TelnetProxy.get(user).sendEvent('pending');
      this._addChallenge(user.uid, challenge);
      console.log(`ChallengesSource 'incomingChallenge': ${JSON.stringify(this._challenges)}`);
      this.emit('challenges', this._challenges);
    });

    proxy.on('pending', ({user, pending}) => {
      console.log(`ChallengesSource 'pending' ${JSON.stringify(pending)}`);
      this._challenges = {};
      for (const challenge of (pending.incoming.challenges || [])) {
        this._addChallenge(user.uid, challenge);
      }
      this.emit('challenges', this._challenges);
    });

    proxy.on('incomingPartnerChallenge', ({user, challenge}) => {
    });
    proxy.on('outgoingPartnerChallenge', ({user, challenge}) => {
    });
  }

  _addChallenge(uid, challenge) {
    const {white, black} = challenge;
    const viewer = onlineUsers.getUsers()[uid];
    if (viewer == null) {
      console.error(`null viewer?`);
      return;
    }
    const viewerHandle = viewer.ficsHandle;
    if (viewerHandle != white.handle && viewerHandle != black.handle) {
      throw (
        `Challenges got challenge for someone else ` +
          `viewer: ${viewerHandle},  [${white.handle}, ${black.handle}]`
      );
    }
    const challenger = white.handle === viewerHandle
      ? black.handle
      : white.handle;
    this._challenges[challenger] = challenge;
  }

  getPartnerChallenges() {
    return this._partnerChallenges;
  }

  getChallenges() {
    return this._challenges;
  }
}

const singleton = new ChallengesSource();

export default { get() { return singleton; } };
