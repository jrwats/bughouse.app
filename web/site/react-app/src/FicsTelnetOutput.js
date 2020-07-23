import React, {useRef, useContext, useEffect, useState} from 'react';
import {TelnetContext} from './telnet/TelnetProvider';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import TextField from '@material-ui/core/TextField';
import TextareaAutosize from '@material-ui/core/TextareaAutosize';

const normalize = msg => msg.split('\n\r').join('\n')

const WAITING = 'Waiting to connect to freechess.org...';
const CONNECTED = 'Connected to freechess.org';

const FicsTelnetOutput = (props) => {
  const [output, setOutput] = useState('Waiting to connect to freechess.org...');
  const [cmd, setCmd] = React.useState('');
  const {telnet, ficsUsername} = useContext(TelnetContext);
  const log = useRef(ficsUsername == null ? WAITING : CONNECTED);
  const ref = useRef(null);

  useEffect(() => {
    console.log(`FicsTelnetOutput.telnet: ${telnet}`);
    if (telnet == null) {
      console.log(`FicsTelnetOutput telnet == null`);
      return;
    }
    if (log.current === WAITING) {
      log.current = CONNECTED;
      setOutput(log.current);
    }
    console.log(`FicsTelnetOutput subscribing to ${telnet}`);
    telnet.on('data', msg => {
      // console.log(`FicsTelnetOutput.on('data')`);
      log.current += normalize(msg);
      setOutput(log.current);
      if (ref.current != null) {
        ref.current.scrollTop = Number.MAX_SAFE_INTEGER;
      }
    });
  }, [telnet]);

  const {style, ...forwardProps} = props;
  return (
    <div style={style}>
      <Grid spacing={1} container >
        <Grid container item>
          <TextareaAutosize
            ref={ref}
            aria-label="console"
            value={output}
            style={{fontFamily: 'Courier', scrollTop: Number.MAX_SAFE_INTEGER}}
            scrolltop={Number.MAX_SAFE_INTEGER}
            {...forwardProps}
            />
        </Grid>
        <Divider orientation="horizontal" flexItem />
        <Grid item>
          <KeyboardArrowRightIcon
            style={{paddingTop: '20px', display: 'inline-block'}}/>
          <TextField
              style={{width: '400px'}}
              ref={ref}
              value={cmd}
              onChange={(e) => { setCmd(e.target.value); } }
              label="Command"
              autoComplete="telnet command"
        />
        </Grid>
      </Grid>
    </div>
  );
};

export default FicsTelnetOutput;
