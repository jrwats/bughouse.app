import React, { useEffect, createContext, useRef, useState } from "react";
import SocketProxy from "./SocketProxy";

/**
 * Provide authenticated firebase user as context to child components
 */
export const SocketContext = createContext({
  socket: null,
  loggedOut: true,
  handle: null,
  outputLog: "",
});

const normalize = (msg) => msg.split("\n\r").join("\n");

const SocketProvider = (props) => {
  const { user } = props;
  const proxy = SocketProxy.get();

  const [socket, setSocket] = useState(proxy);
  const [handle, setHandle] = useState(proxy.getHandle());
  const [loggedOut, setLoggedOut] = useState(proxy.isLoggedOut());
  const [outputLog, setOutputLog] = useState("");
  const log = useRef("");

  useEffect(() => {
    console.log(
      `${Date.now()}: SocketProvider creating SocketProxy. ${user?.uid}`
    );
    const proxy = SocketProxy.get();
    proxy.setUser(user);
    console.log(`SocketProvider.setSocket`);
    setSocket(proxy);
    window.__socket = proxy;
    const onLoggingIn = () => {
      setLoggedOut(false);
    };
    const onLogin = ({ handle }) => {
      console.log(`SocketProvider.login(${handle})`);
      setHandle(handle);
      setLoggedOut(false);
    };
    //  logout
    const onLogout = () => {
      console.log(`SocketProvider.logout`);
      setHandle(null);
      setLoggedOut(true);
    };
    const onData = (data) => {
      log.current += normalize(data);
      setOutputLog(log.current);
      console.log(`log length: ${log.current.length}`);
    };
    // App sign out
    const onDestroy = () => {
      setSocket(null);
    };
    proxy.on("data", onData);
    proxy.on("logging_in", onLoggingIn);
    proxy.on("login", onLogin);
    proxy.on("logout", onLogout);
    proxy.on("destroy", onDestroy);
    return function () {
      proxy.off("logging_in", onLoggingIn);
      proxy.off("login", onLogin);
      proxy.off("logout", onLogout);
      proxy.off("destroy", onDestroy);
      proxy.off("data", onData);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, loggedOut, handle, outputLog }}>
      {props.children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
