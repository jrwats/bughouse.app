import React, { useContext, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import AnalysisMoves from "./AnalysisMoves.react";
// import SideMenu from "../SideMenu.react";
import Board from "./Board.react";
import GameStatusSource from "./GameStatusSource";
import { SocketContext } from "../socket/SocketProvider";
import SwapVertIcon from '@mui/icons-material/SwapVert';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

const Analysis = ({ gamePath }) => {
  const [gameID] = gamePath.split("~");
  const { handle, socket } = useContext(SocketContext);
  const [flippedBoards, setFlippedBoards] = useState(null);
  const [flippedColors, setFlippedColors] = useState(null);
  const gamesSrc = GameStatusSource.get(socket);
  const game = gamesSrc.getGame(gameID);

  useEffect(() => {
    console.log(`requesting analysis`);
    socket && socket.sendEvent("analyze", { id: gameID });
  }, [socket]);

  const onGameUpdate = () => {
    game.forceUpdate();
    // TODO:
    // setTimeout shouldn't be required... we're fighting React here...
    setTimeout(() => {
      game.forceUpdate();
    }, 50);
  };

  const flipColors = (_e) => {
    setFlippedColors(!flippedColors);
    onGameUpdate();
  };
  const flipBoards = (_e) => {
    setFlippedColors(!flippedColors);
    setFlippedBoards(!flippedBoards);
    onGameUpdate();
  };

  const boards = [game.getBoardA(), game.getBoardB()];
  if (flippedBoards) {
    boards.reverse();
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <div style={{ flex: "3 1 40vw", height: "min(40vw, 90vh)" }}>
        <Board
          chessboard={boards[0]}
          fen={boards[0].getBoard().fen}
          gameID={gameID}
          id={`boardLeft`}
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
            <span style={{ paddingLeft: "2em" }}>
              <Button variant="contained" color="primary" onClick={flipColors}>
                <SwapVertIcon />
                {/* {"\u{2B83}"} */}
              </Button>
            </span>
            <span>
              <Button
                variant="contained"
                color="secondary"
                onClick={flipBoards}
              >
                <SwapHorizIcon />
                {/* {"\u{2B82}"} */}
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
          id={`boardRight`}
          orientation={flippedColors ? "white" : "black"}
        />
      </div>
    </div>
  );
};
export default Analysis;
