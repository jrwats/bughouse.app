
import React, { useContext, useEffect } from "react";
import Board from "./Board.react";
import GameStatusSource from "./GameStatusSource";
import { SocketContext } from "../socket/SocketProvider";

const Table = ({ gamePath }) => {

  const [gameID] = gamePath.split("~");
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
  let variStyle = {};
  if (handle == null) {
    variStyle.opacity = '40%'
  }
  return (
    <div style={{ position: "relative", width: "100%", ...variStyle}}>
      {boards}
    </div>
  );
};
export default Table ;
