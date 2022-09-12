const logout = (auth, socket) => {
  if (socket != null) {
    socket.destroy();
  }
  console.log("logging out");
  auth()
    .signOut()
    .then(() => {
      console.log("firebase signed out");
    })
    .catch((err) => {
      console.error(err);
    });
};

export default logout;
