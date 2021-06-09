import './App.css';
import packageJson from '../package.json';
const PORT = process.env.PORT || 8090;

const homepage = new URL(packageJson.homepage);
const {hostname, pathname} = homepage;

let wsJs = null;

function enqRequest() {
  if (wsJs == null || wsJs.readyState !== WebSocket.OPEN) {
    return;
  }
  wsJs.send(JSON.stringify({
    kind: 'enq',
    timestamp: Date.now(),
  }));
}
setInterval(enqRequest, 5000);

const handlers = {
  latency: (msg) => {
    console.log(`server-reported latency: ${msg.ms}`);
  },
  enq: (msg) => {
    wsJs.send(JSON.stringify({
      kind: 'ack',
      timestamp: msg.timestamp
    }));
  },
  ack: (msg) => {
    console.log(`timestamp: ${msg.timestamp}`);
    console.log('client reported latency: ' + (Date.now() - msg.timestamp));
  },
  message: (msg) => {
    console.log(msg);
  }
}

function startup(_evt) {
  if (wsJs != null) {
    return;
  }
  wsJs = new WebSocket(`ws://${hostname}${pathname}/ws_js:${PORT}`);
  console.log(wsJs);
  window.__wsJs = wsJS;
  wsJs.onopen = (evt) => {
    console.log(evt);
  };
  wsJs.onclose = (evt) => {
    wsJs = null;
    console.log(evt);
  };
  wsJs.onerror = (evt) => {
    console.log(evt);
  };

  wsJs.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      const handler = handlers[msg.kind];
      if (!handler) {
        throw new Error('unknown msg');
      }
      handler(msg);
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
      </header>
    </div>
  );
}

export default App;
