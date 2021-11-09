import firebase from "firebase/app";
import "firebase/auth"; // initializes firebase.auth
import "firebase/database"; // initializes firebase.database
import { PROD, DEV } from "./FirebaseConfig";

// console.log(`FIREBASE: ${FIREBASE}`);
console.log(`FIREBASE: ${process.env.REACT_APP_FIREBASE}`);

firebase.initializeApp(
  process.env.REACT_APP_FIREBASE !== "DEV" &&
    process.env.NODE_ENV === "production"
    ? PROD
    : DEV
);

const auth = firebase.auth();

window.__firebase = firebase;

export default auth;
