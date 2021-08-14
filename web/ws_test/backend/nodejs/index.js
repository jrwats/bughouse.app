const WebSocket = require('ws');

const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

console.log(`Listening on port: ${port}`);
const handlers = {
  ack: (ws, msg) => {
    const ms = Date.now() - msg.timestamp;
    console.log(`latency: ${ms}`);
    ws.send(JSON.stringify({
      kind: 'latency',
      ms,
    }));
  },
  enq: (ws, msg) => {
    ws.send(JSON.stringify({
      kind: 'ack',
      timestamp: msg.timestamp
    }));
  }
}

function enqAll() {
  for (client of wss.clients) {
    client.send(JSON.stringify({
      kind: 'enq',
      timestamp: Date.now(),
    }));
  }
}

setInterval(enqAll, 5000);

// const sockets = new Set();
wss.on('connection', (ws, req) => {
  console.log('!!! connection !!!');
  // console.log(ws);
  // console.log('request: %o', req);
  console.log(`request.url: ${req.url}`);

  // sockets[ws] = ws;

  ws.on('close', (msgStr) => {
    console.log('### CLOSED ###');
  });
  ws.on('message', (msgStr) => {
    try {
      const msg = JSON.parse(msgStr);
      const handler = handlers[msg.kind];
      if (!handler) {
        throw new Error('unknown msg');
      }
      handler(ws, msg);
    } catch (e) {
      console.error(e);
    }
  });

  ws.send(JSON.stringify({kind: 'message', message: 'something'}));
});
