import React from "react";
// import Unpartnered from "./Unpartnered.react";
// import Teams from "./Teams.react";
// import Offers from "./Offers.react";
import Box from "@material-ui/core/Box";
import GamingLanding from "./GamingLanding.react";
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
          {/* <div style={{flexGrow: 1}}> */}
          <Box
            display="flex"
            flexWrap="wrap"
            p={1}
            m={1}
            sx={{ maxWidth: "3em" }}
          >
            {/* <Grid container spacing={1}> */}
            <Box p={1}>
              {/* <Grid item alignItems="center" spacing={1} xs={4}> */}
              <OnlinePlayers />
              {/* </Grid> */}
            </Box>
            <Box p={1}>
              {/* <Grid item  spacing={1} xs={3}> */}
              <GamingLanding />
              {/* </Grid> */}
            </Box>
          </Box>
          {/* </Grid> */}
          {/* <Challenges /> */}
          {/* <GamesList /> */}
          {/* <Teams {...{partners, onlineUsers, partnerMap}} /> */}
          {/* <Offers {...{unpartnered, incomingOffers}} /> */}
          {/* <Unpartnered unpartnered={unpartnered} /> */}
          {/* </div> */}
        </ChallengesProvider>
      </GamesListProvider>
    </UsersProvider>
  );
};

export default Bugwho;
