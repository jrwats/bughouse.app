import React, {useContext} from 'react'
import { Redirect } from 'react-router-dom'
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import firebase from "firebase/app";
import {AuthContext} from './auth/AuthProvider';

// import Button from '@material-ui/core/Button';

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const Login = () => {
  // https://github.com/firebase/firebaseui-web
  const uiConfig = {
    // Popup on web, redirect on mobile
    signInFlow: isMobile ? 'redirect' : 'popup',
    signInSuccessUrl: '/home',
    callbacks: {
      signInSuccessWithAuthResult: function(authResult, redirectUrl) {
        console.log('signin successful');
        console.log(authResult);
        console.log(redirectUrl);
        // User successfully signed in.
        // Return type determines whether we continue the redirect automatically
        // or whether we leave that to developer to handle.
        return isMobile;
      },
    },
    signInOptions: [
      {
        provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
        requireDisplayName: false,
        // Allow the user the ability to complete sign-in cross device,
        // including the mobile apps specified in the ActionCodeSettings
        // object below.
        forceSameDevice: false,
      },
      // List of OAuth providers supported.
      {
        provider: firebase.auth.FacebookAuthProvider.PROVIDER_ID,
        scopes: [
          'public_profile',
          'email',
        ],
      },
      {
        provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        customParameters: {
          // Forces account selection even when one account
          // is available.
          prompt: 'select_account'
        }
      },
      firebase.auth.GithubAuthProvider.PROVIDER_ID,
    ],
    // Privacy policy url.
    tosUrl: 'https://bughouse.app/static/TOS.pdf',
    privacyPolicyUrl: 'https://bughouse.app/privacy'
  };

  const {pendingAuth, user} = useContext(AuthContext);
  if (pendingAuth) {
    return null;
  } else if (user) {
    return <Redirect to='/home' />
  }
  return (
    <div id="login" className="row">
      <div className="column">
        <img alt="logo" src="/bha_logo.png" />
      </div>
      <div className="column">
        <StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={firebase.auth()} />
      </div>
    </div>
  );
};

export default Login;
