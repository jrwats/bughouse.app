import React, { useContext } from "react";
import FirebaseLogin from "./FirebaseLogin.react";
import { AuthContext } from "./auth/AuthProvider";

const Login = ({ navigate }) => {
  const { pendingInit, user } = useContext(AuthContext);
  if (user != null) {
    navigate("/", { replace: true });
  }
  if (pendingInit || user != null) {
    console.log(`Login: pendingInit: ${pendingInit}`);
    return null;
  }
  console.log(`Login displaying login`);

  return (
    <div id="login" className="row">
      <div
        className="column"
        style={{
          padding: "30px",
          borderRadius: "2rem",
          boxShadow: "10px 5px 5px #404040",
          backgroundColor: "#dfe0ef",
        }}
      >
        <img alt="logo" src="/bha_logo.png" />
      </div>
      <div className="column">
        <FirebaseLogin />
      </div>
    </div>
  );
};

export default Login;
