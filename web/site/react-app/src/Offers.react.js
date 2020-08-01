import React, {useContext} from 'react';
import Users from './Users';
import Unpartnered from './Unpartnered.react';
import Teams from './Teams.react';
import { UsersContext } from './user/UsersProvider';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import UnpartneredUser from './UnpartneredUser.react';

const Offers = (props) => {
  const {unpartnered, incomingOffers} = useContext(UsersContext);
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
      {offerors.map(user => {
        return (
          <Grid key={user.handle} item xs={3}>
            <UnpartneredUser user={user} />
          </Grid>
        );
      })}
    </Grid>
      </div>
      </div>
  );

  return null;
}

export default Offers;
