import Button from "@mui/material/Button";
import React, { useContext, useEffect, useState } from "react";
import HandleDisplay from "./HandleDisplay.react";
import ClockDisplay from "./ClockDisplay.react";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { SocketContext } from "../socket/SocketProvider";

function getHandleDisplay(handle, canVacate, ticking, onSit, onVacate) {
  if (handle == null) {
    return (
      <Button variant="contained" color="primary" onClick={onSit}>
        Play
      </Button>
    );
  }
  const vacate = canVacate ? (
    <Button variant="contained" color="secondary" onClick={onVacate}>
      <ExitToAppIcon style={{ paddingRight: "10px" }} />
      Leave
    </Button>
  ) : null;
  return (
    <>
      <div className="handle">
        {/* <span className="h6 marker"><TimerIcon /></span> */}
        <span className="h6 marker">{`\u{2658}`}</span>
        <HandleDisplay handle={handle} />
        {/* <span className="h6 marker"><TimerIcon /></span> */}
        <span className="h6 marker">{`\u{2658}`}</span>
      </div>
      {vacate}
    </>
  );
}

const BoardGutter = ({ color, chessboard, forming, data }) => {
  const { socket, handle: viewerHandle } = useContext(SocketContext);
  const playerHandle = data?.handle;
  const gameData = {
    id: chessboard.getGame().getID(),
    board: chessboard.getBoardIdx(),
    color: color === "white" ? 0 : 1,
  };
  const onSit = () => {
    console.log(`id: ${chessboard.getGame().getID()}`);
    socket.sendEvent("sit", gameData);
  };
  const onVacate = () => {
    console.log(`id: ${chessboard.getGame().getID()}`);
    socket.sendEvent("vacate", gameData);
  };
  const canVacate = forming && playerHandle === viewerHandle;
  const toMove = chessboard.getColorToMove();
  const playerColor = chessboard.getHandleColor(playerHandle);
  const ticking = !forming && toMove != null && toMove === playerColor;
  return (
    <div className={`playerData ${ticking ? "ticking" : ""}`}>
      {getHandleDisplay(playerHandle, canVacate, ticking, onSit, onVacate)}
      <ClockDisplay color={color} chessboard={chessboard} forming={forming} />
    </div>
  );
};

export default BoardGutter;
