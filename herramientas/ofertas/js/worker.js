/* Web Worker: indice de busqueda y agrupacion de duplicados fuera del hilo principal. */
importScripts('texto.js', 'busqueda.js', 'duplicados.js');
var indice = null;
self.onmessage = function (e) {
  var m = e.data;
  try {
    if (m.op === 'indexar') {
      indice = new self.Of.busqueda.Indice(m.docs);
      var gr = self.Of.duplicados.agrupar(m.docs);
      self.postMessage({ op: 'listo', id: m.id, n: m.docs.length, grupos: gr.grupos });
    } else if (m.op === 'buscar') {
      var r = indice ? indice.buscar(m.q) : { idx: [], puntaje: [], parsed: null };
      var idx = Int32Array.from(r.idx), pt = Float32Array.from(r.puntaje);
      self.postMessage({ op: 'resultado', id: m.id, idx: idx, puntaje: pt }, [idx.buffer, pt.buffer]);
    }
  } catch (err) { self.postMessage({ op: 'error', id: m.id, error: String(err && err.message || err) }); }
};
