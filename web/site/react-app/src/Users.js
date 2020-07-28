import React, {useContext} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import {UsersContext} from './user/UsersProvider';
import Profile from './user/Profile';

const useStyles = makeStyles({
  table: {
    minWidth: 650,
    maxWidth: 800,
  },
});

const Users = (props) => {
  const {ficsOnline, onlineUsers} = useContext(UsersContext);
  console.log(`Users ${Object.keys(onlineUsers).length}`);
  let rows = [];
  for (const uid in onlineUsers) {
    const {displayName, photoURL, ficsUsername, email} = onlineUsers[uid];
    rows.push({uid, photoURL, ficsUsername, displayName, email});
  }

  for (const ficsPlayer of ficsOnline) {
    const {handle, rating, status} = ficsPlayer;
    rows.push({uid: null, rating, status, ficsUsername: handle});
  }

  const classes = useStyles();

  return (
    <div style={{overflow: 'scroll', height: '100%'}} >
      <TableContainer component={Paper} style={{position: 'relative', left: '80px'}}>
        <Table className={classes.table} size="small" aria-label="a dense table">
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell >Rating</TableCell>
              <TableCell >Status</TableCell>
              <TableCell >FICS handle</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.uid || row.ficsUsername}>
                <TableCell component="th" scope="row">
                  <Profile user={row} />
                </TableCell>
                <TableCell >{row.rating || '++++'}</TableCell>
                <TableCell >{row.status}</TableCell>
                <TableCell >{row.ficsUsername}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default Users;
