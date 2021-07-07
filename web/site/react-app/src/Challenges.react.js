import React, {useEffect, useContext} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import ChallengeSummary from './ChallengeSummary.react';
import Paper from '@material-ui/core/Paper';
import { SocketContext } from './socket/SocketProvider';
import { Link } from "@reach/router";
import { EventEmitter } from 'events';
import { ChallengesContext } from './game/ChallengesProvider';

const useStyles = makeStyles((theme) => {
  window.__theme = theme;
  return {
    paper: {
      padding: '2px 0px',
      textAlign: 'center',
      color: theme.palette.text.primary,
      backgroundColor: '#303030',
      width: 'auto',
    },
  };
});

class Ticker extends EventEmitter {
  tick() { this.emit('tick'); }
}
const _ticker = new Ticker();
setInterval(() => { _ticker.tick(); }, 5000);

const Challenges = () => {
  const {socket} = useContext(SocketContext);
  const {challenges} = useContext(ChallengesContext);
  const classes = useStyles();

  const onClick = (e, id) => {
    socket.send(`accept ${id}`);
    e.preventDefault();
  };
  useEffect(() => {
    const onTick = () => {
      console.log(`Challenges requesting 'pending'`);
      socket.sendEvent('pending');
    };
    _ticker.on('tick', onTick);
    return () => { _ticker.off('tick', onTick); };
  }, [socket]);
  const challengeComponents = [];
  for (const challengerHandle in challenges) {
    const challenge = challenges[challengerHandle];
    challengeComponents.push(
      <div key={challengerHandle} className="cell">
        <Link
          to="#accept"
          onClick={(e) => { onClick(e, challenge.id || ''); }}
          style={{textDecoration: 'none'}}>
          <Paper elevation={8}className={classes.paper}>
            <ChallengeSummary challenge={challenge} />
          </Paper>
        </Link>
      </div>
    );
  }
  if (challengeComponents.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="h5 mono leftBuffer">
        Incoming Challenges
      </div>
      <div className="leftPad">
        <div className="grid">
          {challengeComponents}
        </div>
      </div>
    </div>
  );
};

export default Challenges;
