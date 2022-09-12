import React, { useContext } from "react";
import Button from "@mui/material/Button";
import { AuthContext } from "./auth/AuthProvider";
import { SocketContext } from "./socket/SocketProvider";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import logout from "./logout";

const AppSignOut = () => {
  const { auth, user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  return (
    <Button
      disabled={user == null}
      variant="contained"
      color="primary"
      onClick={(e) => { logout(auth, socket); }}
    >
      <ExitToAppIcon style={{ paddingRight: "10px" }} />
      Sign out
    </Button>
  );
};

export default AppSignOut;
