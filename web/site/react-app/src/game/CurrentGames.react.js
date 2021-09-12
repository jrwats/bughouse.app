import React, { useContext, useEffect, useRef, useState } from "react";
import Box from "@material-ui/core/Box";
import Board, { BoardContext } from "./Board.react";
import Grid from "@material-ui/core/Grid";
import GameStatusSource from "./GameStatusSource";
import { SocketContext } from "../socket/SocketProvider";

const vals = (obj) => Object.keys(obj).map(key => obj[key]);

const CurrentGames = () => {
  const { socket } = useContext(SocketContext);
  const src = GameStatusSource.get(socket)
  const id2game = useRef({});
  const [uiGames, setGames] = useState(vals(id2game.current));

  useEffect(() => {
    const onCurrentGames = ({games}) => {
      id2game.current = games;
      setGames(Array.from(games.values()));
    };

    const onCurrentGame = (data) => {
      if (data.add || data.update) {
        id2game.current.set(data.id, src.getGame(data.id));
      } else if (data.rm) {
        console.error(`Scheduling removal: ${data.id}`);
        // return setTimeout(() => {
        //   id2game.current.delete(data.id);
        //   setGames(Array.from(id2game.current.values()));
        // }, 5000);
      }
      setGames(Array.from(id2game.current.values()));
    };

    src.on('current_games', onCurrentGames);
    src.on('current_game', onCurrentGame);
    socket.sendEvent("sub_current_games", {});

    return () => {
      src.off('current_games', onCurrentGames);
      src.off('current_game', onCurrentGame);
      socket.sendEvent("unsub_current_games", {});
    };
  }, [src]);

  const boxes = uiGames.map(game => {
    const boardA = game.getBoardA();
    const boardB = game.getBoardB();
    const boards = [
      <Board
        chessboard={boardA}
        context={BoardContext.CURRENT}
        gameID={game.getID()}
        id={`${game.getID()}_boardA`}
        orientation="white"
      />,
      <Board
        chessboard={boardB}
        context={BoardContext.CURRENT}
        gameID={game.getID()}
        id={`${game.getID()}_boardB`}
        orientation="black"
      />,
    ];
    return (
      <Grid container spacing={2}>
        <Grid item xs={6}>
          {boards[0]}
        </Grid>
        <Grid item xs={6}>
          {boards[1]}
        </Grid>
      </Grid>
    );
  });

  return (
    <div id="current_games">
      <div className="alien subtitle">Current Games</div>
      <Box
        display="flex"
        flexWrap="wrap"
        p={1}
        m={1}
      >
        {boxes}
      </Box>
    </div>
  );
}


export default CurrentGames;
