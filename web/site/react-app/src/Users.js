import Paper from '@material-ui/core/Paper';
import Profile from './user/Profile';
import React, {useContext} from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import {UsersContext} from './user/UsersProvider';

const useStyles = makeStyles({
  table: {
    minWidth: 650,
    maxWidth: 800,
  },
});

const Users = (props) => {
  const {onlineUsers} = useContext(UsersContext);
  let rows = [];
  for (const uid in onlineUsers) {
    const {displayName, photoURL, ficsHandle, email} = onlineUsers[uid];
    rows.push({uid, photoURL, ficsHandle, displayName, email});
  }

  const classes = useStyles();

  return (
    <div style={{padding: '40px', overflow: 'scroll', height: '100%'}} >
      <Typography style={{marginLeft: '100px'}} variant="h5" noWrap>
        bughouse.app Players
      </Typography>
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
              <TableRow key={row.uid || row.ficsHandle}>
                <TableCell component="th" scope="row">
                  <Profile user={row} />
                </TableCell>
                <TableCell >{row.rating || '++++'}</TableCell>
                <TableCell >{row.status}</TableCell>
                <TableCell >{row.ficsHandle}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default Users;
