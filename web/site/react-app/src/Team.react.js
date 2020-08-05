import React, {useContext} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Player from './Player.react';
import { TelnetContext } from './telnet/TelnetProvider';
import { Link } from "@reach/router";
import CancelIcon from '@material-ui/icons/Cancel';

const useStyles = makeStyles((theme) => {
  return {
    disabled: {
      opacity: '50%',
      cursor: 'default',
    },

    paper: {
      minWidth: '220px',
      paddingRight: '8px',
      paddingLeft: '4px',
      textAlign: 'center',
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.background.default,
    },
  };
});

const ChallengeUser = ({disabled, user}) => {
  const {telnet} = useContext(TelnetContext);
  const classes = useStyles();
  if (disabled) {
    return <Player className={classes.disabled} player={user} />
  }
  const onClick = (e) => {
    // TODO: Popup modal dialog to set these parameters and THEN send this
    // command
    telnet.send(`match ${user.handle} 5 0 bughouse`);
    e.preventDefault();
  };

  return (
    <Link to="#challenge" onClick={onClick} style={{
      cursor: 'cell',
      textDecoration: 'none'
    }}>
      <Player player={user} />
    </Link>
  );
}

const Team = ({partnerMap, team}) => {
  const {telnet, ficsHandle} = useContext(TelnetContext);
  const classes = useStyles();

  const [player1, player2] = team;

  const cancellable =
    player1.handle === ficsHandle ||
    player2.handle === ficsHandle;
  const disabled = cancellable || !(ficsHandle in partnerMap);


  let cancel = null;
  if (cancellable) {
    const disband = (e) => {
      telnet.send(`partner`);
      e.preventDefault();
    }
    cancel = (
      <div style={{zIndex: 99}}>
        <Link to="#disband"
          className='hoverExpose'
          onClick={disband}
          style={{position: 'relative', top: '4px'}} >
          <CancelIcon style={{color: "red"}} />
      </Link>
    </div>
    );
  }

  return (
    <Paper className={classes.paper}>
      <div className="grid">
        <span style={{flexGrow: 0}}>
          <ChallengeUser disabled={disabled} user={player1} />
          <ChallengeUser disabled={disabled} user={player2} />
        </span>
        <span style={{flexGrow: 0}}>{cancel}</span>
      </div>
    </Paper>
  );
};

export default Team;
