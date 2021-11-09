import React, { useContext } from "react";
import { AuthContext } from "./auth/AuthProvider";
import { useNavigate } from "@reach/router";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import AppSignOut from "./AppSignOut";
import UserProfile from "./user/UserProfile.react";

const VerifyEmail = (props) => {
  const { user, needsEmailVerified } = useContext(AuthContext);
  const navigate = useNavigate();

  if (user == null) {
    console.log(`VerifyEmail user == null`);
    navigate("/login", true);
    return null;
  } else if (!needsEmailVerified) {
    navigate("/", true);
    return null;
  }
  const resendEmail = (e) => {
    user.sendEmailVerification();
    e.preventDefault();
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-evenly",
        flexDirection: "column",
      }}
    >
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
      <Paper
        elevation={8}
        style={{
          marginTop: "20px",
          padding: "8px 4px 20px 2px",
          textAlign: "center",
          maxWidth: "20em",
        }}
      >
        Please check your email and verify your email address. Be sure to check
        your spam folder too.
        <p />
        After you've done this, you can try refreshing this page
        <div style={{ paddingTop: "10px" }}>
          <Button variant="contained" color="primary" onClick={resendEmail}>
            Resend Verification email
          </Button>
        </div>
      </Paper>
      <div style={{ marginTop: "80px" }}>
        <UserProfile
          user={user}
          style={{
            position: "relative",
            top: "4px",
            paddingRight: "40px",
          }}
        />
        <AppSignOut />
      </div>
    </div>
  );
};

export default VerifyEmail;
