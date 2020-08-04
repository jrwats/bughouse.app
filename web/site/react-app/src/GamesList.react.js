import React, {useContext} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import {GamesListContext} from './game/GamesListProvider';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import BughouseGameSummary from './BughouseGameSummary.react';

const useStyles = makeStyles((theme) => {
  console.log(theme);
  return {
    root: {
      flexGrow: 1,
      paddingBottom: '40px',
      paddingLeft: '100px',
      paddingRight: '100px'
    },
    paper: {
      padding: theme.spacing(2),
      textAlign: 'center',
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.background.default,
      width: 'auto',
    },
  };
});

const GamesList = (props) => {
  const {games} = useContext(GamesListContext);
  const classes = useStyles();

  return (
    <div style={{overflow: 'scroll', minHeight: '60px', height: '100%'}} >
      <div>
        <Typography style={{marginLeft: '100px'}} variant="h5" noWrap>
           Games in progress
        </Typography>
      </div>
      <div className={classes.root}>
        <Grid container spacing={3}>
          {games.map(bughouseGame => {
            return (
              <Grid key={bughouseGame[0].id} item xs={5}>
                <Paper className={classes.paper}>
                  <BughouseGameSummary bughouseGame={bughouseGame} />
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </div>
    </div>
  );
};

export default GamesList;
