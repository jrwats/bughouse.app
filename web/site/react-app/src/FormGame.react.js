import React, { useContext } from "react";
import Button from "@material-ui/core/Button";
import CloseIcon from "@material-ui/icons/Close";
import Grid from "@material-ui/core/Grid";
import Slider from "@material-ui/core/Slider";
import Switch from "@material-ui/core/Switch";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";
import { purple } from "@material-ui/core/colors";
import { deepPurple } from "@material-ui/core/colors";

import { SocketContext } from "./socket/SocketProvider";

const BugSwitch = withStyles({
  switchBase: {
    color: purple[600],
    "&$checked": {
      color: deepPurple[600],
    },
    "&$checked + $track": {
      backgroundColor: deepPurple[600],
    },
  },
  checked: {},
  track: {},
})(Switch);

function getMark(val, suffix) {
  return {
    value: val,
    label: `${val}${suffix}`,
  };
}

const DEFAULT_BASE = 3;
const DEFAULT_INC = 0;
const FormGame = ({ onCancel }) => {
  const { socket } = useContext(SocketContext);
  const [state, setState] = React.useState({
    rated: true,
    base: DEFAULT_BASE,
    inc: DEFAULT_INC,
  });

  const onCreate = () => {
    console.log(`Creating ${state.base}|${state.inc}`);
    socket.sendEvent("form", {
      time: `${state.base}|${state.inc}`,
      rated: state.rated,
    });
  };
  const handleChange = (event) => {
    setState({ ...state, [event.target.name]: event.target.checked });
  };

  const mins = [1, 2, 3, 4, 5, 10, 20];
  const baseMarks = mins.map((v, idx) => getMark(v, "")); // /'m'));
  const secs = [0, 1, 2, 3, 4, 5, 10, 12, 20];
  const baseSeconds = secs.map((v, idx) => getMark(v, "")); // /'m'));

  return (
    <div style={{ marginLeft: "100px", flexGrow: 1 }}>
      <Grid container spacing={1}>
        <Grid component="label" container alignItems="center" spacing={1}>
          <Grid item>
            <Typography>{state.rated ? "Rated" : "Unrated"}</Typography>
          </Grid>
          <Grid item>
            <BugSwitch
              checked={state.rated}
              onChange={handleChange}
              name="rated"
            />
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
              defaultValue={DEFAULT_BASE}
              getAriaValueText={(val) => `${val} minutes`}
              aria-labelledby="discrete-slider"
              valueLabelDisplay="auto"
              onChangeCommitted={(_e, val) => {
                setState({ ...state, base: val });
              }}
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
              defaultValue={DEFAULT_INC}
              getAriaValueText={(val) => `${val} seconds`}
              aria-labelledby="discrete-slider-inc"
              valueLabelDisplay="auto"
              onChangeCommitted={(_e, val) => {
                setState({ ...state, inc: val });
              }}
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
            <CloseIcon />
            Cancel
          </Button>
        </Grid>
      </Grid>
    </div>
  );
};

export default FormGame;
