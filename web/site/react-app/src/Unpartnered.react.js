import React, {useContext} from 'react';
import Grid from '@material-ui/core/Grid';
import Profile from './user/Profile';
import Typography from '@material-ui/core/Typography';
import UnpartneredPlayer from './UnpartneredPlayer.react';
import { makeStyles } from '@material-ui/core/styles';

const Unpartnered = ({unpartnered}) => {
  const players = [];
  for (const handle in unpartnered) {
    const {rating, status} = unpartnered[handle];
    players.push({uid: null, rating, status, handle});
  }

  return (
    <div style={{width: '100%'}}>
      <Typography style={{marginLeft: '100px'}} variant="h5" noWrap>
         Unpartnered Players
      </Typography>
      <div style={{
        paddingLeft: '100px',
        paddingRight: '100px',
        overflow: 'scroll',
        height: '100%'
        }} >
        <Grid container spacing={3}>
          {players.map(player => {
            return (
              <Grid key={player.handle} item xs={3}>
                <UnpartneredPlayer player={player} />
              </Grid>
            );
          })}
        </Grid>
      </div>
    </div>
  );
};

export default Unpartnered;
