import React, { useContext, useEffect, useRef, useState } from "react";

import RelayEnvironment from "../RelayEnvironment";
import * as UserGamesQuery from "./__generated__/UserGamesQuery.graphql";
import { ErrorBoundary } from "react-error-boundary";
import graphql from 'babel-plugin-relay/macro';
import {loadQuery, useFragment, usePreloadedQuery} from "react-relay";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import Grid from "@mui/material/Grid";
import Loading from "../Loading.react";
import Paper from "@mui/material/Paper";
import SpellcheckIcon from "@mui/icons-material/Spellcheck";
import StyledTableRow from "../StyledTableRow.react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Link } from "@reach/router";
import { SocketContext } from "../socket/SocketProvider";
import { ViewerContext } from "./ViewerProvider";
import { makeStyles } from "@mui/styles";

import {FLAG} from "../game/ClockDisplay.react";

const useStyles = makeStyles({
  table: { minWidth: "20em" },
});

const UserGamesWrapper = ({uid}) => {
  const [queryRef, setQueryRef] = useState(null);
  useEffect(() => {
    const queryRef = loadQuery(
      RelayEnvironment,
      UserGamesQuery.default,
      {id: uid, after: (new Date()).toISOString(), count: 10},
    );
    setQueryRef(queryRef);
  }, [uid]);

  return (
    <ErrorBoundary fallbackRender={({ error }) => <div>{error.message}</div>}>
      <React.Suspense fallback={<div>Loading...</div>}>
        <React.Fragment>
          {queryRef != null && <UserGames uid={uid} queryRef={queryRef} /> }
        </React.Fragment>
      </React.Suspense>
    </ErrorBoundary>
  );
}

const TeamPlayer = ({player, color}) => {
  return (
    <div style={{ maxwidth: "26rem", display: "flex"}}>
      <div class={`color-cell ${color}`} />
      <div style={{display: "flex", textAlign: "right"}}>
        <span class={`team-player-handle`}>
          {player.handle}
        </span>
        <span class={`team-player-rating`}>
          {`(${player.rating})`}
        </span>
      </div>
    </div>
  );
}

const Team = ({ team, flip, won }) => {
  return (
    <tr>
      {team.map(({player, color}, idx) => {
        const style = idx === 1 ? {paddingLeft: "2px"} : {};
        return (<td style={style}>
          <TeamPlayer player={player} color={color} />
        </td>);
      })}
    </tr>
  );
}

const GameRow = ({ game, uid }) => {
  console.log(game);
  const { node: {id, result, players, rated }, cursor } = game;
  console.log(cursor);
  const playerIdx = players.findIndex(p => p.id === uid);
  const teams = [[players[0], players[3]], [players[2], players[1]]]
    .map((t, tidx) => t.map((player, pidx) => ({
      player,
      color: pidx === 0 ? 'white' : 'black',
    })));

  // Ensure player is placed below opposing team (index 1)
  let winners = result.board === result.winner ? 0 : 1;
  if (playerIdx % 3 === 0 ) {
    teams.reverse()
    winners = 1 - winners;
  }

  // Orient opposing colors
  teams[playerIdx % 2 === 1 ? 1 : 0].reverse();
  const kind = result.kind === 0 ? FLAG : "#";

  const date = new Date(cursor);
  return (
    <StyledTableRow key={id}>
      <TableCell width="80rem" >
        <table>
          <tbody>
            {teams.map((t, idx) => (
              <Team key={idx} team={t} won={winners === idx} />
            ))}
          </tbody>
        </table>
      </TableCell>
      <TableCell>{`${winners ? 1 : 0} ${kind}`}</TableCell>
      <TableCell>{rated ? "\u{2713}" : ""}</TableCell>
      <TableCell>
        <div>{date.toLocaleDateString()}</div>
        <div>{date.toLocaleTimeString()}</div>
      </TableCell>
      <TableCell>
        <Link to={`/analysis/${id}`}>
          <Button variant="contained" color="primary">
            Analyze
          </Button>
        </Link>
      </TableCell>
    </StyledTableRow>
  );
};

const UserGames = ({uid, queryRef}) => {

  const data = usePreloadedQuery(
    graphql`
      query UserGamesQuery($id: ID!, $cursor: String, $count: Int) {
      user(id: $id) {
        handle
        name
        games(after: $cursor, first: $count)
          @connection(key: "User_games") {
            edges {
              node {
                id
                result { board, winner, kind }
                rated
                players {
                  id
                  handle
                  rating
                }
              }
            }
            pageInfo { hasNextPage }
          }
        }
      }
    `,
    queryRef
  );

  const loadMore = () => {};
  const headCells = [
    // { id: "time_ctrl", numeric: false, label: "Time" },
    { id: "players", numeric: false, label: "Players" },
    { id: "result", numeric: false, label: "Result" },
    { id: "rated", numeric: false, label: "Rated" },
    { id: "date", numeric: false, label: "Date" },
    { id: "analayze", numeric: false, label: "" },
  ];
  const classes = useStyles();
  return (
    <Box
      display="flex"
      flexWrap="wrap"
      p={1}
      m={1}
      sx={{ maxWidth: "90vw" }}
    >
      <Box p={1}>
        <div>
          <div className="alien subtitle">Past Games</div>
          <div style={{display: "flex"}}>
            <div style={{flexShrink: 1 }}>
              <TableContainer component={Paper}>
                <Table className={classes.table} aria-label="simple table">
                  <TableHead>
                    <TableRow>
                      {headCells.map((headCell) => (
                        <TableCell
                          key={headCell.id}
                          align={headCell.numeric ? "right" : "left"}
                        >
                          {headCell.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data?.user?.games.edges.map((game) => (
                      <GameRow uid={uid} game={game} />
                    ))}
                    {data?.user?.games?.pageInfo?.hasNextPage ? (
                      <TableRow>
                        <TableCell colspan={4} align="center">
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={loadMore}>
                            Load More
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </div>
        </div>
      </Box>
    </Box>
  );
};

export default UserGamesWrapper;
