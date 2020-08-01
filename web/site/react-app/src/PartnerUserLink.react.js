import React, {useContext} from 'react';
import Typography from '@material-ui/core/Typography';
import {TelnetContext} from './telnet/TelnetProvider';
import {UsersContext} from './user/UsersProvider';
import {AuthContext} from './auth/AuthProvider';
import {makeStyles} from '@material-ui/core/styles';
import GroupIcon from '@material-ui/icons/Group';
import invariant from 'invariant';

const useStyles = makeStyles((theme) => ({
  handshake: {
    color: theme.palette.background.default,
    width: '18px',
    paddingLeft: '8px',
  },
}));

const PartnerUserLink = ({handle}) => {
  const {telnet, ficsHandle} =  useContext(TelnetContext);
  const {user} = useContext(AuthContext);
  const {viewingUser, onlineUsers, partnerMap} =  useContext(UsersContext);
  const classes = useStyles();
  invariant(ficsHandle === viewingUser.handle);

  if (ficsHandle == null ||
      partnerMap[ficsHandle] != null ||
      partnerMap[handle] != null) {
    return null;
  }

  const onClick = (e) => {
    telnet.send(`partner ${handle}`);
    e.preventDefault();
  }
  return (
    <a onclick={onClick} href="#">
      <GroupIcon />
      {/*
        <img className={classes.handshake} src="/handshake.svg" title="partner" />
      */}
    </a>
  );
};

export default PartnerUserLink;
