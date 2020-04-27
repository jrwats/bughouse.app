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
    const proxy = new TelnetProxy(user);
    console.log(`TelnetProvider.setTelnet`);
    setTelnet(proxy);
    window.__telnet = proxy;
    proxy.on('logging_in', () => {
      setLoggedOut(false);
    });
    proxy.on('login', username => {
      console.log(`TelnetProvider.login(${username})`);
      setUsername(username);
      setLoggedOut(false);
    });
    proxy.on('logout', () => {
      console.log(`TelnetProvider.logout`);
      setUsername(null);
      setLoggedOut(true);
    });
  }, [user]);
  console.log(`TelnetProvider telnet = ${telnet}`);
  return (
    <TelnetContext.Provider value={{telnet, loggedOut, ficsUsername}}>
      {props.children}
    </TelnetContext.Provider>
  );
};

export default TelnetProvider;
