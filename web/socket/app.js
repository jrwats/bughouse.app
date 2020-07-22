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
const FicsClient = require('./FicsClient');

app.enable('trust proxy');
app.get('/', (req, res) => {
  res.send('websocket server here, at your service');
});

function info(msg) {
  if (process.env.NODE_ENV === 'production' &&
      process.env.DEBUG == null) {
    return;
  }
  console.log(`Server: ` + msg);
}

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

info('initializing admin');
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
info('initialized admin');

let uid2fics = {};
let uid2destroy = {};

io.on('connection', (socket) => {
  let uid = null;
  info('connection');
  const token = socket.handshake.query.token;
  if (token == null) {
    socket.emit('err', {
      type: 'auth',
      message: 'No auth token provided',
    });
    return socket.disconnect(true);
  }

  info(`token='${token.substr(0,20)}...'`);
  admin.auth().verifyIdToken(token)
    .then(decodedToken => {
      uid = decodedToken.uid;
      info(`Authenticated '${uid}'`);
      socket.emit('authenticated', true);

      let fics = uid2fics[uid];
      const logout = () => {
        info(`Deleting FICS telnet connection for ${uid}`);
        delete uid2fics[uid];
        fics.destroy();
        fics.removeAllListeners();
        fics = null;
      };

      const getFicsConn = () => {
        if (fics != null) {
          return fics;
        }
        if (uid2fics[uid] != null) {
          return uid2fics[uid];
        }
        return uid2fics[uid] = new FicsClient();
      }

      if (fics != null) {
        if (uid2destroy[uid] != null) {
          clearTimeout(uid2destroy[uid]);
          delete uid2destroy[uid];
        }
        info(`Reusing FICS telnet connection for ${uid}`);
        info(`Usernamme: ${fics.getUsername()}`);
        return fics;
      } else {
        info(`Establishing new FICS telnet connection for ${uid}`);
        fics = getFicsConn();
      }

      if (fics.getUsername() != null) {
        socket.emit('login', fics.getUsername());
      } else {
        socket.emit('logged_out');
      }

      const dataListener = data => {
        info(`${Date.now()}: socket.emit('data', '${data.substr(0, 20)}...')`);
        socket.emit('data', data);
      };
      fics.on('data', dataListener);

      socket.on('login', creds => {
        let ficsConn = getFicsConn();
        if (ficsConn.isConnected()) {
          socket.emit('login', ficsConn.getUsername());
          info(`Already connected as ${ficsConn.getUsername()}`);
          return;
        }
        info(`login(${creds.username})`);
        ficsConn.login(creds)
          .then(() => {
            socket.emit('login', ficsConn.getUsername());
            info(`${uid} logged in ${ficsConn.getUsername()}`);
          }).catch(err => {
            console.log(err);
            socket.emit('failedlogin', err.message);
            socket.emit('err', {
              type: 'login',
              message: err.message,
            });
          });
      });

      socket.on('logout', () => {
        info(`${uid} logout ${fics && fics.getUsername()}`);
        socket.emit('logged_out');
        logout();
      });

      socket.on('disconnect', (reason) => {
        let username = 'NULL (not logged in)'
        if (fics != null) {
          fics.off('data', dataListener);
          username = fics.getUsername();
        }
        info(`${uid} disconnected: ${username} ${JSON.stringify(reason)}`);
        socket.removeAllListeners();
        // In 30s delete our telnet connection
        uid2destroy[uid] = setTimeout(logout, 1000 * 30);
        info(`${uid} Waiting 30s to destroy FICS telnet cnonection of ${username}`);
      });

      socket.on('cmd', async cmd => {
        const result = await fics.send(cmd);
        info(`cmd '${cmd}': '${result}'`);
      });

    }).catch(err => {
      console.error(err);
      socket.emit('err', {
        type: 'auth',
        message: err.message,
      });
      socket.disconnect(true);
    });

  socket.on('move', (msg) => {
  });

  socket.on('chat message', (msg) => {
    info(`chat message: '${msg}'`);
    socket.emit('chat message', msg);
  });
});

if (module === require.main) {
  const PORT = process.env.PORT || 7777;
  server.listen(PORT, () => {
    info(`App listening on port ${PORT}`);
    info('Press Ctrl+C to quit.');
  });
}
// [END appengine_websockets_app]
