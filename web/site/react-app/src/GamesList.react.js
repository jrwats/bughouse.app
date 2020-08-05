import React, {useContext} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import {GamesListContext} from './game/GamesListProvider';
import Typography from '@material-ui/core/Typography';
import BughouseGameSummary from './BughouseGameSummary.react';

const useStyles = makeStyles((theme) => {
  console.log(theme);
  return {
    paper: {
      padding: theme.spacing(1),
      textAlign: 'center',
      // color: theme.palette.text.primary,
      backgroundColor: '#a0a0b0',
      width: 'auto',
    },
  };
});

const GamesList = (props) => {
  const {games} = useContext(GamesListContext);
  const classes = useStyles();

  return (
    <div style={{overflow: 'scroll', minHeight: '60px', height: '100%'}} >
      <div className="h5 mono leftBuffer">
        Games in progress
      </div>
      <div className="leftPad">
        <div className="grid">
          {games.map(bughouseGame => {
            return (
              <div key={bughouseGame[0].id}>
                <Paper className={classes.paper}>
                  <BughouseGameSummary bughouseGame={bughouseGame} />
                </Paper>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GamesList;
