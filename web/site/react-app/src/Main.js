import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import React, {useContext} from 'react'
import {TelnetContext} from './telnet/TelnetProvider'

const Main = () => {
  const {telnet, ficsUsername} = useContext(TelnetContext);
  const [cmd, setCmd] = React.useState('');
  console.log(`main component! ${ficsUsername}`);

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
            }} >
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

export default Main;
