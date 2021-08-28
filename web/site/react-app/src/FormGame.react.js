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

import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import NativeSelect from '@material-ui/core/NativeSelect';

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

const TimeSelect = ({label, name, helper, value, values, onChange}) => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return (
    <FormControl >
      {isMobile ? (
        <>
          <InputLabel id="select-base-label">{label}</InputLabel>
          <NativeSelect
            labelId={`select-${name}-label`}
            id={`select-${name}`}
            value={value}
            name={name}
            onChange={onChange}
          >
            {values.map(v => <option value={v}>{v}</option>)}
          </NativeSelect>
        </>
      ) : (
        <>
          <InputLabel id="select-base-label">{label}</InputLabel>
          <Select
            labelId={`select-${name}-label`}
            id={`select-${name}`}
            value={value}
            name={name}
            onChange={onChange}
          >
            {values.map(v => <MenuItem value={v}>{v}</MenuItem>)}
          </Select>
        </>
      )}
      <FormHelperText>{helper}</FormHelperText>
    </FormControl>
  );
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
  const handleSelect = (event) => {
    setState({ ...state, [event.target.name]: event.target.value });
  };

  const mins = [1, 2, 3, 4, 5, 10, 20];
  const baseMarks = mins.map((v, idx) => getMark(v, "")); // /'m'));
  const secs = [0, 1, 2, 3, 4, 5, 10, 12, 20];
  const baseSeconds = secs.map((v, idx) => getMark(v, "")); // /'m'));

  return (
    <div style={{ marginLeft: "1rem", flexGrow: 1 }}>
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
          <Grid item xs={2}>
            <TimeSelect label="Base"
              name="base"
              helper="in minutes"
              value={state.base}
              onChange={handleSelect}
              values={[1, 2, 3, 4, 5, 10, 20]} />
          </Grid>
          <Grid item xs={2}>
            <TimeSelect label="Increment"
              name="inc"
              helper="in seconds"
              value={state.inc}
              onChange={handleSelect}
              values={secs} />
          </Grid>
        </Grid>
        <Grid container spacing={2}>
        </Grid>
        <Grid container item xs={4}>
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
