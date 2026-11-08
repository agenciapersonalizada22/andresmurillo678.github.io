/* Worker de reconstruccion 3D: ejecuta R3D.Ops.<op> fuera del hilo de la interfaz. */
importScripts('malla.js', 'mc.js', 'segmentar.js', 'hull.js', 'estereo.js', 'formatos.js', 'medir.js', 'ops.js');
function transferibles(r, out) {
  if (!r || typeof r !== 'object') return out;
  if (ArrayBuffer.isView(r)) { if (out.indexOf(r.buffer) < 0) out.push(r.buffer); return out; }
  if (r instanceof ArrayBuffer) { out.push(r); return out; }
  Object.keys(r).forEach(function (k) { if (r[k] && typeof r[k] === 'object') transferibles(r[k], out); }); return out;
}
self.onmessage = function (e) {
  var m = e.data;
  try {
    var res = self.R3D.Ops[m.op](m.datos, function (p, t) { self.postMessage({ id: m.id, prog: p, texto: t }); });
    self.postMessage({ id: m.id, ok: true, res: res }, transferibles(res, []));
  } catch (err) { self.postMessage({ id: m.id, ok: false, error: err && err.message || String(err) }); }
};
