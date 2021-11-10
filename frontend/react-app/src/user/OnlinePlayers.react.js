import Paper from "@mui/material/Paper";
import React, { useContext, useEffect, useState } from "react";
import { SocketContext } from "../socket/SocketProvider";
import StyledTableRow from "../StyledTableRow.react";
import { makeStyles, withStyles } from "@mui/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";

import { UsersContext } from "./UsersProvider";

const useStyles = makeStyles({
  table: {
    minWidth: "20em",
  },
  visuallyHidden: {
    border: 0,
    clip: "rect(0 0 0 0)",
    height: 1,
    margin: -1,
    overflow: "hidden",
    padding: 0,
    position: "absolute",
    top: 20,
    width: 1,
  },
});

const headCells = [
  { id: "handle", numeric: false, label: "Handle" },
  { id: "rating", numeric: true, label: "Rating" },
];
const OnlinePlayers = () => {
  const { socket } = useContext(SocketContext);
  const { onlineUsers } = useContext(UsersContext);
  const classes = useStyles();
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("rating");
  const players = [...onlineUsers.values()]
    .sort((a, b) => {
      let cmp = a[orderBy] < b[orderBy] ? -1 : a[orderBy] > b[orderBy] ? 1 : 0;
      return order === "asc" ? cmp : -cmp;
    });

  const createSortHandler = (property) => (event) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  useEffect(() => {
    socket.sendEvent("sub_online_players", {});
    return () => {
      socket.sendEvent("unsub_online_players", {});
    };
  }, [socket]);

  return (
    <div>
      <div className="alien subtitle">Online Players</div>
      <TableContainer component={Paper}>
        <Table className={classes.table} aria-label="simple table">
          <TableHead>
            <TableRow>
              {headCells.map((headCell) => (
                <TableCell
                  key={headCell.id}
                  align={headCell.numeric ? "right" : "left"}
                  sortDirection={orderBy === headCell.id ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === headCell.id}
                    direction={orderBy === headCell.id ? order : "asc"}
                    onClick={createSortHandler(headCell.id)}
                  >
                    {headCell.label}
                    {orderBy === headCell.id ? (
                      <span className={classes.visuallyHidden}>
                        {order === "desc"
                          ? "sorted descending"
                          : "sorted ascending"}
                      </span>
                    ) : null}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {players.map((user) => (
              <StyledTableRow key={user.uid}>
                <TableCell component="th" scope="row">
                  {user.handle}
                </TableCell>
                <TableCell align="right">{user.rating}</TableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default OnlinePlayers;
