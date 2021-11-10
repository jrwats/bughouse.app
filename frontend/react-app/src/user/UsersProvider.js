import React, { createContext, useContext, useEffect, useRef, useState } from "react";
// import OnlineUsers from "./OnlineUsers";
import { SocketContext } from "../socket/SocketProvider";

export const UsersContext = createContext({
  onlineUsers: {},
  // incomingOffers: {},
  // outgoingOffers: {},
  // partnerMap: {},
  // partners: [],
  // unpartnered: {},
});

// const _mapPartners = (partners) => {
//   const partnerMap = {};
//   partners.forEach((pair) => {
//     const [user1, user2] = pair;
//     partnerMap[user1.handle] = user2.handle;
//     partnerMap[user2.handle] = user1.handle;
//   });
//   return partnerMap;
// };

const UsersProvider = (props) => {
  const { socket } = useContext(SocketContext);
  let users = useRef({});
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    const onOnline = ({ players }) => {
      console.log(`online_players: ${JSON.stringify(players)}`);
      users.current = {};
      if (players == null) {
        return;
      }
      for (const [uid, handle, rating] of players) {
        users.current[uid] = { uid, handle, rating };
      }
      setOnlineUsers(users.current);
    };
    const onUpdate = (data) => {
      console.log(`online_players_update: ${data}`);
      console.log(data);
      for (const uid of data.offline) {
        delete users.current[uid];
      }
      for (const user of data.online) {
        const [uid, handle, rating] = user;
        users.current[uid] = { uid, handle, rating };
      }
      setOnlineUsers({ ...users.current });
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

  // const src = OnlineUsers.get(socket);
  // const [handleToUser, setHandleToUser] = useState(src.getHandleToUsers());
  // const [incomingOffers, setIncomingOffers] = useState(src.getIncomingOffers());
  // const [outgoingOffers, setOutgoingOffers] = useState(src.getOutgoingOffers());
  // const [partners, setPartners] = useState(src.getPartners());
  // const [partnerMap, setPartnerMap] = useState(_mapPartners(partners));
  // const [unpartnered, setUnpartnered] = useState(src.getUnpartnered());

  // useEffect(() => {
  //   const usersListener = (users) => {
  //     setOnlineUsers({ ...users });
  //     setHandleToUser(src.getHandleToUsers());
  //   };
  //   const unpartneredListener = (users) => {
  //     setUnpartnered(users);
  //   };
  //   const partnersListener = (partners) => {
  //     setPartners(partners);
  //     setPartnerMap(_mapPartners(partners));
  //   };
  //   const outgoingOffersListener = (newOutgoingOffers) => {
  //     setOutgoingOffers({ ...newOutgoingOffers });
  //   };
  //   const incomingOffersListener = (newIncomingOffers) => {
  //     setIncomingOffers({ ...newIncomingOffers });
  //   };
  //   src.on("value", usersListener);
  //   src.on("unpartneredHandles", unpartneredListener);
  //   src.on("partners", partnersListener);
  //   src.on("outgoingOffers", outgoingOffersListener);
  //   src.on("incomingOffers", incomingOffersListener);
  //   return () => {
  //     src.off("value", usersListener);
  //     src.off("unpartneredHandles", unpartneredListener);
  //     src.off("partners", partnersListener);
  //     src.off("outgoingOffers", outgoingOffersListener);
  //     src.off("incomingOffers", incomingOffersListener);
  //   };
  // }, [socket]);

  return (
    <UsersContext.Provider
      value={{
        onlineUsers,
        // handleToUser,
        // incomingOffers,
        // outgoingOffers,
        // partners,
        // partnerMap,
        // unpartnered,
      }}
    >
      {props.children}
    </UsersContext.Provider>
  );
};

export default UsersProvider;
