import React from 'react';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import UnpartneredPlayer from './UnpartneredPlayer.react';

const Unpartnered = ({unpartnered}) => {
  const bughouseUsers = [], ficsPlayers = [];
  for (const handle in unpartnered) {
    const player = unpartnered[handle];
    if (player.user != null) {
      bughouseUsers.push(player);
    } else {
      ficsPlayers.push({handle: handle, uid: null, ...player});
    }
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
          {bughouseUsers.concat(ficsPlayers).map(player => {
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
