import './App.css';
import packageJson from '../package.json';
import React, {useEffect, useState} from 'react';
import { EventEmitter } from 'events';

console.log(process.env);
const WS_JS_PORT = process.env.REACT_APP_WS_JS_PORT || 8090;
console.log(`WS_JS_PORT: ${WS_JS_PORT}`);

const homepage = new URL(packageJson.homepage);
const {pathname} = homepage;
const hostname = window.location.hostname;
let wsJs = null;
let wsRust = null;

const _emitter = new EventEmitter();

function enq(ws) {
  if (ws == null || ws.readyState !== WebSocket.OPEN) {
    console.log(`Not enqing ${ws ? _prefix(ws) : '<null>'}`);
    return;
  }
  ws.send(JSON.stringify({
    kind: 'enq',
    timestamp: Date.now(),
  }));
}

function enqAll() {
  [wsJs, wsRust].forEach(enq);
}

setInterval(enqAll, 5000);

function _prefix(ws) {
  return ws === wsJs ? 'js' : 'rust';
}

const handlers = {
  latency: (msg, ws) => {
    _emitter.emit(`${_prefix(ws)}:server_latency`, msg);
    console.log(`${_prefix(ws)}:server-reported latency: ${msg.ms}`);
  },
  enq: (msg, ws) => {
    console.log(`${_prefix(ws)}:enq ${msg.timestamp}`);
    ws.send(JSON.stringify({
      kind: 'ack',
      timestamp: msg.timestamp
    }));
  },
  ack: (msg, ws) => {
    const latency = Date.now() - msg.timestamp;
    _emitter.emit(`${_prefix(ws)}:client_latency`, {ms: latency});
    console.log(`${_prefix(ws)}:timestamp: ${msg.timestamp}`);
    console.log(`${_prefix(ws)}:client reported latency: ${latency}`);
  },
  message: (msg, ws) => {
    console.log(msg);
  }
}


const LatencyTable = () => {
  const [jsClntLtncy, setJsClntLtncy] = useState(Number.POSITIVE_INFINITY);
  const [jsSrvLtncy, setJsSrvLtncy] = useState(Number.POSITIVE_INFINITY);
  const [rustClntLtncy, setRustClntLtncy] = useState(Number.POSITIVE_INFINITY);
  const [rustSrvLtncy, setRustSrvLtncy] = useState(Number.POSITIVE_INFINITY);
  useEffect(() => {
    const onJsSrv = (msg) => { setJsSrvLtncy(msg.ms); };
    const onJsClient = (msg) => { setJsClntLtncy(msg.ms); };
    const onRustSrv = (msg) => { setRustSrvLtncy(msg.ms); };
    const onRustClient = (msg) => { setRustClntLtncy(msg.ms); };
    _emitter.on('js:client_latency', onJsClient);
    _emitter.on('js:server_latency', onJsSrv);
    _emitter.on('rust:client_latency', onRustClient);
    _emitter.on('rust:server_latency', onRustSrv);
    return () => {
      _emitter.off('js:client_latency', onJsClient);
      _emitter.off('js:server_latency', onJsSrv);
      _emitter.off('rust:client_latency', onRustClient);
      _emitter.off('rust:server_latency', onRustSrv);
    };
  }, [jsClntLtncy, jsSrvLtncy, rustClntLtncy, rustSrvLtncy]);

  const label2val = {
    'JS Client latency': jsClntLtncy,
    'JS Server latency': jsSrvLtncy,
    'Rust Client latency': rustClntLtncy,
    'Rust Server latency': rustSrvLtncy,
  };
  return (
    <table>
      <tbody>
        {Object.keys(label2val).map(key => (
          <tr key={key}>
            <td>{key}</td>
            <td>{label2val[key]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function startup(_evt) {
  if (wsJs == null) {
    wsJs = new WebSocket(`ws://${hostname}${pathname}/ws_js:${WS_JS_PORT}`);
    window.__wsJs = wsJs;
    _subscribe(wsJs, () => { wsJs = null; });
  }
  if (wsRust == null) {
    wsRust = new WebSocket(`ws://${hostname}/ws_rust/`);
    _subscribe(wsRust, () => { wsRust = null; });
  }
}

function _subscribe(ws, onClose) {
  console.log(ws);

  ws.onopen = (evt) => {
    console.log(evt);
  };

  ws.onclose = (evt) => {
    onClose();
    console.log(evt);
  };

  ws.onerror = (evt) => {
    console.log(evt);
  };

  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      const handler = handlers[msg.kind];
      if (!handler) {
        console.error(msg);
        throw new Error(`unknown msg: ${msg}`);
      }
      handler(msg, ws);
    } catch(e) {
      console.error(e);
    }
  };
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <span
          className="App-link"
          href="#"
          target="_blank"
          onClick={startup}
          rel="noopener noreferrer"
        >
          Start
        </span>
        <LatencyTable />
      </header>
    </div>
  );
}

export default App;
