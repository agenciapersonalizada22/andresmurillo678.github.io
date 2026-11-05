/* Cliente del Web Worker: Calc.llamar(op, args) -> Promise. Si no hay Worker, calcula en el hilo principal. */
(function () {
  var w = null, pend = {}, n = 0, fallo = false, BASE = (document.currentScript && document.currentScript.src || location.href).replace(/[^\/]*$/, '');
  function iniciar() {
    if (w || fallo) return;
    try {
      w = new Worker(BASE + 'worker.js');
      w.onmessage = function (e) { var p = pend[e.data.id]; if (!p) return; delete pend[e.data.id]; e.data.ok ? p.res(e.data.r) : p.rej(new Error(e.data.error)); };
      w.onerror = function () { fallo = true; w = null; Object.keys(pend).forEach(function (k) { var p = pend[k]; delete pend[k]; local(p.op, p.args).then(p.res, p.rej); }); };
    } catch (e) { fallo = true; w = null; }
  }
  function local(op, args) { return new Promise(function (res, rej) { setTimeout(function () { try { res(window.Ops.ejecutar(op, args)); } catch (e) { rej(e); } }, 0); }); }
  window.Calc = {
    enWorker: function () { return !!w; },
    llamar: function (op, args) {
      iniciar(); if (!w) return local(op, args);
      return new Promise(function (res, rej) { var id = ++n; pend[id] = { res: res, rej: rej, op: op, args: args }; w.postMessage({ id: id, op: op, args: args }); });
    }
  };
})();
