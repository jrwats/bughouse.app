import React, { createContext, useEffect, useState } from "react";
import auth from "./firebase-init";
import { EventEmitter } from "events";

function needsEmailVerification(user) {
  const nonPass = ({ providerId }) => providerId !== "password";
  return (
    user &&
    user.providerData.filter(nonPass).length === 0 &&
    !user.emailVerified
  );
}

class AuthListener extends EventEmitter {
  constructor(auth) {
    super();
    this._user = auth.currentUser;
    this._claims = {};
    this._pendingInit = true;
    this._needsEmailVerified = needsEmailVerification(this._user);

    auth.onAuthStateChanged((userAuth) => {
      this._user = userAuth;
      this._needsEmailVerified = needsEmailVerification(userAuth);
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
    });
  }

  getUser() {
    return this._user;
  }

  getPendingInit() {
    return this._pendingInit;
  }

  getClaims() {
    return this._claims;
  }

  _notify() {
    this.emit("value", {
      user: this._user,
      needsEmailVerified: this._needsEmailVerified,
      pendingInit: this._pendingInit,
      claims: this._claims,
    });
  }
}

const _singleton = new AuthListener(auth);

/**
 * Provide authenticated firebase user as context to child components
 */
export const AuthContext = createContext({
  user: auth.currentUser,
  needsEmailVerified: false,
  claims: {},
  pendingInit: true,
});
const AuthProvider = (props) => {
  const [pendingInit, setPending] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
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
      value={{ user, claims, needsEmailVerified, pendingInit }}
    >
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
