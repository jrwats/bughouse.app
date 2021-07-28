import React, { setState, useContext } from "react";
import Button from "@material-ui/core/Button";
import Switch from '@material-ui/core/Switch';
import Grid from '@material-ui/core/Grid';
import { withStyles } from '@material-ui/core/styles';
import { indigo } from '@material-ui/core/colors';

import { SocketContext } from "./socket/SocketProvider";

const BugSwitch = withStyles({
  switchBase: {
    color: indigo[400],
    '&$checked': {
      color: indigo[600],
    },
    '&$checked + $track': {
      backgroundColor: indigo[600],
    },
  },
  checked: {},
  track: {},
})(Switch);

const FormGame = () => {
  const { socket } = useContext(SocketContext);
  const [state, setState] = React.useState({
    checked: true,
  });

  const handleChange = (event) => {
    setState({ ...state, [event.target.name]: event.target.checked });
  };

  return (
    <Grid component="label" container alignItems="center" spacing={1}>
      <Grid item>
        <BugSwitch checked={state.checked} onChange={handleChange} name="checked" />
      </Grid>
      <Grid item>{state.checked ? "Rated" : "Unrated"}</Grid>
    </Grid>
  );
};

export default FormGame;
