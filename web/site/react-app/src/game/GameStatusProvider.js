import React, {createContext, useEffect, useState} from 'react';
import GameStatusSource from "./GameStatusSource";
import {SocketContext} from './socket/SocketProvider';

export const GamesStatusContext = createContext({
  boards: [],
  handles: {},
});

const GamesStatusProvider = (props) => {
  const {telnet} = useContext(SocketContext);
  const src = GamesSource.get(telnet);
  const [games, setGames] = useState(src.getGames());
  const [handles, setHandles] = useState(getHandlesFromGames(games));

  useEffect(() => {
    const onGames = ({games}) => {
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

export default GamesStatusProvider;
