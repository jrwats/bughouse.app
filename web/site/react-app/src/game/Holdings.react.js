import React from 'react';
import HeldPiece from './HeldPiece.react';
import { opposite } from 'chessground/util';

const PlayerHoldings = ({chessground, holdings, color, topOffset, viewOnly}) => {
  const piece2count = {};
  for (const p of ['P', 'B', 'N', 'R', 'Q']) {
    piece2count[p] = 0;
  }
  for (const c of holdings ? holdings.split('') : []) {
    ++piece2count[c];
  }
  let top = topOffset;
  return (
    <div style={{height: '50%'}}>
      {['P', 'B', 'N', 'R', 'Q'].map(
        (piece) => {
          const comp = (
            <HeldPiece
              chessground={chessground}
              key={piece}
              color={color}
              piece={piece}
              count={piece2count[piece]}
              top={{top}}
              viewOnly={viewOnly} />
          );
          top += 100;
          return comp;
        }
      )}
    </div>
  );
};

const Holdings = ({chessground, holdings, orientation, viewOnly}) => {
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
        topOffset={256}
        color={orientation}
        holdings={holdings ? holdings[orientation] : ''}
        viewOnly={viewOnly} />
    </div>
  );
}

export default Holdings;
