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
          padding: "0px 50px 0px 12px",
          borderRadius: "2rem",
          boxShadow: "10px 5px 5px #404040",
          backgroundColor: "#202030",
          textAlign: "center",
        }}
      >
        <img class="bug_img_logo" alt="logo" src="/blurred_horsies.png" />
        <span class="bug_logo_text">
          <b>bughouse.</b>app
        </span>
      </div>
      <div className="column">
        <FirebaseLogin />
      </div>
    </div>
  );
};

export default Login;
