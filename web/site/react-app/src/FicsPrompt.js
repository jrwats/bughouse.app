import Divider from '@material-ui/core/Divider';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';

import React, {useContext, useRef} from 'react'
import {TelnetContext} from './telnet/TelnetProvider'

const FicsLoggedIn = () => {
  const {telnet, ficsUsername} = useContext(TelnetContext);
  const ref = useRef();
  const [cmd, setCmd] = React.useState('');

  return (
    <Box style={{paddingLeft: '10px'}}>
      <Grid spacing={1} container>
        <Grid container item>
          <form
            autoComplete="off"
            onSubmit={(event) => {
              console.log('onsubmit');
              telnet.send(cmd);
              setCmd('');
              event.preventDefault();
              // event.stopPropagation();
            }} >
            <KeyboardArrowRightIcon style={{paddingTop: '20px', display: 'inline-block'}}/>
            <TextField
              style={{width: '400px'}}
              ref={ref}
              value={cmd}
              onChange={(e) => { setCmd(e.target.value); } }
              label="Command"
              autoComplete="telnet command"
            />
          </form>
        </Grid>
        <Divider orientation="horizontal" flexItem />
        <Grid item>
          <div>{`Logged in as ${ficsUsername}`}</div>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {telnet.logout()}}>
            Logout
         </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

const FicsLogin = () => {
  const {telnet, loggedOut} = useContext(TelnetContext);
  const usernameRef = useRef();
  const passwordRef = useRef();
  return (
    <form noValidate autoComplete="off">
      <Box style={{maxWidth: '500px'}}>
        <Grid container spacing={2} justify='space-evenly'>
          <Grid item>
            <Grid item >
              <TextField
                ref={usernameRef}
                id="fics_handle"
                autoComplete="username"
                label="FICS username" />
            </Grid>
            <Grid item>
              <TextField
                ref={passwordRef}
                id="standard-password-input"
                label="Password"
                type="password"
                autoComplete="current-password"
              />
            </Grid>
            <Grid item>
              <Button
                style={{marginTop: '10px'}}
                disabled={loggedOut === false}
                variant="contained"
                color="primary"
                onClick={() => {
                  const username = usernameRef.current.querySelector('input').value;
                  const password = passwordRef.current.querySelector('input').value;
                  telnet.login({username, password});
                }} >
                Login
              </Button>
            </Grid>
          </Grid>
          <Grid item>
            <Button
              style={{marginTop: '50px'}}
                disabled={loggedOut === false}
                variant="contained"
                color="primary"
                onClick={() => {telnet.login({username: 'guest'}); }} >
              Login as guest
            </Button>
          </Grid>
        </Grid>
      </Box>
    </form>
  );
};

const FicsPrompt = () => {
  const {telnet, loggedOut} = useContext(TelnetContext);
  console.log(`FicsPrompt loggedOut: ${loggedOut}`);
  if (telnet == null) {
    console.log(`FicsPromp telnet == null`);
    return <div />;
  } else if (telnet.isLoggedIn()) {
    return <FicsLoggedIn />
  }
  console.log(`telnet.isLoggedIn(): ${telnet.isLoggedIn()}`);
  return <FicsLogin />
}

export default FicsPrompt;
