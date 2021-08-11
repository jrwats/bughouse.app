import React, { createContext, useContext, useEffect, useState } from "react";
import OnlineUsers from "./OnlineUsers";
import { AuthContext } from "../auth/AuthProvider";

export const UsersContext = createContext({
  onlineUsers: {},
  incomingOffers: {},
  outgoingOffers: {},
  partnerMap: {},
  partners: [],
  unpartnered: {},
});

const _mapPartners = (partners) => {
  const partnerMap = {};
  partners.forEach((pair) => {
    const [user1, user2] = pair;
    partnerMap[user1.handle] = user2.handle;
    partnerMap[user2.handle] = user1.handle;
  });
  return partnerMap;
};

const UsersProvider = (props) => {
  const src = OnlineUsers.get();
  const { user } = useContext(AuthContext);
  const [handleToUser, setHandleToUser] = useState(src.getHandleToUsers());
  const [incomingOffers, setIncomingOffers] = useState(src.getIncomingOffers());
  const [onlineUsers, setOnlineUsers] = useState(src.getUsers());
  const [outgoingOffers, setOutgoingOffers] = useState(src.getOutgoingOffers());
  const [partners, setPartners] = useState(src.getPartners());
  const [partnerMap, setPartnerMap] = useState(_mapPartners(partners));
  const [unpartnered, setUnpartnered] = useState(src.getUnpartnered());

  useEffect(() => {
    const usersListener = (users) => {
      setOnlineUsers({ ...users });
      setHandleToUser(src.getHandleToUsers());
    };
    const unpartneredListener = (users) => {
      setUnpartnered(users);
    };
    const partnersListener = (partners) => {
      setPartners(partners);
      setPartnerMap(_mapPartners(partners));
    };
    const outgoingOffersListener = (newOutgoingOffers) => {
      setOutgoingOffers({ ...newOutgoingOffers });
    };
    const incomingOffersListener = (newIncomingOffers) => {
      setIncomingOffers({ ...newIncomingOffers });
    };
    src.on("value", usersListener);
    src.on("unpartneredHandles", unpartneredListener);
    src.on("partners", partnersListener);
    src.on("outgoingOffers", outgoingOffersListener);
    src.on("incomingOffers", incomingOffersListener);
    return () => {
      src.off("value", usersListener);
      src.off("unpartneredHandles", unpartneredListener);
      src.off("partners", partnersListener);
      src.off("outgoingOffers", outgoingOffersListener);
      src.off("incomingOffers", incomingOffersListener);
    };
  });

  return (
    <UsersContext.Provider
      value={{
        onlineUsers,
        handleToUser,
        incomingOffers,
        outgoingOffers,
        partners,
        partnerMap,
        unpartnered,
      }}
    >
      {props.children}
    </UsersContext.Provider>
  );
};

export default UsersProvider;
