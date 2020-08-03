import React, {useContext} from 'react';
import Typography from '@material-ui/core/Typography';
import BoardSummary from './BoardSummary.react';
import { Link } from "@reach/router";

const BughouseGameSummary = ({bughouseGame}) => {
  const [board1, board2] = bughouseGame;
  return (
    <Link to={`/home/arena/${board1.id}~${board2.id}`} >
      <div>
        <BoardSummary board={board1} />
        <BoardSummary reverse board={board2} />
      </div>
    </Link>
  );
}


export default BughouseGameSummary;
