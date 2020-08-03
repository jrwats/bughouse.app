import React from 'react'; // , {useContext, useEffect, useState} from 'react';
import HeldPiece from './HeldPiece.react';
import { opposite } from 'chessground/util';

const PlayerHoldings = ({holdings, color, viewOnly}) => {
  const piece2count = {};
  for (const p of ['P', 'B', 'N', 'R', 'Q']) {
    piece2count[p] = 0;
  }
  for (const c of holdings ? holdings.split('') : []) {
    ++piece2count[c];
  }
  console.log(`piece2count: ${JSON.stringify(piece2count)}`);
  console.log(`holdings: ${JSON.stringify(holdings)}`);

  return (
    <div style={{height: '50%'}}>
      {['P', 'B', 'N', 'R', 'Q'].map(
        (piece) => (
          <HeldPiece
            key={piece}
            color={color}
            piece={piece}
            count={piece2count[piece]} />
        )
      )}
    </div>
  );
};

const Holdings = ({holdings, orientation, viewOnly}) => {
  const opponentColor = opposite(orientation);
  return (
    <div style={{display: 'inline-block', height: '100%', width: '50px'}}>
      <PlayerHoldings
        color={opponentColor}
        holdings={holdings[opponentColor]}
        viewOnly={true} />
      <PlayerHoldings
        color={orientation}
        holdings={holdings[orientation]}
        viewOnly={viewOnly} />
    </div>
  );
}

export default Holdings;
