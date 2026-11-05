/* Paquete de proyecto exportable (.cvp): "CVP1" + u32 longitud + JSON cabecera + blobs concatenados. VE.paquete */
(function (g) {
  var P = {};
  P.empaquetar = function (proyecto, blobs) {
    var ids = Object.keys(blobs || {}), cab = { v: 1, proyecto: proyecto, medios: ids.map(function (id) { return { id: id, tam: blobs[id].size, tipo: blobs[id].type }; }) };
    var j = new TextEncoder().encode(JSON.stringify(cab)), h = new Uint8Array(8);
    h.set([67, 86, 80, 49]); new DataView(h.buffer).setUint32(4, j.length);
    return new Blob([h, j].concat(ids.map(function (id) { return blobs[id]; })), { type: 'application/octet-stream' });
  };
  P.leer = async function (blob) {
    var h = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
    if (String.fromCharCode(h[0], h[1], h[2], h[3]) !== 'CVP1') throw new Error('Archivo de proyecto no válido');
    var n = new DataView(h.buffer).getUint32(4), cab = JSON.parse(new TextDecoder().decode(new Uint8Array(await blob.slice(8, 8 + n).arrayBuffer())));
    var pos = 8 + n, medios = {};
    cab.medios.forEach(function (m) { medios[m.id] = blob.slice(pos, pos + m.tam, m.tipo); pos += m.tam; });
    return { proyecto: cab.proyecto, medios: medios };
  };
  g.VE = g.VE || {}; g.VE.paquete = P;
  if (typeof module !== 'undefined') module.exports = P;
})(typeof window !== 'undefined' ? window : globalThis);
