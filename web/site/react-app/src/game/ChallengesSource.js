import {EventEmitter} from 'events';
import SocketProxy from '../socket/SocketProxy';
// import OnlineUsers from '../user/OnlineUsers';
// import invariant from 'invariant';

// const onlineUsers = OnlineUsers.get();
const proxy = SocketProxy.singleton();

/**
 * Listens to the game challenges send from the web socket / telnet proxy
 */
class ChallengesSource extends EventEmitter {
  constructor() {
    super();
    this._challenges = {};
    this._partnerChallenges = {};

    proxy.on('incomingChallenge', ({user, challenge}) => {
      SocketProxy.get(user).sendEvent('pending');
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
    const {challenger} = challenge;
    // const viewer = onlineUsers.getUsers()[uid];
    // if (viewer == null) {
    //   console.error(`null viewer?`);
    //   return;
    // }
    // const viewerHandle = viewer.ficsHandle;
    // invariant(
    //   viewerHandle === challengee.handle,
    //   `Parse assumptions WRONG! viewer: ${viewerHandle}
    //    [${challenger.handle}, ${challengee.handle}]`
    // );
    this._challenges[challenger.handle] = challenge;
  }

  getPartnerChallenges() {
    return this._partnerChallenges;
  }

  getChallenges() {
    return this._challenges;
  }
}

const singleton = new ChallengesSource();

const ChallengesSourceGetter = {
  get() {
    return singleton;
  }
};

export default ChallengesSourceGetter;
