import React from "react";

const UserProfile = ({ user, ...rest }) => {
  const name = user.displayName || user.email;
  let picture = null;
  if (user.photoURL) {
    picture = (
      <img
        alt="profile"
        style={{
          top: "10px",
          position: "relative",
          paddingRight: "10px",
          height: "40px",
          width: "40px",
        }}
        src={user.photoURL}
      />
    );
  }
  return (
    <React.Fragment>
      <span style={{ ...rest.style }}>
        {picture}
        <span className="h6" style={{ fontSize: "1.5em" }}>
          {name}
        </span>
      </span>
    </React.Fragment>
  );
};

export default UserProfile;
