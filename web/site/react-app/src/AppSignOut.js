import React, {useContext} from 'react'
import Button from '@material-ui/core/Button';
import {AuthContext} from './auth/AuthProvider';
import {TelnetContext} from './telnet/TelnetProvider';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import logout from './logout';

const AppSignOut = () => {
  const {user} = useContext(AuthContext);
  const {telnet} = useContext(TelnetContext);
  return (
    <Button
      disabled={user == null}
      variant="contained"
      color="primary"
      onClick={(e) => {logout(telnet); }} >
      <ExitToAppIcon style={{paddingRight: '10px'}}/>
      Sign out
    </Button>
  );
}

export default AppSignOut;
