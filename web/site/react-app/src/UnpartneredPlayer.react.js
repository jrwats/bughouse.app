import React, {useContext} from 'react';
import { Link } from "@reach/router";
import Player from './Player.react';
import { TelnetContext } from './socket/TelnetProvider';
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
  const {telnet, ficsHandle} = useContext(TelnetContext);
  const {user: viewer} = useContext(AuthContext);
  const {handles: playingHandles} = useContext(GamesListContext);
  const classes = useStyles();
  if (player == null) {
    debugger;
  }
  const {handle} = player;

  const disabled =
    ficsHandle == null ||
    ficsHandle === handle ||
    partnerMap[ficsHandle] != null ||
    partnerMap[handle] != null ||
    playingHandles[ficsHandle] ||
    playingHandles[handle] ||
    handle in outgoingOffers;

  const userComponent = (
    <Paper elevation={8} className={`${disabled ? classes.disabled : ''} ${classes.paper}`}>
      <Player player={player} />
    </Paper>
  );

  if (disabled) {
    return userComponent
  }
  const onClick = (e) => {
    telnet.send(`partner ${handle}`);
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
