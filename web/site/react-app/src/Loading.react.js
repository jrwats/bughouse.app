import React from "react";
import CircularProgress from "@material-ui/core/CircularProgress";

const Loading = ({ style, size }) => {
  const default_style = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: "10px",
  };
  console.log(`size: ${size}`);
  return (
    <div style={{ default_style, ...style }}>
      <CircularProgress size={size} className="dark" />
    </div>
  );
};

export default Loading;
