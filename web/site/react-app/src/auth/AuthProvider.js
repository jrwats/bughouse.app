import React, {createContext, useState} from 'react';
import auth from "./firebase-init";

/**
 * Provide authenticated firebase user as context to child components
 */
export const AuthContext = createContext({user: auth.currentUser});
const AuthProvider = (props) => {
  console.log('AuthProvider');
  const [pendingAuth, setPending] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  auth.onAuthStateChanged(userAuth => {
    setUser(userAuth);
    setPending(false);
  });

  return (
    <AuthContext.Provider value={{user, pendingAuth}}>
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
