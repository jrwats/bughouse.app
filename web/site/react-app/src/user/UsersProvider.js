import React, {createContext, useEffect, useState} from 'react';
import OnlineUsers from "./OnlineUsers";

export const UsersContext = createContext({onlineUsers: {}, ficsOnline: []});
const UsersProvider = (props) => {
  const src = OnlineUsers.get();
  const [onlineUsers, setOnlineUsers] = useState(src.getUsers());
  const [ficsOnline, setFicsOnline] = useState(src.getFicsHandles());

  useEffect(() => {
    const usersListener = (users) => { setOnlineUsers({...users}); };
    const ficsListener = (ficsHandles) => { setFicsOnline(ficsHandles); };
    src.on('value', usersListener);
    src.on('ficsOnline', ficsListener);
    return () => {
      src.off('value', usersListener);
      src.off('ficsListener', ficsListener);
    };
  });
  return (
    <UsersContext.Provider value={{onlineUsers, ficsOnline}}>
      {props.children}
    </UsersContext.Provider>
  );
}

export default UsersProvider;
