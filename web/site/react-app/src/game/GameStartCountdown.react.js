import React, { useContext, useEffect, useState } from "react";
const GameStartCountdown = ({game}) => {
  const getSecsTilStart = () => Math.floor((game.getStart() - Date.now()) / 1000);
  let [count, setCount] = useState(getSecsTilStart);
  const msTilStart = (game && game.getStart()) - Date.now();
  if (game == null || msTilStart < 0) {
    return null;
  }
  const delay = (msTilStart % 1000) || 1000;
  setTimeout(() => {
    console.log(`countdown setTimeout: ${Date.now()} ${game.getStart()}`);
    setCount(getSecsTilStart());
  }, delay);

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
