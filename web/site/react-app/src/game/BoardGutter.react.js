import Button from "@material-ui/core/Button";
import React, { useContext, useEffect, useRef, useState } from "react";
import HandleDisplay from "./HandleDisplay.react";
import ClockDisplay from "./ClockDisplay.react";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";
import { SocketContext } from "../socket/SocketProvider";

function getHandleDisplay(handle, canVacate, onSit, onVacate) {
  if (handle == null) {
    return <Button variant="contained" color="primary" onClick={onSit} >
      Sit
    </Button>;
  }
  const vacate = canVacate ? 
    <Button variant="contained" color="secondary" onClick={onVacate}>
      <ExitToAppIcon style={{ paddingRight: "10px" }} />
      Vacate
    </Button> : null ;
  return <>
    <HandleDisplay handle={handle} />
    {vacate}
  </>;
}

const BoardGutter = ({ color,  chessboard, forming }) => {
  const {socket} = useContext(SocketContext);
  const {user} = useContext(AuthContext);
  const playerData = chessboard.getBoard()[color];
  const [handle, setHandle] = useState(playerData?.handle);

  useEffect(() => {
    const onUpdate = () => {
      const playerData = chessboard.getBoard()[color];
      if (playerData == null) {
        console.log(`BoardGutter NULL for ${chessboard.getID()} ${color}`);
        return;
      }
      if (playerData.handle !== handle) {
        setHandle(playerData.handle);
      }
    };
    chessboard.on("update", onUpdate);
    return () => {
      chessboard.off("update", onUpdate);
    };
  }, [forming, handle]);
  console.log(`forming: ${forming}`);
  const gameData = { 
    id: chessboard.getGame().getID(),
    board: chessboard.getBoardIdx(),
    color: color === 'white' ? 0 : 1,
  };
  const onSit = () => {
    console.log(`id: ${chessboard.getGame().getID()}`);
    socket.sendEvent('sit', gameData);
  };
  const onVacate = () => {
    console.log(`id: ${chessboard.getGame().getID()}`);
    socket.sendEvent('vacate', gameData);
  }
  const canVacate = forming && handle == user.userN;
  return (
    <div className="playerData">
      {getHandleDisplay(handle, forming, onSit, onVacate)}
      <ClockDisplay color={color} chessboard={chessboard} forming={forming} />
    </div>
  );
};

export default BoardGutter;
