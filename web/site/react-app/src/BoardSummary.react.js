import React from 'react';
import User from './User.react';
import Typography from '@material-ui/core/Typography';

const BoardSummary = ({reverse, board, style}) => {
  let users = [
    <User
      style={{borderColor: '#333333', backgroundColor: 'white'}}
      user={{...board.white, status: null}} />,
    <User
      style={{color: 'white', backgroundColor: '#202020'}}
      user={{...board.black, status: null}} />,
  ];
  if (reverse) {
    users = users.reverse();
  }
  let id = null;
  if (board.id != null) {
    id = (
      <Typography variant="h7" noWrap>
        {board.id}:
      </Typography>
    );
  }

  return (
    <div style={{paddingTop: '10px', paddingBottom: '10px', ...style}}>
      {users[0]}
      <Typography style={{display: "inline"}} variant="h7" noWrap>
        vs.
      </Typography>
      {users[1]}
    </div>
  );
};

export default BoardSummary;
