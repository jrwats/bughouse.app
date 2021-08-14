import React, { useContext, useEffect, useState } from "react";
import Board from "./Board.react";
import GameStartCountdown from "./GameStartCountdown.react";
import GameStatusSource from "./GameStatusSource";
import { SocketContext } from "../socket/SocketProvider";
import { ViewerContext } from "../user/ViewerProvider";
import invariant from "invariant";
import { Redirect } from "@reach/router";
import { opposite } from "chessground/util";
import ScreenLock from "./ScreenLock";

const Orientation = {
  DEFAULT: 0,
  FLIPPED: 1, // Board B on left
  BLACK: 2, // Black's POV
};

const Arena = ({ gamePath }) => {
  const paths = gamePath.split("~");
  const gameID = paths[0];
  let orientation = paths[1];
  const { socket } = useContext(SocketContext);
  const { handle } = useContext(ViewerContext);
  const gamesSrc = GameStatusSource.get(socket);

  const game = gamesSrc.getGame(gameID);
  const boardA = game.getBoardA();
  const boardB = game.getBoardB();
  const [handleColorA, setHandleColorA] = useState(
    boardA.getHandleColor(handle)
  );
  const [handleColorB, setHandleColorB] = useState(
    boardB != null ? boardB.getHandleColor(handle) : null
  );
  useEffect(() => {
    const onboardA = () => {
      const newHC1 = boardA.getHandleColor(handle);
      console.log(
        `onboardA ${handle} ${newHC1} ${JSON.stringify(boardA.getBoard())}`
      );
      setHandleColorA(newHC1);
    };
    onboardA();
    boardA.on("init", onboardA);
    return () => {
      boardA.off("init", onboardA);
    };
  }, [handle, boardA, gamesSrc]);
  useEffect(() => {
    const onboardB = () => {
      const newHC2 = boardB.getHandleColor(handle);
      console.log(
        `onboardB ${handle} ${newHC2} ${JSON.stringify(boardB.getBoard())}`
      );
      invariant(boardB != null, "wtf");
      console.log(`setHandleColorB(${newHC2})`);
      setHandleColorB(newHC2);
    };
    onboardB();
    boardB.on("init", onboardB);
    return () => {
      boardB.off("init", onboardB);
    };
  }, [handle, boardB, gamesSrc]);

  // Run only once on first load
  useEffect(() => {
    console.log(`Arena subscribing ${gameID}`);
    gamesSrc.observe(gameID);
  }, [gamesSrc, gameID]);
  useEffect(() => {
    ScreenLock.attemptAcquire();
  }, []);

  // TODO make this user-controlled/editable (for observers etc)
  if (orientation == null || orientation === '') {
    orientation = handleColorB ? Orientation.FLIPPED : Orientation.DEFAULT;
    const color = handleColorA || handleColorB;
    orientation |= color === 'black' ? Orientation.BLACK : 0;
  } else {
    orientation = parseInt(orientation);
  }

  // let orientation = null;
  let viewerOrientation =
    orientation & Orientation.BLACK
        ? "black"
        : "white"
  let orientationA =
    orientation & Orientation.FLIPPED
      ? opposite(viewerOrientation)
      : viewerOrientation;

  console.log(`hca: ${handleColorA}, hcb: ${handleColorB}, orientation: ${orientation}`);
  const boards = [
    <Board
      id="boardA"
      key="boardA"
      gameID={gameID}
      chessboard={boardA}
      orientation={orientationA}
    />,
    <Board
      id="boardB"
      key="boardB"
      gameID={gameID}
      chessboard={boardB}
      orientation={opposite(orientationA)}
    />,
  ];
  const countdown = game && <GameStartCountdown key="countdown" start={game.getStart()} />;

  if (orientation & Orientation.FLIPPED) {
    boards.reverse();
  }
  return (
    <div id="arena" style={{ position: "relative", width: "100%" }}>
      {boards}
      {countdown}
    </div>
  );
};

export default Arena;
