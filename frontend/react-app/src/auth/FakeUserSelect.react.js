import React, { useContext, useState } from "react";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import Select from "@mui/material/Select";
import { AuthListener } from "./AuthProvider";
import { SocketContext } from "../socket/SocketProvider";
import MenuItem from "@mui/material/MenuItem";

const fid2handle = {
  ".fake_a": "A1ekhine",
  ".fake_b": "B0risSpassky",
  ".fake_c": "Capab1anca",
  ".fake_d": "Dv0retsky",
  ".fake_e": "E.Lask3r",
  ".fake_f": "F1scher",
  ".fake_g": "GarryKaspar0v",
  ".fake_h": "H1karu",
};

const FakeUserSelect = ({ navigate }) => {
  const { socket } = useContext(SocketContext);
  const [state, setState] = React.useState({ firebaseID: ".fake_a" });

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const onChange = (event) => {
    setState({ ...state, [event.target.name]: event.target.value });
  };
  const onSubmit = () => {
    console.log(`Signing in as ${state.base}|${state.inc}`);
    AuthListener.__testSetFirebaseID(state.firebaseID);
    // socket.sendEvent("auth", { firebase_token: state.firebaseID });
  };
  return (
    <div style={{textAlign: "center"}}>
      <FormControl>
        <Select
          id={`select-firebase-id`}
          value={state.firebaseID}
          name={'firebaseID'}
          onChange={onChange}
        >
          {Object.keys(fid2handle).map((fid) => (
            <MenuItem key={fid} value={fid}>
              {fid2handle[fid]}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>{`Test user`}</FormHelperText>
      </FormControl>
      <div>
        <Button variant="contained" color="primary" onClick={onSubmit}>
          Sign in
        </Button>
      </div>
    </div>
  );
};

export default FakeUserSelect;
