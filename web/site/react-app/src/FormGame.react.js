import React, { setState, useContext } from "react";
import Button from "@material-ui/core/Button";
import CloseIcon from '@material-ui/icons/Close';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import Switch from '@material-ui/core/Switch';
import Typography from '@material-ui/core/Typography';
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

function getMark(val, suffix) {
  return {
    value: val,
    label: `${val}${suffix}`,
  }
}

const FormGame = ({onCancel}) => {
  const { socket } = useContext(SocketContext);
  const [state, setState] = React.useState({
    rated: true,
    base: 3,
    inc: 0,
  });

  const onCreate = () => socket.sendEvent('form', {
    time: `${state.base}|${state.inc}`,
    rated: state.rated,
  });
  const handleChange = (event) => {
    setState({ ...state, [event.target.name]: event.target.checked });
  };

  let baseMarks= [1,2,3,4,5,10,20].map(v => getMark(v, 'm'));
  return (
    <div style={{flexGrow: 1}}>
      <Grid container spacing={1}>
        <Grid component="label" container alignItems="center" spacing={1}>
          <Grid item>
            <BugSwitch checked={state.rated} onChange={handleChange} name="rated" />
          </Grid>
          <Grid item>
            <Typography>
              {state.rated ? "Rated" : "Unrated"}
            </Typography>
          </Grid>
        </Grid>
        <Grid  container alignItems="center" spacing={2}>
          <Grid item>
            <Typography id="discrete-slider" gutterBottom>
              Minutes
            </Typography>
            <Slider
              defaultValue={state.base}
              getAriaValueText={(val) => `${val} minutes`}
              aria-labelledby="discrete-slider"
              valueLabelDisplay="on"
              step={null}
              marks={baseMarks}
            />
          </Grid>
        </Grid>
        <Grid container item xs={2}>
          <Button variant="contained" color="primary" onClick={onCreate}>
            Create Challenge
          </Button>
        </Grid>
        <Grid container item xs={2}>
          <Button variant="contained" color="secondary" onClick={onCancel}>
            <CloseIcon />Cancel
          </Button>
        </Grid>
      </Grid>
    </div>
  );
};

export default FormGame;
