import Button from "@material-ui/core/Button";
import React, { useState } from "react";
// import Unpartnered from "./Unpartnered.react";
// import Teams from "./Teams.react";
// import Offers from "./Offers.react";
import FormGame from "./FormGame.react";
// import GamesList from "./GamesList.react";
// import Challenges from "./Challenges.react";
// import { UsersContext } from "./user/UsersProvider";
import ChallengesProvider from "./game/ChallengesProvider";
import GamesListProvider from "./game/GamesListProvider";
import Seeks from "./Seeks.react";

const ActionExpansion = {
  NONE: 0,
  SEEKS: 1,
  FORM_GAME: 2,
};

function getExpansionDisplay(expansion, setExpansion) {
  const onCancel = () => setExpansion(ActionExpansion.None);
  if (expansion === ActionExpansion.SEEKS) {
    return <Seeks onCancel={onCancel} />;
  } else if (expansion === ActionExpansion.FORM_GAME) {
    return <FormGame onCancel={onCancel} />;
  }
  return (
    <>
      <div>
        <Button
          style={{ marginTop: "10px" }}
          variant="contained"
          color="primary"
          onClick={() => {
            setExpansion(ActionExpansion.SEEKS);
          }}
        >
          Seek Game
        </Button>
      </div>
      <div>
        <Button
          style={{ marginTop: "10px" }}
          variant="contained"
          color="primary"
          onClick={() => {
            setExpansion(ActionExpansion.FORM_GAME);
          }}
        >
          Play with Friends 
        </Button>
      </div>
    </>
  );
}

const Bugwho = (props) => {
  // const {
  //   incomingOffers,
  //   onlineUsers,
  //   outgoingOffers,
  //   partnerMap,
  //   partners,
  //   unpartnered,
  // } = useContext(UsersContext);

  let [expansion, setExpansion] = useState(ActionExpansion.NONE);
  return (
    <GamesListProvider>
      <ChallengesProvider>
        <div>
          {/* <Challenges /> */}
          {/* <GamesList /> */}
          {/* <Teams {...{partners, onlineUsers, partnerMap}} /> */}
          {/* <Offers {...{unpartnered, incomingOffers}} /> */}
          {/* <Unpartnered unpartnered={unpartnered} /> */}
          {getExpansionDisplay(expansion, setExpansion)}
        </div>
      </ChallengesProvider>
    </GamesListProvider>
  );
};

export default Bugwho;
