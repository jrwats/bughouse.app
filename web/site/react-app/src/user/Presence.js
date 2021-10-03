import firebase from "firebase/app";
import auth from "../auth/firebase-init";

// TODO
// Delete.  Handle presence server-side (nBughouse ot Firebase DB)
class Presence {
  static init() {
    auth.onAuthStateChanged((userAuth) => {
      // console.log("Presence registering presence");
      // console.log(`Presence ${userAuth}`);
      if (userAuth == null) {
        return;
      }
      const uid = userAuth.uid;

      // A user can connect from multiple devices/browser tabs. So store each
      // connection instance separately any time that connectionsRef's value is null
      // (i.e. has no children) I am offline
      // const db = firebase.database();
      // const connsRef = db.ref(`users/${uid}/connections`);
      //   const lastOnlineRef = db.ref(`users/${uid}/lastOnline`);
      //   const connectedRef = db.ref(".info/connected");
      //   db.ref(`users/${uid}/displayName`).set(userAuth.displayName);
      //   db.ref(`users/${uid}/email`).set(userAuth.email);
      //   db.ref(`users/${uid}/photoURL`).set(userAuth.photoURL);
      //
      //   connectedRef.on("value", (snap) => {
      //     const isOnline = snap.val();
      //     // console.log(`Presence is ${isOnline} for ${uid}`);
      //     if (isOnline) {
      //       lastOnlineRef
      //         .onDisconnect()
      //         .set(firebase.database.ServerValue.TIMESTAMP);
      //     }
      //   });
      // });
    });
  }
}

export default Presence;
