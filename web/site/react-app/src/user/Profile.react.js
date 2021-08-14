import Button from "@material-ui/core/Button";
import EditIcon from '@material-ui/icons/Edit';
import SpellcheckIcon from '@material-ui/icons/Spellcheck';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import React, { useContext, useRef, useState } from "react";
import TextField from '@material-ui/core/TextField';
import Typography from "@material-ui/core/Typography";
import { SocketContext } from "../socket/SocketProvider";
import { ViewerContext } from "./ViewerProvider";
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));

const HandleEdit = ({handle}) => {
  const textInput = useRef(null);
  const { socket } = useContext(SocketContext);
  let [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <>
        <Typography variant="h6" style={{display: "inline-block"}}>
          {handle}
        </Typography>
        <span style={{marginLeft: "1em"}}>
          <Button 
            variant="contained"
            color="primary"
            onClick={(_e) => { setEditing(true); }}>
            <EditIcon fontSize="small" /> Edit
          </Button>
        </span>
      </>
    )
  }
  const onSubmit = (evt) => {
    const newHandle = textInput.current.querySelector('input').value;
    socket.sendEvent('setHandle', {handle: newHandle});
    evt.preventDefault();
  };
  return (
    <form onSubmit={onSubmit} noValidate autoComplete="off">
      <TextField ref={textInput} id="handle" label="Handle:" defaultValue={handle}/>
      <span style={{position: "relative", top: ".4em", marginLeft: "1em"}}>
        <Button 
          variant="contained"
          color="primary"
          onClick={onSubmit}>
          <SpellcheckIcon fontSize="small" /> 
          <span style={{marginLeft: ".2em"}}>Submit</span>
        </Button>
      </span>
    </form>
  );
};

const Profile = (props) => {
  const { handle, rating, deviation } = useContext(ViewerContext);
  console.log('Profile');
  const classes = useStyles();

  return (
    <div style={{flexGrow: 1}}>
      <Grid container spacing={1}>
        <Grid container item xs={12} spacing={8}>
          <Grid item xs={3} >
            <HandleEdit handle={handle} />
          </Grid>
        </Grid>
        <Grid container item xs={12} spacing={3}>
          <Grid item sm={4}>
            <Paper className={classes.paper}>Rating: {rating}, Deviation: {deviation}</Paper>
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
};

export default Profile;
