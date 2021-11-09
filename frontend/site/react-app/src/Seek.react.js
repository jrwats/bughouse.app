import React, { useContext } from "react";
import Button from "@mui/material/Button";
import { SocketContext } from "./socket/SocketProvider";

const Seek = ({ time, disabled }) => {
  const { socket } = useContext(SocketContext);

  return (
    <Button
      style={{ marginLeft: "1em", marginTop: "1em" }}
      variant="contained"
      color="primary"
      disabled={disabled}
      onClick={() => {
        socket.sendEvent("seek", { time });
      }}
    >
      {time}
    </Button>
  );
};

export default Seek;
