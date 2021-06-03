import React from 'react';
import SideMenu from './SideMenu.react';
import Bugwho from './Bugwho.react';
import Arena from './game/Arena.react';
import { Router } from "@reach/router";
import FicsTelnetOutput from './FicsTelnetOutput';

const Main = (props) => {
  return (
    <div style={{width: '100%', height: '100%'}}>
      <SideMenu style={{position: 'absolute'}} />
      <div style={{
        top: '0px',
        position: 'absolute',
        height: '100%',
        width: '100%',
      }} >
      <Router>
        <Arena path="/arena/:gamePair" />
        <Bugwho path="/" />
        <FicsTelnetOutput path="fics_console"/>
      </Router>
      </div>
    </div>
  );
}

export default Main;