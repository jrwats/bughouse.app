import firebase from 'firebase/app';
import auth from '../auth/firebase-init';
import TelnetProxy from '../telnet/TelnetProxy';

class Presence {

  static init() {
    TelnetProxy.singleton().on('login', ({uid, ficsUsername}) => {
      firebase.database().ref(`users/${uid}/ficsUsername`).set(ficsUsername);
    });

    TelnetProxy.singleton().on('logout', ({uid}) => {
      firebase.database().ref(`users/${uid}/ficsUsername`).set(null);
    });

    auth.onAuthStateChanged(userAuth => {
      console.log('Presence registering presence');
      console.log(`Presence ${userAuth}`);
      if (userAuth == null) {
        return;
      }
      const uid = userAuth.uid;

      // A user can connect from multiple devices/browser tabs. So store each
      // connection instance separately any time that connectionsRef's value is null
      // (i.e. has no children) I am offline
      const db = firebase.database();
      // const connsRef = db.ref(`users/${uid}/connections`);
      const lastOnlineRef = db.ref(`users/${uid}/lastOnline`);
      const connectedRef = db.ref('.info/connected');
      const ficsUsername = db.ref(`users/${uid}/ficsUsername`);
      db.ref(`users/${uid}/displayName`).set(userAuth.displayName);
      db.ref(`users/${uid}/email`).set(userAuth.email);
      db.ref(`users/${uid}/photoURL`).set(userAuth.photoURL);
      const connsRef = db.ref(`online/${uid}/connections`);

      connectedRef.on('value', snap => {
        const isOnline = snap.val();
        console.log(`Setting presence to ${isOnline} for ${uid}`);
        if (isOnline) {
          var con = connsRef.push();
          con.onDisconnect().remove();
          con.set(firebase.database.ServerValue.TIMESTAMP);
          lastOnlineRef.onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
          ficsUsername.onDisconnect().remove();
        }
      });
    })
  }
}

export default Presence;
