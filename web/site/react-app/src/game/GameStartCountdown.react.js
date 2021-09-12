import React, { useEffect, useRef, useState } from "react";

const INTERVAL = 200; // "tickle" clock every 200 milliseconds

const GameStartCountdown = ({ start }) => {
  // let [now, setNow] = useState(Date.now());
  const getSecsTilStart = () => Math.round(((start || 0) - Date.now()) / 1000);
  let [count, setCount] = useState(getSecsTilStart());
  let interval = useRef(null);
  const updateClock = () => { setCount(getSecsTilStart()); };

  // Use both an interval every 200ms and attempt to time a clock update
  // precisely with the second as well.
  useEffect(() => {
    interval.current = setInterval(() => {
      updateClock();
      if (start < Date.now()) {
        clearInterval(interval.current);
      }
    }, INTERVAL);
    return () => {
      clearInterval(interval.current);
    };
  }, [start, updateClock]);

  useEffect(() => {
    const msTilSec = (start - Date.now()) % 1000 || 1000;
    setTimeout(() => {
      if (start != null) {
        updateClock(start);
      }
    }, msTilSec);
  }, [start, count]);

  if (start == null || count <= 0) {
    return null;
  }
  return <div id="game_countdown">{count}</div>;
};

export default GameStartCountdown;
