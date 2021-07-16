import React, {useContext} from 'react';
import Unpartnered from './Unpartnered.react';
import Teams from './Teams.react';
import Offers from './Offers.react';
import GamesList from './GamesList.react';
import Challenges from './Challenges.react';
import { UsersContext } from './user/UsersProvider';
import ChallengesProvider from './game/ChallengesProvider';
import GamesListProvider from './game/GamesListProvider';
import Seeks from './Seeks.react';

const Bugwho = (props) => {
  const {
    incomingOffers,
    onlineUsers,
    // outgoingOffers,
    partnerMap,
    partners,
    unpartnered,
  } = useContext(UsersContext);

  return (
    <GamesListProvider>
      <ChallengesProvider>
        <div>
          {/* <Challenges /> */}
          <GamesList />
          {/* <Teams {...{partners, onlineUsers, partnerMap}} /> */}
          {/* <Offers {...{unpartnered, incomingOffers}} /> */}
          <Unpartnered unpartnered={unpartnered} />

          <Seeks />
        </div>
      </ChallengesProvider>
    </GamesListProvider>
  );

}

export default Bugwho;
