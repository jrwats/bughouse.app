import React, {useRef, useContext, useEffect, useState} from 'react';
import {TelnetContext} from './telnet/TelnetProvider';
import TextareaAutosize from '@material-ui/core/TextareaAutosize';

const normalize = msg => msg.split('\n\r').join('\n')

const WAITING = 'Waiting to connect to freechess.org...';
const CONNECTED = 'Connected to freechess.org';

const FicsTelnetOutput = (props) => {
  const [output, setOutput] = useState('Waiting to connect to freechess.org...');
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
    console.warn(`FicsTelnetOutput subscribing to ${telnet}`);
    telnet.on('data', msg => {
      // console.log(`FicsTelnetOutput.on('data')`);
      log.current += normalize(msg);
      setOutput(log.current);
      if (ref.current != null) {
        ref.current.scrollTop = Number.MAX_SAFE_INTEGER;
      }
    });
  }, [telnet]);

  let forwardProps = {...props};
  const style = {
    fontFamily: 'Courier',
    scrollTop: Number.MAX_SAFE_INTEGER,
    ...forwardProps.style,
  };
  delete forwardProps.style;
  return (
    <TextareaAutosize
      ref={ref}
      aria-label="console"
      value={output}
      style={style}
      scrolltop={Number.MAX_SAFE_INTEGER}
      {...forwardProps}
      />
  );
};

export default FicsTelnetOutput;
