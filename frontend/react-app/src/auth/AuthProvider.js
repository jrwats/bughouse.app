import React, { createContext, useEffect, useState } from "react";
import auth from "./firebase-init";
import { onAuthStateChanged } from "firebase/auth";
import { EventEmitter } from "events";

function needsEmailVerification(user) {
  const needsPass = ({ providerId }) => providerId === "password";
  return (
    user &&
    user.providerData.filter(needsPass).length >= 1 &&
    !user.emailVerified
  );
}

function getFakeUser(fid) {
  return fid == null ? null : {
    getIdToken: (_refresh) => {
      return new Promise((resolve, reject) => {
        resolve(fid);
      });
    },
    fid,
    providerData: [],
    fake: true,
  };
}

const getUser = (auth) =>
  (auth.currentUser || getFakeUser(localStorage.getItem(FAKE_KEY)));

const FAKE_KEY = "__fakeFID";
class _AuthListener extends EventEmitter {
  constructor(auth) {
    super();
    this._user = getUser(auth);
    this._claims = {};
    this._pendingInit = true;
    this._needsEmailVerified = needsEmailVerification(this._user);
    console.log(`needsEmailVerification: ${this._needsEmailVerified}`);
    onAuthStateChanged(auth, userAuth => this.onAuth(userAuth));
  }

  onAuth(userAuth) {
    console.log(`AuthListener.onAuthStateChanged: ${userAuth}`);
    this._user = userAuth || getFakeUser(localStorage.getItem(FAKE_KEY));
    this._needsEmailVerified = needsEmailVerification(userAuth);
    console.log(`needsEmailVerification: ${this._needsEmailVerified}`);
    this._pendingInit = false;
    if (userAuth != null) {
      userAuth
        .getIdTokenResult()
        .then((idTokenResult) => {
          this._claims = idTokenResult.claims;
          this._notify();
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      this._claims = {};
    }
    this._notify();
  }

  _notify() {
    this.emit("value", {
      user: this._user,
      needsEmailVerified: this._needsEmailVerified,
      pendingInit: this._pendingInit,
      claims: this._claims,
    });
  }

  __testSetFirebaseID(fid) {
    localStorage.setItem(FAKE_KEY, fid);
    this._user = getFakeUser(fid);
    this._notify();
  }
}

const _singleton = new _AuthListener(auth);

export const AuthListener = {
  get: () => _singleton,
  __testSetFirebaseID: (fid) => {
    _singleton.__testSetFirebaseID(fid);
  },
  __clearFakeFirebaseID: () => {
    localStorage.removeItem(FAKE_KEY);
    _singleton.onAuth(null);
  },
};

/**
 * Provide authenticated firebase user as context to child components
 */
export const AuthContext = createContext({
  auth,
  user: getUser(auth),
  needsEmailVerified: false,
  claims: {},
  pendingInit: true,
});
const AuthProvider = (props) => {
  const [pendingInit, setPending] = useState(true);
  const [user, setUser] = useState(getUser(auth));
  const [needsEmailVerified, setEmailVerified] = useState(
    needsEmailVerification(auth.currentUser)
  );
  const [claims, setClaims] = useState({});

  useEffect(() => {
    const onValue = ({ user, needsEmailVerified, pendingInit, claims }) => {
      setUser(user);
      setPending(pendingInit);
      setEmailVerified(needsEmailVerified);
      setClaims(claims);
    };
    _singleton.on("value", onValue);

    return () => {
      _singleton.off("value", onValue);
    };
  });

  return (
    <AuthContext.Provider
      value={{ auth, user, claims, needsEmailVerified, pendingInit }}
    >
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
