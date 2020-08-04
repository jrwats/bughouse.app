import React, {useContext} from 'react';
import Unpartnered from './Unpartnered.react';
import Teams from './Teams.react';
import Offers from './Offers.react';
import GamesList from './GamesList.react';
import Challenges from './Challenges.react';
import { UsersContext } from './user/UsersProvider';
import { ChallengesContext } from './game/ChallengesProvider';

const Bugwho = (props) => {
  const { challenges } = useContext(ChallengesContext);
  const {
    incomingOffers,
    onlineUsers,
    // outgoingOffers,
    partnerMap,
    partners,
    unpartnered,
  } = useContext(UsersContext);

  return (
    <div>
      <Challenges challenges={challenges} />
      <GamesList />
      <Teams {...{partners, onlineUsers, partnerMap}} />
      <Offers {...{unpartnered, incomingOffers}} />
      <Unpartnered unpartnered={unpartnered} />
    </div>
  );

}

export default Bugwho;
