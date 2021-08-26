import React, { useEffect, useState } from "react";
import AnalysisState from "./AnalysisState";
// import { opposite } from "chessground/util";

const AnalysisMoves = ({ game }) => {
  let [moves, setMoves] = useState(game.getMoves() || []);
  useEffect(() => {
    const onGameUpdate = () => {
      setMoves(game.getMoves());
    };
    game.on("update", onGameUpdate);
    return () => {
      game.off("update", onGameUpdate);
    };
  }, [game]);

  const uiMoves = moves.map((mv, idx) => {
    const onClick = (_e) => {
      game.update(mv.state);
    };
    const prev = moves[idx - 1];
    let num = `${mv.num}.${mv.color === "black" ? ".." : ""} `;
    let clear = <div key={idx} />;
    let spacer = null;
    if (prev?.boardID === mv.boardID && prev?.num === mv.num) {
      num = null;
      clear = null;
    } else if (mv.color === "black") {
      const className = `move ${mv.boardID ? "b" : "a"} ${mv.color}`;
      spacer = <div key={`${idx}`} className={className} />;
    }
    return (
      <>
        {clear}
        {spacer}
        <div
          onClick={onClick}
          key={`${mv.boardID}_${mv.num}_${mv.color}`}
          className={`move ${mv.boardID ? "b" : "a"} ${mv.color}`}
        >
          {num}
          {mv.label}
        </div>
      </>
    );
  });
  return (
    <div id="analysis_moves" style={{ width: "20vw" }}>
      {uiMoves}
    </div>
  );
};

export default AnalysisMoves;
