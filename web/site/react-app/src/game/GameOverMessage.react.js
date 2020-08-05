import React, {useContext, useEffect, useState} from 'react';
import { opposite } from 'chessground/util';
import Paper from '@material-ui/core/Paper';
import HandleDisplay from './HandleDisplay.react';
import { TelnetContext} from '../telnet/TelnetProvider';
import PeopleIcon from '@material-ui/icons/People';
import Button from '@material-ui/core/Button';
import { Link } from "@reach/router";

const GameOverMessage = ({chessboard}) => {
  const {ficsHandle} = useContext(TelnetContext);

  const winnerColor = chessboard.getWinner();
  console.log(`GameOverMessage ${chessboard.id}`);

  const winnerHandle = chessboard.getBoard()[winnerColor].handle;
  const loserHandle = chessboard.getBoard()[opposite(winnerColor)].handle;
  let msg;
  if (ficsHandle === winnerHandle) {
    msg = 'You won';
  } else if (ficsHandle === loserHandle) {
    msg = 'You lost';
  } else {
    msg = (
      <span>
        <HandleDisplay color={winnerColor} handle={winnerHandle} />
        <span style={{paddingLeft: '.8em'}}>won</span>
      </span>
    );
  }
  return (
    <div className="gameOver">
      <Paper className="gameOverMsg" elevation={12} style={{
        padding: '4px 4px 8px 4px',
        alignText: 'center'}}>
      <div className="grid clamped" style={{
        alignItems: 'center',
        justifyContent: 'space-evenly',
        flexDirection: 'column',
      }}>
          <div className="h6">{msg}</div>
          <div style={{paddingTop: '8px'}}>{chessboard.getReason()}</div>
          <Link to="/home" style={{marginTop: 'min(2vw, 5vh)'}}>
            <Button variant="contained" color="primary">
              <PeopleIcon fontSize="small" style={{paddingRight: '.8em'}}/>
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </Paper>
    </div>
  );
}

export default GameOverMessage;
