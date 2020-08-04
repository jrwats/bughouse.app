import React from 'react';
import FiberManualRecordTwoToneIcon from '@material-ui/icons/FiberManualRecordTwoTone';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  ready: {
    color: 'green'
  },
  examining: {
    color: 'orange'
  },
  runningSimul: {
    color: '#030303',
  },
  playingTournament: {
    color: '#ccccff',
  },
  playingGame: {
    color: 'blue'
  },
  inactiveOrBusy: {
    color: 'red'
  },
  notOpen: {
    color: '#ff00ff'
  },
}));

const status2Class = {
  ' ': 'ready',             // not busy
  '#': 'examining',         // examining a game
  '~': 'runningSimul',      // running a simul match
  '&': 'playingTournament', // involved in a tournament
  '^': 'playingGame',       // involved in a game
  '.': 'inactiveOrBusy',    // . inactive for 5 minutes or longer, or if "busy" is set
  ':': 'notOpen',           // not open for a match
};

const status2Alt = {
  ' ': 'Ready',
  '#': 'Examining a game',
  '~': 'Running a simul',
  '&': 'Playing a tournament',
  '^': 'Playing a game',
  '.': 'Inactive or busy',
  ':': 'Not open for play',
};

const Status = ({status, style}) => {
  const classes = useStyles();
  if (status == null) {
    return null;
  }
  return (
    <FiberManualRecordTwoToneIcon
      alt={status2Alt[status]}
      title={status2Alt[status]}
      className={classes[status2Class[status]]}
      style={style}
    />
  );
};

export default Status;
