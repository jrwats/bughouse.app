import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "../auth/AuthProvider";
import { SocketContext } from "../socket/SocketProvider";

export const ViewerContext = createContext({
  fid: null,
  handle: null,
  isGuest: false,
  uid: null,
  firebaseUser: null,
});

const ViewerProvider = (props) => {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext); // firebase user

  const [state, setState] = useState({
    handle: null,
    isGuest: false,
    firebaseUser: user,
    uid: null,
    fid: user?.uid,
    rating: 0,
    deviation: 0,
  });

  useEffect(() => {
    const onLogin = ({fid, handle, isGuest, uid, rating, deviation}) => {
      setState({
        ...state,
        fid,
        handle,
        isGuest,
        uid,
        rating,
        deviation,
      });
    };

    socket && socket.on("login", onLogin);  
    return () => {
      socket && socket.off("login", onLogin);
    };
  }, [socket]);

  return (
    <ViewerContext.Provider value={state}>
      {props.children}
    </ViewerContext.Provider>
  );
};

export default ViewerProvider;
