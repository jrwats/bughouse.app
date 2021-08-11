import React, { useContext } from "react";
import EditIcon from '@material-ui/icons/Edit';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import { ViewerContext } from "./ViewerProvider";
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));

const Profile = (props) => {
  const { handle, rating, deviation } = useContext(ViewerContext);
  debugger;
  console.log('Profile');
  const classes = useStyles();

  return (
    <div style={{flexGrow: 1}}>
       <Grid container spacing={3}>
        <Grid item xs={4}>
          <Paper className={classes.paper}>{handle}</Paper>
        </Grid>
        <Grid item xs={4} sm={6}>
          <EditIcon fontSize="small" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper className={classes.paper}>Rating: </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper className={classes.paper}>{rating}</Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper className={classes.paper}>Deviation: </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper className={classes.paper}>{deviation}</Paper>
        </Grid>
      </Grid>
    </div>
  );
};

export default Profile;
