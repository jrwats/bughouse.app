import React from 'react';
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
      <div className="h5 mono leftBuffer">
        Incoming Partner Offers
      </div>
      <div className="leftPad">
        <div className="grid">
          {offerors.map(player => {
            return (
              <div key={player.handle} className="cell">
                <UnpartneredPlayer player={player} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

}

export default Offers;
