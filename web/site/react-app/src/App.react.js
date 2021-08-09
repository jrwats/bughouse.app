import React, { useContext, useNavigate } from "react";
import "./App.css";
import { AuthContext } from "./auth/AuthProvider";
import Presence from "./user/Presence";
import Login from "./Login.react";
import VerifyEmail from "./VerifyEmail.react";
import Home from "./Home.react";
import SocketProvider from "./socket/SocketProvider";
import Table from "./game/Table.react";
import {  Router } from "@reach/router";
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";

Presence.init();

const GuestTable = ({gamePath}) => {
  const { user, needsEmailVerified } = useContext(AuthContext);
  return <SocketProvider user={user}>
    <Table gamePath={gamePath} />
  </SocketProvider>
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
