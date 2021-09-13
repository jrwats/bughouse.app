import React, { useContext, useEffect, useState } from "react";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import AnalysisMoves from "./AnalysisMoves.react";
// import SideMenu from "../SideMenu.react";
import Board from "./Board.react";
import GameStatusSource from "./GameStatusSource";
import { SocketContext } from "../socket/SocketProvider";

const Analysis = ({ gamePath }) => {
  const [gameID] = gamePath.split("~");
  const { handle, socket } = useContext(SocketContext);
  const [flippedBoards, setFlippedBoards] = useState(null);
  const [flippedColors, setFlippedColors] = useState(null);
  const gamesSrc = GameStatusSource.get(socket);
  const game = gamesSrc.getGame(gameID);
  const [boardA, setBoardA] = useState({val: game.getBoardA()});
  const [boardB, setBoardB] = useState({val: game.getBoardB()});

  useEffect(() => {
    console.log(`requesting analysis`);
    socket && socket.sendEvent("analyze", { id: gameID });
  }, [socket]);

  const onGameUpdate = () => {
    // debugger;
    setBoardA({val: game.getBoardA()});
    setBoardB({val: game.getBoardB()});
    game.forceUpdate();
  };

  const flipColors = (_e) => { setFlippedColors(!flippedColors); onGameUpdate(); };
  const flipBoards = (_e) => { setFlippedBoards(!flippedBoards); onGameUpdate(); };
  const boards = [game.getBoardA(), game.getBoardB()];
  if (flippedBoards) {
    boards.reverse();
  }

  // const boards = [
  //   <Board
  //     chessboard={flippedBoards ? boardB : boardA}
  //     gameID={gameID}
  //     orientation={flippedColors ? "black" : "white"}
  //   />,
  //   <Board
  //     chessboard={flippedBoards ? boardA : boardB}
  //     gameID={gameID}
  //     orientation={flippedColors ? "white" : "black"}
  //   />,
  // ];
  //

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <div style={{ flex: "3 1 40vw", height: "min(40vw, 90vh)" }}>
        <Board
          chessboard={boards[0]}
          fen={boards[0].getBoard().fen}
          gameID={gameID}
          orientation={flippedColors ? "black" : "white"}
        />
      </div>
      <div
        style={{
          flex: "1 1 auto",
          overflowX: "visible",
          overflowY: "auto",
          height: "min(40vw, 90vh)",
        }}
      >
        <div className="analysis-moves">
          <div className="flip-buttons">
            <span style={{paddingLeft: "2em"}}>
              <Button variant="contained" color="primary" onClick={flipColors} >
                {"\u{2B83}"}
              </Button>
            </span>
            <span>
              <Button variant="contained" color="secondary" onClick={flipBoards} >
                {"\u{2B82}"}
              </Button>
            </span>
          </div>
          <div className="titles">
            <span className={flippedBoards ? "b" : "a"}>
              <span className="arrow">{"\u{2b60}"}</span>
              <span>Board {flippedBoards ? "B" : "A"}</span>
            </span>
            <span className={flippedBoards ? "a" : "b"}>
              <span>Board {flippedBoards ? "A" : "B"}</span>
              <span className="arrow">{"\u{2b62}"}</span>
            </span>
          </div>
        </div>
        <AnalysisMoves game={game} flippedBoards={flippedBoards} />
      </div>
      <div style={{ flex: "3 1 40vw", height: "min(40vw, 90vh)" }}>
        <Board
          chessboard={boards[1]}
          fen={boards[1].getBoard().fen}
          gameID={gameID}
          orientation={flippedColors ? "white" : "black"}
        />
      </div>
    </div>
  );
};
export default Analysis;
