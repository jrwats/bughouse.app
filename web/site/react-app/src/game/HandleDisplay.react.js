import React, { useContext } from "react";
import { UsersContext } from "../user/UsersProvider";
import UserName from "../UserName.react";

const HandleDisplay = ({ handle }) => {
  const { handleToUser } = useContext(UsersContext);
  return (
    <span>
      <span className="h6 roboto light">{handle}</span>
      <UserName
        user={handleToUser[handle]}
        className="h6"
        style={{
          display: "inline",
          fontWeight: "300",
        }}
      />
    </span>
  );
};

export default HandleDisplay;
