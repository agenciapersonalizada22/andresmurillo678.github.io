/* Codificador de codigos QR (ISO/IEC 18004, Modelo 2) escrito a mano, sin librerias.
   Modos numerico, alfanumerico y byte (UTF-8); correccion L/M/Q/H; versiones 1-40; 8 mascaras con penalizacion.
   No implementa: Kanji, ECI, modo mixto por segmentos automatico, Micro QR. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.QRCodificador = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var NIVELES = { L: 0, M: 1, Q: 2, H: 3 }, FORMATO = { L: 1, M: 0, Q: 3, H: 2 };
  var ECC_POR_BLOQUE = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]];
  var NUM_BLOQUES = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]];
  var ALFA = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  var MODOS = { numerico: 1, alfanumerico: 2, byte: 4 };

  function modulosBrutos(v) {
    var r = (16 * v + 128) * v + 64;
    if (v >= 2) { var n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
    return r;
  }
  function palabrasDatos(v, e) { return Math.floor(modulosBrutos(v) / 8) - ECC_POR_BLOQUE[NIVELES[e]][v] * NUM_BLOQUES[NIVELES[e]][v]; }
  function bitsConteo(modo, v) { var t = { 1: [10, 12, 14], 2: [9, 11, 13], 4: [8, 16, 16] }[modo]; return t[v <= 9 ? 0 : v <= 26 ? 1 : 2]; }

  function utf8(s) {
    if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(s));
    var o = []; s = unescape(encodeURIComponent(s)); for (var i = 0; i < s.length; i++) o.push(s.charCodeAt(i)); return o;
  }
  function modoAuto(texto) {
    if (/^[0-9]*$/.test(texto)) return 'numerico';
    for (var i = 0; i < texto.length; i++) if (ALFA.indexOf(texto[i]) < 0) return 'byte';
    return 'alfanumerico';
  }
  function anadir(bits, val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
  /* seg: {modo, datos: texto (numerico/alfanumerico) | bytes[]}; devuelve {modo, n, bits} */
  function segmento(texto, modo, bytes) {
    modo = modo || modoAuto(texto);
    var bits = [], n;
    if (modo === 'numerico') {
      if (!/^[0-9]*$/.test(texto)) throw new Error('El modo numerico solo admite digitos.');
      n = texto.length;
      for (var i = 0; i < n;) { var k = Math.min(3, n - i); anadir(bits, parseInt(texto.substr(i, k), 10), k * 3 + 1); i += k; }
    } else if (modo === 'alfanumerico') {
      n = texto.length;
      for (var j = 0; j < n;) {
        var a = ALFA.indexOf(texto[j]); if (a < 0) throw new Error('Caracter no valido en modo alfanumerico: ' + texto[j]);
        if (j + 1 < n) { var b = ALFA.indexOf(texto[j + 1]); if (b < 0) throw new Error('Caracter no valido en modo alfanumerico: ' + texto[j + 1]); anadir(bits, a * 45 + b, 11); j += 2; }
        else { anadir(bits, a, 6); j++; }
      }
    } else {
      var d = bytes || utf8(texto); n = d.length; d.forEach(function (x) { anadir(bits, x, 8); });
    }
    return { modo: modo, n: n, bits: bits };
  }
  function longitudBits(seg, v) { return 4 + bitsConteo(MODOS[seg.modo], v) + seg.bits.length; }

  /* ---- Reed-Solomon en GF(256), polinomio 0x11D ---- */
  function mulGF(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; }
  function divisorRS(grado) {
    var r = []; for (var i = 0; i < grado - 1; i++) r.push(0); r.push(1);
    var raiz = 1;
    for (var k = 0; k < grado; k++) {
      for (var j = 0; j < r.length; j++) { r[j] = mulGF(r[j], raiz); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
      raiz = mulGF(raiz, 2);
    }
    return r;
  }
  function restoRS(datos, div) {
    var r = div.map(function () { return 0; });
    datos.forEach(function (b) { var f = b ^ r.shift(); r.push(0); div.forEach(function (c, i) { r[i] ^= mulGF(c, f); }); });
    return r;
  }
  function entrelazar(datos, v, e) {
    var ne = NIVELES[e], nb = NUM_BLOQUES[ne][v], le = ECC_POR_BLOQUE[ne][v], raw = Math.floor(modulosBrutos(v) / 8);
    var cortos = nb - raw % nb, lc = Math.floor(raw / nb), bloques = [], div = divisorRS(le), k = 0;
    for (var i = 0; i < nb; i++) {
      var d = datos.slice(k, k + lc - le + (i < cortos ? 0 : 1)); k += d.length;
      var ecc = restoRS(d, div); if (i < cortos) d.push(0);
      bloques.push(d.concat(ecc));
    }
    var res = [];
    for (var c = 0; c < bloques[0].length; c++) for (var j = 0; j < nb; j++) if (c !== lc - le || j >= cortos) res.push(bloques[j][c]);
    return res;
  }

  /* ---- matriz ---- */
  function posicionesAlineacion(v) {
    if (v === 1) return [];
    var n = Math.floor(v / 7) + 2, paso = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, r = [6];
    for (var p = v * 4 + 17 - 7; r.length < n; p -= paso) r.splice(1, 0, p);
    return r;
  }
  function crearMatriz(v) {
    var tam = v * 4 + 17, m = [], fn = [];
    for (var i = 0; i < tam; i++) { m.push(new Uint8Array(tam)); fn.push(new Uint8Array(tam)); }
    return { v: v, tam: tam, m: m, fn: fn };
  }
  function fijar(M, x, y, oscuro) { M.m[y][x] = oscuro ? 1 : 0; M.fn[y][x] = 1; }
  function patronesFuncion(M, e) {
    var tam = M.tam, v = M.v, i, dx, dy;
    for (i = 0; i < tam; i++) { fijar(M, 6, i, i % 2 === 0); fijar(M, i, 6, i % 2 === 0); }
    [[3, 3], [tam - 4, 3], [3, tam - 4]].forEach(function (c) {
      for (dy = -4; dy <= 4; dy++) for (dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), x = c[0] + dx, y = c[1] + dy;
        if (x >= 0 && x < tam && y >= 0 && y < tam) fijar(M, x, y, d !== 2 && d !== 4);
      }
    });
    var al = posicionesAlineacion(v), n = al.length;
    for (i = 0; i < n; i++) for (var j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (dy = -2; dy <= 2; dy++) for (dx = -2; dx <= 2; dx++) fijar(M, al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    bitsFormato(M, e, 0);   // reserva
    if (v >= 7) {
      var r = v; for (i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      var bits = (v << 12) | r;
      for (i = 0; i < 18; i++) { var b = ((bits >>> i) & 1) !== 0, a = tam - 11 + i % 3, c = Math.floor(i / 3); fijar(M, a, c, b); fijar(M, c, a, b); }
    }
  }
  function bitsFormato(M, e, mascara) {
    var tam = M.tam, dat = (FORMATO[e] << 3) | mascara, r = dat, i;
    for (i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    var bits = ((dat << 10) | r) ^ 0x5412;
    function b(k) { return ((bits >>> k) & 1) !== 0; }
    for (i = 0; i <= 5; i++) fijar(M, 8, i, b(i));
    fijar(M, 8, 7, b(6)); fijar(M, 8, 8, b(7)); fijar(M, 7, 8, b(8));
    for (i = 9; i < 15; i++) fijar(M, 14 - i, 8, b(i));
    for (i = 0; i < 8; i++) fijar(M, tam - 1 - i, 8, b(i));
    for (i = 8; i < 15; i++) fijar(M, 8, tam - 15 + i, b(i));
    fijar(M, 8, tam - 8, true);
  }
  function colocar(M, datos) {
    var tam = M.tam, i = 0;
    for (var der = tam - 1; der >= 1; der -= 2) {
      if (der === 6) der = 5;
      for (var vert = 0; vert < tam; vert++) for (var j = 0; j < 2; j++) {
        var x = der - j, arriba = ((der + 1) & 2) === 0, y = arriba ? tam - 1 - vert : vert;
        if (!M.fn[y][x] && i < datos.length * 8) { M.m[y][x] = (datos[i >>> 3] >>> (7 - (i & 7))) & 1; i++; }
      }
    }
  }
  function invierte(mk, x, y) {
    switch (mk) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return x * y % 2 + x * y % 3 === 0;
      case 6: return (x * y % 2 + x * y % 3) % 2 === 0;
      default: return ((x + y) % 2 + x * y % 3) % 2 === 0;
    }
  }
  function mascarar(M, mk) { for (var y = 0; y < M.tam; y++) for (var x = 0; x < M.tam; x++) if (!M.fn[y][x] && invierte(mk, x, y)) M.m[y][x] ^= 1; }
  function penalizacion(M) {
    var tam = M.tam, m = M.m, p = 0, x, y, oscuros = 0;
    function lineas(get) {
      for (var a = 0; a < tam; a++) {
        var run = 1, hist = [];
        for (var b = 0; b < tam; b++) {
          var c = get(a, b);
          if (b > 0 && c === get(a, b - 1)) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
          hist.push(c);
        }
        // patron 1:1:3:1:1 con 4 claros a un lado
        for (var k = 0; k + 11 <= tam; k++) {
          var s = hist.slice(k, k + 11).join('');
          if (s === '10111010000' || s === '00001011101') p += 40;
        }
      }
    }
    lineas(function (a, b) { return m[a][b]; });
    lineas(function (a, b) { return m[b][a]; });
    for (y = 0; y < tam; y++) for (x = 0; x < tam; x++) {
      if (m[y][x]) oscuros++;
      if (x + 1 < tam && y + 1 < tam && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
    }
    var tot = tam * tam, k2 = Math.ceil(Math.abs(oscuros * 20 - tot * 10) / tot) - 1;
    return p + Math.max(0, k2) * 10;
  }

  /* codificarSegmento(seg, opciones) -> {version, ecc, mascara, tam, modulos[y][x] (0/1), modo, datos (palabras)} */
  function codificar(texto, o) {
    o = o || {};
    var e = (o.ecc || 'M').toUpperCase(); if (!(e in NIVELES)) throw new Error('Nivel de correccion no valido.');
    var seg = segmento(texto, o.modo, o.bytes), vmin = o.versionMin || 1, vmax = o.versionMax || 40, v, usadas;
    for (v = vmin; ; v++) {
      var cap = palabrasDatos(v, e) * 8, necesita = longitudBits(seg, v);
      if (necesita <= cap) { usadas = necesita; break; }
      if (v >= vmax) throw new Error('Los datos no caben en un QR' + (vmax < 40 ? ' de version <= ' + vmax : '') + ' con correccion ' + e + ' (' + seg.n + ' elementos).');
    }
    if (o.subirEcc !== false) {
      ['M', 'Q', 'H'].forEach(function (n2) { if (NIVELES[n2] > NIVELES[e] && usadas <= palabrasDatos(v, n2) * 8) e = n2; });
    }
    var bits = []; anadir(bits, MODOS[seg.modo], 4); anadir(bits, seg.n, bitsConteo(MODOS[seg.modo], v)); bits = bits.concat(seg.bits);
    var cap2 = palabrasDatos(v, e) * 8;
    anadir(bits, 0, Math.min(4, cap2 - bits.length));
    anadir(bits, 0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < cap2; pad ^= 0xEC ^ 0x11) anadir(bits, pad, 8);
    var datos = []; for (var i = 0; i < bits.length; i += 8) { var by = 0; for (var k = 0; k < 8; k++) by = (by << 1) | bits[i + k]; datos.push(by); }
    var todo = entrelazar(datos, v, e), M = crearMatriz(v);
    patronesFuncion(M, e); colocar(M, todo);
    var mejor = o.mascara, pen = Infinity;
    if (mejor == null || mejor < 0) {
      for (var mk = 0; mk < 8; mk++) {
        mascarar(M, mk); bitsFormato(M, e, mk);
        var s = penalizacion(M); if (s < pen) { pen = s; mejor = mk; }
        mascarar(M, mk);
      }
    }
    mascarar(M, mejor); bitsFormato(M, e, mejor);
    return { version: v, ecc: e, mascara: mejor, tam: M.tam, modulos: M.m, modo: seg.modo, datos: datos, todo: todo, esFuncion: M.fn };
  }

  function mascaraFuncion(v) { var M = crearMatriz(v); patronesFuncion(M, 'L'); return M.fn; }
  return { mascaraFuncion: mascaraFuncion, tablas: { ecc: ECC_POR_BLOQUE, bloques: NUM_BLOQUES, formato: FORMATO }, invierte: invierte, codificar: codificar, segmento: segmento, modoAuto: modoAuto, palabrasDatos: palabrasDatos, modulosBrutos: modulosBrutos, entrelazar: entrelazar,
    restoRS: restoRS, divisorRS: divisorRS, utf8: utf8, ALFA: ALFA, NIVELES: NIVELES, posicionesAlineacion: posicionesAlineacion,
    capacidad: function (v, e, modo) {
      var bits = palabrasDatos(v, e) * 8 - 4 - bitsConteo(MODOS[modo], v);
      if (modo === 'numerico') { var n = Math.floor(bits / 10) * 3; var r = bits % 10; return n + (r >= 7 ? 2 : r >= 4 ? 1 : 0); }
      if (modo === 'alfanumerico') return Math.floor(bits / 11) * 2 + (bits % 11 >= 6 ? 1 : 0);
      return Math.floor(bits / 8);
    } };
});
