import React, { useContext } from "react";
import Button from "@material-ui/core/Button";
import { SocketContext } from "./socket/SocketProvider";
import Seek from "./Seek.react";

const Seeks = () => {
  return (
    <div>
      Seek a game:
      <div>
        <Seek time="1|0" />
        <Seek time="3|0" />
      </div>
    </div>
  );
};
export default Seeks;
