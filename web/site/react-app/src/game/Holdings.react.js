import React from "react";
import HeldPiece from "./HeldPiece.react";
import { opposite } from "chessground/util";

const PlayerHoldings = ({
  chessground,
  chessboard,
  holdings,
  color,
  viewOnly,
}) => {
  const piece2count = {P: 0, B: 0, N: 0, R: 0, Q: 0};
  for (const c of holdings) {
    ++piece2count[c];
  }
  return (
    <div style={{ height: "50%" }}>
      {Object.keys(piece2count).map((piece) => {
        const comp = (
          <HeldPiece
            chessgroundRef={chessground}
            chessboard={chessboard}
            key={piece}
            color={color}
            piece={piece}
            count={piece2count[piece]}
            viewOnly={viewOnly}
          />
        );
        return comp;
      })}
    </div>
  );
};

const Holdings = ({
  chessground,
  chessboard,
  holdings,
  orientation,
  viewOnly,
}) => {
  const chars = (holdings || '').split('');
  const blackHoldings = chars.filter(c => c === c.toLowerCase()).map(c => c.toUpperCase());
  const whiteHoldings = chars.filter(c => c === c.toUpperCase());
  return (
    <div
      style={{
        display: "inline-block",
        position: "relative",
        height: "100%",
        width: "min(5vw, 10vh)",
      }}
    >
      <PlayerHoldings
        color={opposite(orientation)}
        holdings={orientation === 'white' ? blackHoldings : whiteHoldings}
        viewOnly={true}
      />
      <PlayerHoldings
        chessground={chessground}
        color={orientation}
        chessboard={chessboard}
        holdings={orientation === 'white' ? whiteHoldings : blackHoldings}
        viewOnly={viewOnly}
      />
    </div>
  );
};

export default Holdings;
