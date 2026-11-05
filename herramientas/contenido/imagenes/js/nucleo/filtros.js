/* Filtros de pixeles (RGBA Uint8ClampedArray, in situ). Parametros con valores por defecto. */
(function (r, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else r.Filtros = f(); })(this, function () {
  var F = {}, C;
  if (typeof require === 'function' && typeof module === 'object') C = require('./color.js'); else C = this.Color || self.Color;
  var cl = function (v) { return v < 0 ? 0 : v > 255 ? 255 : v; };
  function lut(d, tabla) { for (var i = 0; i < d.length; i += 4) { d[i] = tabla[d[i]]; d[i + 1] = tabla[d[i + 1]]; d[i + 2] = tabla[d[i + 2]]; } }
  function lutRGB(d, tr, tg, tb) { for (var i = 0; i < d.length; i += 4) { d[i] = tr[d[i]]; d[i + 1] = tg[d[i + 1]]; d[i + 2] = tb[d[i + 2]]; } }
  function tabla(f) { var t = new Uint8ClampedArray(256); for (var i = 0; i < 256; i++) t[i] = f(i); return t; }

  F.brillo = function (d, w, h, p) { var v = (p.v || 0) * 2.55; lut(d, tabla(function (x) { return x + v; })); };
  F.contraste = function (d, w, h, p) {
    var c = (p.v || 0) * 2.55, k = 259 * (c + 255) / (255 * (259 - c));
    lut(d, tabla(function (x) { return k * (x - 128) + 128; }));
  };
  F.gamma = function (d, w, h, p) { var g = p.v || 1; lut(d, tabla(function (x) { return 255 * Math.pow(x / 255, 1 / g); })); };
  F.saturacion = function (d, w, h, p) {
    var s = 1 + (p.v || 0) / 100;
    for (var i = 0; i < d.length; i += 4) { var l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; d[i] = l + (d[i] - l) * s; d[i + 1] = l + (d[i + 1] - l) * s; d[i + 2] = l + (d[i + 2] - l) * s; }
  };
  F.tono = function (d, w, h, p) {
    var a = (p.v || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    var m = [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
      0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
      0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072];
    for (var i = 0; i < d.length; i += 4) { var r = d[i], g = d[i + 1], b = d[i + 2]; d[i] = r * m[0] + g * m[1] + b * m[2]; d[i + 1] = r * m[3] + g * m[4] + b * m[5]; d[i + 2] = r * m[6] + g * m[7] + b * m[8]; }
  };
  F.temperatura = function (d, w, h, p) {
    var v = (p.v || 0) / 100 * 40;
    lutRGB(d, tabla(function (x) { return x + v; }), tabla(function (x) { return x + v * 0.1; }), tabla(function (x) { return x - v; }));
  };
  F.tinte = function (d, w, h, p) { var v = (p.v || 0) / 100 * 30; lutRGB(d, tabla(function (x) { return x; }), tabla(function (x) { return x - v; }), tabla(function (x) { return x; })); };
  /* curvas: puntos [[x,y],..] 0..255, interpolacion monotona (Fritsch-Carlson); canal 'rgb'|'r'|'g'|'b' */
  F.tablaCurva = function (pts) {
    pts = pts.slice().sort(function (a, b) { return a[0] - b[0]; });
    var n = pts.length, dx = [], m = [], i;
    if (n < 2) return tabla(function (x) { return x; });
    for (i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0] || 1e-6; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
    var t = [m[0]]; for (i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2; t[n - 1] = m[n - 2];
    for (i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
      var a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
      if (s > 9) { var k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
    }
    return tabla(function (x) {
      if (x <= pts[0][0]) return pts[0][1]; if (x >= pts[n - 1][0]) return pts[n - 1][1];
      var j = 0; while (x > pts[j + 1][0]) j++;
      var hh = dx[j], u = (x - pts[j][0]) / hh, u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * pts[j][1] + (u3 - 2 * u2 + u) * hh * t[j] + (-2 * u3 + 3 * u2) * pts[j + 1][1] + (u3 - u2) * hh * t[j + 1];
    });
  };
  F.curvas = function (d, w, h, p) {
    var pts = p.puntos || [[0, 0], [255, 255]], ca = p.canal || 'rgb', t = F.tablaCurva(pts), id = tabla(function (x) { return x; });
    lutRGB(d, ca === 'rgb' || ca === 'r' ? t : id, ca === 'rgb' || ca === 'g' ? t : id, ca === 'rgb' || ca === 'b' ? t : id);
  };
  F.niveles = function (d, w, h, p) {
    var n = p.neg == null ? 0 : p.neg, b = p.blan == null ? 255 : p.blan, g = p.gam || 1, sn = p.sneg || 0, sb = p.sblan == null ? 255 : p.sblan;
    lut(d, tabla(function (x) { var t = Math.min(1, Math.max(0, (x - n) / Math.max(1, b - n))); return sn + Math.pow(t, 1 / g) * (sb - sn); }));
  };
  F.invertir = function (d) { lut(d, tabla(function (x) { return 255 - x; })); };
  F.grises = function (d) { for (var i = 0; i < d.length; i += 4) { var l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; d[i] = d[i + 1] = d[i + 2] = l; } };
  F.sepia = function (d, w, h, p) {
    var a = (p && p.v != null ? p.v : 100) / 100;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2];
      d[i] = r + (0.393 * r + 0.769 * g + 0.189 * b - r) * a; d[i + 1] = g + (0.349 * r + 0.686 * g + 0.168 * b - g) * a; d[i + 2] = b + (0.272 * r + 0.534 * g + 0.131 * b - b) * a;
    }
  };
  F.umbral = function (d, w, h, p) { var u = p.v == null ? 128 : p.v; for (var i = 0; i < d.length; i += 4) { var v = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) >= u ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = v; } };
  F.posterizar = function (d, w, h, p) { var n = Math.max(2, p.v || 4); lut(d, tabla(function (x) { return Math.round(x / 255 * (n - 1)) / (n - 1) * 255; })); };
  F.duotono = function (d, w, h, p) {
    var a = C.hexARgb(p.c1 || '#1b1464'), b = C.hexARgb(p.c2 || '#fbb034');
    for (var i = 0; i < d.length; i += 4) { var l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; d[i] = a[0] + (b[0] - a[0]) * l; d[i + 1] = a[1] + (b[1] - a[1]) * l; d[i + 2] = a[2] + (b[2] - a[2]) * l; }
  };
  F.ruido = function (d, w, h, p) {
    var c = (p.v == null ? 20 : p.v) * 2.55, mono = p.mono !== false, s = (p.semilla || 12345) >>> 0;
    function rnd() { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    for (var i = 0; i < d.length; i += 4) {
      if (mono) { var n = (rnd() - 0.5) * c; d[i] += n; d[i + 1] += n; d[i + 2] += n; } else { d[i] += (rnd() - 0.5) * c; d[i + 1] += (rnd() - 0.5) * c; d[i + 2] += (rnd() - 0.5) * c; }
    }
  };
  F.pixelado = function (d, w, h, p) {
    var t = Math.max(2, Math.round(p.v || 8));
    for (var by = 0; by < h; by += t) for (var bx = 0; bx < w; bx += t) {
      var r = 0, g = 0, b = 0, a = 0, n = 0, x, y, i;
      for (y = by; y < Math.min(h, by + t); y++) for (x = bx; x < Math.min(w, bx + t); x++) { i = (y * w + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; a += d[i + 3]; n++; }
      r /= n; g /= n; b /= n; a /= n;
      for (y = by; y < Math.min(h, by + t); y++) for (x = bx; x < Math.min(w, bx + t); x++) { i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a; }
    }
  };
  /* desenfoque de caja separable (3 pasadas ~ gaussiano) con alfa premultiplicado */
  function cajaH(src, dst, w, h, r) {
    var K = 2 * r + 1;
    for (var y = 0; y < h; y++) for (var c = 0; c < 4; c++) {
      var o = y * w * 4 + c, s = 0, x;
      for (x = -r; x <= r; x++) s += src[o + Math.min(w - 1, Math.max(0, x)) * 4];
      for (x = 0; x < w; x++) {
        dst[o + x * 4] = s / K;
        s += src[o + Math.min(w - 1, x + r + 1) * 4] - src[o + Math.max(0, x - r) * 4];
      }
    }
  }
  function cajaV(src, dst, w, h, r) {
    var K = 2 * r + 1, sw = w * 4;
    for (var x = 0; x < w; x++) for (var c = 0; c < 4; c++) {
      var o = x * 4 + c, s = 0, y;
      for (y = -r; y <= r; y++) s += src[Math.min(h - 1, Math.max(0, y)) * sw + o];
      for (y = 0; y < h; y++) {
        dst[y * sw + o] = s / K;
        s += src[Math.min(h - 1, y + r + 1) * sw + o] - src[Math.max(0, y - r) * sw + o];
      }
    }
  }
  F.desenfocar = function (d, w, h, radio) {
    radio = Math.round(radio); if (radio < 1) return;
    var f = new Float32Array(d.length), g = new Float32Array(d.length), i;
    for (i = 0; i < d.length; i += 4) { var a = d[i + 3] / 255; f[i] = d[i] * a; f[i + 1] = d[i + 1] * a; f[i + 2] = d[i + 2] * a; f[i + 3] = d[i + 3]; }
    var r = Math.max(1, Math.round(radio / 1.7));
    for (var k = 0; k < 3; k++) { cajaH(f, g, w, h, r); cajaV(g, f, w, h, r); }
    for (i = 0; i < d.length; i += 4) { var al = f[i + 3] / 255; if (al > 0.0001) { d[i] = f[i] / al; d[i + 1] = f[i + 1] / al; d[i + 2] = f[i + 2] / al; } d[i + 3] = f[i + 3]; }
  };
  F.desenfoque = function (d, w, h, p) { F.desenfocar(d, w, h, p.v == null ? 4 : p.v); };
  F.nitidez = function (d, w, h, p) {
    var cant = (p.v == null ? 50 : p.v) / 100, o = new Uint8ClampedArray(d); F.desenfocar(o, w, h, p.radio || 2);
    for (var i = 0; i < d.length; i += 4) for (var c = 0; c < 3; c++) d[i + c] = d[i + c] + (d[i + c] - o[i + c]) * cant * 2;
  };
  F.vineta = function (d, w, h, p) {
    var f = (p.v == null ? 50 : p.v) / 100, rad = p.radio == null ? 0.75 : p.radio, cx = w / 2, cy = h / 2, md = Math.hypot(cx, cy);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var dd = Math.hypot(x - cx, y - cy) / md, t = Math.max(0, (dd - rad * 0.5) / (1 - rad * 0.5)), k = 1 - f * t * t, i = (y * w + x) * 4;
      d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
    }
  };
  /* enfoque elipse: fuera de (cx,cy,rx,ry) en fracciones se desenfoca; suav 0..1 */
  F.desenfoqueFondo = function (d, w, h, p) {
    var o = new Uint8ClampedArray(d); F.desenfocar(o, w, h, p.radio == null ? 12 : p.radio);
    var cx = (p.cx == null ? 0.5 : p.cx) * w, cy = (p.cy == null ? 0.5 : p.cy) * h, rx = (p.rx == null ? 0.3 : p.rx) * w, ry = (p.ry == null ? 0.35 : p.ry) * h, su = p.suav == null ? 0.4 : p.suav;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var q = Math.hypot((x - cx) / rx, (y - cy) / ry), t = Math.min(1, Math.max(0, (q - 1) / Math.max(0.01, su))), i = (y * w + x) * 4;
      for (var c = 0; c < 4; c++) d[i + c] = d[i + c] + (o[i + c] - d[i + c]) * t;
    }
  };
  F.auto = function (d, w, h) {
    var hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)], n = 0, i;
    for (i = 0; i < d.length; i += 4) if (d[i + 3] > 0) { hist[0][d[i]]++; hist[1][d[i + 1]]++; hist[2][d[i + 2]]++; n++; }
    if (!n) return;
    var lim = n * 0.005, tabs = hist.map(function (hh) {
      var a = 0, s = 0, lo = 0, hi = 255; for (i = 0; i < 256; i++) { s += hh[i]; if (s > lim) { lo = i; break; } }
      s = 0; for (i = 255; i >= 0; i--) { s += hh[i]; if (s > lim) { hi = i; break; } }
      if (hi - lo < 8) { lo = 0; hi = 255; } return [lo, hi];
    });
    var media = 0; for (i = 0; i < d.length; i += 4) media += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; media /= n;
    var gam = Math.min(1.6, Math.max(0.65, Math.log(0.5) / Math.log(Math.max(0.05, Math.min(0.95, media / 255)))));
    var T = tabs.map(function (q) { return tabla(function (x) { return 255 * Math.pow(Math.min(1, Math.max(0, (x - q[0]) / (q[1] - q[0]))), 1 / (1 + (gam - 1) * 0.5)); }); });
    lutRGB(d, T[0], T[1], T[2]);
  };
  F.aplicar = function (d, w, h, op, p) {
    if (!F[op] || op === 'aplicar' || op === 'aplicarOps' || typeof F[op] !== 'function') return;
    F[op](d, w, h, p || {});
  };
  F.aplicarOps = function (d, w, h, ops) { (ops || []).forEach(function (o) { F.aplicar(d, w, h, o[0], o[1]); }); };

  F.NOMBRES = {
    brillo: 'Brillo', contraste: 'Contraste', saturacion: 'Saturación', tono: 'Tono', temperatura: 'Temperatura', tinte: 'Tinte', gamma: 'Gamma',
    vineta: 'Viñeta', nitidez: 'Nitidez', desenfoque: 'Desenfoque', ruido: 'Ruido', pixelado: 'Pixelado', duotono: 'Duotono',
    invertir: 'Invertir', grises: 'Blanco y negro', sepia: 'Sepia', umbral: 'Umbral', posterizar: 'Posterizar', niveles: 'Niveles', curvas: 'Curvas'
  };
  F.LOOKS = [
    ['original', 'Original', []],
    ['vivido', 'Vívido', [['saturacion', { v: 35 }], ['contraste', { v: 12 }]]],
    ['calido', 'Cálido', [['temperatura', { v: 35 }], ['saturacion', { v: 10 }]]],
    ['frio', 'Frío', [['temperatura', { v: -35 }], ['contraste', { v: 6 }]]],
    ['vintage', 'Vintage', [['sepia', { v: 55 }], ['contraste', { v: -10 }], ['vineta', { v: 45 }], ['ruido', { v: 8 }]]],
    ['bn', 'Blanco y negro', [['grises', {}]]],
    ['bn-alto', 'B/N contrastado', [['grises', {}], ['contraste', { v: 45 }]]],
    ['sepia', 'Sepia', [['sepia', { v: 100 }]]],
    ['cine', 'Cine', [['contraste', { v: 18 }], ['saturacion', { v: -15 }], ['temperatura', { v: -12 }], ['vineta', { v: 40 }]]],
    ['dramatico', 'Dramático', [['contraste', { v: 40 }], ['saturacion', { v: -20 }], ['vineta', { v: 55 }]]],
    ['suave', 'Suave', [['contraste', { v: -18 }], ['brillo', { v: 8 }], ['saturacion', { v: -8 }]]],
    ['brillante', 'Brillante', [['brillo', { v: 18 }], ['saturacion', { v: 18 }]]],
    ['mate', 'Mate', [['niveles', { sneg: 28, sblan: 235 }], ['saturacion', { v: -10 }]]],
    ['neon', 'Neón', [['duotono', { c1: '#14003d', c2: '#00ffd5' }], ['contraste', { v: 20 }]]],
    ['atardecer', 'Atardecer', [['duotono', { c1: '#3b0a5c', c2: '#ffb347' }]]],
    ['oceano', 'Océano', [['duotono', { c1: '#001f3f', c2: '#7fdbff' }]]],
    ['pop', 'Pop art', [['posterizar', { v: 4 }], ['saturacion', { v: 60 }]]],
    ['negativo', 'Negativo', [['invertir', {}]]],
    ['retro-pixel', 'Retro píxel', [['pixelado', { v: 6 }], ['posterizar', { v: 6 }]]],
    ['lomo', 'Lomo', [['contraste', { v: 25 }], ['saturacion', { v: 30 }], ['vineta', { v: 70 }], ['tinte', { v: 10 }]]],
    ['nitido', 'Nítido', [['nitidez', { v: 70, radio: 2 }], ['contraste', { v: 6 }]]]
  ];
  return F;
});
