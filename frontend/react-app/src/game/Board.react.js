import React, { useContext, useEffect, useRef, useState } from "react";
import "./chessground.css";
import BoardGutter from "./BoardGutter.react";
import Chessground from "@jrwats/react-chessground";
import GameOverMessage from "./GameOverMessage.react";
import Holdings from "./Holdings.react";
import PromotionDialog from "./PromotionDialog.react";
import invariant from "invariant";
import { LETTERS, NAMES, PIECES } from "./Piece";
import { SocketContext } from "../socket/SocketProvider";
import { eventPosition, opposite } from "chessground/util";
import { cancelDropMode, drop, setDropMode } from "chessground/drop";
import { whitePov } from "chessground/board";
import MoveSound from "../sound/nes/Move.mp3";
import GenericNotifySound from "../sound/nes/GenericNotify.mp3";

let lastPlay = Date.now();
const playAudio = (file) => {
  // "debounce"
  const now = Date.now();
  const soundOff = parseInt(localStorage.getItem("soundOff") || 0);
  if (now - lastPlay < 200 || soundOff) {
    return;
  }
  lastPlay = now;
  const audio = new Audio(file);
  audio.volume = 0.5;
  audio.play();
};

export const BoardContext = {
  CURRENT: "current",
};

const isViewOnly = (forming, handle, chessboard) =>
  forming ||
  !chessboard.isInitialized() ||
  chessboard.getGame().isAnalysis() ||
  chessboard.getHandleColor(handle) == null;

const getData = (cb, color) => cb.getBoard()[color]

