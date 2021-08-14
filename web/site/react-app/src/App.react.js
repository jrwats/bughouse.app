import React, { useContext } from "react";
import "./App.css";
import { AuthContext } from "./auth/AuthProvider";
import Presence from "./user/Presence";
import Login from "./Login.react";
import LooseLogin from "./LooseLogin.react";
import VerifyEmail from "./VerifyEmail.react";
import Home from "./Home.react";
import SocketProvider from "./socket/SocketProvider";
import Table from "./game/Table.react";
import Arena from "./game/Arena.react";
import UsersProvider from "./user/UsersProvider";
import ViewerProvider from "./user/ViewerProvider";
import {  Router } from "@reach/router";
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";

Presence.init();

const GuestTable = ({gamePath}) => {
  const { user } = useContext(AuthContext);
  // console.log(`user: ${JSON.stringify(user)}`);
  return (
    <>
      <LooseLogin gamePath={gamePath} />
      <Table gamePath={gamePath} />
    </>
  );
};


const App = () => {
  const darkTheme = createMuiTheme({ palette: { type: "dark" } });
  const { user } = useContext(AuthContext);
  return (
    <SocketProvider user={user}>
      <ViewerProvider>
        <UsersProvider>
          <ThemeProvider theme={darkTheme}>
            <Router>
              <Login path="/login" />
              <VerifyEmail path="/verify" />
              <Home path="/*" />
              <GuestTable path="table/:gamePath" />
              <Arena path="/arena/:gamePath" />
            </Router>
          </ThemeProvider>
        </UsersProvider>
      </ViewerProvider>
    </SocketProvider>
  );
};

export default App;
