import React, { useContext } from "react";
import Button from "@material-ui/core/Button";
import { SocketContext } from "./socket/SocketProvider";

const Seek = ({ time }) => {
  const { socket } = useContext(SocketContext);

  return (
    <Button
      style={{ marginTop: "10px" }}
      variant="contained"
      color="primary"
      onClick={() => {
        socket.sendEvent("seek", { time });
      }}
    >
      {time}
    </Button>
  );
};

export default Seek;
