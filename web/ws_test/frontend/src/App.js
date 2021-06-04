import './App.css';
const PORT = 8080;

let ws = null;

function enqRequest() { 
  if (ws == null || ws.readyState !== WebSocket.OPEN) {
    return;
  }
  ws.send(JSON.stringify({
    type: 'enq',
    timestamp: Date.now(),
  }));
}
setInterval(enqRequest, 5000);

const handlers = {
  latency: (msg) => {
    console.log(`server-reported latency: ${msg.ms}`);
  },
  enq: (msg) => {
    ws.send(JSON.stringify({
      type: 'ack', 
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
  if (ws != null) {
    return;
  }
  ws = new WebSocket(`ws://localhost:${PORT}`);
  console.log(ws);
  window.__ws = ws;
  ws.onopen = (evt) => {
    console.log(evt);
  };
  ws.onclose = (evt) => {
    ws = null;
    console.log(evt);
  };
  ws.onerror = (evt) => {
    console.log(evt);
  };

  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      const handler = handlers[msg.type];
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
