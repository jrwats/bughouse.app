// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

// [START appengine_websockets_app]
const app = require('express')();
const fs = require('fs');
const admin = require('firebase-admin');
const log = require('./log');
const FicsManager = require('./FicsManager');
const FicsParser = require('./FicsParser');
const BughouseState = require('./BughouseState');

app.enable('trust proxy');
app.get('/', (req, res) => {
  res.send('websocket server here, at your service');
});

const getServer = () => {
  // Run local https server directly.  Otherwise rely on Google App
  // Engine proxying to http via https
  if (process.env.NODE_ENV === 'production') {
    return require('http').Server(app);
  }
  console.log('creating https server');
  const https = require('https');
  // To install certs on MacOS:
  //
  // mkdir -p .localhost-ssl
  // sudo openssl genrsa -out localhost.key 2048
  // sudo openssl req -new -x509 -key .localhost-ssl/localhost.key \
  //   -out .localhost-ssl/localhost.crt -days 1024 -subj /CN=localhost
  //
  // sudo security add-trusted-cert -d -r trustRoot -k \
  //   /Library/Keychains/System.keychain .localhost-ssl/localhost.crt
  return https.createServer({
    key: fs.readFileSync('.localhost-ssl/localhost.key'),
    cert: fs.readFileSync('.localhost-ssl/localhost.crt'),
  }, app);
}

const server = getServer();
const io = require('socket.io')(server);

log('initializing admin');
const adminSdkJson = process.env.NODE_ENV === 'production'
  ? './bughouse-secrets/.firebase-adminsdk.json'
  : './bughouse-secrets/.dev-firebase-adminsdk.json';
const dbURL = process.env.NODE_ENV === 'production'
  ? 'https://bughouse-274816.firebaseio.com'
  : 'https://bughouse-dev.firebaseio.com';
admin.initializeApp({
  credential: admin.credential.cert(require(adminSdkJson)),
  databaseURL: dbURL,
});
log('initialized admin');

const ficsMgr = FicsManager.get();
const bughouseState = BughouseState.get();
const parser = new FicsParser(ficsMgr);
const db = admin.database();

io.on('connection', (socket) => {
  let uid = null;
  log('connection');
  const token = socket.handshake.query.token;
  if (token == null) {
    socket.emit('err', {
      type: 'auth',
      message: 'No auth token provided',
    });
    return socket.disconnect(true);
  }
  console.log('Got socket connection');
  console.log(token);

  log(`token='${token.substr(0,20)}...'`);
  admin.auth().verifyIdToken(token)
    .then(decodedToken => {
      uid = decodedToken.uid;
      log(`Authenticated '${uid}'`);
      socket.emit('authenticated', true);
      log(decodedToken);
      const onlineTimestamp = db.ref(`online/${uid}/connections`).push();
      onlineTimestamp.onDisconnect().remove();

      const fics = ficsMgr.get(uid);
      if (fics.getUsername() != null) {
        socket.emit('login', fics.getUsername());
      } else {
        socket.emit('logged_out');
      }
      const dataListener = data => {
        log(`${Date.now()}: socket.emit('data', '${data.substr(0, 20)}...')`);
        socket.emit('data', data);
      };
      fics.on('data', dataListener);

      socket.on('fics_login', creds => {
        let ficsConn = ficsMgr.get(uid);
        if (ficsConn.isLoggedIn()) {
          socket.emit('login', ficsConn.getUsername());
          log(`Already connected as ${ficsConn.getUsername()}`);
          return;
        }
        log(`login(${creds.username})`);
        ficsConn.login(creds)
          .then(() => {
            socket.emit('login', ficsConn.getUsername());
            log(`${uid} logged in ${ficsConn.getUsername()}`);
          }).catch(err => {
            console.error(err);
            socket.emit('failedlogin', err.message);
            socket.emit('err', {
              type: 'login',
              message: err.message,
            });
          });
      });

      socket.on('fics_logout', () => {
        log(`${uid} logout ${fics && fics.getUsername()}`);
        socket.emit('logged_out');
        fics.off('data', dataListener);
        ficsMgr.get(uid).destroy();
      });
      const playersListener = players => {
        socket.emit('players', players);
      }
      bughouseState.on('players', playersListener);

      socket.on('disconnect', (reason) => {
        let username = ficsMgr.getUsername(uid) || 'NULL (not logged in)';
        log(`${uid} disconnected: ${username} ${JSON.stringify(reason)}`);
        bughouseState.off('players', playersListener);
        socket.removeAllListeners();
        ficsMgr.onClientDisconnect(uid);
        if (fics) {
          fics.off('data', dataListener);
        }
        onlineTimestamp.remove();
      });

      socket.on('cmd', async cmd => {
        const result = await ficsMgr.get(uid).send(cmd);
        log(`cmd '${cmd}': ${result.substr(30)}...`);
      });

      socket.on('move', (msg) => {
      });

      socket.on('players', () => {
        console.log(`app 'players' sending ${bughouseState.getPlayers().length}`);
        socket.emit('players', bughouseState.getPlayers());
      });

    }).catch(err => {
      console.error(err);
      socket.emit('err', {
        type: 'auth',
        message: err.message,
      });
      socket.disconnect(true);
    });

});

if (module === require.main) {
  const PORT = process.env.PORT || 7777;
  server.listen(PORT, () => {
    log(`App listening on port ${PORT}`);
    log('Press Ctrl+C to quit.');
  });
}
// [END appengine_websockets_app]
