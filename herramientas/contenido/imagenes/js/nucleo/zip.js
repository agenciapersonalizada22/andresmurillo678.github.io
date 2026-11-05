/* ZIP sin compresion (metodo 0) con CRC32. */
(function (r, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else r.Zip = f(); })(this, function () {
  var Z = {}, tabla = null;
  function crcTabla() { tabla = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tabla[n] = c >>> 0; } }
  Z.crc32 = function (a) { if (!tabla) crcTabla(); var c = 0xFFFFFFFF; for (var i = 0; i < a.length; i++) c = tabla[(c ^ a[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  var u8 = function (s) { return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : Uint8Array.from(Buffer.from(s, 'utf8')); };
  /* archivos: [{nombre, datos:Uint8Array}] -> Uint8Array */
  Z.crear = function (archivos, fecha) {
    var d = fecha || new Date(), dosT = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var dosF = (Math.max(0, d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    var partes = [], central = [], off = 0;
    archivos.forEach(function (a) {
      var nom = u8(a.nombre), crc = Z.crc32(a.datos), n = a.datos.length;
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, dosT, true); lh.setUint16(12, dosF, true); lh.setUint32(14, crc, true); lh.setUint32(18, n, true); lh.setUint32(22, n, true);
      lh.setUint16(26, nom.length, true); lh.setUint16(28, 0, true);
      partes.push(new Uint8Array(lh.buffer), nom, a.datos);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, dosT, true); ch.setUint16(14, dosF, true); ch.setUint32(16, crc, true); ch.setUint32(20, n, true); ch.setUint32(24, n, true);
      ch.setUint16(28, nom.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), nom);
      off += 30 + nom.length + n;
    });
    var tamC = central.reduce(function (s, p) { return s + p.length; }, 0);
    var fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
    fin.setUint32(12, tamC, true); fin.setUint32(16, off, true);
    var todo = partes.concat(central, [new Uint8Array(fin.buffer)]);
    var total = todo.reduce(function (s, p) { return s + p.length; }, 0), out = new Uint8Array(total), o = 0;
    todo.forEach(function (p) { out.set(p, o); o += p.length; });
    return out;
  };
  /* lector minimo para pruebas: devuelve [{nombre, datos}] */
  Z.leer = function (b) {
    var v = new DataView(b.buffer, b.byteOffset, b.length), res = [], p = 0;
    while (p + 30 <= b.length && v.getUint32(p, true) === 0x04034b50) {
      var n = v.getUint32(p + 22, true), ln = v.getUint16(p + 26, true), le = v.getUint16(p + 28, true);
      var nom = new TextDecoder().decode(b.subarray(p + 30, p + 30 + ln));
      res.push({ nombre: nom, datos: b.slice(p + 30 + ln + le, p + 30 + ln + le + n), crc: v.getUint32(p + 14, true) });
      p += 30 + ln + le + n;
    }
    return res;
  };
  return Z;
});
