import firebase from 'firebase/app';
import {EventEmitter} from 'events';
import TelnetProxy from '../telnet/TelnetProxy';

const proxy = TelnetProxy.singleton();

/**
 * Listens to the firebase DB 'online' table, and then individual listens to
 * each user to get their FICS data, display info, etc.
 */
class OnlineUsers extends EventEmitter {

  constructor(db) {
    super();
    this._uids = {};
    this._users = {};
    this._handle2uid = {};
    this._unpartnered = {};
    this._partners = [];
    this._listeners = {};
    this._subscriptions = {};
    this._outgoingOffers = {};
    this._incomingOffers = {};

    console.log(`OnlineUsers ${Date.now()}`);
    this._db = db;
    const onlineUsers = db.ref('online');

    const onBugwho = bug => {
      console.log(`onBugwho ${bug}`);
      onPartners(bug.partners);
      this._onUnpartneredHandles(bug.unpartnered);
    };
    const onPartners = partners => {
      console.log(`OnlineUsers partners`);
      console.log(partners);
      this._partners = partners;
      this._mergePartnerHandles();
      this.emit('partners', partners);
    };
    const onPending = ({pending}) => {
      const {outgoing, incoming} = pending;
      if (outgoing == null) {
        debugger;
      }
      for (const {handle} of (outgoing.offers || [])) {
        this._outgoingOffers[handle] = true;
      }
      this._outgoingChallenges = outgoing.challenges;
      for (const {handle} of (incoming.offers || [])) {
        this._incomingOffers[handle] = true;
      }
      this._incomingChallenges = incoming.challenges;
      this.emit('incomingChallenges', this._incomingChallenges);
      this.emit('incomingOffers', this._incomingOffers);
    };
    const onIncomingOffer = ({handle, user}) => {
      console.log(`OnlineUsers onIncomingOffer(${handle})`);
      this._incomingOffers[handle] = true;
      this.emit('incomingOffers', this._incomingOffers);
    };
    const onLogout = () => {
      this._incomingOffers = {};
    };
    const onOutgoingCancelled = ({user, handle}) => {
      delete this._outgoingOffers[handle];
      this.emit('outgoingOffers', this._outgoingOffers);
    };
    proxy.on('bugwho', onBugwho);
    proxy.on('unpartneredHandles', (handles) => { this._onUnpartneredHandles(handles); });
    proxy.on('partners', onPartners);
    proxy.on('partnerAccepted', data => this._formPartner(data));
    proxy.on('incomingOffer', onIncomingOffer);
    proxy.on('outgoingOfferCancelled', onOutgoingCancelled);
    proxy.on('pending', onPending);
    proxy.on('logout', onLogout);
    proxy.on('unpartnered', ({user}) => {
      const ficsHandle = this._users[user.uid].ficsHandle;
      for (let i = 0; i < this._partners.length; ++i) {
        const [p1, p2] = this._partners[i];
        if (p1.handle === ficsHandle || p2.handle === ficsHandle) {
          this._partners.splice(i, 1);
          onPartners(this._partners);
          return;
        }
      }
      console.error(`Unpartnered ${ficsHandle} not found?`);
    });

    onlineUsers.once('value', (snapshot) => {
      console.log(`OnlineUsers online snapshot`);
      this._uids = snapshot.val() || {};
      for (const uid in this._uids) {
        this._listenToUser(uid);
      }
      console.log(this._uids);

      onlineUsers.on('child_added', (data) => {
        // console.log(`OnlineUsers online.child_added ${data.key}`);
        this._uids[data.key] = data.val();
        this._users[data.key] = {};
        this._listenToUser(data.key);
        this.emit('value', this._users);
      });
      onlineUsers.on('child_changed', (data) => {
        // console.log(`OnlineUsers online.child_changed ${data.key}`);
        this._uids[data.key] = data.val();
      });
      onlineUsers.on('child_removed', (data) => {
        // console.log(`OnlineUsers online.child_removed ${data.key}`);
        this._unsubscribeFromUser(data.key);
        this.emit('value', this._users);
      });
    });
  }

  _onUnpartneredHandles(unpartneredFicsPlayers) {
    const newUnpartnered = {};
    for (const player of unpartneredFicsPlayers) {
      const {handle} = player;
      newUnpartnered[handle] = player;
    }
    this._unpartnered = newUnpartnered;
    this._mergeUserHandles();
    this.emit('unpartneredHandles', this._unpartnered);
  }

  _mergeUserHandles() {
    for (const handle in this._unpartnered) {
      if (handle in this._handle2uid) {
        this._unpartnered[handle].user = this._users[this._handle2uid[handle]];
      }
    }
  }

