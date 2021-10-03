import React, { useContext, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import { SocketContext } from "./socket/SocketProvider";
import Typography from "@mui/material/Typography";
import { styled, withStyles } from "@mui/styles";

const styles = {
  titleContainer: {
    overflow: "hidden",
  },
  title: {
    color: "rgba(255, 40, 200, 0.95)",
    textShadow: "0px 0px 12px #232333",
    fontFamily: "AlienEncounters, Roboto",
  },
  blinking: {
    animation: "ticking-grow 0.25s infinite alternate",
  },
};

// TODO share this copypasta with App.css
const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiPaper-root.MuiDialog-paper": {
    border: "#f0c 3px solid",
    borderRadius: "1rem",
    boxShadow: `
      inset 0px 0 3px 3px rgba(255, 44, 255, 0.80), 
      0px 0 8px  2px rgba(255, 34, 255, 0.70), 
      0px 0 15px 3px rgba(255, 44, 255, 0.60)`,
  },
}));

const RefreshButton = (props) => {
  const refresh = (_e) => {
    window.location.reload();
  };
  return (
    <Button variant="contained" onClick={refresh}>
      Refresh
    </Button>
  );
};

const Reconnecting = (props) => (
  <Grid
    container
    spacing={0}
    direction="column"
    alignItems="center"
    justify="center"
  >
    <Grid item xs={3}>
      <CircularProgress />
    </Grid>
  </Grid>
);

const DisconnectDialog = withStyles(styles)((props) => {
  const { socket } = useContext(SocketContext);
  const [readyState, setReadyState] = useState(socket.readyState());
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    const onChange = (_e) => {
      console.log(`onChange ${JSON.stringify(_e)}`);
      const readyState = socket.readyState();
      setReadyState(readyState);
      if (readyState === WebSocket.OPEN) {
        setDisconnected(false);
      }
    };
    const onDisconnect = (_) => {
      console.error("DISCONNECT");
      setDisconnected(true);
    };
    socket.on("open", onChange);
    socket.on("reconnecting", onChange);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("open", onChange);
      socket.off("reconnecting", onChange);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  if (readyState === WebSocket.OPEN) {
    return null;
  }
  const title = disconnected ? "Disconnected" : "Reconnecting...";
  const content = disconnected ? <RefreshButton /> : <Reconnecting />;
  return (
    <StyledDialog variant="outlined" open={true} maxWidth="sm">
      <DialogTitle className={props.classes.titleContainer}>
        <Typography
          className={`${props.classes.title} ${
            disconnected ? "" : props.classes.blinking
          }`}
        >
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent>{content}</DialogContent>
    </StyledDialog>
  );
});

export default DisconnectDialog;
