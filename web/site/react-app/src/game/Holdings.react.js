import React from "react";
import HeldPiece from "./HeldPiece.react";
import { opposite } from "chessground/util";

const PlayerHoldings = ({
  boardID,
  chessground,
  chessboard,
  gameID,
  holdings,
  color,
  viewOnly,
}) => {
  const piece2count = { P: 0, B: 0, N: 0, R: 0, Q: 0 };
  for (const c of holdings) {
    ++piece2count[c];
  }
  return (
    <div style={{ height: "50%" }}>
      {Object.keys(piece2count).map((piece) => {
        const comp = (
          <HeldPiece
            boardID={boardID}
            chessgroundRef={chessground}
            chessboard={chessboard}
            gameID={gameID}
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
  boardID,
  gameID,
  height,
  chessground,
  chessboard,
  holdings,
  orientation,
  viewOnly,
}) => {
  const chars = (holdings || "").split("");
  const blackHoldings = chars
    .filter((c) => c === c.toLowerCase())
    .map((c) => c.toUpperCase());
  const whiteHoldings = chars.filter((c) => c === c.toUpperCase());
  return (
    <div
      class="holdings"
      style={{
        // display: "inline-block",
        position: "relative",
        height: height ? `${height}px` : "100%",
        // width: "min(5vw, 10vh)",
        flex: "1 1 0",
      }}
    >
      <PlayerHoldings
        color={opposite(orientation)}
        holdings={orientation === "white" ? blackHoldings : whiteHoldings}
        viewOnly={true}
      />
      <PlayerHoldings
        boardID={boardID}
        gameID={gameID}
        chessground={chessground}
        color={orientation}
        chessboard={chessboard}
        holdings={orientation === "white" ? whiteHoldings : blackHoldings}
        viewOnly={viewOnly}
      />
    </div>
  );
};

export default Holdings;
