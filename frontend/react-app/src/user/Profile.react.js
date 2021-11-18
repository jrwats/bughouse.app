import React, { useContext, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SpellcheckIcon from "@mui/icons-material/Spellcheck";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Loading from "../Loading.react";
import { SocketContext } from "../socket/SocketProvider";
import { ViewerContext } from "./ViewerProvider";
import { makeStyles } from "@mui/styles";
import UserGames from "./UserGames.react"

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(2),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
}));

const HandleEdit = ({ handle }) => {
  const textInput = useRef(null);
  const { socket } = useContext(SocketContext);
  let [editing, setEditing] = useState(false);
  let [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onUpdate = (_data) => {
      setEditing(false);
      setSubmitting(false);
    };
    socket.on("handle_update", onUpdate);
    socket.on("login", onUpdate);
    return () => {
      socket.off("handle_update", onUpdate);
      socket.off("login", onUpdate);
    };
  }, [socket]);

  if (!editing) {
    return (
      <>
        <Typography variant="h6" style={{ display: "inline-block" }}>
          {handle}
        </Typography>
        <span style={{ marginLeft: "1em" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={(_e) => {
              setEditing(true);
            }}
          >
            <EditIcon fontSize="small" /> Edit
          </Button>
        </span>
      </>
    );
  }

  const onSubmit = (evt) => {
    const newHandle = textInput.current.querySelector("input").value;
    socket.sendEvent("set_handle", { handle: newHandle });
    evt.preventDefault();
    setSubmitting(true);
  };

  return (
    <form onSubmit={onSubmit} noValidate autoComplete="off">
      <div style={{ width: "100%" }}>
        <TextField
          ref={textInput}
          id="handle"
          label="Handle:"
          defaultValue={handle}
        />
      </div>
      <div style={{ margin: "4px 0px" }}>
        <span style={{ marginTop: "4px" }}>
          <Button
            variant="contained"
            color={submitting ? "secondary" : "primary"}
            onClick={onSubmit}
          >
            <SpellcheckIcon fontSize="small" />
            <span style={{ marginLeft: ".2em" }}>
              {submitting ? (
                <Loading style={{ padding: "0 2rem" }} size="1.0rem" />
              ) : (
                "Submit"
              )}
            </span>
          </Button>
        </span>
        <span style={{ margin: "4px 4px 4px 4px" }}>
          <Button
            variant="contained"
            disabled={submitting}
            color="secondary"
            onClick={(_) => {
              setEditing(false);
            }}
          >
            <CloseIcon fontSize="small" />
            <span style={{ marginLeft: ".2em" }}>Cancel</span>
          </Button>
        </span>
      </div>
    </form>
  );
};

const Profile = (props) => {
  const { deviation, handle, rating, uid } = useContext(ViewerContext);
  console.log("Profile");
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
        <div style={{ flexGrow: 1 }}>
          <HandleEdit handle={handle} />
          <Grid container item xs={12} spacing={3} style={{ marginTop: "1rem" }}>
            <Grid item sm={4}>
              <Paper className={classes.paper}>
                Rating: {rating}, Deviation: {deviation}
              </Paper>
            </Grid>
          </Grid>
          <UserGames uid={uid} />
        </div>
      </Box>
    </Box>
  );
};

export default Profile;
