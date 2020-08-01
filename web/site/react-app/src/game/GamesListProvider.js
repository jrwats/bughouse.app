import React, {createContext, useEffect, useState} from 'react';
import GamesListSource from "./GamesListSource";

export const GamesListContext = createContext({
  games: [],
  handles: {},
});

const getHandlesFromGames = (games) => {
  const handles = {};
  for (const game of games) {
    const [board1, board2] = game;
    handles[board1.white.handle] = 1;
    handles[board1.black.handle] = 1;
    handles[board2.white.handle] = 1;
    handles[board2.black.handle] = 1;
  }
  return handles;
}

const GamesListProvider = (props) => {
  const src = GamesListSource.get();
  const [games, setGames] = useState(src.getGames());
  const [handles, setHandles] = useState(getHandlesFromGames(games));

  useEffect(() => {
    const onGames = games => {
      setGames(games);
      setHandles(getHandlesFromGames(games));
    };
    src.on('games', onGames);
    return () => {
      src.off('games', onGames);
    };
  });
  return (
    <GamesListContext.Provider value={{games, handles}} >
      {props.children}
    </GamesListContext.Provider>
  );
}

export default GamesListProvider;
