import React, { useEffect, useState } from "react";
const GameStartCountdown = ({start}) => {
  let [now, setNow] = useState(Date.now());
  const getSecsTilStart = () => Math.round((start - Date.now()) / 1000);
  let [count, setCount] = useState(getSecsTilStart);
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
      // left: "45%",
      // margin: "0",
      backgroundColor: "#efefef",
      border: "0.3rem solid black",
      borderRadius: "1rem",
      color: "red",
      fontSize: "8em",
      left: "50%",
      position: "absolute",
      top: "40%",
      minWidth: "1em",
      textAlign: "center",
      transform: "translate(-50%, -50%)",
      zIndex: 999,
      }}>
      {count}
    </div>
  );
};

export default GameStartCountdown;
