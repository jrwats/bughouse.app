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
    <Box display="flex" p={1}>
      <div class={`color-cell ${color}`} />
      <div style={{display: "flex", alignItems: "center"}}>
        <span class={`team-player-handle`}>
          {player.handle}
        </span>
        <span class={`team-player-rating`}>
          {`(${player.rating})`}
        </span>
      </div>
    </Box>
  );
}

const Team = ({ team, flip, won }) => {
  const color = ((c) => flip ? c.reverse() : c)(['white', 'black']);
  return (
    <div style={{display: "flex"}}>
      {team.map((p, idx) => (
        <TeamPlayer player={p} color={color[idx]} />
      ))}
    </div>
  );
}

const GameRow = ({ game, uid }) => {
  console.log(game);
  const { node: {id, result, players, rated }, cursor } = game;
  const playerIdx = players.findIndex(p => p.id === uid);
  const playerTeam = playerIdx % 3 === 0 ? 0 : 1;
  const teams = [[players[0], players[3]], [players[1], players[2]]];

  // Place player's team below opposing team
  let winners = result.board === result.winner ? 0 : 1;
  if (playerTeam === 0) {
    teams.reverse()
    winners = 1 - winners;
  }

  // If player is black - orient teams accordingly
  const flippedIdx = playerIdx % 2 === 1 ? 1 : 0;
  if (flippedIdx  === 1) {
    teams.forEach(t => t.reverse());
  }

  const kind = result.kind === 0 ? FLAG : "#";
  const uiTeams = teams.map((t, idx) => (
    <Team key={idx} team={t} flip={flippedIdx === idx} won={winners === idx} />
  ));

  return (
    <StyledTableRow key={id}>
      <TableCell>{uiTeams}</TableCell>
      <TableCell>{`${winners ? 1 : 0} ${kind}`}</TableCell>
      <TableCell>{rated ? "\u{2713}" : ""}</TableCell>
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

const useStyles = makeStyles({
  table: { minWidth: "20em" },
});

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
          }
        }
      }
    `,
    queryRef
  );

  const headCells = [
    // { id: "time_ctrl", numeric: false, label: "Time" },
    { id: "players", numeric: false, label: "Players" },
    { id: "result", numeric: false, label: "Result" },
    { id: "rated", numeric: false, label: "Rated" },
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
