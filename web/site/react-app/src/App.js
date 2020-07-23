import React from 'react';
import './App.css';
import Presence from './user/Presence';
import Login from './Login';
import Home from './Home';
import { Router } from "@reach/router";

Presence.init();

const App = () => {
  return(
    <Router>
      <Login path="/" />
      <Home path="home" />
    </Router>
  );
}

export default App;
