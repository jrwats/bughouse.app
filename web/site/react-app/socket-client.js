const io = require('socket.io-client');
const fs = require('fs');

const URL = process.env.NODE_ENV === 'production'
  ? 'https://websocket-dot-bughouse-274816.nn.r.appspot.com'
  : 'https://localhost:7777';

const ca = process.env.NODE_ENV === 'production'
  ? undefined
  : fs.readFileSync('../socket/.localhost-ssl/localhost.crt');

console.log(`URL: ${URL}`);
const socket = io(URL, {
  secure: true,
  reconnect: true,
  ca: ca,
  // rejectUnauthorized: false,
});

socket.on('connection', () => {
  console.log('connection');
});

const then = Date.now();
socket.emit('chat message', 'testing 2');

socket.on('err', (msg) => {
  console.log(msg);
});

socket.on('chat message', (msg) => {
  const time = Date.now() - then;
  console.log(`Ping: ${time}`);
  console.log(msg);
});

console.log('the end');
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
sleep(2000).then(() => console.log('done sleeping'));
