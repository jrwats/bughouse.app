import React from 'react';
import BoardSummary from './BoardSummary.react';
import Typography from '@material-ui/core/Typography';

const ChallengeSummary = ({challenge}) => {
  const {id, challenger, challengee} = challenge;
  return (
    <div>
      {/* TODO challenger isn't necessarily white.  Stop using board summary*/}
      <BoardSummary
        board={{id, white: challenger, black: challengee}}
          style={{display: 'inline'}} />
      <span style={{
        marginLeft: '10px',
        padding: '4px',
        borderRadius: 4,
        backgroundColor: '#303f9f',
        color: '#efefef'}} >
        <Typography variant="h6" noWrap style={{display: 'inline', padding: '4px'}}>
          {challenge.mins}
           /
          {challenge.incr}
        </Typography>
      </span>

    </div>
  );
};

export default ChallengeSummary;
