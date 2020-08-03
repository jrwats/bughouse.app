import React, {useContext, useEffect, useState} from 'react';

const roles = {
  P: 'pawn',
  R: 'rook',
  N: 'knight',
  B: 'bishop',
  Q: 'queen',
};

const HeldPiece = ({piece, color, count}) => {
  const visibility = count === 0 ? 'hidden' : 'visible';
  return (
    <div style={{ visibility: visibility, position: 'relative', height: '20%', width: '100%'}}>
      <piece
        className={`${color} ${roles[piece]}`}
        style={{
          position: 'absolute',
          visibility: visibility,
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }} />
    </div>
  );
};

export default HeldPiece;
