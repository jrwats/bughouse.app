import React, {useContext} from 'react';
import { Link } from "@reach/router";
import Player from './Player.react';
import { SocketContext } from './socket/SocketProvider';
import { UsersContext } from './user/UsersProvider';
import { AuthContext } from './auth/AuthProvider';
import { GamesListContext } from './game/GamesListProvider';
import Paper from '@material-ui/core/Paper';
import { makeStyles } from '@material-ui/core/styles';
import OnlineUsers from './user/OnlineUsers';

/**
 * Provides "partner" link action if applicable
 */

const useStyles = makeStyles((theme) => {
  return {
    disabled: {
      opacity: '50%',
      cursor: 'default',
    },
    paper: {
      backgroundColor: theme.palette.background.default,
    }
  };
});

const UnpartneredPlayer = ({player}) => {
  const {outgoingOffers, partnerMap} = useContext(UsersContext);
  const {socket, handle} = useContext(SocketContext);
  const {user: viewer} = useContext(AuthContext);
  const {handles: playingHandles} = useContext(GamesListContext);
  const classes = useStyles();
  if (player == null) {
    debugger;
  }

  const disabled =
    player.handle == null ||
    player.handle === handle ||
    partnerMap[player.handle] != null ||
    partnerMap[player.handle] != null ||
    playingHandles[player.handle] ||
    playingHandles[player.handle] ||
    player.handle in outgoingOffers;

  const userComponent = (
    <Paper elevation={8} className={`${disabled ? classes.disabled : ''} ${classes.paper}`}>
      <Player player={player} />
    </Paper>
  );

  if (disabled) {
    return userComponent
  }
  const onClick = (e) => {
    socket.send(`partner ${handle}`);
    OnlineUsers.get().offerTo({user: viewer, handle});
    e.preventDefault();
  };
  return (
    <Link to="#partner" onClick={onClick} style={{textDecoration: 'none'}}>
      {userComponent}
    </Link>
  );
};

export default UnpartneredPlayer;
