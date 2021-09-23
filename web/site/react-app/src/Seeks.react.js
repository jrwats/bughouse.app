import Button from "@material-ui/core/Button";
import React from "react";
import Seek from "./Seek.react";
import Typography from "@material-ui/core/Typography";
import CancelIcon from "@material-ui/icons/Cancel";
import MuiAlert from "@mui/material/Alert";

const Seeks = ({ onCancel }) => {
  return (
    <div>
      <div style={{ maxWidth: "30vw" }}>
        <div className="alien subtitle"> Seek a game: </div>
      </div>
      <div style={{ maxWidth: "30vw" }}>
        <MuiAlert severity="info" elevation={6} variant="filled">
          We'll open up more seek pools as we get more users
        </MuiAlert>

        
      </div>
      <div>
        <Seek disabled={true} time="1|0" />
        <Seek time="3|0" />
        <Seek disabled={true} time="5|0" />
      </div>
      <div>
        <Seek disabled={true} time="1|2" />
        <Seek disabled={true} time="3|2" />
        <Seek disabled={true} time="5|5" />
      </div>
      <div style={{ marginTop: "1em" }}>
        <Button variant="contained" color="secondary" onClick={onCancel}>
          <CancelIcon fontSize="small" />
          <span style={{ marginLeft: "0.5em" }}>Cancel</span>
        </Button>
      </div>
    </div>
  );
};
export default Seeks;
