import React, {useEffect, createContext, useRef, useState} from 'react';
import TelnetProxy from './TelnetProxy';

/**
 * Provide authenticated firebase user as context to child components
 */
export const TelnetContext = createContext({
  telnet: null,
  loggedOut: true,
  ficsHandle: null,
  outputLog: '',
});

const normalize = msg => msg.split('\n\r').join('\n')

const TelnetProvider = (props) => {
  const {user} = props;
  const proxy = TelnetProxy.get(user);

  const [telnet, setTelnet] = useState(proxy);
  const [ficsHandle, setHandle] = useState(proxy.getHandle());
  const [loggedOut, setLoggedOut] = useState(proxy.isLoggedOut());
  const [outputLog, setOutputLog] = useState('');
  const log = useRef('');

  useEffect(() => {
    console.log(`${Date.now()}: TelnetProvider creating TelnetProxy. ${user.uid}`);
    const proxy = TelnetProxy.get(user);
    console.log(`TelnetProvider.setTelnet`);
    setTelnet(proxy);
    window.__telnet = proxy;
    const onLoggingIn = () => { setLoggedOut(false); };
    const onLogin = ({ficsHandle}) => {
      console.log(`TelnetProvider.login(${ficsHandle})`);
      setHandle(ficsHandle);
      setLoggedOut(false);
    };
    const onLogout = () => {
      console.log(`TelnetProvider.logout`);
      setHandle(null);
      setLoggedOut(true);
    };
    const onData = (output) => {
      log.current += normalize(output);
      setOutputLog(log.current);
      console.log(`log length: ${log.current.length}`);
    }
    proxy.on('data', onData);
    proxy.on('logging_in', onLoggingIn);
    proxy.on('login', onLogin);
    proxy.on('logout', onLogout);
    return function() {
      proxy.off('logging_in', onLoggingIn);
      proxy.off('login', onLogin);
      proxy.off('logout', onLogout);
      proxy.off('data', onData);
    };
  }, [user]);

  return (
    <TelnetContext.Provider value={{telnet, loggedOut, ficsHandle, outputLog}}>
      {props.children}
    </TelnetContext.Provider>
  );
};

export default TelnetProvider;
