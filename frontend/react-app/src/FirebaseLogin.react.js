import React, { useContext } from "react";

import StyledFirebaseAuth from "react-firebaseui/StyledFirebaseAuth";

import { AuthContext } from "./auth/AuthProvider";

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const FirebaseLogin = () => {
  const { auth, pendingInit, user } = useContext(AuthContext);
  if (pendingInit || user != null) {
    console.log(`FirebaseLogin: pendingInit: ${pendingInit}`);
    return null;
  }
  const signInOptions = [
    {
      provider: auth.EmailAuthProvider.PROVIDER_ID,
      requireDisplayName: false,
      // Allow the user the ability to complete sign-in cross device,
      // including the mobile apps specified in the ActionCodeSettings
      // object below.
      forceSameDevice: false,
    },
    // List of OAuth providers supported.
    {
      provider: auth.FacebookAuthProvider.PROVIDER_ID,
      scopes: ["public_profile", "email"],
    },
    {
      provider: auth.GoogleAuthProvider.PROVIDER_ID,
      customParameters: {
        // Forces account selection even when one account
        // is available.
        prompt: "select_account",
      },
    },
    auth.GithubAuthProvider.PROVIDER_ID,
  ];

  // https://github.com/firebase/firebaseui-web
  const uiConfig = {
    // Popup on web, redirect on mobile
    signInFlow: "redirect", // isMobile ? "redirect" : "popup",
    signInSuccessUrl: "/",
    callbacks: {
      signInSuccessWithAuthResult: function (authResult, redirectUrl) {
        // TODO: this should go serverside...
        if (
          authResult.additionalUserInfo?.providerId === "password" &&
          !authResult.user.emailVerified
        ) {
          console.log("needs email verification");
          user.sendEmailVerification();
        }
        console.log("signin successful");
        // console.log(authResult);
        // console.log(redirectUrl);
        // User successfully signed in.
        // Return type determines whether we continue the redirect automatically
        // or whether we leave that to developer to handle.
        return isMobile;
      },
      uiShown: function () {
        console.log("firebase UI shown");
        console.log(`currentUser: ${auth().currentUser}`);
      },
      signInFailure: function (err) {
        debugger;
        console.error(err);
      },
    },
    signInOptions,
    // Privacy policy url.
    tosUrl: "https://bughouse.app/TOS.pdf",
    privacyPolicyUrl: "https://bughouse.app/privacy.htm",
  };
  return (
    <StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={auth()} />
  );
};

export default FirebaseLogin;
