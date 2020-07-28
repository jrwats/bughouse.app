import React, {createContext, useEffect, useState} from 'react';
import auth from "./firebase-init";
import {EventEmitter} from 'events';

class AuthListener extends EventEmitter {

  constructor(auth) {
    super();
    this._user = auth.currentUser;
    this._claims =  {};
    this._pendingInit = true;

    auth.onAuthStateChanged(userAuth => {
      this._user = userAuth;
      this._pendingInit = false;
      console.log(`AuthListener userAuth=${userAuth}`);
      console.log(`AuthListener pendingInit=${this._pendingInit}`);
      if (userAuth != null) {
        userAuth.getIdTokenResult()
          .then(idTokenResult => {
            console.log('AuthListener claims');
            console.log(idTokenResult.claims);
            this._claims = idTokenResult.claims;
            this._notify();
          })
          .catch(err => { console.error(err); });
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
    this.emit('value', {
      user: this._user,
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
  claims: {},
  pendingInit: true,
});
const AuthProvider = (props) => {
  const [pendingInit, setPending] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  const [claims, setClaims] = useState({});

  useEffect(() => {
    const onValue = ({user, pendingInit, claims}) => {
      setUser(user);
      setPending(pendingInit);
      setClaims(claims);
    };
    _singleton.on('value', onValue);

    return () => {
      _singleton.off('value', onValue);
    };
  });

  return (
    <AuthContext.Provider value={{user, claims, pendingInit}}>
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
