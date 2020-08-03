import firebase from "firebase/app";
import "firebase/auth"; // initializes firebase.auth
import "firebase/database"; // initializes firebase.database

const prodConfig = {
  apiKey: "AIzaSyDGLGrDsxUK2MPKd4xI9klvQaNrgWWRkEE",
  authDomain: "bughouse-274816.firebaseapp.com",
  databaseURL: "https://bughouse-274816.firebaseio.com",
  projectId: "bughouse-274816",
  storageBucket: "bughouse-274816.appspot.com",
  messagingSenderId: "757856014866",
  appId: "1:757856014866:web:cd7a7ac96676ba9255fecb",
  measurementId: "G-BGZVQM1CG5"
};

const devConfig = {
  apiKey: "AIzaSyD_hg77lc_QHhsdATF1Uy7nZItToB-FGXw",
  authDomain: "bughouse-dev.firebaseapp.com",
  databaseURL: "https://bughouse-dev.firebaseio.com",
  projectId: "bughouse-dev",
  storageBucket: "bughouse-dev.appspot.com",
  messagingSenderId: "49685448221",
  appId: "1:49685448221:web:52bab4a65a9aea225a28f4"
};

// console.log(`FIREBASE: ${FIREBASE}`);
console.log(`FIREBASE: ${process.env.REACT_APP_FIREBASE}`);

firebase.initializeApp(
  (process.env.REACT_APP_FIREBASE !== 'DEV' &&
   process.env.NODE_ENV === 'production')
    ? prodConfig
    : devConfig
);

const auth = firebase.auth();

window.__firebase = firebase;

export default auth;
