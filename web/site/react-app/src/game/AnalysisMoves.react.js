import React, { useEffect, useRef, useState } from "react";
import AnalysisState from "./AnalysisState";
import { initial } from "chessground/fen";

const AnalysisMoves = ({ game, flippedBoards }) => {
  let [moves, setMoves] = useState(game.getMoves() || []);
  let idx = useRef(-1);
  useEffect(() => {
    const onGameUpdate = () => {
      setMoves(game.getMoves());
    };
    game.on("update", onGameUpdate);
    return () => {
      game.off("update", onGameUpdate);
    };
  }, [game]);

  useEffect(() => {
    const onKey = (e) => {
      const delta = e.key === 'ArrowRight' ? 1 : 
        (e.key === 'ArrowLeft' ? -1 : 0)
      idx.current = Math.min(Math.max(-1 ,idx.current + delta), moves.length - 1);
      const state = idx.current >= 0
        ? moves[idx.current].state
        : { a: {board: {fen: initial}}, b: {board: {fen: initial}}};
      game.update(state);
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    }
  }, [moves]);

  const uiMoves = moves.map((mv, mvIdx) => {
    const onClick = (_e) => {
      idx.current = mvIdx;
      game.update(mv.state);
    };
    const prev = moves[mvIdx - 1];
    let num = `${mv.num}.${mv.color === "black" ? ".." : ""} `;
    let clear = <div key={`${mvIdx}_clear`} />;
    let spacer = null;
    if (prev?.boardID === mv.boardID && prev?.num === mv.num) {
      num = null;
      clear = null;
    } else if (mv.color === "black") {
      const className = `move ${mv.boardID ? "b" : "a"} ${mv.color}`;
      spacer = <div key={`${mvIdx}_spacer`} className={className} />;
    }
    return (
      <React.Fragment key={`${mvIdx}_frag`}>
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
      </React.Fragment>
    );
  });
  return (
    <div className="analysis-moves" style={{ width: "20vw" }}>
      {uiMoves}
    </div>
  );
};

export default AnalysisMoves;
