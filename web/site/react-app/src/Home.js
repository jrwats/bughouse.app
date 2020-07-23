import FicsLogin from './FicsLogin';
import Loading from './Loading';
import Main from './Main';
import React, {useContext} from 'react'
import TelnetProvider, {TelnetContext} from './telnet/TelnetProvider';
import { useNavigate } from "@reach/router";
import {AuthContext} from './auth/AuthProvider';

const HomeRouter = (props) => {
  const {telnet, loggedOut} = useContext(TelnetContext);
  if (telnet == null || loggedOut == null) {
    console.log(`Initializing telnet conn...`);
    return <Loading />;
  } else if (telnet.isLoggedIn()) {
    return <Main />;
  }
  return <FicsLogin />;
}

const Home = (props) => {
  const {user} = useContext(AuthContext);
  const navigate = useNavigate();
  if (user == null) {
    console.log(`Home user is null, navigating to login`);
    navigate('/', true);
    return null;
  }

  return (
    <TelnetProvider user={user}>
      <HomeRouter />
    </TelnetProvider>
  );
};

export default Home;