const Board = ({
  chessboard,
  fen,
  context,
  forming,
  orientation,
  gameID,
  id,
}) => {
  const { socket, handle } = useContext(SocketContext);
  const [boardFEN, setFEN] = useState(fen || chessboard.getBoard().fen);
  const premove = useRef(null);
  const [holdings, setHoldings] = useState(chessboard.getHoldings());
  const [finished, setFinished] = useState(chessboard.isFinished());
  const [handleColor, setHandleColor] = useState(
    chessboard.getHandleColor(handle)
  );
  const [viewOnly, setViewOnly] = useState(
    isViewOnly(forming, handle, chessboard)
  );
  const [promoVisible, setPromoVisible] = useState(false);
  const [boardData, setBoardData] = useState(chessboard.getBoard());
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [sz, setSz] = useState(null);
  const pendingMove = useRef({});
  const boardWrapperRef = useRef(null);
  const chessgroundRef = React.useRef(null);

  const readEl = (el) => {
    if (el == null) {
      return;
    }
    const height = el.offsetHeight * 0.8;
    const width = el.offsetWidth * 0.88;
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
    setViewOnly(isViewOnly(forming, handle, chessboard));
    const onUpdate = (_) => {
      const board = chessboard.getBoard();
      const holdings = chessboard.getHoldings();
      const prevFen = chessgroundRef?.current?.cg?.state?.fen;
      console.log(`onUpdate premove: ${premove.current}`);
      const colorToMove = board.fen.split(" ")[1] === "w" ? "white" : "black";
      if (colorToMove === handleColor) {
        if (boardFEN != null && board.fen !== prevFen) {
          const file =
            handleColor === colorToMove ? GenericNotifySound : MoveSound;
          playAudio(file);
        }
        if (premove.current != null) {
          console.log(`sending premove: ${premove.current}`);
          socket.sendEvent("move", { id: gameID, move: premove.current });
          premove.current = null;
          chessgroundRef.current.cg.cancelPremove();
          chessgroundRef.current.cg.cancelPredrop();
        }
      }
      setBoardData(board);
      setFEN(board.fen);
      setHandleColor(chessboard.getHandleColor(handle));
      setHoldings(holdings);
      setViewOnly(isViewOnly(forming, handle, chessboard));
    };
    const onGameOver = () => {
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
    alert = <GameOverMessage context={context} chessboard={chessboard} />;
  }
  const premovable = {
    enabled: true,
    castle: true,
    events: {
      set: (src, dest) => {
        console.log(`premove: ${src}, ${dest}`);
        premove.current = `${src}${dest}`;
      },
      unset: () => {
        console.log(`unsetting premove: ${id}`);
        premove.current = null;
      },
    },
  };

  const onPredrop = (move) => {
    console.log(`onPredrop(${move})`);
    premove.current = move;
  };

  const predroppable = {
    enabled: true,
    events: {
      set: (role, key) => {
        const piece = LETTERS[role].toUpperCase();
        onPredrop(`${piece}@${key}`);
      },
      unset: () => {
        console.log(`unsetting predrop: ${id}`);
        premove.current = null;
      },
    },
  };
  window[`__dbg${id}`] = chessgroundRef?.current?.cg;

  const turnColor =
    boardFEN != null && boardFEN.split(" ")[1] === "w" ? "white" : "black";

  const setDropSelect = viewOnly
    ? (_) => {}
    : (piece) => {
      const cg= chessgroundRef.current.cg;
      setSelectedPiece(piece);
      if (piece == null) {
        cancelDropMode(cg.state);
      } else {
        // cg.cancelMove();
        cg.cancelPremove();
        setDropMode(cg.state, {role: NAMES[piece], color: handleColor});
      }
    };

  const afterNewPiece = (role, dest) => {
    const piece = LETTERS[role].toUpperCase();
    console.log(`afterNewpiece(${role}, ${dest})`);
  }

  const onClick = (evt) => {
    if (selectedPiece != null) {
      console.log('click: clearing dropmode');
      setDropSelect(null);
    }
  }

  const onDropNewPiece = (cgPiece, key) => {
    const piece = LETTERS[cgPiece.role].toUpperCase();
    socket.sendEvent("move", { id: gameID, move: `${piece}@${key}` });
    console.log('onDropPiece clearing dropmode');
    setDropSelect(null);
  }

  const onMove = (from, to, e) => {
    console.log(
      `onMove ${JSON.stringify(from)} ${JSON.stringify(to)}`
    );
    setDropSelect(null);
    const pieces = chessgroundRef.current.cg.state.pieces;
    if (
      handleColor === turnColor &&
      pieces.get(to)?.role === PIECES.PAWN &&
      ((to[1] === "1" && turnColor === "black") ||
        (to[1] === "8" && turnColor === "white"))
    ) {
      setPromoVisible(true);
      pendingMove.current = { from, to };
      return;
    } else if (chessboard.getStart() > Date.now()) {
      const cg = chessgroundRef.current.cg;
      cg.state.premovable.current = [from, to];
      cg.state.premovable.events.set(from, to);
      return;
    }

    // Send UCI formatted move
    socket.sendEvent("move", {
      id: gameID,
      move: `${from}${to}`,
    });

    // Done so that a gameUpdate will trigger a
    // re-render if the move was illegal
    setFEN(null);
  };

  return (
    <div
      ref={boardWrapperRef}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      <BoardGutter
        forming={forming}
        color={opposite(orientation)}
        chessboard={chessboard}
        data={boardData[opposite(orientation)]}
      />
      <div
        style={{
          position: "relative", // for alert
          // flex: "8 1 auto",
          display: "flex",
        }}
      >
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
            chessboard={chessboard}
            chessground={chessgroundRef}
            gameID={gameID}
            height={sz}
            holdings={holdings}
            selectedPiece={selectedPiece}
            onDropSelect={setDropSelect}
            onPredrop={onPredrop}
            orientation={orientation}
            viewOnly={viewOnly}
          />
          <div
            style={{
              position: "relative",
              flex: "8 1 auto",
              height: "100%",
            }}
          >
            <div
              onClick={onClick}
              style={{
                position: "absolute",
                height: sz == null ? "100%" : sz + "px",
                width: sz == null ? "100%" : sz + "px",
              }}
            >
              <Chessground
                animation={{ enabled: true, duration: 100 }}
                coordinates={true}
                disableContextMenu={true}
                drawable={{ enabled: false }}
                fen={boardFEN}
                key={chessboard.getID()}
                lastMove={chessboard.getLastMove()}
                movable={{
                  color: handleColor ?? undefined,
                  events: {afterNewPiece},
                }}
                onMove={onMove}
                onDropNewPiece={onDropNewPiece}
                orientation={orientation}
                pieceKey={true}
                predroppable={viewOnly ? null : predroppable}
                premovable={viewOnly ? null : premovable}
                ref={chessgroundRef}
                turnColor={turnColor}
                viewOnly={viewOnly}
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
        data={boardData[orientation]}
      />
    </div>
  );
};

export default Board;