  _mergePartnerHandles() {
    for (let i = 0; i < this._partners.length; ++i) {
      const [p1, p2] = this._partners[i];
      if (p1.handle in this._handle2uid) {
        this._partners[i][0] = {...p1, user: this.getUserFromHandle(p1.handle)};
      }
      if (p2.handle in this._handle2uid) {
        this._partners[i][1] = {...p2, user: this.getUserFromHandle(p2.handle)};
      }
    }
  }

  _formPartner({user, handle}) {
    if (user == null) {
      debugger;
    }
    const {uid} = user;
    const viewerHandle = this._users[uid].ficsHandle;
    if (handle in this._unpartnered && viewerHandle in this._unpartnered) {
      this._partners.push([
        this._unpartnered[handle],
        this._unpartnered[viewerHandle],
      ]);
    } else {
      console.error(`Already partnered? ${viewerHandle} ${handle}`);
    }
    delete this._outgoingOffers[handle];
    delete this._incomingOffers[handle];
    delete this._unpartnered[handle];
    delete this._unpartnered[viewerHandle];
    this.emit('partners', [...this._partners]);
    this.emit('unpartneredHandles', this._unpartnered);
  }

  _listenToUser(uid) {
    console.log(`OnlineUsers listening to ${uid}`);
    if (uid in this._subscriptions) {
      console.log('already listening');
      return;
    }
    this._subscriptions[uid] = 1;
    const user = this._db.ref(`users/${uid}`);
    user.once('value', (snapshot) => {
      this._users[uid] = snapshot.val();
      console.log(`OnlineUsers users/${uid} snapshot`);
      console.log(this._users[uid]);
      this.emit('value', this._users);

      this._listen(user, 'child_added', (data) => {
        // console.log(`OnlineUsers user.child_added ${data.key}`);
        if (this._users[uid] != null) {
          this._users[uid][data.key] = data.val();
          if (data.key === 'ficsHandle') {
            this._handle2uid[data.val()] = uid;
            this._mergeUserHandles();
            this._mergePartnerHandles();
            this.emit('unpartneredHandles', this._unpartnered);
          }
          this.emit('value', this._users);
        }
      });
      this._listen(user, 'child_changed', (data) => {
        // console.log(`OnlineUsers user.child_changed ${data.key}`);
        if (this._users[uid] != null) {
          if (data.key === 'ficsHandle') {
            this._handle2uid[data.val()] = uid;
          }
          this._users[uid][data.key] = data.val();
        }
        this.emit('value', this._users);
      });
      this._listen(user, 'child_removed', (data) => {
        // console.log(`OnlineUsers user.child_removed ${data.key}`);
        if (!(uid in this._users)) {
          console.error(`${uid} already gone?`);
          return;
        }
        if (data.key === 'ficsHandle') {
          const oldHandle = this._users[uid][data.key];
          delete this._handle2uid[oldHandle];
          this._users[uid].ficsHandle = null;
        }
        this.emit('value', this._users);
      });
      this._listen(user, 'child_moved', (data) => {
        console.log(`OnlineUsers user.child_moved ${data.key}`);
      });

    });
  }

  _listen(ref, eventName, listener) {
    const key = ref.getKey();
    if (!(key in this._listeners)){
      this._listeners[key] = {};
    }
    this._listeners[key][eventName] = listener;
    ref.on(eventName, listener);
  }

  _unsubscribeFromUser(uid) {
    const refKey = `users/${uid}`;
    for (const eventName in this._listeners[refKey]) {
      this._db.ref(refKey).off(this._listeners[refKey][eventName]);
    }
    if (this._users[uid].ficsHandle != null) {
      delete this._handle2uid[this._users[uid].ficsHandle];
    }
    delete this._users[uid];
    delete this._subscriptions[uid];
  }

  offerTo({user, handle}) {
    if (this._incomingOffers[handle]) {
      this._formPartner({user, handle});
      return;
    };
    this._outgoingOffers[handle] = true;
    this.emit('outgoingOffers', this._outgoingOffers);
  }

  getOutgoingOffers() {
    return this._outgoingOffers;
  }

  hasOutgoingOffer(handle) {
    return handle in this._outgoingOffers;
  }

  getIncomingOffers() {
    return this._incomingOffers;
  }

  getUsers() {
    return {...this._users};
  }

  getUserFromHandle(handle) {
    const uid = this._handle2uid[handle];
    return uid && this._users[uid];
  }

  getHandleToUsers() {
    const handle2user = {};
    for (const handle in this._handle2uid) {
      const uid = this._handle2uid[handle];
      handle2user[handle] = this._users[uid];
    }
    return handle2user;
  }

  // Filters (deduplicates) out existing bughouse.app users
  getUnpartnered() {
    return this._unpartnered;
  }

  getPendingOffers() {
    return this._pendingOffers;
  }

  // Filters (deduplicates) out existing bughouse.app users
  getPartners() {
    return this._partners;
  }
}

const singleton = new OnlineUsers(firebase.database());
window.__onlineUsers = singleton;

export default { get() { return singleton; } };
