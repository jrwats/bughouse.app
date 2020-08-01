import React, {useContext} from 'react';
import {ChallengesContext} from './game/ChallengesProvider';
import BoardSummary from './BoardSummary.react';
import Typography from '@material-ui/core/Typography';

const ChallengeSummary = ({challenge}) => {
  const {id, white, black} = challenge;
  return (
    <div>
      <BoardSummary board={{id, white, black}} style={{display: 'inline'}}/>
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
