function emit(ws, kind, obj) {
  obj = obj || {};
  ws && ws.send(JSON.stringify(...obj, kind}));
}

module.exports = emit;
