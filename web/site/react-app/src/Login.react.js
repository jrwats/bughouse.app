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
      <div id="logo_splash" className="column">
        <img class="bug_img_logo" alt="logo" src="/neon_horsies.png" />
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
