import React, {useContext, useEffect, useState} from 'react';
import Chessground from 'react-chessground'
import Holdings from './Holdings.react'
import './chessground.css'
import { TelnetContext } from '../telnet/TelnetProvider';

const Board = ({chessboard, orientation}) => {
  const {telnet, ficsHandle} = useContext(TelnetContext);
  const handleColor = chessboard.getHandleColor(ficsHandle);
  const [viewOnly, setViewOnly] = useState(
    chessboard.isInitialized() &&
    handleColor == null
  );
  const [fen, setFEN] = useState(chessboard.getBoard().fen);
  const [holdings, setHoldings] = useState(chessboard.getHoldings());

  useEffect(() => {
    const onUpdate = (_) => {
      const board = chessboard.getBoard();
      const holdings = chessboard.getHoldings();
      console.log(`Board 'boardUpdate', ${JSON.stringify(board)}, ${JSON.stringify(holdings)}`);
      setFEN(board.fen);
      setHoldings(holdings);
      setViewOnly(
        chessboard.isInitialized() &&
        chessboard.getHandleColor(ficsHandle) == null
      );
    };
    const onGameOver = () => {
    };
    chessboard.on('update', onUpdate);
    chessboard.on('gameOver', onGameOver);
    return () => {
      chessboard.off('update', onUpdate);
      chessboard.off('gameOver', onGameOver);
    };
  });

  console.log(`Chessground viewOnly ${chessboard.getID()}: ${viewOnly}`);
  return (
    <div style={{display: 'inline-block', height: '512px', width: '50%'}}>
      <Holdings orientation={orientation} holdings={holdings} />
      <Chessground
        key={chessboard.getID()}
        fen={fen}
        onMove={(from, to) => {
          console.log(`onMove ${JSON.stringify(from)} ${JSON.stringify(to)}`);
          telnet.sendEvent('move', `${from}-${to}`);
        }}
        viewOnly={viewOnly}
        orientation={orientation}
        pieceKey={true}
        coordinates={false}
        drawable={{enabled: false}}
        style={{display: 'inline-block'}}
      />
    </div>
  );
};

export default Board;
