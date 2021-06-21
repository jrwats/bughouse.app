'use strict';

// [START appengine_websockets_app]
const app = require('express')();
const emit = require('./emit');
const fs = require('fs');
const admin = require('firebase-admin');
const log = require('./log');
const FicsManager = require('./FicsManager');
const CmdDelegate = require('./CmdDelegate');
const BughouseState = require('./BughouseState');
const Pending = require('./Pending');
const GameObserver = require('./GameObserver');
const SocketManager = require('./SocketManager');
const GameStartParser = require('./GameStartParser');
const GameOverParser = require('./GameOverParser');
const WebSocket = require('ws');

// app.enable('trust proxy');
// app.get('/', (req, res) => {
//   res.send('websocket server here, at your service');
// });

// const getServer = () => {
//   // Run local https server directly.  Otherwise rely on Google App
//   // Engine proxying to http via https
//   if (process.env.NODE_ENV === 'production') {
//     return require('http').Server(app);
//   }
//   console.log('creating https server');
//   const https = require('https');
//   /************************** To install certs (on MacOS)**********************
//   mkdir -p .localhost-ssl
//   sudo openssl genrsa -out .localhost-ssl/localhost.key 2048
//   sudo openssl req -new -x509 -key .localhost-ssl/localhost.key \
//     -out .localhost-ssl/localhost.crt -days 1024 -subj /CN=localhost
//   sudo chmod a+r .localhost-ssl/localhost.key
//
//   # Linx/WSL
//   sudo cp .localhost-ssl/localhost.crt /usr/local/share/ca-certificats/
//   sudo update-ca-certificates
//
//   # Mac
//   sudo security add-trusted-cert -d -r trustRoot -k \
//     /Library/Keychains/System.keychain .localhost-ssl/localhost.crt
//   ****************************************************************************/
//   return https.createServer({
//     key: fs.readFileSync('.localhost-ssl/localhost.key'),
//     cert: fs.readFileSync('.localhost-ssl/localhost.crt'),
//   }, app);
// }

// const server = getServer();
// const io = require('socket.io')(server);

// Rely on 
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

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

const db = admin.database();
const ficsMgr = FicsManager.get(db);
const socketMgr = SocketManager.get(ficsMgr);
const bughouseState = BughouseState.get();
const gameObserver = GameObserver.get(socketMgr, ficsMgr);

