import FicsLogin from './FicsLogin';
import Loading from './Loading';
import Main from './Main';
import React, {useContext} from 'react'
import TelnetProvider, {TelnetContext} from './telnet/TelnetProvider';
import UsersProvider from './user/UsersProvider';
import { useNavigate } from "@reach/router";
import {AuthContext} from './auth/AuthProvider';

const HomeRouter = (props) => {
  const {telnet} = useContext(TelnetContext);
  if (telnet == null || !telnet.isInitialized()) {
    console.log(`HomeRouter initializing telnet ${telnet}`);
    return <Loading path="loading" />;
  } else if (telnet.isLoggedIn()) {
    console.log('HomeRouter isLogged in rendering main...');
    return <Main path="/" />;
  }
  console.log('rendering FICS login...');
  return <FicsLogin path="fics_login" />;
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
      <UsersProvider>
        <HomeRouter />
      </UsersProvider>
    </TelnetProvider>
  );
};

export default Home;
