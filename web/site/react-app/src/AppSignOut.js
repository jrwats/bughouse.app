import React, {useContext} from 'react'
import Button from '@material-ui/core/Button';
import firebase from "firebase/app";
import {AuthContext} from './auth/AuthProvider';

const logout = () => {
  console.log('logging out');
  firebase.auth().signOut();
};

const AppSignOut = () => {
  const {user} = useContext(AuthContext);
  return (
    <Button
      style={{marginTop: '50px'}}
      disabled={user == null}
      variant="contained"
      color="primary"
      onClick={logout} >
      Sign out
    </Button>
  );
}

export default AppSignOut;
