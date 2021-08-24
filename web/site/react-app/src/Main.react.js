import Analysis from "./game/Analysis.react";
import Bugwho from "./Bugwho.react";
import Profile from "./user/Profile.react";
import React from "react";
import SideMenu from "./SideMenu.react";
import Table from "./game/Table.react";
// import Typography from "@material-ui/core/Typography";

import { Router } from "@reach/router";

const Main = (props) => {
  console.log("Main");
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div style={{position: "absolute"}}>
        <SideMenu />
        <span className="bug-logo-text small">
          <span className="solid">bughouse.</span>app
        </span>
      </div>
      <div className="main">
        <Router>
          <Bugwho path="/" />
          <Analysis path="/analysis/:gamePath" />
          <Profile path="/profile" />
          <Table path="/table/:gamePath" />
        </Router>
      </div>
    </div>
  );
};

export default Main;
