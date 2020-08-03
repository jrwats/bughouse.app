import React, {useContext} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Profile from './user/Profile';
import User from './User.react';
import Team from './Team.react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

const useStyles = makeStyles((theme) => {
  console.log(theme);
  return {
    root: {
      flexGrow: 1,
      padding: '20px 100px 20px 100px',
      bottom: '40px',
    },
  };
});

const Teams = ({onlineUsers, partnerMap, partners, ...rest}) => {
  const classes = useStyles();

  return (
    <div style={{overflow: 'scroll', minHeight: '60px', height: '100%'}} >
      <div>
        <Typography style={{marginLeft: '100px'}} variant="h5" noWrap>
           Teams
        </Typography>
      </div>
      <div className={classes.root}>
        <Grid container spacing={3}>
          {partners.map(pair => {
            return (
              <Grid item key={pair[0].handle} xs={3}>
                <Team team={pair} {...{onlineUsers, partnerMap, partners}}/>
              </Grid>
            );
          })}
        </Grid>
      </div>
    </div>
  );
};

export default Teams;
