import React, {useContext} from 'react'
import {Redirect, Route} from 'react-router-dom';
import {AuthContext} from './AuthProvider';

const RequireAuth = ({ children }) => {
  const {user} = useContext(AuthContext);
  if (user == null) {
    return <Redirect to='/' />;
  }
  return (
    <React.Fragment>
      {children}
    </React.Fragment>
  );
};

const SecureRoute = ( {component, ...props} ) => {
  const PassedComponent = component || function() { return null; };
  const WrappedComponent = () => (
    <RequireAuth>
      <PassedComponent />
    </RequireAuth>
  );
  return (
    <Route
      { ...props }
      render={() => props.render
        ? props.render({...props, component: WrappedComponent})
        : <WrappedComponent /> }
    />
  );
};

export default SecureRoute;
