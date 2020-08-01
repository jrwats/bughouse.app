import React, {useContext, useEffect, useState} from 'react';
import Chessground from 'react-chessground'
import 'react-chessground/dist/styles/chessground.css'

const Board = ({chessboard}) => {
  const [board, setBoard] = useState(chessboard.getBoard());
  const [holdings, setHoldings] = useState(chessboard.getHoldings());

  useEffect(() => {
    const onUpdate = (_) => {
      debugger;
      setBoard(chessboard.getBoard());
      setHoldings(chessboard.getHoldings());
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

  return (
    <Chessground />
  );
};

export default Board;
