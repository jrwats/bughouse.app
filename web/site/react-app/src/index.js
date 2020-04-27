import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { createBrowserHistory } from 'history'

import './index.css';
import * as serviceWorker from './serviceWorker';
import App from './App';

const history = createBrowserHistory();

ReactDOM.render((
  <React.StrictMode>
    <Router history={history}>
      <App history={history} />
    </Router>
  </React.StrictMode>
), document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
