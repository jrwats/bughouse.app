import { initializeApp } from "firebase/app";
import "firebase/database"; // initializes firebase.database
// import firebase from 'firebase/compat/app';
import { getAuth } from "firebase/auth";
import { PROD, DEV } from "./FirebaseConfig";

// console.log(`FIREBASE: ${FIREBASE}`);
console.log(`FIREBASE: ${process.env.REACT_APP_FIREBASE}`);

const firebaseApp = initializeApp(
  process.env.REACT_APP_FIREBASE !== "DEV" &&
    process.env.NODE_ENV === "production"
    ? PROD
    : DEV
);

const appAuth = getAuth(firebaseApp);

window.__firebase = firebaseApp;

export default appAuth;
