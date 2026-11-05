/* Codificador QR (modelo 2) desde cero: numerico, alfanumerico y bytes UTF-8; versiones 1-40; niveles L/M/Q/H. */
(function (r, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else r.QR = f(); })(this, function () {
  var Q = {};
  var ECC_BLOQ = {
    L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  };
  var NUM_BLOQ = {
    L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  };
  var FMT = { L: 1, M: 0, Q: 3, H: 2 };
  var ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  Q.ALNUM = ALNUM;

  var bit = function (v, i) { return ((v >>> i) & 1) !== 0; };
  function modulosBrutos(v) {
    var r = (16 * v + 128) * v + 64;
    if (v >= 2) { var na = Math.floor(v / 7) + 2; r -= (25 * na - 10) * na - 55; if (v >= 7) r -= 36; }
    return r;
  }
  Q.modulosDatos = function (v, ecc) { return Math.floor(modulosBrutos(v) / 8) - ECC_BLOQ[ecc][v] * NUM_BLOQ[ecc][v]; };

  /* GF(256) */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  var gmul = function (a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; };
  function divisor(grado) {
    var r = new Array(grado).fill(0); r[grado - 1] = 1; var raiz = 1;
    for (var i = 0; i < grado; i++) {
      for (var j = 0; j < grado; j++) { r[j] = gmul(r[j], raiz); if (j + 1 < grado) r[j] ^= r[j + 1]; }
      raiz = gmul(raiz, 2);
    }
    return r;
  }
  /* resto de la division polinomial = bytes de correccion */
  Q.reedSolomon = function (datos, grado) {
    var d = divisor(grado), res = new Array(grado).fill(0);
    datos.forEach(function (b) {
      var fac = b ^ res.shift(); res.push(0);
      d.forEach(function (c, i) { res[i] ^= gmul(c, fac); });
    });
    return res;
  };

  function utf8(s) {
    if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(s));
    return Array.from(Buffer.from(s, 'utf8'));
  }
  function segmento(texto) {
    if (/^[0-9]*$/.test(texto)) return { modo: 1, n: texto.length, bits: bitsNum(texto) };
    var alnum = true; for (var i = 0; i < texto.length; i++) if (ALNUM.indexOf(texto[i]) < 0) { alnum = false; break; }
    if (alnum) return { modo: 2, n: texto.length, bits: bitsAlnum(texto) };
    var b = utf8(texto), bits = []; b.forEach(function (x) { pon(bits, x, 8); });
    return { modo: 4, n: b.length, bits: bits };
  }
  function pon(arr, val, n) { for (var i = n - 1; i >= 0; i--) arr.push((val >>> i) & 1); }
  function bitsNum(t) { var b = []; for (var i = 0; i < t.length;) { var n = Math.min(3, t.length - i); pon(b, parseInt(t.substr(i, n), 10), n * 3 + 1); i += n; } return b; }
  function bitsAlnum(t) {
    var b = [], i;
    for (i = 0; i + 1 < t.length; i += 2) pon(b, ALNUM.indexOf(t[i]) * 45 + ALNUM.indexOf(t[i + 1]), 11);
    if (i < t.length) pon(b, ALNUM.indexOf(t[i]), 6);
    return b;
  }
  function bitsConteo(modo, v) {
    var k = v <= 9 ? 0 : v <= 26 ? 1 : 2;
    return { 1: [10, 12, 14], 2: [9, 11, 13], 4: [8, 16, 16] }[modo][k];
  }

  /* devuelve los codewords de datos (con relleno) */
  Q.datos = function (texto, ecc, minV, maxV) {
    var seg = segmento(texto), v, cap;
    for (v = minV || 1; v <= (maxV || 40); v++) {
      cap = Q.modulosDatos(v, ecc) * 8;
      var uso = 4 + bitsConteo(seg.modo, v) + seg.bits.length;
      if (uso <= cap) break;
      if (v === (maxV || 40)) throw new Error('Texto demasiado largo para QR');
    }
    var b = []; pon(b, seg.modo, 4); pon(b, seg.n, bitsConteo(seg.modo, v)); b = b.concat(seg.bits);
    for (var t = 0; t < 4 && b.length < cap; t++) b.push(0);
    while (b.length % 8) b.push(0);
    var cw = [];
    for (var i = 0; i < b.length; i += 8) { var x = 0; for (var j = 0; j < 8; j++) x = (x << 1) | b[i + j]; cw.push(x); }
    for (var pad = 0xEC; cw.length < cap / 8; pad ^= 0xEC ^ 0x11) cw.push(pad);
    return { version: v, cw: cw };
  };
  Q.entrelazar = function (cw, v, ecc) {
    var nb = NUM_BLOQ[ecc][v], le = ECC_BLOQ[ecc][v], raw = Math.floor(modulosBrutos(v) / 8);
    var cortos = nb - raw % nb, lc = Math.floor(raw / nb), bloques = [], k = 0;
    for (var i = 0; i < nb; i++) {
      var d = cw.slice(k, k + lc - le + (i < cortos ? 0 : 1)); k += d.length;
      var e = Q.reedSolomon(d, le); if (i < cortos) d.push(0);
      bloques.push(d.concat(e));
    }
    var out = [];
    for (i = 0; i < bloques[0].length; i++) bloques.forEach(function (bl, j) { if (i !== lc - le || j >= cortos) out.push(bl[i]); });
    return out;
  };
  function posAlineacion(v) {
    if (v === 1) return [];
    var n = Math.floor(v / 7) + 2, size = v * 4 + 17, paso = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, r = [6];
    for (var p = size - 7; r.length < n; p -= paso) r.splice(1, 0, p);
    return r;
  }
  Q.posAlineacion = posAlineacion;
  Q.bitsFormato = function (ecc, mascara) {
    var data = (FMT[ecc] << 3) | mascara, rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  };
  function penalizacion(m, size) {
    var p = 0, x, y, k;
    for (var pasada = 0; pasada < 2; pasada++) {
      for (y = 0; y < size; y++) {
        var run = 1, hist = [];
        for (x = 1; x <= size; x++) {
          var a = pasada ? m[x < size ? x : 0][y] : m[y][x < size ? x : 0], b = pasada ? m[x - 1][y] : m[y][x - 1];
          if (x < size && a === b) run++; else { if (run >= 5) p += run - 2; run = 1; }
        }
        var linea = ''; for (x = 0; x < size; x++) linea += (pasada ? m[x][y] : m[y][x]) ? '1' : '0';
        var re = /(?:00001011101|10111010000)/g, mm; while ((mm = re.exec(linea))) { p += 40; re.lastIndex = mm.index + 1; }
      }
    }
    for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) { var c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3; }
    var oscuros = 0; m.forEach(function (fila) { fila.forEach(function (c) { if (c) oscuros++; }); });
    k = Math.ceil(Math.abs(oscuros * 20 - size * size * 10) / (size * size)) - 1;
    return p + Math.max(0, k) * 10;
  }
  var MASCARAS = [
    function (x, y) { return (x + y) % 2 === 0; }, function (x, y) { return y % 2 === 0; }, function (x, y) { return x % 3 === 0; },
    function (x, y) { return (x + y) % 3 === 0; }, function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
    function (x, y) { return x * y % 2 + x * y % 3 === 0; }, function (x, y) { return (x * y % 2 + x * y % 3) % 2 === 0; },
    function (x, y) { return ((x + y) % 2 + x * y % 3) % 2 === 0; }
  ];
  Q.mascaras = MASCARAS;

  /* matriz de funciones (true donde hay patron de funcion) */
  Q.funciones = function (v) {
    var size = v * 4 + 17, fn = [], x, y;
    for (y = 0; y < size; y++) fn.push(new Array(size).fill(false));
    function marca(x, y) { if (x >= 0 && y >= 0 && x < size && y < size) fn[y][x] = true; }
    for (var i = 0; i < size; i++) { marca(6, i); marca(i, 6); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (p) { for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) marca(p[0] + dx, p[1] + dy); });
    var al = posAlineacion(v), n = al.length;
    for (i = 0; i < n; i++) for (var j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) marca(al[i] + dx2, al[j] + dy2);
    }
    for (i = 0; i < 9; i++) { marca(8, i); marca(i, 8); }
    for (i = 0; i < 8; i++) { marca(size - 1 - i, 8); marca(8, size - 1 - i); }
    if (v >= 7) for (i = 0; i < 6; i++) for (j = 0; j < 3; j++) { marca(size - 11 + j, i); marca(i, size - 11 + j); }
    return fn;
  };
  Q.codificar = function (texto, ecc, opciones) {
    opciones = opciones || {}; ecc = ecc || 'M';
    var d = Q.datos(texto, ecc, opciones.minVersion, opciones.maxVersion), v = d.version, size = v * 4 + 17;
    var todo = Q.entrelazar(d.cw, v, ecc), fn = Q.funciones(v), m = [], x, y, i;
    for (y = 0; y < size; y++) m.push(new Array(size).fill(false));
    function poner(x, y, c) { m[y][x] = c; }
    for (i = 0; i < size; i++) { poner(6, i, i % 2 === 0); poner(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (p) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy)), xx = p[0] + dx, yy = p[1] + dy;
        if (xx >= 0 && yy >= 0 && xx < size && yy < size) poner(xx, yy, dist !== 2 && dist !== 4);
      }
    });
    var al = posAlineacion(v), n = al.length;
    for (i = 0; i < n; i++) for (var j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) poner(al[i] + dx2, al[j] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
    }
    function formato(mask) {
      var b = Q.bitsFormato(ecc, mask), k;
      for (k = 0; k <= 5; k++) poner(8, k, bit(b, k));
      poner(8, 7, bit(b, 6)); poner(8, 8, bit(b, 7)); poner(7, 8, bit(b, 8));
      for (k = 9; k < 15; k++) poner(14 - k, 8, bit(b, k));
      for (k = 0; k < 8; k++) poner(size - 1 - k, 8, bit(b, k));
      for (k = 8; k < 15; k++) poner(8, size - 15 + k, bit(b, k));
      poner(8, size - 8, true);
    }
    formato(0);
    if (v >= 7) {
      var rem = v; for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var vb = (v << 12) | rem;
      for (i = 0; i < 18; i++) { var c = bit(vb, i), a = size - 11 + i % 3, b2 = Math.floor(i / 3); poner(a, b2, c); poner(b2, a, c); }
    }
    var k2 = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (var jj = 0; jj < 2; jj++) {
        x = right - jj; y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
        if (!fn[y][x] && k2 < todo.length * 8) { m[y][x] = bit(todo[k2 >>> 3], 7 - (k2 & 7)); k2++; }
      }
    }
    function aplicar(mask) { for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (!fn[y][x] && MASCARAS[mask](x, y)) m[y][x] = !m[y][x]; }
    var mejor = opciones.mascara, minPen = Infinity;
    if (mejor == null) {
      for (var mk = 0; mk < 8; mk++) { aplicar(mk); formato(mk); var pen = penalizacion(m, size); if (pen < minPen) { minPen = pen; mejor = mk; } aplicar(mk); }
    }
    aplicar(mejor); formato(mejor);
    return { version: v, size: size, ecc: ecc, mascara: mejor, modulos: m };
  };
  Q.aSvg = function (qr, borde, fg, bg) {
    borde = borde == null ? 4 : borde; var s = qr.size + borde * 2, d = '';
    qr.modulos.forEach(function (fila, y) { fila.forEach(function (c, x) { if (c) d += 'M' + (x + borde) + ' ' + (y + borde) + 'h1v1h-1z'; }); });
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + ' ' + s + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="' + (bg || '#fff') + '"/><path d="' + d + '" fill="' + (fg || '#000') + '"/></svg>';
  };
  return Q;
});
