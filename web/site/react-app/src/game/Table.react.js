
import React, { useContext, useEffect, useState } from "react";
import Board from "./Board.react";
import GameStartCountdown from "./GameStartCountdown.react";
import GameStatusSource from "./GameStatusSource";
import { SocketContext } from "../socket/SocketProvider";
import invariant from "invariant";
import { Redirect } from "@reach/router";
import { opposite } from "chessground/util";
import ScreenLock from "./ScreenLock";

const Table = ({ gamePath }) => {

  const [gameID, orientation] = gamePath.split("~");
  const { handle, socket } = useContext(SocketContext);
  const gamesSrc = GameStatusSource.get(socket);
  const game = gamesSrc.getGame(gameID);
  const boardA = game.getBoardA();
  const boardB = game.getBoardB();

  useEffect(() => {
    console.log(`Table subscribing ${gameID}`);
    gamesSrc.observe(gameID);
  }, [gamesSrc, gameID]);

  const boards = [
    <Board
      chessboard={boardA}
      forming={true}
      gameID={gameID}
      id="boardA"
      orientation="white"
    />,
    <Board
      chessboard={boardB}
      forming={true}
      gameID={gameID}
      id="boardB"
      orientation="black"
    />,
  ];
  return (
    <div style={{ position: "relative", width: "100%" }}>
      {boards}
    </div>
  );
};
export default Table ;
