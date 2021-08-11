import Box from "@material-ui/core/Box";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import React, { useContext, useRef } from "react";
import { SocketContext } from "./socket/SocketProvider";
import Typography from "@material-ui/core/Typography";
import AppSignOut from "./AppSignOut";
import UserProfile from "./user/UserProfile.react";
import { AuthContext } from "./auth/AuthProvider";

const FicsLogin = () => {
  const { socket, loggedOut } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const usernameRef = useRef();
  const passwordRef = useRef();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div>
        <Box
          style={{
            flexGrow: 1,
            maxWidth: "500px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <form noValidate autoComplete="off">
            <Grid container spacing={2}>
              <Grid
                item
                xs={8}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="h4" noWrap>
                  Login to FICS
                </Typography>
              </Grid>
              <Grid
                item
                xs={8}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontWeight: 300, fontSize: ".7em" }}>
                  Free Internet Chess Server @ freechess.org
                </div>
              </Grid>
              <Grid item>
                <Grid item>
                  <TextField
                    ref={usernameRef}
                    id="fics_handle"
                    autoComplete="username"
                    label="FICS username"
                  />
                </Grid>
                <Grid item>
                  <TextField
                    ref={passwordRef}
                    id="standard-password-input"
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                  />
                </Grid>
                <Grid item>
                  <Button
                    style={{ marginTop: "10px" }}
                    disabled={loggedOut === false}
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      const username =
                        usernameRef.current.querySelector("input").value;
                      const password =
                        passwordRef.current.querySelector("input").value;
                      socket.login({ username, password });
                    }}
                  >
                    Login
                  </Button>
                </Grid>
              </Grid>
              <Grid item>
                <Button
                  style={{ marginTop: "50px" }}
                  disabled={loggedOut === false}
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    console.log("FicsLogin onClick");
                    socket.login({ username: "guest" });
                  }}
                >
                  Login as guest
                </Button>
              </Grid>
            </Grid>
          </form>
        </Box>
        <div style={{ marginTop: "80px" }}>
          <UserProfile
            user={user}
            style={{
              position: "relative",
              top: "4px",
              paddingRight: "40px",
            }}
          />
          <AppSignOut />
        </div>
      </div>
    </div>
  );
};

export default FicsLogin;
