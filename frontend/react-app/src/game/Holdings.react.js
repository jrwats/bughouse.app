import React, { useRef } from "react";
import HeldPiece from "./HeldPiece.react";
import { opposite } from "chessground/util";

const PlayerHoldings = ({
  boardID,
  chessboard,
  chessground,
  color,
  container,
  gameID,
  holdings,
  onPredrop,
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
            container={container}
            gameID={gameID}
            key={piece}
            color={color}
            piece={piece}
            count={piece2count[piece]}
            viewOnly={viewOnly}
            onPredrop={onPredrop}
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
      onPredrop={onPredrop}
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
      {/* <PlayerHoldings */}
      {/*   boardID={boardID} */}
      {/*   gameID={gameID} */}
      {/*   chessground={chessground} */}
      {/*   chessboard={chessboard} */}
      {/*   color={opposite(orientation)} */}
      {/*   holdings={orientation === "white" ? blackHoldings : whiteHoldings} */}
      {/*   viewOnly={true} */}
      {/* /> */}
      {/* <PlayerHoldings */}
      {/*   boardID={boardID} */}
      {/*   gameID={gameID} */}
      {/*   chessground={chessground} */}
      {/*   color={orientation} */}
      {/*   chessboard={chessboard} */}
      {/*   holdings={orientation === "white" ? whiteHoldings : blackHoldings} */}
      {/*   viewOnly={viewOnly} */}
      {/* /> */}
    </div>
  );
};

export default Holdings;
