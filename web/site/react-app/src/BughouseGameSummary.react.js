import React, {useContext} from 'react';
import Typography from '@material-ui/core/Typography';
import BoardSummary from './BoardSummary.react';

const BughouseGameSummary = ({bughouseGame}) => {
  const [board1, board2] = bughouseGame;
  return (
    <div>
      <BoardSummary board={board1} />
      <BoardSummary reverse board={board2} />
    </div>
  );
}


export default BughouseGameSummary;
