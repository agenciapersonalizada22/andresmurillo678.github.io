importScripts('indicadores.js', 'riesgo.js', 'patrones.js', 'backtest.js', 'screener.js', 'ops.js');
self.onmessage = function (e) {
  var m = e.data;
  try { self.postMessage({ id: m.id, ok: true, r: self.Ops.ejecutar(m.op, m.args) }); }
  catch (err) { self.postMessage({ id: m.id, ok: false, error: String(err && err.message || err) }); }
};
