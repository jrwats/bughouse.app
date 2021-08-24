import React, { useEffect, useRef, useState } from "react";
const GameStartCountdown = ({ start }) => {
  const getSecsTilStart = () => Math.round(((start || 0) - Date.now()) / 1000);
  // let [now, setNow] = useState(Date.now());
  let [count, setCount] = useState(getSecsTilStart());
  let interval = useRef(null);
  const msTilStart = start - Date.now();
  const updateClock = () => { setCount(getSecsTilStart()) };
  useEffect(() => {
    interval.current = setInterval(() => {
      updateClock();
      if (start < Date.now()) {
        clearInterval(interval.current);
      }
    }, 200);
    return () => { clearInterval(interval.current); };
  }, [start]);

  if (count <= 0 || msTilStart < 0) {
    return null;
  }
  return <div id="game_countdown">{count}</div>;
};

export default GameStartCountdown;
