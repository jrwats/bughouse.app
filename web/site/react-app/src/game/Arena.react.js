import React, {useContext, useEffect, useState} from 'react';
import Board from './Board.react';
import GameStatusSource from './GameStatusSource';
import {SocketContext} from '../socket/SocketProvider';
import invariant from 'invariant';
import { Redirect } from "@reach/router";
import { opposite } from 'chessground/util';
import ScreenLock from './ScreenLock';

const Arena = ({gameID}) => {
  const {handle, socket} = useContext(SocketContext);
  const gamesSrc = GameStatusSource.get(socket);

  const game = gamesSrc.getGame(gameID);
  const [handleColorA, setHandleColorA] =
    useState(boardA.getHandleColor(handle));
  const [handleColorB, setHandleColorB] =
    useState(boardB != null ? boardB.getHandleColor(handle) : null);
  useEffect(() => {
    const onboardA = () => {
      const newHC1 = boardA.getHandleColor(handle);
      console.log(`onboardA ${handle} ${newHC1} ${JSON.stringify(boardA.getBoard())}`);
      setHandleColorA(newHC1);
    };
    onboardA();
    boardA.on('init', onboardA);
    return () => {
      boardA.off('init', onboardA);
    }
  }, [handle, boardA, gamesSrc]);
  useEffect(() => {
    const onboardB = () => {
      const newHC2 = boardB.getHandleColor(handle);
      console.log(`onboardB ${handle} ${newHC2} ${JSON.stringify(boardB.getBoard())}`);
      invariant(boardB != null, 'wtf');
      console.log(`setHandleColorB(${newHC2})`);
      setHandleColorB(newHC2);
    };
    onboardB();
    boardB.on('init', onboardB);
    return () => {
      boardB.off('init', onboardB);
    };
  }, [handle, boardB, gamesSrc]);

  // Run only once on first load
  useEffect(() => {
    console.log(`Arena subscribing ${gameID}`);
    gamesSrc.observe(id1);
    if (id2 != null) {
      gamesSrc.observe(id2);
    }
  }, [gamesSrc, id1, id2]);
  useEffect(() => { ScreenLock.attemptAcquire(); }, [id1, id2]);

  let orientation1 = handleColorA || 'white';
  console.log(`Arena hc1: ${handleColorA} o1: ${orientation1}, hc2: ${handleColorB}`);

  let boardView2 = null;
  if (id2 != null) {
    if (handleColorB != null) {
      invariant(handleColorA == null, `Viewer can't be on both boards: ${handleColorA} ${handleColorB}`);
      return <Redirect to={`/home/arena/${id2}~${id1}`} />;
    }
    boardView2 = (
      <Board
        chessboard={boardB}
        orientation={opposite(orientation1)}
      />
    );
    console.log(`Arena hc2: ${handleColorB}`);
  } else {
    console.log(`Arena only observing one game?`);
  }

  return (
    <div style={{width: '100%'}}>
      <Board
        id="boardA"
        chessboard={boardA}
        orientation={orientation1}
      />
      {boardView2}
    </div>
  );
};

export default Arena;
