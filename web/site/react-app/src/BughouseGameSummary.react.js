import React from "react";
import Player from "./Player.react";
import Paper from "@mui/material/Paper";
import { Link } from "@reach/router";

const BughouseGameSummary = ({ bughouseGame }) => {
  // TODO add non-FICS logic
  const [board1, board2] = bughouseGame;

  return (
    <Link
      to={`/fics_arena/${board1.id}~${board2.id}`}
      style={{ textDecoration: "none" }}
    >
      <span
        className="grid"
        style={{
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper className="cell">
          <Player white player={board1.white} />
          <Player black player={board2.black} />
        </Paper>
        <span className="h6 dark">vs.</span>
        <Paper className="cell">
          <Player black player={board1.black} />
          <Player white player={board2.white} />
        </Paper>
      </span>
    </Link>
  );
};

export default BughouseGameSummary;
