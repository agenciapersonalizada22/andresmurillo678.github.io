/* Worker de analisis: recibe frames reducidos (RGBA) y devuelve el resultado de la tuberia. Sin red, sin acceso a claves. */
importScripts('analisis.js', 'tuberia.js');
var tub = new VTuberia.Tuberia(), oc = null, ox = null;
self.onmessage = function (e) {
  var m = e.data;
  try {
    if (m.tipo === 'config') tub.configurar(m.cfg);
    else if (m.tipo === 'reiniciar') tub.reiniciar();
    else if (m.tipo === 'frame') { var r = tub.procesar(new Uint8ClampedArray(m.buf), m.w, m.h, m.t); r.tipo = 'resultado'; r.seq = m.seq; self.postMessage(r); }
    else if (m.tipo === 'bitmap') {   // OffscreenCanvas: el reescalado y la lectura de pixeles ocurren aqui, no en la interfaz
      if (!oc || oc.width !== m.w || oc.height !== m.h) { oc = new OffscreenCanvas(m.w, m.h); ox = oc.getContext('2d', { willReadFrequently: true }); }
      ox.drawImage(m.bmp, 0, 0, m.w, m.h); m.bmp.close(); var r2 = tub.procesar(ox.getImageData(0, 0, m.w, m.h).data, m.w, m.h, m.t); r2.tipo = 'resultado'; r2.seq = m.seq; self.postMessage(r2);
    }
    else if (m.tipo === 'calor') { var c = tub.mapaCalor(); self.postMessage({ tipo: 'calor', id: m.id, calor: c, celdas: tub.celdasCalor(8, 6) }); }
  } catch (err) { self.postMessage({ tipo: 'error', msg: String(err && err.message || err) }); }
};
