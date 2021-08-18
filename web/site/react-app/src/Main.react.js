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
      <SideMenu style={{ position: "absolute" }} />
      <div
        style={{
          top: "0px",
          marginLeft: "3em",
          position: "absolute",
          height: "100%",
          width: "calc(100% - 4em)",
        }}
      >
        <div class="bug_logo_text small">
          <span class="solid">bughouse.</span>app
        </div>
        <Router>
          <Table path="/table/:gamePath" />
          <Bugwho path="/" />
          <Profile path="/profile" />
        </Router>
      </div>
    </div>
  );
};

export default Main;
