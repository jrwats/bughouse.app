import Button from "@material-ui/core/Button";
import React, { useContext, useEffect, useRef, useState } from "react";
import HandleDisplay from "./HandleDisplay.react";
import ClockDisplay from "./ClockDisplay.react";
import { SocketContext } from "../socket/SocketProvider";


const PlayerDisplay = ({ color,  chessboard, forming }) => {
  const {socket} = useContext(SocketContext);
  const playerData = chessboard.getBoard()[color];
  const [handle, setHandle] = useState(playerData?.handle);

  useEffect(() => {
    const onUpdate = () => {
      const playerData = chessboard.getBoard()[color];
      if (playerData == null) {
        console.log(`PlayerDisplay NULL for ${chessboard.getID()} ${color}`);
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
  let handleDisplay = playerData.handle == null ?
    <Button
      style={{ marginTop: "10px" }}
      variant="contained"
      color="primary"
      onClick={() => {
        socket.sendEvent('sit', { 
          id: chessboard.getGame().getID(),
          board: chessboard.getBoardID(),
          color: color
        });
      }}
    >
      Sit
    </Button>
    : <HandleDisplay handle={handle} />;
  return (
    <div className="playerData">
      {handleDisplay}
      <ClockDisplay color={color} chessboard={chessboard} forming={forming} />
    </div>
  );
};

export default PlayerDisplay;
