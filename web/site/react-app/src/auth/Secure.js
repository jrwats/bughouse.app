import React, {useContext} from 'react'
import {navigate} from 'hookrouter';
import {AuthContext} from './AuthProvider';

const Secure = ({ children }) => {
  const {user} = useContext(AuthContext);
  if (user == null) {
    console.log(`Secure user is null, navigating to login`);
    navigate('/', true);
    return null;
  }
  return (
    <React.Fragment>
      {children}
    </React.Fragment>
  );
};

export default Secure;
