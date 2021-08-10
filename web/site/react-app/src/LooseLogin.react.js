import Button from "@material-ui/core/Button";
import React, { useContext } from "react";
import auth from "./auth/firebase-init";
import FirebaseLogin from "./FirebaseLogin.react";
import { AuthContext } from "./auth/AuthProvider";

const LooseLogin = ({ navigate }) => {
  const { pendingInit, user } = useContext(AuthContext);
  if (pendingInit || user != null) {
    console.log(`Login: pendingInit: ${pendingInit}`);
    return null;
  }
  console.log(`Login displaying login`);

  const playAsGuest = () => {
    auth.signInAnonymously()
      .then(() => {
      })
      .catch((e) => {
        console.error(`Failed to sign in`);
      });
  };
  return (
    <div style={{
      position: "absolute",
      height: "min(100%, 50vw)",
      width: "100%",
      zIndex: 999}}>
    <div id="loginContainer">
      <div id="looseLogin" className="row">
        <div className="column" style={{ padding: "30px" }} >
          <Button variant="contained" color="primary" onClick={playAsGuest} >
            Play as Guest
          </Button>
        </div>
        <div className="column">
          <FirebaseLogin allowGuest={true} />
        </div>
      </div>
    </div>
    </div>
  );
};

export default LooseLogin;
