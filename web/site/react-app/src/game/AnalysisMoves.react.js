import React, { useEffect, useState } from "react";
// import { opposite } from "chessground/util";

const AnalysisMoves = ({game}) => {
  let [moves, setMoves] = useState(game.getMoves() || []);
  useEffect(() => {
    const onGameUpdate = () => {
      setMoves(game.getMoves());
    }
    game.on('update', onGameUpdate);
    return () => {
      game.off('update', onGameUpdate);
    };
  }, [game]);

  const uiMoves = moves.map(mv => {
    return (
      <div>
        {mv.num}: {mv.src || '@'} => {mv.dest}
      </div>
    );
  });
  return (
    <div id="analysis_moves" style={{width: "10vw"}}>
      {uiMoves}
    </div>
  );
}

export default AnalysisMoves;
