import React, { useEffect, useRef, useState } from "react";
import { EventEmitter } from "events";
import HandleDisplay from "./HandleDisplay.react";

const _ticker = new EventEmitter();
setInterval(() => {
  _ticker.emit("tick");
}, 200);

const PlayerDisplay = ({ color, chessboard }) => {
  const playerData = chessboard.getBoard()[color];
  const [handle, setHandle] = useState(playerData?.handle);
  const refTime = useRef(parseInt(playerData?.ms));
  const lastUpdate = useRef(Math.max(chessboard.getStart(), Date.now()));
  const [ms, setTime] = useState(refTime.current);

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
      const milliseconds = parseInt(playerData.ms);
      if (Number.isNaN(milliseconds)) {
        console.log(`PlayerDisplay ${playerData.ms} isNaN`);
        return;
      }
      refTime.current = parseInt(playerData?.ms);
      lastUpdate.current = Math.max(chessboard.getStart(), Date.now());
      setTime(refTime.current);
    };
    const onTick = () => {
      const board = chessboard.getBoard();
      if (
        chessboard.getColorToMove() === color &&
        chessboard.getStart() <= Date.now()
      ) {
        let now = Date.now();
        let delta = now - lastUpdate.current;
        lastUpdate.current = now;
        refTime.current = Math.max(0, refTime.current - delta);
        setTime(refTime.current);
      }
    };
    chessboard.on("update", onUpdate);
    _ticker.on("tick", onTick);
    return () => {
      chessboard.off("update", onUpdate);
      _ticker.off("tick", onTick);
    };
  }, [color, chessboard, handle]);
  const mins = Math.floor(ms / 1000.0 / 60.0);
  const secs = Math.floor((ms / 1000.0) % 60);
  return (
    <div className="playerData">
      <HandleDisplay handle={handle} />
      <span className="h6 mono bold light">
        {mins}:{(secs < 10 ? "0" : "") + secs}
      </span>
    </div>
  );
};

export default PlayerDisplay;
