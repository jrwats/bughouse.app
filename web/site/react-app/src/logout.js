import firebase from "firebase/app";

const logout = (telnet) => {
  telnet.destroy();
  console.log('logging out');
  firebase.auth().signOut().then(() => {
    console.log('firebase signed out');
  }).catch((err) => {
    console.error(err);
  });
};

export default logout;
