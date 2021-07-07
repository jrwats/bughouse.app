import React, {useEffect, useRef, useContext} from 'react';
import {SocketContext} from './socket/SocketProvider';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import TextField from '@material-ui/core/TextField';
import TextareaAutosize from '@material-ui/core/TextareaAutosize';

const FicsSocketOutput = (props) => {
  const [cmd, setCmd] = React.useState('');
  const {outputLog, telnet} = useContext(SocketContext);
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current != null) {
      console.log('FicsSocketOutput setting scrollTop')
      ref.current.scrollTop = Number.MAX_SAFE_INTEGER;
    } else {
      console.log('FicsSocketOutput ref.current is null');
    }
  });

  const {style} = props;
  return (
    <div style={style}>
      <Grid spacing={1} container >
        <Grid container item>
          <TextareaAutosize
            ref={ref}
            aria-label="console"
            value={outputLog}
            rowsMin={40}
            rowsMax={60}
            style={{
              fontFamily: 'Courier',
              width: '100%',
            }}
            />
        </Grid>
        <Divider orientation="horizontal" flexItem />
        <Grid item>
          <form
            autoComplete="off"
            onSubmit={(event) => {
              telnet.send(cmd);
              setCmd('');
              event.preventDefault();
            }} >
            <KeyboardArrowRightIcon
              style={{paddingTop: '20px', display: 'inline-block'}}/>
            <TextField
                style={{width: '400px'}}
                value={cmd}
                onChange={(e) => { setCmd(e.target.value); } }
                label="Command"
                autoComplete="telnet command"
            />
          </form>
        </Grid>
      </Grid>
    </div>
  );
};

export default FicsSocketOutput;
