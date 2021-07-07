import React, {useEffect, createContext, useRef, useState} from 'react';
import SocketProxy from './SocketProxy';

/**
 * Provide authenticated firebase user as context to child components
 */
export const TelnetContext = createContext({
  telnet: null,
  loggedOut: true,
  handle: null,
  outputLog: '',
});

const normalize = msg => msg.split('\n\r').join('\n')

const TelnetProvider = (props) => {
  const {user} = props;
  const proxy = SocketProxy.get(user);

  const [telnet, setTelnet] = useState(proxy);
  const [handle, setHandle] = useState(proxy.getHandle());
  const [loggedOut, setLoggedOut] = useState(proxy.isLoggedOut());
  const [outputLog, setOutputLog] = useState('');
  const log = useRef('');

  useEffect(() => {
    console.log(`${Date.now()}: TelnetProvider creating SocketProxy. ${user.uid}`);
    const proxy = SocketProxy.get(user);
    console.log(`TelnetProvider.setTelnet`);
    setTelnet(proxy);
    window.__telnet = proxy;
    const onLoggingIn = () => { setLoggedOut(false); };
    const onLogin = ({handle}) => {
      console.log(`TelnetProvider.login(${handle})`);
      setHandle(handle);
      setLoggedOut(false);
    };
    //  logout
    const onLogout = () => {
      console.log(`TelnetProvider.logout`);
      setHandle(null);
      setLoggedOut(true);
    };
    const onData = (data) => {
      log.current += normalize(data);
      setOutputLog(log.current);
      console.log(`log length: ${log.current.length}`);
    }
    // App sign out
    const onDestroy = () => {
      setTelnet(null);
    };
    proxy.on('data', onData);
    proxy.on('logging_in', onLoggingIn);
    proxy.on('login', onLogin);
    proxy.on('logout', onLogout);
    proxy.on('destroy', onDestroy);
    return function() {
      proxy.off('logging_in', onLoggingIn);
      proxy.off('login', onLogin);
      proxy.off('logout', onLogout);
      proxy.off('destroy', onDestroy);
      proxy.off('data', onData);
    };
  }, [user]);

  return (
    <TelnetContext.Provider value={{telnet, loggedOut, handle, outputLog}}>
      {props.children}
    </TelnetContext.Provider>
  );
};

export default TelnetProvider;
