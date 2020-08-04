import React from 'react';
import Player from './Player.react';

const BoardSummary = ({reverse, board, style}) => {
  let users = [
    <Player
      style={{borderColor: '#333333', backgroundColor: 'white'}}
      user={{...board.white, status: null}} />,
    <Player
      style={{color: 'white', backgroundColor: '#202020'}}
      user={{...board.black, status: null}} />,
  ];
  if (reverse) {
    users = users.reverse();
  }
  // let id = null;
  // if (board.id != null) {
  //   id = (
  //     <span className="h6">
  //       {board.id}:
  //     </span>
  //   );
  // }

  return (
    <div style={{paddingTop: '10px', paddingBottom: '10px', ...style}}>
      {users[0]}
      <span className="h6">
        vs.
      </span>
      {users[1]}
    </div>
  );
};

export default BoardSummary;
