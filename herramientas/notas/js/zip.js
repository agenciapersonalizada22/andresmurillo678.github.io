/* ZIP minimo: crea archivos sin compresion (metodo 0) y lee metodo 0 y 8 (deflate con DecompressionStream). */
(function (G) {
  'use strict';
  var U = G.Util || require('./util.js');
  var Z = {}, tabla = null;
  function crc32(b) {
    if (!tabla) { tabla = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tabla[n] = c >>> 0; } }
    var x = 0xffffffff; for (var i = 0; i < b.length; i++) x = tabla[(x ^ b[i]) & 255] ^ (x >>> 8);
    return (x ^ 0xffffffff) >>> 0;
  }
  Z.crc32 = crc32;
  Z.crear = function (archivos) {
    var partes = [], central = [], desp = 0, ahora = new Date();
    var dt = ((ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1)) & 0xffff;
    var dd = (((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate()) & 0xffff;
    archivos.forEach(function (a) {
      var nom = U.utf8(a.ruta), datos = typeof a.datos === 'string' ? U.utf8(a.datos) : a.datos, crc = crc32(datos);
      var lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint16(10, dt, true); lh.setUint16(12, dd, true); lh.setUint32(14, crc, true); lh.setUint32(18, datos.length, true); lh.setUint32(22, datos.length, true); lh.setUint16(26, nom.length, true);
      partes.push(new Uint8Array(lh.buffer), nom, datos);
      var ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(12, dt, true); ch.setUint16(14, dd, true); ch.setUint32(16, crc, true); ch.setUint32(20, datos.length, true); ch.setUint32(24, datos.length, true); ch.setUint16(28, nom.length, true); ch.setUint32(42, desp, true);
      central.push(new Uint8Array(ch.buffer), nom);
      desp += 30 + nom.length + datos.length;
    });
    var tamC = central.reduce(function (s, p) { return s + p.length; }, 0);
    var fin = new DataView(new ArrayBuffer(22)); fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true); fin.setUint32(12, tamC, true); fin.setUint32(16, desp, true);
    var todo = partes.concat(central, [new Uint8Array(fin.buffer)]), total = todo.reduce(function (s, p) { return s + p.length; }, 0), out = new Uint8Array(total), o = 0;
    todo.forEach(function (p) { out.set(p, o); o += p.length; });
    return out;
  };
  function inflar(datos) {
    var ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter();
    w.write(datos); w.close();
    return new Response(ds.readable).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  Z.leer = function (bytes) {
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), i, fin = -1;
    for (i = bytes.length - 22; i >= Math.max(0, bytes.length - 65600); i--) if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
    if (fin < 0) return Promise.reject(new Error('No es un ZIP válido'));
    var n = dv.getUint16(fin + 10, true), p = dv.getUint32(fin + 16, true), tareas = [];
    for (i = 0; i < n; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) return Promise.reject(new Error('ZIP dañado'));
      var met = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      var nombre = U.deUtf8(bytes.subarray(p + 46, p + 46 + nl));
      p += 46 + nl + el + cl;
      if (/\/$/.test(nombre)) continue;
      var lnl = dv.getUint16(lo + 26, true), lel = dv.getUint16(lo + 28, true), ini = lo + 30 + lnl + lel, crudo = bytes.subarray(ini, ini + csz);
      tareas.push({ ruta: nombre, met: met, crudo: crudo });
    }
    return Promise.all(tareas.map(function (t) {
      if (t.met === 0) return { ruta: t.ruta, datos: new Uint8Array(t.crudo) };
      if (t.met === 8) return inflar(t.crudo).then(function (d) { return { ruta: t.ruta, datos: d }; });
      throw new Error('Compresión no soportada en ' + t.ruta);
    }));
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Z; else G.Zip = Z;
})(typeof window !== 'undefined' ? window : globalThis);
