import React, { useContext, useEffect, useState } from "react";
import Chessground from "react-chessground";
import Holdings from "./Holdings.react";
import BoardGutter from "./BoardGutter.react";
import "./chessground.css";
import { SocketContext } from "../socket/SocketProvider";
import { opposite } from "chessground/util";
import GameOverMessage from "./GameOverMessage.react";
import invariant from "invariant";

const Board = ({ chessboard, forming, orientation, gameID, id }) => {
  const { socket, handle } = useContext(SocketContext);
  const [viewOnly, setViewOnly] = useState(forming);
  const [fen, setFEN] = useState(chessboard.getBoard().fen);
  const [holdings, setHoldings] = useState(chessboard.getHoldings());
  const [finished, setFinished] = useState(chessboard.isFinished());
  const game = chessboard.getGame();
  useEffect(() => {
    const onUpdate = (_) => {
      console.log(`board.react.update(...)`);
      const board = chessboard.getBoard();
      const holdings = chessboard.getHoldings();
      setFEN(board.fen);
      console.log(`fen: ${board.fen}`);
      setHoldings(holdings);
      setViewOnly(
        forming || 
        (chessboard.isInitialized() && chessboard.getHandleColor(handle) == null)
      );
    };
    const onGameOver = () => {
      console.log(`onGameOver`);
      invariant(chessboard.isFinished(), "WTF?");
      setFinished(true);
    };
    chessboard.on("update", onUpdate);
    chessboard.on("gameOver", onGameOver);
    return () => {
      chessboard.off("update", onUpdate);
      chessboard.off("gameOver", onGameOver);
    };
  }, [forming, handle, chessboard]);

  useEffect(() => {
    const onGameOver = (_dat) => {
      setFinished(true);
    };
    game.on("gameOver", onGameOver);
    return () => {
      game.off("gameOver", onGameOver);
    };
  }, [game]);

  const chessgroundRef = React.useRef(null);

  let alert = null;
  if (finished) {
    alert = <GameOverMessage chessboard={chessboard} />;
  }

  console.log(`board.react fen: ${fen}`);
  // animation={{ enabled: false, duration: 150 }} 
  return (
    <div style={{ display: "inline-block", width: "50%" }}>
      <BoardGutter forming={forming} color={opposite(orientation)} chessboard={chessboard} />
      <div
        id={id}
        style={{
          position: "relative",
          height: "min(44vw, 90vh)",
          width: "100%",
        }}
      >
        {alert}
        <Holdings
          boardID={id}
          chessground={chessgroundRef}
          gameID={gameID}
          orientation={orientation}
          holdings={holdings}
          chessboard={chessboard}
          viewOnly={viewOnly}
        />
        <Chessground
          ref={chessgroundRef}
          key={chessboard.getID()}
          fen={fen}
          onMove={(from, to) => {
            console.log(`onMove ${JSON.stringify(from)} ${JSON.stringify(to)}`);
            // Send UCI formatted move
            socket.sendEvent("move", { id: gameID, move: `${from}${to}` });
            // Done so that a gameUpdate will trigger a re-render if the move was illegal
            setFEN(null); 
          }}
          animation={{ enabled: false }} 
          viewOnly={viewOnly}
          orientation={orientation}
          pieceKey={true}
          coordinates={false}
          drawable={{ enabled: false }}
          promotion={(e) => {
            debugger;
          }}
          style={{ display: "inline-block" }}
        />
      </div>
      <BoardGutter forming={forming} color={orientation} chessboard={chessboard} />
    </div>
  );
};

export default Board;
