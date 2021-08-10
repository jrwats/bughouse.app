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
import UsersProvider from "./user/UsersProvider";
import {  Router } from "@reach/router";
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";

Presence.init();

const GuestTable = ({gamePath}) => {
  const { user } = useContext(AuthContext);
  // console.log(`user: ${JSON.stringify(user)}`);
  return (
    <SocketProvider user={user}>
      <UsersProvider>
        <LooseLogin />
        <Table gamePath={gamePath} />
      </UsersProvider>
    </SocketProvider>
  );
};

const App = () => {
  const darkTheme = createMuiTheme({ palette: { type: "dark" } });
  return (
    <ThemeProvider theme={darkTheme}>
      <Router>
        <Login path="/" />
        <VerifyEmail path="/verify" />
        <Home path="home/*" />
        <GuestTable path="table/:gamePath" />
      </Router>
    </ThemeProvider>
  );
};

export default App;
