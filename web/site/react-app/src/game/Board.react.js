import React, { useContext, useEffect, useRef, useState } from "react";
import "./chessground.css";
import BoardGutter from "./BoardGutter.react";
import Box from "@material-ui/core/Box";
import Chessground from "react-chessground";
import GameOverMessage from "./GameOverMessage.react";
import Holdings from "./Holdings.react";
import PromotionDialog from "./PromotionDialog.react";
import invariant from "invariant";
import { PIECES } from "./Piece";
import { SocketContext } from "../socket/SocketProvider";
import { opposite } from "chessground/util";

const Board = ({ chessboard, forming, orientation, gameID, id }) => {
  const { socket, handle } = useContext(SocketContext);
  const [viewOnly, setViewOnly] = useState(forming);
  const [fen, setFEN] = useState(chessboard.getBoard().fen);
  const [holdings, setHoldings] = useState(chessboard.getHoldings());
  const [finished, setFinished] = useState(chessboard.isFinished());
  const [handleColor, setHandleColor] = useState(
    chessboard.getHandleColor(handle)
  );
  const [promoVisible, setPromoVisible] = useState(false);
  const [sz, setSz] = useState(null);
  const pendingMove = useRef({});
  const boardWrapperRef = useRef(null);

  const readEl = (el) => {
    if (el == null) {
      return;
    }
    const height = el.offsetHeight;
    const width = el.offsetWidth;
    let newSz = Math.floor(Math.min(height, width));
    newSz -= newSz % 32;
    console.log(`height: ${height}, width: ${width}, newSz: ${newSz}`);
    setSz(newSz);
  };
  useEffect(() => {
    readEl(boardWrapperRef.current);
    const resizeObserver = new ResizeObserver((entries) => {
      readEl(boardWrapperRef.current);
    });
    resizeObserver.observe(boardWrapperRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [boardWrapperRef]);

  const chessgroundRef = React.useRef(null);

  const game = chessboard.getGame();
  useEffect(() => {
    const onUpdate = (_) => {
      console.log(`board.react.update(...)`);
      const board = chessboard.getBoard();
      const holdings = chessboard.getHoldings();
      setFEN(board.fen);
      console.log(`fen: ${board.fen}`);
      setHandleColor(chessboard.getHandleColor(handle));
      setHoldings(holdings);
      setViewOnly(
        forming ||
          (chessboard.isInitialized() &&
            chessboard.getHandleColor(handle) == null)
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

  let alert = null;
  if (finished) {
    alert = <GameOverMessage chessboard={chessboard} />;
  }
  return (
    <div style={{ display: "inline-block", width: "50%" }}>
      <BoardGutter
        forming={forming}
        color={opposite(orientation)}
        chessboard={chessboard}
      />
      <div
        style={{
          position: "relative",
          height: "min(90vh, 44vw)",
        }}
      >
        {alert}
        <Box
          id={id}
          display="flex"
          flexWrap="nowrap"
          p={1}
          m={1}
          style={{
            position: "relative",
            margin: 0,
            padding: 0,
            height: "100%",
          }}
        >
          <Holdings
            boardID={id}
            chessground={chessgroundRef}
            gameID={gameID}
            orientation={orientation}
            holdings={holdings}
            chessboard={chessboard}
            viewOnly={viewOnly}
          />
          <div ref={boardWrapperRef} style={{ height: "100%", flex: "8 1 0" }}>
            <div
              style={{
                position: "absolute",
                height: sz == null ? "100%" : sz + "px",
                width: sz == null ? "100%" : sz + "px",
                backgroundColor: "#ff0000",
              }}
            >
              <Chessground
                ref={chessgroundRef}
                key={chessboard.getID()}
                fen={fen}
                onMove={(from, to, e) => {
                  const pieces = chessgroundRef.current.cg.state.pieces;
                  const sideToMove = fen.split(" ")[1];
                  const colorToMove = sideToMove === "w" ? "white" : "black";
                  if (
                    handleColor === colorToMove &&
                    pieces.get(to)?.role === PIECES.PAWN &&
                    ((to[1] === "1" && sideToMove === "b") ||
                      (to[1] === "8" && sideToMove === "w"))
                  ) {
                    setPromoVisible(true);
                    pendingMove.current = { from, to };
                    return;
                  }
                  console.log(
                    `onMove ${JSON.stringify(from)} ${JSON.stringify(to)}`
                  );
                  // Send UCI formatted move
                  socket.sendEvent("move", {
                    id: gameID,
                    move: `${from}${to}`,
                  });
                  // Done so that a gameUpdate will trigger a re-render if the move was illegal
                  setFEN(null);
                }}
                animation={{ enabled: true, duration: 100 }}
                viewOnly={viewOnly}
                orientation={orientation}
                pieceKey={true}
                coordinates={false}
                drawable={{ enabled: false }}
              />
            </div>
          </div>
        </Box>
        <PromotionDialog
          color={orientation}
          open={promoVisible}
          onClose={(piece) => {
            let { from, to } = pendingMove.current;
            if (to != null && piece !== "x") {
              socket.sendEvent("move", {
                id: gameID,
                move: `${from}${to}${piece}`,
              });
            } else if (piece === "x") {
              console.error(`How was promotion dialog open?`);
            }
            setPromoVisible(false);
          }}
          selectedValue={"x"}
        />
        <BoardGutter
          forming={forming}
          color={orientation}
          chessboard={chessboard}
        />
      </div>
    </div>
  );
};

export default Board;
