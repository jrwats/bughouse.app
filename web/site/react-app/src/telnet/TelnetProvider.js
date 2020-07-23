import React, {useEffect, createContext, useState} from 'react';
import TelnetProxy from './TelnetProxy';

/**
 * Provide authenticated firebase user as context to child components
 */
export const TelnetContext = createContext({
  telnet: null,
  loggedOut: true,
  ficsUsername: null,
});

const TelnetProvider = (props) => {
  const {user} = props;
  console.log(`TelnetProvider.user ${user.uid}`);
  const [telnet, setTelnet] = useState(null);
  const [ficsUsername, setUsername] = useState(null);
  const [loggedOut, setLoggedOut] = useState(null);

  useEffect(() => {
    console.log(`${Date.now()}: TelnetProvider creating TelnetProxy. ${user.uid}`);
    const proxy = TelnetProxy.get(user);
    console.log(`TelnetProvider.setTelnet`);
    setTelnet(proxy);
    window.__telnet = proxy;
    const onLoggingIn = () => { setLoggedOut(false); };
    const onLogin = ({ficsUsername}) => {
      console.log(`TelnetProvider.login(${ficsUsername})`);
      // firebase.database().ref(`users/${uid}/ficsUsername`).set(username);
      setUsername(ficsUsername);
      setLoggedOut(false);
    };
    const onLogout = () => {
      console.log(`TelnetProvider.logout`);
      setUsername(null);
      setLoggedOut(true);
    };
    proxy.on('logging_in', onLoggingIn);
    proxy.on('login', onLogin);
    proxy.on('logout', onLogout);
    return function() {
      proxy.off('logging_in', onLoggingIn);
      proxy.off('login', onLogin);
      proxy.off('logout', onLogout);
    };
  }, [user]);

  return (
    <TelnetContext.Provider value={{telnet, loggedOut, ficsUsername}}>
      {props.children}
    </TelnetContext.Provider>
  );
};

export default TelnetProvider;
