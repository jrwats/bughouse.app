import React, { useState } from "react";
const GameStartCountdown = ({ start }) => {
  const getSecsTilStart = () => Math.round(((start || 0) - Date.now()) / 1000);
  // let [now, setNow] = useState(Date.now());
  let [count, setCount] = useState(getSecsTilStart());
  const msTilStart = start - Date.now();

  if (msTilStart >= 0) {
    setTimeout(() => {
      setCount(getSecsTilStart());
      console.log(`count: ${getSecsTilStart()}`);
      // setNow(Date.now());
    }, msTilStart % 1000 || 1000);
  }

  if (count < 0 || msTilStart < 0) {
    return null;
  }

  return (
    <div
      id="game_countdown"
      style={{
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
        zIndex: 100,
      }}
    >
      {count}
    </div>
  );
};

export default GameStartCountdown;
