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
      paddingBottom: theme.spacing(1),
      paddingTop: '0px',
      textAlign: 'center',
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.background.default,
      width: 'auto',
    },
  };
});

const ChallengeUser = ({disabled, user, ...rest}) => {
  const {telnet} = useContext(TelnetContext);
  const classes = useStyles();
  if (disabled) {
    return <Player className={classes.disabled} player={user} {...rest} />
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
      <Player player={user} {...rest} />
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
      <div style={{position: 'absolute', zIndex: 99}}>
        <Link to="#disband"
          className='hoverExpose'
          onClick={disband}
          style={{position: 'relative', top: '4px', left: '260px'}} >
          <CancelIcon style={{color: "red"}} />
      </Link>
    </div>
    );
  }
  const style = {display: 'block'};
  return (
    <Paper className={classes.paper}>
      {cancel}
      <ChallengeUser disabled={disabled} user={player1} style={style}/>
      <ChallengeUser disabled={disabled} user={player2} style={style}/>
    </Paper>
  );
};

export default Team;
