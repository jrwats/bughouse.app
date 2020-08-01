import React, {useContext} from 'react';
import Users from './Users';
import Unpartnered from './Unpartnered.react';
import Teams from './Teams.react';
import Offers from './Offers.react';
import GamesList from './GamesList.react';
import Challenges from './Challenges.react';

const Bugwho = (props) => {
  return (
    <div>
      <Challenges />
      <GamesList />
      <Teams />
      <Offers />
      <Users />
      <Unpartnered />
    </div>
  );

}

export default Bugwho;
