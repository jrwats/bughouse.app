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
    }, 50);
    return () => { clearInterval(interval.current); };
  }, [start]);

  // if (msTilStart >= 0) {
  //   setTimeout(() => {
  //     updateClock();
  //   }, (msTilStart % 1000) || 1000);
  // }

  if (count < 0 || msTilStart < 0) {
    console.log(`setting null cuz ${count < 0} ${msTilStart < 0}`);
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
