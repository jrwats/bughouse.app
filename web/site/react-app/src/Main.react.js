import React from "react";
import SideMenu from "./SideMenu.react";
import Bugwho from "./Bugwho.react";
import Profile from "./user/Profile.react";
import Table from "./game/Table.react";

import { Router } from "@reach/router";
import FicsTelnetOutput from "./FicsTelnetOutput";

const Main = (props) => {
  console.log('Main');
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <SideMenu style={{ position: "absolute" }} />
      <div
        style={{
          top: "0px",
          marginLeft: "3em",
          position: "absolute",
          height: "100%",
          width: "100%",
        }}
      >
        <Router>
          <Table path="/table/:gamePath" />
          <Bugwho path="/" />
          <Profile path="/profile" />
          <FicsTelnetOutput path="fics_console" />
        </Router>
      </div>
    </div>
  );
};

export default Main;
