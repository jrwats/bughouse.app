import React, { useContext } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CloseIcon from '@mui/icons-material/Close';
import Grid from "@mui/material/Grid";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import { makeStyles, withStyles } from "@mui/styles";
import { purple } from "@mui/material/colors";
import { deepPurple } from "@mui/material/colors";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import NativeSelect from "@mui/material/NativeSelect";
import { SocketContext } from "./socket/SocketProvider";

const useStyles = makeStyles((theme) => ({
  switchRoot: {
    padding: 0,
  },
  root: {
    color: "#ff000",
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
}));

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

const TimeSelect = ({ name, helper, value, values, onChange }) => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return (
    <FormControl>
      {isMobile ? (
        <>
          <NativeSelect
            id={`select-${name}`}
            value={value}
            name={name}
            onChange={onChange}
          >
            {values.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </>
      ) : (
        <>
          <Select
            id={`select-${name}`}
            value={value}
            name={name}
            onChange={onChange}
          >
            {values.map((v) => (
              <MenuItem key={v} value={v}>
                {v}
              </MenuItem>
            ))}
          </Select>
        </>
      )}
      <FormHelperText>{helper}</FormHelperText>
    </FormControl>
  );
};

const DEFAULT_BASE = 3;
const DEFAULT_INC = 0;
const FormTable = ({ onCancel }) => {
  const { socket } = useContext(SocketContext);
  const [state, setState] = React.useState({
    public: true,
    inc: DEFAULT_INC,
    base: DEFAULT_BASE,
    rated: true,
  });

  const onCreate = () => {
    console.log(`Creating ${state.base}|${state.inc}`);
    socket.sendEvent("create_table", {
      time: `${state.base}|${state.inc}`,
      rated: state.rated,
      public: state.public,
    });
  };
  const handleChange = (event) => {
    setState({ ...state, [event.target.name]: event.target.checked });
  };
  const handleSelect = (event) => {
    setState({ ...state, [event.target.name]: event.target.value });
  };
  const classes = useStyles();

  return (
    <div
      style={{
        marginTop: "14px",
        maxWidth: "40rem",
        marginLeft: "1rem",
        flexGrow: 1,
      }}
    >
      <Grid id="form_table" container spacing={4}>
        <Grid container alignItems="center" spacing={1}>
          <Grid item xs={2}>
            <Typography>{state.public ? "Public" : "Private"}</Typography>
          </Grid>
          <Grid item xs={2}>
            <Typography>{state.rated ? "Rated" : "Unrated"}</Typography>
          </Grid>
          <Grid item xs={2}>
            <Typography>Base</Typography>
          </Grid>
          <Grid item xs={2}>
            <Typography>Increment</Typography>
          </Grid>
        </Grid>
        <Grid container alignItems="center" spacing={1}>
          <Grid item xs={2} classes={{ root: classes.switchRoot }}>
            <BugSwitch
              checked={state.public}
              onChange={handleChange}
              name="public"
            />
          </Grid>
          <Grid item xs={2} classes={{ root: classes.switchRoot }}>
            <BugSwitch
              checked={state.rated}
              onChange={handleChange}
              name="rated"
            />
          </Grid>
          <Grid item xs={2}>
            <TimeSelect
              name="base"
              helper="in minutes"
              value={state.base}
              onChange={handleSelect}
              values={[1, 2, 3, 4, 5, 10, 20]}
            />
          </Grid>
          <Grid item xs={2}>
            <TimeSelect
              name="inc"
              helper="in seconds"
              value={state.inc}
              onChange={handleSelect}
              values={[0, 1, 2, 3, 4, 5, 10, 12, 20]}
            />
          </Grid>
        </Grid>
        <Grid container item xs={8} spacing={0} style={{ padding: "16px 0px" }}>
          <Box display="flex" justifyContent="center">
            <Box p={1}>
              <Button variant="contained" color="primary" onClick={onCreate}>
                Create Table
              </Button>
            </Box>
            <Box p={1}>
              <Button variant="contained" color="secondary" onClick={onCancel}>
                <CloseIcon />
                Cancel
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </div>
  );
};

export default FormTable;
