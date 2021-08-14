import React, { useContext, useEffect, useState } from "react";
import Board from "./Board.react";
import GameStatusSource from "./GameStatusSource";
import { SocketContext } from "../socket/SocketProvider";
import invariant from "invariant";
import { Redirect } from "@reach/router";
import { opposite } from "chessground/util";
import ScreenLock from "./ScreenLock";

const FicsArena = ({ gamePair }) => {
  const { handle, socket } = useContext(SocketContext);
  const gamesSrc = GameStatusSource.get(socket);
  let [id1, id2] = gamePair.split("~");
  console.log(`Arena ${id1}/${id2} ${handle}`);
  if (id1 === id2) {
    id2 = null;
  }
  const [board1, setBoard1] = useState(gamesSrc.getBoard(id1));
  const [board2, setBoard2] = useState(gamesSrc.getBoard(id2));
  useEffect(() => {
    setBoard1(gamesSrc.getBoard(id1));
  }, [gamesSrc, id1]);
  useEffect(() => {
    setBoard2(gamesSrc.getBoard(id2));
  }, [gamesSrc, id2]);
  const [handleColor1, setHandleColor1] = useState(
    board1.getHandleColor(handle)
  );
  const [handleColor2, setHandleColor2] = useState(
    board2 != null ? board2.getHandleColor(handle) : null
  );
  useEffect(() => {
    const onBoard1 = () => {
      const newHC1 = board1.getHandleColor(handle);
      console.log(
        `onBoard1 ${handle} ${newHC1} ${JSON.stringify(board1.getBoard())}`
      );
      setHandleColor1(newHC1);
    };
    onBoard1();
    board1.on("init", onBoard1);
    return () => {
      board1.off("init", onBoard1);
    };
  }, [handle, board1, gamesSrc]);
  useEffect(() => {
    const onBoard2 = () => {
      const newHC2 = board2.getHandleColor(handle);
      console.log(
        `onBoard2 ${handle} ${newHC2} ${JSON.stringify(board2.getBoard())}`
      );
      invariant(board2 != null, "wtf");
      console.log(`setHandleColor2(${newHC2})`);
      setHandleColor2(newHC2);
    };
    onBoard2();
    board2.on("init", onBoard2);
    return () => {
      board2.off("init", onBoard2);
    };
  }, [handle, board2, gamesSrc]);

  // Run only once on first load
  useEffect(() => {
    console.log(`Arena subscribing ${id1} ${id2}`);
    gamesSrc.observe(id1);
    if (id2 != null) {
      gamesSrc.observe(id2);
    }
  }, [gamesSrc, id1, id2]);
  useEffect(() => {
    ScreenLock.attemptAcquire();
  }, [id1, id2]);

  let orientation1 = handleColor1 || "white";
  console.log(
    `Arena hc1: ${handleColor1} o1: ${orientation1}, hc2: ${handleColor2}`
  );

  let boardView2 = null;
  if (id2 != null) {
    if (handleColor2 != null) {
      invariant(
        handleColor1 == null,
        `Viewer can't be on both boards: ${handleColor1} ${handleColor2}`
      );
      return <Redirect to={`/home/arena/${id2}~${id1}`} />;
    }
    boardView2 = (
      <Board chessboard={board2} orientation={opposite(orientation1)} />
    );
    console.log(`Arena hc2: ${handleColor2}`);
  } else {
    console.log(`Arena only observing one game?`);
  }

  return (
    <div style={{ width: "100%" }}>
      <Board id="board1" chessboard={board1} orientation={orientation1} />
      {boardView2}
    </div>
  );
};

export default FicsArena;
