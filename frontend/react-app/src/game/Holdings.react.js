import React, { useRef, useState } from "react";
import HeldPiece from "./HeldPiece.react";
import { opposite } from "chessground/util";

const PlayerHoldings = (props) => {
  const piece2count = { P: 0, B: 0, N: 0, R: 0, Q: 0 };
  for (const c of props.holdings) {
    ++piece2count[c];
  }
  return (
    <div style={{ height: "50%" }}>
      {Object.keys(piece2count).map((piece) => {
        const comp = (
          <HeldPiece
            {...props}
            key={piece}
            piece={piece}
            selected={!props.viewOnly && piece === props.selectedPiece}
            count={piece2count[piece]}
          />
        );
        return comp;
      })}
    </div>
  );
};

const Holdings = ({
  boardID,
  chessboard,
  chessground,
  gameID,
  height,
  holdings,
  selectedPiece,
  onDropSelect,
  onPredrop,
  orientation,
  viewOnly,
}) => {
  const chars = (holdings || "").split("");
  const blackHoldings = chars
    .filter((c) => c === c.toLowerCase())
    .map((c) => c.toUpperCase());
  const whiteHoldings = chars.filter((c) => c === c.toUpperCase());
  const containerRef = useRef(null);
  const getPlayerHoldings = (color, playerHoldings) => (
    <PlayerHoldings
      boardID={boardID}
      gameID={gameID}
      chessground={chessground}
      chessboard={chessboard}
      container={containerRef}
      color={color}
      holdings={playerHoldings}
      selectedPiece={selectedPiece}
      onPredrop={onPredrop}
      onDropSelect={onDropSelect}
      viewOnly={color !== orientation}
    />
  );
  return (
    <div
      className="holdings"
      ref={containerRef}
      style={{
        // display: "inline-block",
        // width: "min(5vw, 10vh)",
        position: "relative",
        height: height ? `${height}px` : "100%",
        width: height ? `${Math.floor(height / 8)}px` : undefined,
        flex: "1 1 1",
      }}
    >
      {getPlayerHoldings(
        opposite(orientation),
        orientation === "white" ? blackHoldings : whiteHoldings
      )}
      {getPlayerHoldings(
        orientation,
        orientation === "white" ? whiteHoldings : blackHoldings
      )}
    </div>
  );
};

export default Holdings;
