import React, {createContext, useContext, useEffect, useState} from 'react';
import OnlineUsers from "./OnlineUsers";
import {AuthContext} from '../auth/AuthProvider';

export const UsersContext = createContext({
  viewingUser: null,
  onlineUsers: {},
  incomingOffers: {},
  outgoingOffers: {},
  partnerMap: {},
  partners: [],
  unpartnered: {},
});

const _mapPartners = (partners) => {
  const partnerMap = {};
  partners.forEach(pair => {
    const [user1, user2] = pair;
    partnerMap[user1.handle] = user2.handle;
    partnerMap[user2.handle] = user1.handle;
  });
  return partnerMap;
}

const UsersProvider = (props) => {
  const src = OnlineUsers.get();
  const {user} = useContext(AuthContext);
  const [onlineUsers, setOnlineUsers] = useState(src.getUsers());
  const [viewingUser, setViewingUser] = useState(onlineUsers[user.uid]);
  const [unpartnered, setUnpartnered] = useState(src.getUnpartnered());
  const [partners, setPartners] = useState(src.getPartners());
  const [partnerMap, setPartnerMap] = useState(_mapPartners(partners));
  const [outgoingOffers, setOutgoingOffers] = useState(src.getOutgoingOffers());
  const [incomingOffers, setIncomingOffers] = useState(src.getIncomingOffers());

  useEffect(() => {
    const usersListener = (users) => {
      setOnlineUsers({...users});
      setViewingUser(users[user.uid]);
    };
    const unpartneredListener = (users) => {
      setUnpartnered(users);
    };
    const partnersListener = (partners) => {
      setPartners(partners);
      setPartnerMap(_mapPartners(partners))
    };
    const outgoingOffersListener = (newOutgoingOffers) => {
      setOutgoingOffers({...newOutgoingOffers});
    };
    const incomingOffersListener = (newIncomingOffers) => {
      setIncomingOffers({...newIncomingOffers});
    };
    src.on('value', usersListener);
    src.on('unpartneredHandles', unpartneredListener);
    src.on('partners', partnersListener);
    src.on('outgoingOffers', outgoingOffersListener);
    src.on('incomingOffers', incomingOffersListener);
    return () => {
      src.off('value', usersListener);
      src.off('unpartneredHandles', unpartneredListener);
      src.off('incomingOffers', incomingOffersListener);
    };
  });

  return (
    <UsersContext.Provider value={{
      viewingUser,
      onlineUsers,
      incomingOffers,
      outgoingOffers,
      partners,
      partnerMap,
      unpartnered}}>
      {props.children}
    </UsersContext.Provider>
  );
}

export default UsersProvider;
