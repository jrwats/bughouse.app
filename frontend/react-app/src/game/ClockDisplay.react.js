import React, { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../socket/SocketProvider";
import { EventEmitter } from "events";
import TimerIcon from '@mui/icons-material/Timer';

const _ticker = new EventEmitter();
setInterval(() => {
  _ticker.emit("tick");
}, 50);

export const FLAG = "\u{1F6A9}";
const IDEO_SPACE = "\u{3000}";
const TEN_SECS = 10000;

function getFlag(result, boardID, color) {
  if (
    result?.kind === 0 &&
    (result.board === 0) === (boardID.split("/")[1] === "a") &&
    (result.winner === 0) === (color === "black")
  ) {
    return `${FLAG} `;
  }
  return "";
}

function getLastUpdate(chessboard) {
  const start = chessboard.getStart();
  return start == null ? null : Math.max(Date.now(), start);
}

function getTimes(ms, ping) {
  let numSubMS = Math.round(ms % 1000);
  let mins = Math.floor(ms / 1000.0 / 60.0);
  let secs =
    Math.floor((ms / 1000.0) % 60) + (ms > TEN_SECS && numSubMS > ping ? 1 : 0);
  if (secs === 60) {
    mins += 1;
    secs = 0;
  }
  const subMS = ms <= TEN_SECS ? `.${Math.floor(numSubMS / 100)}` : IDEO_SPACE;
  return { mins, secs, subMS };
}

const ClockDisplay = ({ color, chessboard, forming }) => {
  const { ping } = useContext(SocketContext);
  const refTime = useRef(chessboard.getBoard()[color]?.ms || 0);
  const lastUpdate = useRef(getLastUpdate(chessboard));
  const result = useRef(chessboard.getGame().getResult());

  const initTimes = getTimes(refTime.current);
  const [mins, setMins] = useState(initTimes.mins);
  const [secs, setSecs] = useState(initTimes.secs);
  const [subMS, setSubMS] = useState(initTimes.subMS);

  useEffect(() => {
    const onUpdate = (cb) => {
      const playerData = chessboard.getBoard()[color];
      if (Number.isNaN(playerData.ms)) {
        console.log(`PlayerDisplay ${playerData.ms} isNaN`);
      } else {
        refTime.current = playerData.ms;
      }
      result.current = cb.getGame().getResult();
      lastUpdate.current = getLastUpdate(chessboard);
      const times = getTimes(Math.max(0, refTime.current), ping);
      setMins(times.mins);
      setSecs(times.secs);
      setSubMS(times.subMS);
    };

    const onTick = () => {
      const now = Date.now();
      if (
        forming ||
        result.current != null ||
        chessboard.getGame().isAnalysis() ||
        chessboard.getColorToMove() !== color ||
        chessboard.getStart() == null ||
        now < chessboard.getStart()
      ) {
        return;
      }
      let delta = now - (lastUpdate.current ?? now);
      lastUpdate.current = now;
      refTime.current = Math.max(0, refTime.current - delta);
      const times = getTimes(refTime.current, ping);
      setMins(times.mins);
      setSecs(times.secs);
      setSubMS(times.subMS);
    };
    chessboard.on("update", onUpdate);
    _ticker.on("tick", onTick);
    return () => {
      chessboard.off("update", onUpdate);
      _ticker.off("tick", onTick);
    };
  }, [color, chessboard, forming]);

  const flag = getFlag(result.current, chessboard.getID(), color);
  const low = refTime.current <= TEN_SECS ? "low" : "";
  return (
    <div style={{display: "flex", fontSize: "calc(min(1.3vw, 2.6vh))"}}>
      <div className={`timer-icon ${low} ${flag ? 'flagged' : ''}`}>
        <TimerIcon fontSize="inherit"  />
      </div>
      <div className={`clock ${low} h6 mono`}>
        {flag}
        {mins}:{(secs < 10 ? "0" : "") + secs}
        {subMS}
      </div>
    </div>
  );
};
export default ClockDisplay;
