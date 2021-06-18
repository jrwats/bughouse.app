import React, {useContext, useEffect, useState} from 'react';
import Chessground from 'react-chessground'
import Holdings from './Holdings.react'
import PlayerDisplay from './PlayerDisplay.react'
import './chessground.css'
import { TelnetContext } from '../socket/TelnetProvider';
import { opposite } from 'chessground/util';
import GameOverMessage from './GameOverMessage.react';
import invariant from 'invariant';

const Board = ({chessboard, orientation, id}) => {
  const {telnet, ficsHandle} = useContext(TelnetContext);
  const [viewOnly, setViewOnly] = useState(false);
  const [fen, setFEN] = useState(chessboard.getBoard().fen);
  const [holdings, setHoldings] = useState(chessboard.getHoldings());
  const [finished, setFinished] = useState(chessboard.isFinished());

  useEffect(() => {
    const onUpdate = (_) => {
      const board = chessboard.getBoard();
      const holdings = chessboard.getHoldings();
      setFEN(board.fen);
      setHoldings(holdings);
      setViewOnly(
        chessboard.isInitialized() &&
        chessboard.getHandleColor(ficsHandle) == null
      );
    };
    const onGameOver = () => {
      console.log(`onGameOver`);
      invariant(chessboard.isFinished(), 'WTF?');
      setFinished(true);
    };
    chessboard.on('update', onUpdate);
    chessboard.on('gameOver', onGameOver);
    return () => {
      chessboard.off('update', onUpdate);
      chessboard.off('gameOver', onGameOver);
    };
  }, [ficsHandle, chessboard]);

  useEffect(() => {
    const onGameOver = ({board}) => {
      setFinished(true);
    };
    chessboard.on('gameOver', onGameOver);
    return () => { chessboard.off('gameOver', onGameOver); };
  }, [chessboard]);

  const chessgroundRef = React.useRef(null);

  let alert = null;
  console.log(`Board ${chessboard.getID()} finished: ${finished}`);
  if (finished) {
    alert = <GameOverMessage chessboard={chessboard} />;
  }

  return (
    <div style={{display: 'inline-block', width: '50%'}}>
      <PlayerDisplay color={opposite(orientation)} chessboard={chessboard} />
      <div
        id={id}
        style={{
          position: 'relative',
          height: 'min(44vw, 90vh)',
          width: '100%',
        }} >
        {alert}
        <Holdings
          chessground={chessgroundRef}
          orientation={orientation}
          holdings={holdings}
          chessboard={chessboard}
          viewOnly={viewOnly} />
        <Chessground
          ref={chessgroundRef}
          key={chessboard.getID()}
          fen={fen}
          onMove={(from, to) => {
            console.log(`onMove ${JSON.stringify(from)} ${JSON.stringify(to)}`);
            telnet.sendEvent('move', `${from}-${to}`);
          }}
          animation={{enabled: true, duration: 150}}
          viewOnly={viewOnly}
          orientation={orientation}
          pieceKey={true}
          coordinates={false}
          drawable={{enabled: false}}
          promotion={(e) => {
            debugger;
          }}
          style={{display: 'inline-block'}}
        />
      </div>
      <PlayerDisplay color={orientation} chessboard={chessboard} />
    </div>
  );
};

export default Board;
