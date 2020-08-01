import React, {useContext} from 'react';
import Typography from '@material-ui/core/Typography';
import { Link } from "@reach/router";
import User from './User.react';
import { TelnetContext } from './telnet/TelnetProvider';
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

const UnpartneredUser = ({user}) => {
  const {telnet} = useContext(TelnetContext);
  const {onlineUsers, outgoingOffers, pendingOffers, partnerMap} = useContext(UsersContext);
  const {user: viewer} = useContext(AuthContext);
  const {handles: playingHandles} = useContext(GamesListContext);
  const classes = useStyles();
  const viewingFicsHandle = onlineUsers[viewer.uid]?.ficsHandle;
  const {handle} = user;

  const disabled =
    viewingFicsHandle == null ||
    viewingFicsHandle === handle ||
    partnerMap[viewingFicsHandle] != null ||
    partnerMap[handle] != null ||
    playingHandles[viewingFicsHandle] ||
    playingHandles[handle] ||
    handle in outgoingOffers;

  const userComponent = (
    <Paper className={`${disabled ? classes.disabled : ''} ${classes.paper}`}>
      <User user={user} />
    </Paper>
  );

  if (disabled) {
    return userComponent
  }
  const onClick = (e) => {
    telnet.send(`partner ${handle}`);
    OnlineUsers.get().offerTo({uid: viewer.uid, handle});
    e.preventDefault();
  };
  return (
    <Link to="#partner" onClick={onClick} style={{textDecoration: 'none'}}>
      {userComponent}
    </Link>
  );
};

export default UnpartneredUser;
