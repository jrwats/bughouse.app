import React from 'react';
import HeldPiece from './HeldPiece.react';
import { opposite } from 'chessground/util';

const PlayerHoldings = ({
  chessground,
  chessboard,
  holdings,
  color,
  viewOnly
}) => {
  const piece2count = {};
  for (const p of ['P', 'B', 'N', 'R', 'Q']) {
    piece2count[p] = 0;
  }
  for (const c of holdings ? holdings.split('') : []) {
    ++piece2count[c];
  }
  return (
    <div style={{height: '50%'}}>
      {['P', 'B', 'N', 'R', 'Q'].map(
        (piece) => {
          const comp = (
            <HeldPiece
              chessgroundRef={chessground}
              chessboard={chessboard}
              key={piece}
              color={color}
              piece={piece}
              count={piece2count[piece]}
              viewOnly={viewOnly} />
          );
          return comp;
        }
      )}
    </div>
  );
};

const Holdings = ({chessground, chessboard, holdings, orientation, viewOnly}) => {
  const opponentColor = opposite(orientation);
  return (
    <div style={{
      display: 'inline-block',
      position: 'relative',
      height: '100%',
      width: 'min(5vw, 10vh)',
      }}>
      <PlayerHoldings
        color={opponentColor}
        holdings={holdings ? holdings[opponentColor] : ''}
        viewOnly={true} />
      <PlayerHoldings
        chessground={chessground}
        color={orientation}
        chessboard={chessboard}
        holdings={holdings ? holdings[orientation] : ''}
        viewOnly={viewOnly} />
    </div>
  );
}

export default Holdings;
