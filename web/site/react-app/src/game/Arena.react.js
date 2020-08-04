import React, {useContext, useEffect, useState} from 'react';
import Board from './Board.react';
import GameStatusSource from './GameStatusSource';
import {TelnetContext} from '../telnet/TelnetProvider';
import invariant from 'invariant';
import { Redirect } from "@reach/router";
import { opposite } from 'chessground/util';

const Arena = ({gamePair}) => {
  const {ficsHandle, telnet} = useContext(TelnetContext);
  const gamesSrc = GameStatusSource.get(telnet);
  let [id1, id2] = gamePair.split('~');
  console.log(`Arena ${id1}/${id2}`);
  if (id1 === id2) {
    id2 = null;
  }
  const board1 = gamesSrc.getBoard(id1);
  const board2 = gamesSrc.getBoard(id2);
  const [handleColor1, setHandleColor1] =
    useState(board1.getHandleColor(ficsHandle));
  const [handleColor2, setHandleColor2] =
    useState(board2 != null ? board2.getHandleColor(ficsHandle) : null);
  useEffect(() => {
    const onBoard1 = () => {
      setHandleColor1(board1.getHandleColor(ficsHandle));
    };
    board1.on('init', onBoard1);
    return () => {
      board1.off('init', onBoard1);
    }
  });
  useEffect(() => {
    const onBoard2 = () => {
      console.log(`onBoard2 ${board2}`);
      invariant(board2 != null, 'wtf');
      setHandleColor2(board2.getHandleColor(ficsHandle));
    };
    return () => {
      board2.off('init', onBoard2);
    };
  });

  let orientation1 = handleColor1 || 'white';
  console.log(`Arena hc1: ${handleColor1} o1: ${orientation1}, hc2: ${handleColor2}`);
  gamesSrc.observe(id1);

  let boardView2 = null;
  if (id2 != null) {
    if (handleColor2 != null) {
      debugger;
      invariant(handleColor1 == null, `Viewer can't be on both boards: ${handleColor1} ${handleColor2}`);
      return <Redirect to={`/home/arena/${id2}~${id1}`} />;
    }
    boardView2 = (
      <Board
        chessboard={board2}
        orientation={opposite(orientation1)}
      />
    );
    gamesSrc.observe(id2);
    console.log(`Arena hc2: ${handleColor2}`);
  } else {
    console.log(`Arena only observing one game?`);
  }

  return (
    <div style={{width: '100%'}}>
      <Board
        id="board1"
        chessboard={board1}
        orientation={orientation1}
      />
      {boardView2}
    </div>
  );
};

export default Arena;
