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
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';

const Color = {
  WHITE: 0,
  BLACK: 1,
};

function handles(boards) {
  return boards.flatMap(b =>
    [b.getBoard()?.white?.handle, b.getBoard()?.black?.handle]
  );
}

function inferOrientation(handle, boards) {
  let color = Color.WHITE;
  let flip = false;
  if (boards[0] != null) {
    const colors = boards.map(b => b.getHandleColor(handle));
    color = colors.find(c => c != null) === "black" ? Color.BLACK : Color.WHITE;
    flip = colors[1] != null;
  }
  return {color, flip}
}

const Analysis = ({ gamePath }) => {
  const [gameID] = gamePath.split("~");
  const { handle, socket } = useContext(SocketContext);
  const gamesSrc = GameStatusSource.get(socket);
  const game = gamesSrc.getGame(gameID);
  const origBoards = [game.getBoardA(), game.getBoardB()];
  const origOrientation = inferOrientation(handle, origBoards);
  const [boards, setBoards] = useState(origBoards);
  const [flipped, setFlipped] = useState(origOrientation.flip);
  const [orientation, setOrientation] = useState(origOrientation.color);

  useEffect(() => {
    const onGameSSUpdate = (game) => {
      if (game == null || game.getID() !== gameID) {
        return;
      }
      const newBoards = [game.getBoardA(), game.getBoardB()];
      const {color, flip} = inferOrientation(handle, newBoards);
      console.error(`onGameUpdate setting flipped...`);
      setBoards(newBoards);
      setFlipped(flip);
      setOrientation(color);
    }
    const onGameUpdate = (game) => {
      onGameSSUpdate(game);
      game.off('update', onGameUpdate);
    }
    gamesSrc.on('gameUpdate', onGameSSUpdate);
    game.on("update", onGameUpdate);
    return () => {
      gamesSrc.off('gameUpdate', onGameSSUpdate);
      game.off("update", onGameUpdate);
    };
  }, [gamesSrc, game]);

  useEffect(() => {
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
    setOrientation(Color.BLACK - orientation);
    onGameUpdate();
  };
  const flipBoards = (_e) => {
    setOrientation(Color.BLACK - orientation);
    setFlipped(!flipped);
    onGameUpdate();
  };

  const uiBoards = flipped ? boards.slice().reverse() : boards.slice();
  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <div style={{ flex: "3 1 40vw", height: "min(40vw, 90vh)" }}>
        <Board
          chessboard={uiBoards[0]}
          fen={uiBoards[0].getBoard().fen}
          gameID={gameID}
          id={`boardLeft`}
          orientation={orientation === Color.WHITE ? "white" : "black"}
        />
      </div>
      <div
        style={{
          flex: "1 1 auto",
          height: "min(40vw, 90vh)",
        }}
      >
        <div className="analysis-moves">
          <div className="flip-buttons">
            <span>
              <Button sx={{p: 1, m: 0}} variant="contained" color="primary" onClick={flipColors}>
                <SwapVertIcon fontSize="inherit" />
              </Button>
            </span>
            <span>
              <Button
                sx={{p: 1, m: 0}}
                variant="contained"
                color="secondary"
                onClick={flipBoards}
              >
                <SwapHorizIcon fontSize="inherit" />
              </Button>
            </span>
          </div>
          <div className="titles">
            <span className={flipped ? "b" : "a"}>
              <span className="arrow"><ArrowBack fontSize="inherit" /></span>
              {/* <span className="arrow">{"\u{2b60}"}</span> */}
              <span>Board {flipped ? "B" : "A"}</span>
            </span>
            <span className={flipped ? "a" : "b"}>
              <span>Board {flipped ? "A" : "B"}</span>
              <span className="arrow"><ArrowForward fontSize="inherit" /></span>
              {/* <span className="arrow">{"\u{2b62}"}</span> */}
            </span>
          </div>
        </div>
        <AnalysisMoves game={game} />
      </div>
      <div style={{ flex: "3 1 40vw", height: "min(40vw, 90vh)" }}>
        <Board
          chessboard={uiBoards[1]}
          fen={uiBoards[1].getBoard().fen}
          gameID={gameID}
          id={`boardRight`}
          orientation={orientation === Color.WHITE ? "black" : "white"}
        />
      </div>
    </div>
  );
};
export default Analysis;
