import React from "react";
// import Unpartnered from "./Unpartnered.react";
// import Teams from "./Teams.react";
// import Offers from "./Offers.react";
import GamingLanding from "./GamingLanding.react";
import Grid from '@material-ui/core/Grid';
// import GamesList from "./GamesList.react";
// import Challenges from "./Challenges.react";
import UsersProvider from "./user/UsersProvider";
import OnlinePlayers from "./user/OnlinePlayers.react";
import ChallengesProvider from "./game/ChallengesProvider";
import GamesListProvider from "./game/GamesListProvider";


const Bugwho = (props) => {
  // const {
  //   incomingOffers,
  //   onlineUsers,
  //   outgoingOffers,
  //   partnerMap,
  //   partners,
  //   unpartnered,
  // } = useContext(UsersContext);

  return (
    <UsersProvider>
      <GamesListProvider>
        <ChallengesProvider>
          <div style={{}}>
            <Grid container spacing={1}>
              <Grid item alignItems="center" spacing={1} xs={3}>
                <OnlinePlayers />
              </Grid>
              <Grid item  spacing={1} xs={8}>
                <GamingLanding />
              </Grid>
            </Grid>
            {/* <Challenges /> */}
            {/* <GamesList /> */}
            {/* <Teams {...{partners, onlineUsers, partnerMap}} /> */}
            {/* <Offers {...{unpartnered, incomingOffers}} /> */}
            {/* <Unpartnered unpartnered={unpartnered} /> */}
          </div>
        </ChallengesProvider>
      </GamesListProvider>
    </UsersProvider>
  );
};

export default Bugwho;
