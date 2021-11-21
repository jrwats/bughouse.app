import React, { useContext, useEffect, useRef, useState } from "react";

import type {UserComponent_user$key} from 'UserComponent_user.graphql';

import RelayEnvironment from "../RelayEnvironment";
import * as UserGamesQuery from "./__generated__/UserGamesQuery.graphql";
// import * as UserGamesListPaginationQuery from "./__generated__/UserGamesListPaginationQuery.graphql.js"
// import * as UserGamesList_user from "./__generated__/UserGamesList_user.graphql.js"
import { UserGamesList_user$key } from "./__generated__/UserGamesList_user.graphql";

import { ErrorBoundary } from "react-error-boundary";
import graphql from 'babel-plugin-relay/macro';
import {loadQuery, useFragment, usePaginationFragment, usePreloadedQuery} from "react-relay";

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
    <div style={{ width: "16rem", display: "flex"}}>
      <div className={`color-cell ${color}`} />
      <div style={{display: "flex", textAlign: "right"}}>
        <span className={`team-player-handle`}>
          {player.handle}
        </span>
        <span className={`team-player-rating`}>
          {`(${player.rating})`}
        </span>
      </div>
    </div>
  );
}

const Team = ({ team, flip, won }) => {
  return (
    <tr>
      {team.map(({player, color}, idx) => (
        <td key={idx}>
          <TeamPlayer player={player} color={color} />
        </td>
      ))}
    </tr>
  );
}

const GameRow = ({ game, uid }) => {
  const { node: {gid, result, players, rated }, cursor } = game;
  const playerIdx = players.findIndex(p => p.uid === uid);
  const teams = [[players[0], players[3]], [players[2], players[1]]]
    .map((players) => players.map((player, idx) => ({
      player,
      color: idx === 0 ? 'white' : 'black',
    })));

  let winners = result.board === result.winner ? 0 : 1;
  if (playerIdx % 3 === 0 ) {
    // Ensure player is placed below opposing team (index 1)
    teams.reverse();
    winners = 1 - winners;
  }

  // If player is black, flip team.  Otherwise flip other team.
  teams[playerIdx % 2 === 1 ? 1 : 0].reverse();
  const kind = result.kind === 0 ? FLAG : "#";

  const date = new Date(cursor);
  return (
    <StyledTableRow key={gid}>
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
        <Link to={`/analysis/${gid}`}>
          <Button variant="contained" color="primary">
            Analyze
          </Button>
        </Link>
      </TableCell>
    </StyledTableRow>
  );
};

const UserGamesList = ({user}) => {
  const {data: {games, uid}, loadNext, hasNext} = usePaginationFragment(
    graphql`
      fragment UserGamesList_user on User
      @refetchable(queryName: "UserGamesListPaginationQuery") {
        uid
        games(
          after: $cursor,
          first: $count
        ) @connection(key: "UserGamesList_games") {
          edges {
            node {
              gid
              result { board, winner, kind }
              rated
              players {
                uid
                handle
                rating
              }
            }
          }
          pageInfo { hasNextPage }
        }
      }
    `,
    user,
  );

  const onClick = () => {
    loadNext(10);
  };
  const headCells = [
    // TODO Refactor backend and send time_ctrl down
    // { id: "time_ctrl", numeric: false, label: "Time" },
    { id: "players", numeric: false, label: "Players" },
    { id: "result", numeric: false, label: "Result" },
    { id: "rated", numeric: false, label: "Rated" },
    { id: "date", numeric: false, label: "Date" },
    { id: "analayze", numeric: false, label: "" },
  ];
  const classes = useStyles();
  return (
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
          {games.edges.map((edge) => (
            <GameRow key={edge.node.gid} uid={uid} game={edge} />
          ))}
          {hasNext ? (
            <TableRow>
              <TableCell colSpan="5" align="center">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onClick}>
                  Load More
                </Button>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const UserGames = ({uid, queryRef}) => {
  const data = usePreloadedQuery(
    graphql`
      query UserGamesQuery($id: String!, $cursor: String, $count: Int) {
        user(id: $id) {
          handle
          name
          uid
          ...UserGamesList_user
        }
      }
    `,
    queryRef
  );
  const user = data.user;
  if (!user) {
    throw new Error("User undefined?");
  }

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
          <UserGamesList user={user} />
        </div>
      </Box>
    </Box>
  );
};

export default UserGamesWrapper;
