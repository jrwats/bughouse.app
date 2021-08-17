import React, { useContext, useEffect } from "react";
import SideMenu from "../SideMenu.react";
import Board from "./Board.react";
import GameStatusSource from "./GameStatusSource";
import { SocketContext } from "../socket/SocketProvider";
import { navigate } from "@reach/router";

const Table = ({ gamePath }) => {
  const [gameID] = gamePath.split("~");
  const { handle, socket } = useContext(SocketContext);
  const gamesSrc = GameStatusSource.get(socket);
  const game = gamesSrc.getGame(gameID);
  const boardA = game.getBoardA();
  const boardB = game.getBoardB();

  const onGame = (data) => {
    console.log(`Table.onGame navigating to arena ${data.id}`);
    navigate(`/arena/${data.id}`);
  };
  useEffect(() => {
    socket.on("game_update", onGame);
    socket.on("game_start", onGame);
    return () => {
      socket.off("game_update", onGame);
      socket.off("game_start", onGame);
    };
  }, [socket]);
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
    variStyle.opacity = "40%";
  }
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        ...variStyle,
      }}
    >
      <SideMenu style={{ position: "absolute" }} />
      <div
        style={{
          width: "calc(100% - 3em)",
          marginLeft: "3em",
        }}
      >
        {boards}
      </div>
    </div>
  );
};
export default Table;
