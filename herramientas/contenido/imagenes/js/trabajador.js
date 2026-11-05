/* Web Worker: filtros y recortes de fondo fuera del hilo principal. */
importScripts('nucleo/color.js', 'nucleo/filtros.js', 'nucleo/relleno.js');
self.onmessage = function (e) {
  var m = e.data, d = new Uint8ClampedArray(m.buffer), r = null;
  try {
    if (m.op === 'ops') Filtros.aplicarOps(d, m.w, m.h, m.args);
    else if (m.op === 'quitarColor') Relleno.quitarColor(d, m.w, m.h, m.args.rgb, m.args.tol, m.args.suav, m.args.contiguo, m.args.semilla);
    else if (m.op === 'varita') r = Relleno.region(d, m.w, m.h, m.args.x, m.args.y, m.args.tol, m.args.contiguo);
  } catch (err) { self.postMessage({ id: m.id, error: String(err) }); return; }
  var tr = [d.buffer]; if (r) tr.push(r.buffer);
  self.postMessage({ id: m.id, buffer: d.buffer, resultado: r }, tr);
};
