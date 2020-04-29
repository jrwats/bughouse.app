import React, {useContext} from 'react'

import {AuthContext} from './auth/AuthProvider';

import FicsTelnetOutput from './FicsTelnetOutput';
import FicsPrompt from './FicsPrompt';
import TelnetProvider from './telnet/TelnetProvider';
import AppBar from './AppBar';

const Home = (props) => {
  const {user} = useContext(AuthContext);
  console.log(`Home.user: ${user != null}`);
  return (
    <TelnetProvider user={user}>
      <AppBar />
      <div>
        <FicsTelnetOutput
          // telnet={telnet}
          rowsMin={20}
          rowsMax={40}
          style={{width: '762px'}}
          width={'80px'}
        />
        <FicsPrompt />
      </div>
    </TelnetProvider>
  );
};

export default Home;
