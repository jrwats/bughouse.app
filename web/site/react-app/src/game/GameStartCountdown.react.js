import React, { useContext, useEffect, useState } from "react";
const GameStartCountdown = ({start}) => {
  const getSecsTilStart = () => Math.round((start - Date.now()) / 1000);
  let [count, setCount] = useState(getSecsTilStart);
  let [now, setNow] = useState(Date.now());
  const msTilStart = start - Date.now();
  if (msTilStart < 0 || isNaN(msTilStart)) {
    return null;
  }
  setTimeout(() => {
    setCount(getSecsTilStart());
    setNow(Date.now());
  }, (msTilStart % 1000) || 1000);

  return (
    <div id="game_countdown" style={{
      position: "absolute",
      top: "20%",
      left: "45%",
      color: "red",
      fontSize: "8em",
      zIndex: 999,
      }}>
      {count}
    </div>
  );
};

export default GameStartCountdown;
