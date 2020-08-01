import React, {createContext, useEffect, useState} from 'react';
import GameStatusSource from "./GameStatusSource";
import {TelnetContext} from './telnet/TelnetProvider';

export const GamesStatusContext = createContext({
  boards: [],
  handles: {},
});

const GamesListProvider = (props) => {
  const {telnet} = useContext(TelnetContext);
  const src = GamesSource.get(telnet);
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
