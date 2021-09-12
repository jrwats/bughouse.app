import React, { useContext } from "react";
import { opposite } from "chessground/util";
import Paper from "@material-ui/core/Paper";
import HandleDisplay from "./HandleDisplay.react";
import { SocketContext } from "../socket/SocketProvider";
import FeaturedVideoIcon from "@material-ui/icons/FeaturedVideo";
import AssessmentIcon from "@material-ui/icons/Assessment";
import Button from "@material-ui/core/Button";
import { Link } from "@reach/router";

import { BoardContext } from "./Board.react";

const GameOverMessage = ({ context, chessboard }) => {
  const { handle } = useContext(SocketContext);
  const board = chessboard.getBoard();
  const winnerColor = chessboard.getWinner();
  const gameID = chessboard.getGame().getID();

  if (board[winnerColor] == null) {
    return null;
  }
  const winnerHandle = board[winnerColor].handle;
  const loserHandle = board[opposite(winnerColor)].handle;
  let msg;
  if (handle === winnerHandle) {
    msg = "You won";
  } else if (handle === loserHandle) {
    msg = "You lost";
  } else {
    msg = (
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div style={{ flex: "auto" }}>
          <HandleDisplay color={winnerColor} handle={winnerHandle} />
        </div>
        <div style={{ flex: "auto", paddingLeft: ".2em" }}>won</div>
      </div>
    );
  }

  const dashLink = context === BoardContext.CURRENT
    ? null
    : <div style={{ flex: "auto" }}>
      <Link to="/" style={{ marginTop: "min(3vw, 7vh)" }}>
        <Button variant="contained" color="primary">
          <FeaturedVideoIcon
            fontSize="small"
            style={{ paddingRight: ".6em" }}
          />
          Dashboard
        </Button>
      </Link>
    </div>;

  return (
    <div className="gameOver">
      <Paper className="gameOverMsg" elevation={20}>
        <div
          className="grid clamped"
          style={{
            alignItems: "center",
            justifyContent: "space-evenly",
            flexDirection: "column",
          }}
        >
          <div className="bug-logo-text h5 ">{msg}</div>
          <div style={{ paddingTop: "8px" }}>{chessboard.getReason()}</div>
          <div style={{ display: "flex", marginTop: "min(3vw, 7vh)" }}>
            {dashLink}
            <div style={{ flex: "auto", marginLeft: "1em" }}>
              <Link
                to={`/analysis/${gameID}`}
                style={{ marginTop: "min(3vw, 7vh)" }}
              >
                <Button variant="contained" color="primary">
                  <AssessmentIcon
                    fontSize="small"
                    style={{ paddingRight: ".6em" }}
                  />
                  Analyze
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Paper>
    </div>
  );
};

export default GameOverMessage;
