import React, { useContext, useEffect } from "react";
import AnalysisMoves from "./AnalysisMoves.react";
// import SideMenu from "../SideMenu.react";
import Board from "./Board.react";
import GameStatusSource from "./GameStatusSource";
import { SocketContext } from "../socket/SocketProvider";

const Analysis = ({ gamePath }) => {
  const [gameID] = gamePath.split("~");
  const { handle, socket } = useContext(SocketContext);
  const gamesSrc = GameStatusSource.get(socket);
  const game = gamesSrc.getGame(gameID);
  const boardA = game.getBoardA();
  const boardB = game.getBoardB();

  useEffect(() => {
    console.log(`requesting analysis`);
    socket && socket.sendEvent("analyze", { id: gameID });
  }, [socket]);

  const boards = [
    <Board
      chessboard={boardA}
      gameID={gameID}
      id="boardA"
      orientation="white"
    />,
    <Board
      chessboard={boardB}
      gameID={gameID}
      id="boardB"
      orientation="black"
    />,
  ];
  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <div style={{ flex: "3 1 40vw", height: "min(40vw, 90vh)" }}>
        {boards[0]}
      </div>
      <div style={{ flex: "1 1 auto" }}>
        <AnalysisMoves game={game} />
      </div>
      <div style={{ flex: "3 1 40vw", height: "min(40vw, 90vh)" }}>
        {boards[1]}
      </div>
    </div>
  );
};
export default Analysis;
