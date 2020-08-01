import React, {useContext} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {ChallengesContext} from './game/ChallengesProvider';
import ChallengeSummary from './ChallengeSummary.react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import { TelnetContext } from './telnet/TelnetProvider';
import { UsersContext } from './user/UsersProvider';
import { Link } from "@reach/router";

const useStyles = makeStyles((theme) => {
  window.__theme = theme;
  return {
    root: {
      flexGrow: 1,
      paddingBottom: '40px',
      paddingLeft: '100px',
      paddingRight: '100px'
    },
    paper: {
      padding: theme.spacing(1),
      textAlign: 'center',
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.info.light,
      width: 'auto',
    },
  };
});

const Challenges = ({props}) => {
  const {telnet} = useContext(TelnetContext);
  const {challenges} = useContext(ChallengesContext)
  console.log(`Challenges.react ${JSON.stringify(challenges)}`);
  const classes = useStyles();

  const onClick = (e, id) => {
    telnet.send(`accept ${id}`);
    e.preventDefault();
  };

  const challengeComponents = [];
  for (const challengerHandle in challenges) {
    const challenge = challenges[challengerHandle];
    challengeComponents.push(
      <Grid key={challenge.id || challengerHandle} item xs={5}>
        <Link
          to="#accept"
          onClick={(e) => { onClick(e, challenge.id || ''); }}
          style={{textDecoration: 'none'}}>
          <Paper className={classes.paper}>
            <ChallengeSummary challenge={challenge} />
          </Paper>
        </Link>
      </Grid>
    );
  }
  if (challengeComponents.length === 0) {
    return null;
  }

  return (
    <div style={{overflow: 'scroll', minHeight: '60px', height: '100%'}} >
      <div>
        <Typography style={{marginLeft: '100px'}} variant="h5" noWrap>
           Incoming Challenges
        </Typography>
      </div>
      <div className={classes.root}>
        <Grid container spacing={3}>
          {challengeComponents}
        </Grid>
      </div>
    </div>
  );
};

export default Challenges;
