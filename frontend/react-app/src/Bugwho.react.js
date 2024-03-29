import React from "react";
// import Unpartnered from "./Unpartnered.react";
// import Teams from "./Teams.react";
// import Offers from "./Offers.react";
import Box from "@mui/material/Box";
import CurrentGames from "./game/CurrentGames.react";
import GamingLanding from "./GamingLanding.react";
import PublicTables from "./PublicTables.react";
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
          <Box p={2}>
            <GamingLanding />
          </Box>
          <Box
            display="flex"
            flexWrap="wrap"
            p={1}
            m={1}
            sx={{ maxWidth: "90vw" }}
          >
            <Box p={1}>
              <OnlinePlayers />
            </Box>
            <Box p={1}>
              <PublicTables />
            </Box>
            <Box p={1}>
              <CurrentGames />
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
