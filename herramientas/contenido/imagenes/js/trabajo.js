/* Gestor del Web Worker (filtros pesados) con respaldo en el hilo principal. */
(function (IM) {
  var w = null, intentado = false, id = 0, pend = {}, activos = 0, T = { usaWorker: false };
  function crear() {
    if (intentado) return w; intentado = true;
    try {
      w = new Worker('js/trabajador.js');
      w.onmessage = function (e) { var m = e.data, p = pend[m.id]; if (!p) return; delete pend[m.id]; if (m.error) p.no(new Error(m.error)); else p.ok(m); };
      w.onerror = function () { var viejos = pend; pend = {}; w = null; T.usaWorker = false; for (var k in viejos) viejos[k].fallback(); };
      T.usaWorker = true;
    } catch (e) { w = null; }
    return w;
  }
  function estado(d) { activos += d; var el = document.getElementById('ocupado'); if (el) el.hidden = activos <= 0; }
  function enviar(op, canvas, args, sync) {
    var x = canvas.getContext('2d'), img = x.getImageData(0, 0, canvas.width, canvas.height);
    var worker = crear();
    estado(1);
    function local() {
      var r = null;
      if (op === 'ops') window.Filtros.aplicarOps(img.data, img.width, img.height, args);
      else if (op === 'quitarColor') window.Relleno.quitarColor(img.data, img.width, img.height, args.rgb, args.tol, args.suav, args.contiguo, args.semilla);
      else if (op === 'varita') r = window.Relleno.region(img.data, img.width, img.height, args.x, args.y, args.tol, args.contiguo);
      x.putImageData(img, 0, 0); return r;
    }
    if (!worker) return new Promise(function (ok) { setTimeout(function () { var r = local(); estado(-1); ok(r); }, 0); });
    return new Promise(function (ok, no) {
      var mid = ++id;
      pend[mid] = {
        ok: function (m) { if (op !== 'varita') x.putImageData(new ImageData(new Uint8ClampedArray(m.buffer), img.width, img.height), 0, 0); estado(-1); ok(m.resultado); },
        no: function (e) { estado(-1); no(e); },
        fallback: function () { var r = local(); estado(-1); ok(r); }
      };
      var buf = img.data.buffer;
      try { worker.postMessage({ id: mid, op: op, w: img.width, h: img.height, args: args, buffer: buf }, [buf]); } catch (e) { delete pend[mid]; var r = local(); estado(-1); ok(r); }
    });
  }
  T.ops = function (canvas, ops) { return enviar('ops', canvas, ops); };
  T.quitarColor = function (canvas, args) { return enviar('quitarColor', canvas, args); };
  T.varita = function (canvas, args) { return enviar('varita', canvas, args); };
  IM.Trabajo = T;
})(window.IM);
