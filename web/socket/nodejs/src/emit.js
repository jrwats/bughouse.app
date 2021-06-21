function emit(ws, kind, obj) {
  obj = obj || {};
  ws && ws.send(JSON.stringify({kind,...obj}));
}

module.exports = emit;
