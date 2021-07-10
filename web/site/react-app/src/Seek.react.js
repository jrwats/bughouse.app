import React, {useContext} from 'react';
import Button from '@material-ui/core/Button';
import { SocketContext } from './socket/SocketProvider';

const Seek = () => {
  const {socket} = useContext(SocketContext);

  return (
    <Button
      style={{marginTop: '10px'}}
      variant="contained"
      color="primary"
      onClick={() => { 
        socket.sendEvent('seek', {time: "3|0"}); 
      }} >
      Seek 3|0
    </Button>
  );
};

export default Seek;
