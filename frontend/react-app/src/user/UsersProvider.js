import React, { createContext, useContext, useEffect, useRef, useState } from "react";
// import OnlineUsers from "./OnlineUsers";
import { SocketContext } from "../socket/SocketProvider";

export const UsersContext = createContext({
  onlineUsers: new Map(),
  handleToUser: new Map(),
});

function getHandleToUsers(users) {
  const h2u = new Map();
  for (const [_uid, user] of users) {
    h2u.set(user.handle, user);
  }
  return h2u;
}

const UsersProvider = (props) => {
  const { socket } = useContext(SocketContext);
  let users = useRef(new Map());
  const [onlineUsers, setOnlineUsers] = useState(users.current);
  const [handleToUser, setHandleToUser] = useState(new Map());

  useEffect(() => {
    const onOnline = ({ players }) => {
      console.log(`online_players: ${JSON.stringify(players)}`);
      users.current = new Map();
      if (players == null) {
        return;
      }
      for (const [uid, handle, rating] of players) {
        users.current.set(uid, { uid, handle, rating });
      }
      setOnlineUsers(users.current);
      setHandleToUser(getHandleToUsers(users.current));
    };
    const onUpdate = (data) => {
      console.log(`online_players_update: ${data}`);
      console.log(data);
      for (const uid of data.offline) {
        users.current.delete(uid);
      }
      for (const user of data.online) {
        const [uid, handle, rating] = user;
        users.current.set(uid, { uid, handle, rating });
      }
      setOnlineUsers(new Map(users.current));
      setHandleToUser(getHandleToUsers(users.current));
    };
    socket.on("online_players", onOnline);
    socket.on("online_players_update", onUpdate);
    console.log(`OnlineUsers sending 'online_players'`);
    socket.sendEvent("online_players", { count: 0, cursor: null });
    return () => {
      socket.off("online_players", onOnline);
      socket.off("online_players_update", onUpdate);
    };
  }, [socket]);

  return (
    <UsersContext.Provider
      value={{
        onlineUsers,
        handleToUser,
      }}
    >
      {props.children}
    </UsersContext.Provider>
  );
};

export default UsersProvider;
