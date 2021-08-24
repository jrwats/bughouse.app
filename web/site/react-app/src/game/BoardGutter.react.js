import Button from "@material-ui/core/Button";
import React, { useContext, useEffect, useState } from "react";
import HandleDisplay from "./HandleDisplay.react";
import ClockDisplay from "./ClockDisplay.react";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";
import { SocketContext } from "../socket/SocketProvider";

function getHandleDisplay(handle, canVacate, onSit, onVacate) {
  if (handle == null) {
    return (
      <Button variant="contained" color="primary" onClick={onSit}>
        Sit
      </Button>
    );
  }
  const vacate = canVacate ? (
    <Button variant="contained" color="secondary" onClick={onVacate}>
      <ExitToAppIcon style={{ paddingRight: "10px" }} />
      Vacate
    </Button>
  ) : null;
  return (
    <>
      <HandleDisplay handle={handle} />
      {vacate}
    </>
  );
}

const BoardGutter = ({ color, chessboard, forming }) => {
  const { socket, handle: viewerHandle } = useContext(SocketContext);
  const playerData = chessboard.getBoard()[color];
  const [playerHandle, setHandle] = useState(playerData?.handle);

  useEffect(() => {
    const onUpdate = () => {
      const playerData = chessboard.getBoard()[color];
      if (playerData == null) {
        console.log(`BoardGutter NULL for ${chessboard.getID()} ${color}`);
        return;
      }
      if (playerData.handle !== playerHandle) {
        setHandle(playerData.handle);
      }
    };
    chessboard.on("update", onUpdate);
    return () => {
      chessboard.off("update", onUpdate);
    };
  }, [forming, playerHandle, chessboard, color]);
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
    <div className={`${"playerData"} ${ticking ? "ticking" : ""}`}>
      {getHandleDisplay(playerHandle, canVacate, onSit, onVacate)}
      <ClockDisplay color={color} chessboard={chessboard} forming={forming} />
    </div>
  );
};

export default BoardGutter;
