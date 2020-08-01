'use strict';

// [START appengine_websockets_app]
const app = require('express')();
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

const db = admin.database();
const ficsMgr = FicsManager.get(db);
const socketMgr = SocketManager.get();
const bughouseState = BughouseState.get();
const gameObserver = GameObserver.get(socketMgr, ficsMgr);

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
  const pendingOffers = Pending.get(uid);

  log(`token='${token.substr(0,20)}...'`);
  admin.auth().verifyIdToken(token)
    .then(decodedToken => {
      uid = decodedToken.uid;
      socketMgr.add(uid, socket);
      log(`Authenticated '${uid}'`);
      socket.emit('authenticated', true);
      // log(decodedToken);
      const onlineTimestamp = db.ref(`online/${uid}/connections`).push();
      onlineTimestamp.set(Date.now());
      log(`app db pushed ${onlineTimestamp}`);
      onlineTimestamp.onDisconnect().remove();

      const fics = ficsMgr.get(uid);
      const cmdDelegate = new CmdDelegate(socket, uid);
      const gameStartParser = new GameStartParser(uid, gameObserver);
      cmdDelegate.addHandler(pendingOffers);
      cmdDelegate.addHandler(gameObserver);
      cmdDelegate.addHandler(gameStartParser);
      if (fics.getUsername() != null) {
        socket.emit('login', fics.getUsername());
      } else {
        socket.emit('logged_out');
      }
      const dataListener = data => {
        log(`${Date.now()}: socket.emit('data', '${data.substr(0, 20)}...')`);
        if (cmdDelegate.handle(data)) {
          return;
        }
        socket.emit('data', data);
      };
      fics.on('data', dataListener);
      socket.on('fics_login', creds => {
        let ficsConn = ficsMgr.get(uid);
        if (ficsConn != fics) {
          log(`app relistening to 'data'`);
          ficsConn.on('data', dataListener);
        } else {
          log(`app NOT relistening to 'data'`);
        }
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
        ficsMgr.logout(uid);
      });
      const unpartneredListener = unpartnered => {
        socket.emit('unpartneredHandles', unpartnered);
      };
      const partnerListener = partners => {
        socket.emit('partners', partners);
      };
      const gamesListener = games => {
        socket.emit('games', games);
      };
      bughouseState.on('unpartnered', unpartneredListener);
      bughouseState.on('partners', partnerListener);
      bughouseState.on('games', gamesListener);

      socket.on('disconnect', (reason) => {
        let username = ficsMgr.getUsername(uid) || 'NULL (not logged in)';
        log(`${uid} disconnected: ${username} ${JSON.stringify(reason)}`);
        bughouseState.off('unpartnered', unpartneredListener);
        bughouseState.off('partners', partnerListener);
        bughouseState.off('games', gamesListener);
        socket.removeAllListeners();
        ficsMgr.onClientDisconnect(uid);
        pendingOffers.destroy();
        if (fics) {
          fics.off('data', dataListener);
        }
        onlineTimestamp.remove();
        socketMgr.destroy(uid);
      });

      socket.on('cmd', async cmd => {
        const result = await ficsMgr.get(uid).send(cmd);
        log(`app 'cmd' '${cmd}': '${result.substr(0,30)}...'`);
      });

      socket.on('move', (msg) => {
      });

      socket.on('pending', async () => {
        const pendingText = await ficsMgr.get(uid).send('pending');
        const pending = pendingOffers.parse(pendingText);
        // log(`!!! app pending '${pendingText}' ${JSON.stringify(pending)}`);
        socket.emit('pending', pending);
      });

      socket.on('bugwho', () => {
        const gamesLen = bughouseState.getGames().length;
        const partnerLen = bughouseState.getPartners().length;
        const unpartnerLen = bughouseState.getUnpartnered().length;
        console.log(`app 'bugwho' sending [${gamesLen}, ${partnerLen}, ${unpartnerLen}]...`);
        socket.emit('bugwho', {
          games: bughouseState.getGames(),
          partners: bughouseState.getPartners(),
          unpartnered: bughouseState.getUnpartnered(),
        });
      });

      socket.on('unobserve', ({id}) => {
        log(`app 'unobserve' ${id}`);
        gameObserver.unsubscribe(uid, id);
      });

      socket.on('observe', ({id}) => {
        log(`app 'observe' ${id}`);
        gameObserver.subscribe(uid, id);
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
