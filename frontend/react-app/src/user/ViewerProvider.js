import { EventEmitter } from "events";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "../auth/AuthProvider";
import { SocketContext } from "../socket/SocketProvider";
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

function getViewer(user) {
  return {
    handle: null,
    guest: false,
    firebaseUser: user,
    uid: null,
    fid: user?.uid,
    rating: 0,
    deviation: 0,
  };
}

const ViewerProvider = (props) => {
  const { socket } = useContext(SocketContext); // firebase user
  const { user } = useContext(AuthContext); // firebase user
  const [state, setState] = useState(getViewer(user));

  useEffect(() => {
    if (socket == null) {
      return;
    }
    const onLogin = (data) => {
      setState(data.uid !== state.uid
        ? { ...DEFAULT_CONTEXT, ...data }
        : { ...state, ...data });
    };
    const onLogout = (_) => {
      setState(DEFAULT_CONTEXT);
    };

    socket.on("login", onLogin);
    socket.on("logout", onLogout);
    return () => {
      socket.off("login", onLogin);
      socket.off("logout", onLogout);
    };
  }, [socket, user]);

  return (
    <ViewerContext.Provider value={state}>
      {props.children}
    </ViewerContext.Provider>
  );
};

export default ViewerProvider;
