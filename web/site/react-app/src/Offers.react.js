import React, {useContext} from 'react';
import Unpartnered from './Unpartnered.react';
import Teams from './Teams.react';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import UnpartneredPlayer from './UnpartneredPlayer.react';

const Offers = ({unpartnered, incomingOffers}) => {
  const offerors = [];
  for (const handle in incomingOffers) {
    if (!(handle in unpartnered)) {
      console.error(`${handle} is already partnered?!`);
      console.error(unpartnered)
      continue;
    }
    offerors.push(unpartnered[handle]);
  }
  if (offerors.length === 0) {
    return null;
  }
  console.log(`Offers ${Object.keys(incomingOffers).length}`);
  return (
    <div style={{width: '100%'}}>
      <Typography style={{marginLeft: '100px'}} variant="h5" noWrap>
        Incoming Partner Offers
      </Typography>
      <div style={{
        paddingLeft: '100px',
        paddingRight: '100px',
        overflow: 'scroll',
        height: '100%'
      }} >
        <Grid container spacing={3}>
          {offerors.map(player => {
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

}

export default Offers;