wss.on('connection', (ws, req) => {
  let uid = null;
  console.log(`url: ${req.url}`);
  const match = /\?.*$/.exec(req.url);
  console.log(match);
  const params = new URLSearchParams(match && match[0]);
  const token = params.get('token');
  log(`connection: '${(token || '<null>').substr(0,20)}...'`);
  if (token == null) {
    emit(ws, 'err', {
      kind: 'auth',
      message: 'No auth token provided',
    });
    return ws.terminate();
  }

  admin.auth().verifyIdToken(token)
    .then(decodedToken => {
      uid = decodedToken.uid;
      socketMgr.add(uid, ws);
      log(`Authenticated '${uid}'`);
      emit(ws, 'authenticated', true);
      log(`emitted 'authenticated'`);
      // log(decodedToken);
      const onlineTimestamp = db.ref(`online/${uid}/connections`).push();
      onlineTimestamp.set(Date.now());
      log(`app db pushed ${onlineTimestamp}`);
      onlineTimestamp.onDisconnect().remove();

      ws.onclose = (reason) => {
        let username = ficsMgr.getHandle(uid) || 'NULL';
        socketMgr.remove(uid, ws);
        log(`${uid} disconnected: ${username} ${JSON.stringify(reason)}`);
        bughouseState.off('unpartnered', unpartneredListener);
        bughouseState.off('partners', partnerListener);
        bughouseState.off('games', gamesListener);
        ws.removeAllListeners();
        pending.destroy();
        onlineTimestamp.remove();
        cmdDelegate && cmdDelegate.onClose();
      };
      const fics = ficsMgr.get(uid);
      const pending = Pending.get(uid);
      const cmdDelegate = new CmdDelegate(ws, fics);
      cmdDelegate.addHandler(pending);
      cmdDelegate.addHandler(gameObserver);
      cmdDelegate.addHandler(new GameStartParser(uid, gameObserver));
      cmdDelegate.addHandler(new GameOverParser(gameObserver));
      if (fics.getHandle() != null) {
        emit(ws, 'login', fics.getHandle());
      } else {
        emit(ws, 'logged_out');
      }
      const handlers = {};
      handlers['fics_login'] = creds => {
        let ficsConn = ficsMgr.get(uid);
        if (ficsConn.isLoggedIn()) {
          emit(ws, 'login', ficsConn.getHandle());
          log(`Already connected as ${ficsConn.getHandle()}`);
          return;
        }
        log(`login(${creds.username})`);
        ficsConn.login(creds)
          .then(() => {
            emit(ws, 'login', ficsConn.getHandle());
            log(`${uid} logged in ${ficsConn.getHandle()}`);
          }).catch(err => {
            console.error(err);
            emit(ws, 'failedlogin', err.message);
            emit(ws, 'err', {
              kind: 'login',
              message: err.message,
            });
          });
      };

      handlers['enq'] = (msg) => {
        console.log(`enq ${msg.timestamp}`);
        emit(ws, 'ack', {timestamp: msg.timestamp});
      };

      handlers['fics_logout'] = () => {
        log(`${uid} logout ${fics && fics.getHandle()}`);
        emit(ws, 'logged_out');
        ficsMgr.logout(uid);
      };
      const unpartneredListener = handles => {
        emit(ws, 'unpartneredHandles', handles);
      };
      const partnerListener = partners => {
        emit(ws, 'partners', partners);
      };
      const gamesListener = games => {
        emit(ws, 'games', games);
      };
      bughouseState.on('unpartnered', unpartneredListener);
      bughouseState.on('partners', partnerListener);
      bughouseState.on('games', gamesListener);

      handlers['cmd'] = async ({cmd}) => {
        const result = await ficsMgr.get(uid).send(cmd);
        log(`app 'cmd' '${cmd}': '${result.substr(0,30)}...'`);
      };

      handlers['refresh'] = ({id}) => {
        log(`app 'refresh' ${id}`);
        gameObserver.refresh(id, ws);
      };

      handlers['move'] = (msg) => {
        ficsMgr.get(uid).hipriSend(msg);
      };

      handlers['pending'] = async () => {
        const pendingText = await ficsMgr.get(uid).send('pending');
        emit(ws, 'pending', pending.parse(pendingText));
      };

      handlers['bugwho'] = () => {
        const gamesLen = bughouseState.getGames().length;
        const partnerLen = bughouseState.getPartners().length;
        const unpartnerLen = bughouseState.getUnpartnered().length;
        console.log(`app 'bugwho' sending [${gamesLen}, ${partnerLen}, ${unpartnerLen}]...`);
        emit(ws, 'bugwho', {
          games: bughouseState.getGames(),
          partners: bughouseState.getPartners(),
          unpartnered: bughouseState.getUnpartnered(),
        });
      };

      handlers['unobserve'] = ({id}) => {
        log(`app 'unobserve' ${id}`);
        gameObserver.unsubscribe(uid, id);
      };

      handlers['observe'] = ({id}) => {
        log(`app 'observe' ${id} ${uid}`);
        gameObserver.subscribe(uid, id);
      };

      ws.onmessage = evt => {
        const {data} = evt;
        const msg = data[0] === '{' ? JSON.parse(data) : data;
        const kind = msg.kind || data;
        const handler = handlers[kind];
        if (!handler) {
          console.error('Unknown data: %s', data);
        }
        handler(msg);
      };

    }).catch(err => {
      console.error(err);
      emit(ws, 'err', {
        kind: 'auth',
        message: err.message,
      });
      ws.disconnect(true);
    });
});

if (module === require.main) {
  log(`App listening on port ${port}`);
}
// [END appengine_websockets_app]
