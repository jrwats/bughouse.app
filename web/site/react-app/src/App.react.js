import React from 'react';
import './App.css';
import Presence from './user/Presence';
import Login from './Login.react';
import Home from './Home.react';
import { Router } from "@reach/router";
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';

Presence.init();

const App = () => {
  const darkTheme = createMuiTheme({ palette: { type: 'dark' }});
  return(
    <ThemeProvider theme={darkTheme}>
      <Router>
        <Login path="/" />
        <Home path="home/*" />
      </Router>
    </ThemeProvider>
  );
}

export default App;
