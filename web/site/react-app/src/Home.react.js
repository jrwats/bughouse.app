import React, { useContext } from "react";

import Loading from "./Loading.react";
import Main from "./Main.react";
import { SocketContext } from "./socket/SocketProvider";
import { useNavigate } from "@reach/router";
import { AuthContext } from "./auth/AuthProvider";

const HomeRouter = (props) => {
  const { socket } = useContext(SocketContext);
  if (socket == null || !socket.isAuthed()) {
    console.log(`HomeRouter initializing socket ${socket}`);
    return <Loading path="loading" />;
  } else if (socket.isLoggedIn()) {
    console.log("HomeRouter isLogged in rendering main...");
    return <Main path="/" />;
  } else {
    debugger;
  }
  console.log("Not logged in?");
  return <Loading path="loading" />;
};

const Home = (props) => {
  const { user, needsEmailVerified } = useContext(AuthContext);
  const navigate = useNavigate();
  if (user == null) {
    console.log(`Home user is null, navigating to login`);
    navigate("/login", true);
    return null;
  } else if (needsEmailVerified) {
    navigate("/verify", true);
    return null;
  }

  return (
    <HomeRouter />
  );
};

export default Home;
