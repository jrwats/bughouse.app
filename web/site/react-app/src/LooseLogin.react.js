import Button from "@material-ui/core/Button";
import React, { useContext, useEffect, useState } from "react";
import auth from "./auth/firebase-init";
import FirebaseLogin from "./FirebaseLogin.react";
import GameStatusSource from "./game/GameStatusSource";
import { AuthContext } from "./auth/AuthProvider";
import { SocketContext } from "./socket/SocketProvider";
import { ViewerContext } from "./user/ViewerProvider";

const LooseLogin = ({ gamePath }) => {
  const { pendingInit, user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const { isGuest } = useContext(ViewerContext);
  const gamesSrc = GameStatusSource.get(socket);
  const [gameID] = gamePath.split("~");
  const game = gamesSrc.getGame(gameID);
  const [rated, setRated] = useState(game.isRated());
  useEffect(() => {
    const onUpdate = (game) => {
      setRated(game.isRated());
    };
    game.on("update", onUpdate);
    return () => {
      game.off("update", onUpdate);
    };
  }, [game]);
  console.log(
    `LooseLogin pendingInit: ${pendingInit}, isRated: ${rated}, isGuest: ${socket.isGuest()}`
  );
  // user is non-null AND game is either unrated OR the user is not a guest
  // eslint-disable no-mixed-operators
  if (pendingInit || (user != null && (!rated || !isGuest))) {
    return null;
  }
  console.log(`Login displaying login`);

  const playAsGuest = () => {
    auth
      .signInAnonymously()
      .then(() => {})
      .catch((e) => {
        console.error(`Failed to sign in`);
      });
  };
  return (
    <div
      style={{
        position: "absolute",
        height: "min(100%, 50vw)",
        width: "100%",
        zIndex: 10,
      }}
    >
      <div id="loginContainer">
        <div id="looseLogin" className="row">
          <div className="column" style={{ padding: "30px" }}>
            <Button
              disabled={rated}
              variant="contained"
              color="primary"
              onClick={playAsGuest}
            >
              Play as Guest
            </Button>
            {rated ? <div>Rated games require sign-in</div> : null}
          </div>
          <div className="column">
            <FirebaseLogin />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LooseLogin;
