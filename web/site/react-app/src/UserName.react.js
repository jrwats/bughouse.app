import React from "react";

const UserName = ({ className, user, style }) => {
  if (user == null) {
    return null;
  }
  const displayName = user.displayName || (user.email || "").split("@")[0];
  return (
    <div className={className} style={style}>
      <span
        className="roboto"
        style={{
          overflow: "ellipsis",
          maxWidth: "20rem",
          paddingLeft: ".5em",
        }}
      >
        ({displayName})
      </span>
    </div>
  );
};

export default UserName;
