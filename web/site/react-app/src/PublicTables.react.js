import React, { useContext, useEffect, useRef, useState } from "react";
import { navigate } from "@reach/router";
import Button from "@mui/material/Button";
import { SocketContext } from "./socket/SocketProvider";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import StyledTableRow from "./StyledTableRow.react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import { makeStyles, withStyles } from "@mui/styles";

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

const PublicTableRow = ({ table }) => {
  const { a, b, id, rated } = table;
  const onView = (evt) => {
    navigate(`/table/${id}`);
  };
  return (
    <StyledTableRow key={id}>
      <TableCell>{rated ? "\u{2713}" : ""}</TableCell>
      <TableCell>{table.timeCtrl}</TableCell>
      <TableCell>
        <Box display="flex" flexWrap="wrap">
          <Box p={1}>
            <div> {a?.board?.white?.handle}</div>
            <div> {a?.board?.black?.handle}</div>
          </Box>
          <Box p={1}>
            <div> {b?.board?.white?.handle}</div>
            <div> {b?.board?.black?.handle}</div>
          </Box>
        </Box>
      </TableCell>
      <TableCell>
        <Button variant="contained" color="primary" onClick={onView}>
          View
        </Button>
      </TableCell>
    </StyledTableRow>
  );
};

const PublicTables = () => {
  const { socket } = useContext(SocketContext);
  const tables = useRef({});
  const [uiTables, setTables] = useState({ val: tables.current });
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("rating");

  useEffect(() => {
    const onTable = (data) => {
      if (data.add || data.update) {
        tables.current[data.id] = data.table;
      } else {
        // remove
        delete tables.current[data.id];
      }
      setTables({ val: tables.current });
    };
    const onTables = (data) => {
      tables.current = data.tables;
      setTables({ val: tables.current });
    };
    socket.on("public_table", onTable);
    socket.on("public_tables", onTables);
    socket.sendEvent("sub_public_tables", {});
    return () => {
      socket.sendEvent("unsub_public_tables", {});
      socket.off("public_table", onTable);
      socket.off("public_tables", onTables);
    };
  }, [socket]);

  const tableRows = Object.keys(uiTables?.val || {})
    .map((gid) => uiTables.val[gid])
    .sort((a, b) => {
      let cmp = a[orderBy] < b[orderBy] ? -1 : a[orderBy] > b[orderBy] ? 1 : 0;
      return order === "asc" ? cmp : -cmp;
    });
  const createSortHandler = (property) => (event) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const classes = useStyles();
  const headCells = [
    { id: "rated", numeric: false, label: "Rated" },
    { id: "time_ctrl", numeric: false, label: "Time" },
    { id: "players", numeric: false, label: "Players" },
    { id: "join", numeric: false, label: "" },
  ];
  return (
    <div>
      <div className="alien subtitle">Open Tables</div>
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
            {tableRows.map((table) => (
              <PublicTableRow key={table.id} table={table} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default PublicTables;
