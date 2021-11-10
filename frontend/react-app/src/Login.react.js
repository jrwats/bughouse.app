import React, { useContext } from "react";
import FirebaseLogin from "./FirebaseLogin.react";
import { AuthContext } from "./auth/AuthProvider";
import FakeUserSelect from "./auth/FakeUserSelect.react";
import logo from "./images/blue_pink_neon_200.png";

const Login = ({ navigate }) => {
  const dev = process.env.NODE_ENV === 'development';
  const { pendingInit, user } = useContext(AuthContext);
  if (user != null) {
    navigate("/", { replace: true });
  }
  if (pendingInit || user != null) {
    console.log(`Login: pendingInit: ${pendingInit}`);
    return null;
  }
  console.log(`Login displaying login`);
  const fakeUsers = !dev ? null : (
    <div className="column">
      <FakeUserSelect />
    </div>
  );

  return (
    <div id="login" className="row">
      <div id="logo_splash" className="column">
        {/* <span class="bug_img_logo" alg="logo" /> */}
        <img className="bug-img-logo" alt="logo" src={logo} />
        <span className="bug-logo-text logo-glow">
          <span className="solid">bughouse.</span>
          app
        </span>
      </div>
      {fakeUsers}
      <div className="column">
        <FirebaseLogin />
      </div>
    </div>
  );
};

export default Login;
