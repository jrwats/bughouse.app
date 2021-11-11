import React, { useContext } from "react";
import {RelayEnvironmentProvider} from "react-relay";
import RelayEnvironment from "./RelayEnvironment";

import "./App.css";
import { AuthContext } from "./auth/AuthProvider";
// import Presence from "./user/Presence";
import Login from "./Login.react";
import LooseLogin from "./LooseLogin.react";
import VerifyEmail from "./VerifyEmail.react";
import Home from "./Home.react";
import SocketProvider from "./socket/SocketProvider";
import Table from "./game/Table.react";
import Arena from "./game/Arena.react";
// import UsersProvider from "./user/UsersProvider";
import ViewerProvider from "./user/ViewerProvider";
import { Router } from "@reach/router";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import purple from "@mui/material/colors/purple";

// Presence.init();

const GuestTable = ({ gamePath }) => {
  return (
    <>
      <LooseLogin gamePath={gamePath} />
      <Table gamePath={gamePath} />
    </>
  );
};

const App = () => {
  const darkTheme = createTheme({
    palette: {
      mode: "dark",
      type: "dark",
      primary: purple,
      // {
      //   main: purple[700],
      //   dark: purple[400],
      // },
      secondary: {
        main: "#a22e63", // purple[200],
        dark: "#e23e73", // purple[200],
      },
    },
  });

  const { user } = useContext(AuthContext);
  return (
    <RelayEnvironmentProvider environment={RelayEnvironment}>
      <SocketProvider user={user}>
        <ViewerProvider>
          {/* <UsersProvider> */}
          <ThemeProvider theme={darkTheme}>
            <Router>
              <Login path="/login" />
              <VerifyEmail path="/verify" />
              <Home path="/*" />
              <GuestTable path="table/:gamePath" />
              <Arena path="/arena/:gamePath" />
            </Router>
          </ThemeProvider>
          {/* </UsersProvider> */}
        </ViewerProvider>
      </SocketProvider>
    </RelayEnvironmentProvider>
  );
};

export default App;
