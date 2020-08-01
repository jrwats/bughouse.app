import React, {useContext} from 'react';
import Board from './Board.react';
import GameStatusSource from './game/GameStatusSource';
import Divider from '@material-ui/core/Divider';
import {TelnetContext} from './telnet/TelnetProvider';

const Arena = (props) => {
  const {telnet} = useContext(TelnetContext);
  const gamesSrc = GameStatusSource.get(telnet);
  const {gamePair} = props;
  const [id1, id2] = gamePair.split('~');
  console.log(`Arena ${id1}/${id2}`);

  let board2 = id2 != null
    ? <Board chessboard={gamesSrc.getBoard(id2)} />
    : null;
  if (id2 == null) {
    console.log(`Arena only observing one game?`);
  } else {
    gamesSrc.observe(id2);
  }
  gamesSrc.observe(id1);

  return (
    <div style={{display: 'flex' }}>
      <Board chessboard={gamesSrc.getBoard(id1)} />
      {board2}
    </div>
  );
};

export default Arena
