import React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import AuthProvider from './auth/AuthProvider';
import './App.css';
import Presence from './user/Presence';

import SecureRoute from './auth/SecureRoute'
import Login from './Login'
import Home from './Home'

Presence.init();

const App = () => (
  <Router>
    <AuthProvider>
      <Route exact path='/' component={Login} />
      <SecureRoute path='/home' component={Home} />
    </AuthProvider>
  </Router>
);
export default App;
