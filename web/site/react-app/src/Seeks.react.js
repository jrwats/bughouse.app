import React from "react";
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
