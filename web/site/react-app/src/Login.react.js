import React, { useContext } from "react";
import FirebaseLogin from "./FirebaseLogin.react";
import { AuthContext } from "./auth/AuthProvider";
import logo from "./images/blue_pink_neon_200.png";

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
        {/* <span class="bug_img_logo" alg="logo" /> */}
        <img class="bug_img_logo" alt="logo" src={logo} />
        <span class="bug_logo_text">
          <span class="solid">
            bughouse.
          </span>
            app
        </span>
      </div>
      <div className="column">
        <FirebaseLogin />
      </div>
    </div>
  );
};

export default Login;
