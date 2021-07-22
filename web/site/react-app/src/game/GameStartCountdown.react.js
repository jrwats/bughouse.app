import React, { useContext, useEffect, useState } from "react";
const GameStartCountdown = ({game}) => {
  const getSecs = () => Date.now() - game.getStart() / 1000.0;
  let [count, setCount] = useState(getSecs);
  if (game.getStart() > Date.now()) {
    return null;
  }
  setTimeout(() => {
    setCount(Math.floor(getSecs()));
  }, (Date.now() - game.getStart()) % 1000);

  return (
    <div style={{
      position: "absolute", 
      display: "relative",
      width: "50%",
      color: "red" 
      }}>
      {count}
    </div>
  );
};

export default GameStartCountdown;
