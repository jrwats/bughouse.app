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
    this._fics2user = {};
    this._ficsHandles = [];
    this._listeners = {};
    this._subscriptions = {};

    console.log(`OnlineUsers ${Date.now()}`);
    this._db = db;
    const onlineUsers = db.ref('online');

    proxy.on('players', ficsPlayers => {
      const handles = {};
      for (const uid in this._users) {
        handles[this._users[uid].ficsUsername] = 1;
      }
      this._ficsHandles =
        ficsPlayers.filter(({handle}) => !(handle in handles));
      this.emit('ficsOnline', this._ficsHandles);
    });
    onlineUsers.once('value', (snapshot) => {
      console.log(`OnlineUsers online snapshot`);
      this._uids = snapshot.val();
      for (const uid in this._uids) {
        this._listenToUser(uid);
      }
      console.log(this._uids);

      onlineUsers.on('child_added', (data) => {
        console.log(`OnlineUsers online.child_added ${data.key}`);
        this._uids[data.key] = data.val();
        this._users[data.key] = {};
        this._listenToUser(data.key);
        this.emit('value', this._users);
      });
      onlineUsers.on('child_changed', (data) => {
        console.log(`OnlineUsers online.child_changed ${data.key}`);
        this._uids[data.key] = data.val();
      });
      onlineUsers.on('child_removed', (data) => {
        console.log(`OnlineUsers online.child_removed ${data.key}`);
        this._unsubscribeFromUser(data.key);
        this.emit('value', this._users);
      });
    });
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
        console.log(`OnlineUsers user.child_added ${data.key}`);
        if (this._users[uid] != null) {
          this._users[uid][data.key] = data.val();
          this.emit('value', this._users);
        }
      });
      this._listen(user, 'child_changed', (data) => {
        console.log(`OnlineUsers user.child_changed ${data.key}`);
        if (this._users[uid] != null) {
          this._users[uid][data.key] = data.val();
        }
        this.emit('value', this._users);
      });
      this._listen(user, 'child_removed', (data) => {
        console.log(`OnlineUsers user.child_removed ${data.key}`);
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
      this._db.ref(refKey).off(this._listeners[refKey][eventName])
    }
    delete this._users[uid];
    delete this._subscriptions[uid];
  }

  getUsers() {
    return {...this._users};
  }

  // Filters (deduplicates) out existing bughouse.app users
  getFicsHandles() {
    return this._ficsHandles;
  }
}

const singleton = new OnlineUsers(firebase.database());

export default { get() { return singleton; } };
