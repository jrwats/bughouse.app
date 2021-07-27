
import React, { useContext, useEffect, useState } from "react";
import Board from "./Board.react";
import GameStartCountdown from "./GameStartCountdown.react";
import GameStatusSource from "./GameStatusSource";
import { SocketContext } from "../socket/SocketProvider";
import invariant from "invariant";
import { Redirect } from "@reach/router";
import { opposite } from "chessground/util";
import ScreenLock from "./ScreenLock";

const GameFormation = ({ gamePath, children }) => {

  const [gameID, orientation] = gamePath.split("~");
  const { handle, socket } = useContext(SocketContext);
  const gamesSrc = GameStatusSource.get(socket);
  const game = gamesSrc.getGame(gameID);
  const boardA = game.getBoardA();
  const boardB = game.getBoardB();

  const boards = [
    <Board
      id="boardA"
      gameID={gameID}
      forming={true}
      chessboard={boardA}
      orientation="white"
    />,
    <Board
      id="boardB"
      gameID={gameID}
      chessboard={boardB}
      orientation="black"
    />,
  ];
  return (
    <div style={{ position: "relative", width: "100%" }}>
      {boards}
    </div>
  );
};
export default GameFormation ;
