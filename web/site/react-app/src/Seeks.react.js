import Button from "@material-ui/core/Button";
import React from "react";
import Seek from "./Seek.react";
import Typography from "@material-ui/core/Typography";
import CancelIcon from '@material-ui/icons/Cancel';

const Seeks = ({onCancel}) => {
  return (
    <div>
      <Typography variant="h6" style={{display: "inline-block"}}>
        Seek a game:
      </Typography>
      <div>
        <Seek time="1|0" />
        <Seek time="3|0" />
      </div>
      <div style={{marginTop: "1em"}}>
        <Button 
          variant="contained"
          color="secondary"
          onClick={onCancel}>
          <CancelIcon fontSize="small" /> 
          <span style={{marginLeft: "0.5em"}}>Cancel</span>
        </Button>
      </div>
    </div>
  );
};
export default Seeks;
