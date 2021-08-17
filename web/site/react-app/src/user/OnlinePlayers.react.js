import Paper from '@material-ui/core/Paper';
import React, { useContext, useEffect } from "react";
import { SocketContext } from "../socket/SocketProvider";
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import { UsersContext } from "./UsersProvider";

const useStyles = makeStyles({
  table: {
    minWidth: "20em",
  },
});

const OnlinePlayers = () => {
  let { onlineUsers } = useContext(UsersContext);
  const classes = useStyles();

  const { socket } = useContext(SocketContext);

  useEffect(() => {
    socket.sendEvent('sub_online_players', {});
    return () => {
      socket.sendEvent('unsub_online_players', {});
    }
  },[socket]);

  return (
    <TableContainer component={Paper}>
      <Table className={classes.table} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Handle</TableCell>
            <TableCell align="right">Rating</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.keys(onlineUsers).map((uid) => {
            const user = onlineUsers[uid];
            return (
              <TableRow key={uid}>
                <TableCell component="th" scope="row">
                  {user.handle}
                </TableCell>
                <TableCell align="right">{user.rating}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default OnlinePlayers;
