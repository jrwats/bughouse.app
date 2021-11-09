import { EventEmitter } from "events";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "../auth/AuthProvider";
import SocketProxy from "../socket/SocketProxy";

const DEFAULT_CONTEXT = {
  deviation: 0,
  fid: null,
  firebaseUser: null,
  handle: null,
  isGuest: false,
  rating: 0,
  uid: null,
};
export const ViewerContext = createContext(DEFAULT_CONTEXT);
let _singleton = null;

class ViewerSingleton extends EventEmitter {
  constructor(user) {
    super();
    this._socket = SocketProxy.get();
    this.onLogin = this._onLogin.bind(this);
    this.onLogout = this._onLogout.bind(this);
    this._socket.on("login", this.onLogin);
    this._socket.on("logout", this.onLogout);
    this._setViewer(user);
  }

  _onLogin(data) {
    if (data.uid !== this._viewer.uid) {
      console.log(`ViewerSingelton new user?`);
      this._viewer = { ...DEFAULT_CONTEXT, ...data };
    }
    this._viewer = { ...this._viewer, ...data };
    this._viewer.isGuest = data.guest;
    this.emit("update", this._viewer);
  }

  _onLogout(data) {
    this._setViewer(DEFAULT_CONTEXT);
  }

  _setViewer(user) {
    this._viewer = {
      handle: null,
      guest: false,
      firebaseUser: user,
      uid: null,
      fid: user?.uid,
      rating: 0,
      deviation: 0,
    };
  }

  getViewer() {
    return this._viewer;
  }

  static get(user) {
    if (_singleton == null) {
      _singleton = new ViewerSingleton(user);
    }
    return _singleton;
  }
}

const ViewerProvider = (props) => {
  const { user } = useContext(AuthContext); // firebase user
  const viewer = ViewerSingleton.get(user);
  const [state, setState] = useState(viewer.getViewer());

  useEffect(() => {
    const onUpdate = (data) => setState(data);
    viewer.on("update", onUpdate);
    return () => {
      viewer.off("update", onUpdate);
    };
  }, [viewer]);

  return (
    <ViewerContext.Provider value={state}>
      {props.children}
    </ViewerContext.Provider>
  );
};

export default ViewerProvider;
