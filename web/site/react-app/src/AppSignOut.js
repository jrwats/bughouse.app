import React, {useContext} from 'react'
import Button from '@material-ui/core/Button';
import firebase from "firebase/app";
import {AuthContext} from './auth/AuthProvider';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';

const logout = () => {
  console.log('logging out');
  firebase.auth().signOut().then(() => {
    console.log('firebase signed out');
  }).catch((err) => {
    console.error(err);
  });
};

const AppSignOut = () => {
  const {user} = useContext(AuthContext);
  return (
    <Button
      disabled={user == null}
      variant="contained"
      color="primary"
      onClick={logout} >
      <ExitToAppIcon style={{paddingRight: '10px'}}/>
      Sign out
    </Button>
  );
}

export default AppSignOut;
