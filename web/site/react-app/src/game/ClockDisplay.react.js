import React, { useEffect, useRef, useState } from "react";
import { EventEmitter } from "events";

const _ticker = new EventEmitter();
setInterval(() => {
  _ticker.emit("tick");
}, 50);

const FLAG = "\u{1F6A9}";
function getFlag(result, boardID, color) {
  if (result?.kind === 0 &&
    (result.board === 0) === (boardID.split('/')[1] === 'a') &&
    (result.winner === 0) === (color === 'black')) {
    return `${FLAG} `;
  }
  return "";
}

const ClockDisplay = ({ color, chessboard, forming }) => {
  const refTime = useRef(chessboard.getBoard()[color]?.ms || 0);
  const lastUpdate = useRef(Math.max(Date.now(), chessboard.getStart() || 0));
  const [state, setState] = useState({
    playerData: chessboard.getBoard()[color],
    result: null,
    ms: refTime.current,
  });

  useEffect(() => {
    const onUpdate = (cb) => {
      const playerData = chessboard.getBoard()[color];
      const milliseconds = playerData.ms;
      if (Number.isNaN(milliseconds)) {
        console.log(`PlayerDisplay ${playerData.ms} isNaN`);
      } else {
        refTime.current = milliseconds;
      }
      lastUpdate.current = Math.max(Date.now(), chessboard.getStart() || 0);
      const result = cb.getGame().getResult();
      setState({ result, playerData, ms: refTime.current });
    };

    const onTick = () => {
      if (
        forming ||
        state.result != null ||
        chessboard.getGame().isAnalysis() ||
        chessboard.getColorToMove() !== color ||
        Date.now() < chessboard.getStart()
      ) {
        return;
      }
      let now = Date.now();
      let delta = now - lastUpdate.current;
      lastUpdate.current = now;
      refTime.current = Math.max(0, refTime.current - delta);
      setState({ ...state, ms: refTime.current });
    };
    chessboard.on("update", onUpdate);
    _ticker.on("tick", onTick);
    return () => {
      chessboard.off("update", onUpdate);
      _ticker.off("tick", onTick);
    };
  }, [state, color, chessboard, forming]);

  if (Number.isNaN(state.ms)) {
    // debugger;
    console.error(`state.ms isNaN`);
    state.ms = 0;
  }
  const ms = Math.max(0, state.ms + 900);
  const mins = Math.floor(ms / 1000.0 / 60.0);
  const secs = Math.floor((ms / 1000.0) % 60);

  const res = state.result;
  const flag = getFlag(state.result, chessboard.getID(), color);
  return (
    <span className="clock h6 alien" >
      {flag}{mins}:{(secs < 10 ? "0" : "") + secs}
    </span>
  );
};
export default ClockDisplay;
