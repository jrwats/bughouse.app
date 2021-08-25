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
import MoveSound from "../sound/nes/Move.mp3";
import GenericNotifySound from "../sound/nes/GenericNotify.mp3";

let lastPlay = Date.now();
const playAudio = (file) => {
  // "debounce"
  const now = Date.now();
  const soundOff = parseInt(localStorage.getItem('soundOff') || 0);
  if (now - lastPlay < 200 || soundOff) {
    return;
  }
  console.log(`Playing ${file}`);
  lastPlay = now;
  const audio = new Audio(file);
  audio.volume = 0.5;
  audio.play();
  console.log(`${file}.play`);
}

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
  const chessgroundRef = React.useRef(null);

  const readEl = (el) => {
    if (el == null) {
      return;
    }
    const height = el.offsetHeight;
    const width = el.offsetWidth;
    let newSz = Math.floor(Math.min(height, width));
    newSz -= newSz % 32;
    setSz(newSz);
  };

  useEffect(() => {
    readEl(boardWrapperRef.current);
    const resizeObserver = new ResizeObserver((_entries) => {
      readEl(boardWrapperRef.current);
    });
    resizeObserver.observe(boardWrapperRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [boardWrapperRef]);


  const game = chessboard.getGame();
  useEffect(() => {
    const onUpdate = (_) => {
      console.log(`board.react.update(...)`);
      const board = chessboard.getBoard();
      const holdings = chessboard.getHoldings();
      const prevFen = chessgroundRef?.current?.cg?.state?.fen;
      if (fen != null && board.fen !== prevFen) {
        const colorToMove = board.fen.split(" ")[1] === "w" ? "white" : "black";
        const file = handleColor === colorToMove ? GenericNotifySound : MoveSound;
        playAudio(file);
      }
      setFEN(board.fen);
      setHandleColor(chessboard.getHandleColor(handle));
      setHoldings(holdings);
      setViewOnly(
        forming ||
        !chessboard.isInitialized() ||
        chessboard.getGame().isAnalysis() ||
        chessboard.getHandleColor(handle) == null
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
  if (finished && !chessboard.getGame().isAnalysis()) {
    alert = <GameOverMessage chessboard={chessboard} />;
  }
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%"
      }}>
      <BoardGutter
        forming={forming}
        color={opposite(orientation)}
        chessboard={chessboard}
      />
      <div style={{
        position: "relative", // for alert
        flex: "8 1 auto",
        display: "flex",
        maxHeight: "min(85vh, 44vw)",
        }}
      >
        {/* <Box */}
        <div
          id={id}
          style={{
            flex: "1 1 auto",
            display: "flex",
            flexWrap: "nowrap",
            margin: 0,
            padding: 0,
          }}
        >
          {alert}
          <Holdings
            boardID={id}
            chessground={chessgroundRef}
            gameID={gameID}
            height={sz}
            orientation={orientation}
            holdings={holdings}
            chessboard={chessboard}
            viewOnly={viewOnly}
          />
          <div ref={boardWrapperRef} style={{
            position: "relative",
            flex: "8 1 auto"
            }}>
            <div
              style={{
                position: "absolute",
                height: sz == null ? "100%" : sz + "px",
                width: sz == null ? "100%" : sz + "px"
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

                  // Done so that a gameUpdate will trigger a
                  // re-render if the move was illegal
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
        </div>
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
      </div>
      <BoardGutter
        forming={forming}
        color={orientation}
        chessboard={chessboard}
      />
    </div>
  );
};

export default Board;
