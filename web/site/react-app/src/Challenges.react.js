import React, {useContext} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import ChallengeSummary from './ChallengeSummary.react';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import { TelnetContext } from './telnet/TelnetProvider';
import { Link } from "@reach/router";

const useStyles = makeStyles((theme) => {
  window.__theme = theme;
  return {
    root: {
      paddingBottom: '40px',
      paddingLeft: '100px',
      paddingRight: '100px'
    },
    paper: {
      padding: '2px 0px',
      textAlign: 'center',
      color: theme.palette.text.primary,
      backgroundColor: '#acccfd',
      width: 'auto',
    },
  };
});

const Challenges = ({challenges, ...rest}) => {
  const {telnet} = useContext(TelnetContext);
  const classes = useStyles();

  const onClick = (e, id) => {
    telnet.send(`accept ${id}`);
    e.preventDefault();
  };

  const challengeComponents = [];
  for (const challengerHandle in challenges) {
    const challenge = challenges[challengerHandle];
    challengeComponents.push(
      <div className="cell">
        <Link
          to="#accept"
          onClick={(e) => { onClick(e, challenge.id || ''); }}
          style={{textDecoration: 'none'}}>
          <Paper className={classes.paper}>
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
    <div style={{overflow: 'scroll', minHeight: '60px', height: '100%'}} >
      <div className="h5 mono" style={{marginLeft: '100px'}} >
        Incoming Challenges
      </div>
      <div className={classes.root}>
        <div className="grid">
          {challengeComponents}
        </div>
      </div>
    </div>
  );
};

export default Challenges;
