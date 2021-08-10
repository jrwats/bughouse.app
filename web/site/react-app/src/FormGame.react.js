import React, { useContext } from "react";
import Button from "@material-ui/core/Button";
import CloseIcon from '@material-ui/icons/Close';
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

  const mins = [1, 2, 3, 4, 5, 10, 20];
  const baseMarks = mins.map((v, idx) => getMark(v, '')); // /'m'));
  const secs = [0, 1, 2, 3, 4, 5, 10, 12, 20];
  const baseSeconds = secs.map((v, idx) => getMark(v, '')); // /'m'));

  return (
    <div style={{marginLeft: "100px", flexGrow: 1}}>
      <Grid container spacing={1}>
        <Grid component="label" container alignItems="center" spacing={1}>
          <Grid item>
            <Typography>
              {state.rated ? "Rated" : "Unrated"}
            </Typography>
          </Grid>
          <Grid item>
            <BugSwitch checked={state.rated} onChange={handleChange} name="rated" />
          </Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid item xs={2}>
            <Typography id="discrete-slider" gutterBottom>
              Base (minutes)
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Slider
              defaultValue={state.base}
              getAriaValueText={(val) => `${val} minutes`}
              aria-labelledby="discrete-slider"
              valueLabelDisplay="auto"
              step={null}
              max={mins[mins.length - 1]}
              marks={baseMarks}
            />
          </Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid item xs={2}>
            <Typography id="discrete-slider-inc" gutterBottom>
              Increment (seconds)
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Slider
              defaultValue={state.inc}
              getAriaValueText={(val) => `${val} seconds`}
              aria-labelledby="discrete-slider-inc"
              valueLabelDisplay="auto"
              step={null}
              max={secs[secs.length - 1]}
              marks={baseSeconds}
            />
          </Grid>
        </Grid>
        <Grid container item xs={3}>
          <Button variant="contained" color="primary" onClick={onCreate}>
            Create Table
          </Button>
        </Grid>
        <Grid container item xs={4}>
          <Button variant="contained" color="secondary" onClick={onCancel}>
            <CloseIcon />Cancel
          </Button>
        </Grid>
      </Grid>
    </div>
  );
};

export default FormGame;
