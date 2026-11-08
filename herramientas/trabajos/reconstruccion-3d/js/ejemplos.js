/* Escenas sinteticas con verdad conocida (puro): vistas de mesa giratoria de esfera/caja y par estereo con disparidad conocida. */
(function (root) {
  'use strict';
  var R = root.R3D = root.R3D || {}, E = R.Ejemplos = {};
  function inter(o, d, f) { // rayo contra forma; devuelve {t, n, p} o null. formas: esfera {tipo:'esfera',c,r,col}, caja {tipo:'caja',min,max,col}
    var t, n, k;
    if (f.tipo === 'esfera') {
      var ox = o[0] - f.c[0], oy = o[1] - f.c[1], oz = o[2] - f.c[2], b = ox * d[0] + oy * d[1] + oz * d[2], c = ox * ox + oy * oy + oz * oz - f.r * f.r, disc = b * b - c;
      if (disc < 0) return null; t = -b - Math.sqrt(disc); if (t < 0) return null;
      var p = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t]; return { t: t, p: p, n: [(p[0] - f.c[0]) / f.r, (p[1] - f.c[1]) / f.r, (p[2] - f.c[2]) / f.r] };
    }
    var t0 = -Infinity, t1 = Infinity, eje = -1, sg = 1;
    for (k = 0; k < 3; k++) {
      if (Math.abs(d[k]) < 1e-12) { if (o[k] < f.min[k] || o[k] > f.max[k]) return null; continue; }
      var a = (f.min[k] - o[k]) / d[k], bb = (f.max[k] - o[k]) / d[k], s = -1; if (a > bb) { var tmp = a; a = bb; bb = tmp; s = 1; }
      if (a > t0) { t0 = a; eje = k; sg = s; } if (bb < t1) t1 = bb; if (t0 > t1) return null;
    }
    if (t0 < 0) return null; n = [0, 0, 0]; n[eje] = sg; return { t: t0, p: [o[0] + d[0] * t0, o[1] + d[1] * t0, o[2] + d[2] * t0], n: n };
  }
  E.formas = function (nombre) {
    if (nombre === 'esfera') return [{ tipo: 'esfera', c: [0, 0, 0], r: 1, col: [220, 70, 60] }];
    if (nombre === 'caja') return [{ tipo: 'caja', min: [-1, -1, -1], max: [1, 1, 1], col: [60, 140, 220] }];
    return [{ tipo: 'caja', min: [-0.9, -1, -0.9], max: [0.9, 0.2, 0.9], col: [60, 140, 220] }, { tipo: 'esfera', c: [0, 0.75, 0], r: 0.75, col: [235, 180, 50] }];
  };
  /* 'taza': caja 1.8x1.2x1.8 + casquete de esfera (r .75, centro y .75) sobre el plano y=.2 */
  E.volumenVerdad = function (nombre) { if (nombre === 'esfera') return 4 / 3 * Math.PI; if (nombre === 'caja') return 8; var h = 1.5 - 0.2; return 1.8 * 1.2 * 1.8 + Math.PI * h * h * (3 * 0.75 - h) / 3; };
  /* vistas de color + mascara; cam = H.camarasGiro. fondo [r,g,b] */
  E.vistasGiro = function (nombre, cams, fondo) {
    var formas = E.formas(nombre), fon = fondo || [30, 160, 60];
    return cams.map(function (c) {
      var w = c.w, h = c.h, data = new Uint8ClampedArray(w * h * 4), mascara = new Uint8Array(w * h);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var px = (x + 0.5 - c.cx) / c.F, py = -(y + 0.5 - c.cy) / c.F, d = [c.f[0] + c.r[0] * px + c.u[0] * py, c.f[1] + c.r[1] * px + c.u[1] * py, c.f[2] + c.r[2] * px + c.u[2] * py], l = Math.hypot(d[0], d[1], d[2]); d = [d[0] / l, d[1] / l, d[2] / l];
        var mejor = null, ff = null; formas.forEach(function (f) { var q = inter(c.C, d, f); if (q && (!mejor || q.t < mejor.t)) { mejor = q; ff = f; } });
        var o = (y * w + x) * 4;
        if (mejor) { var sh = 0.45 + 0.55 * Math.max(0, -(d[0] * mejor.n[0] + d[1] * mejor.n[1] + d[2] * mejor.n[2])), ban = (Math.floor(mejor.p[1] * 4 + 100) + Math.floor(mejor.p[0] * 4 + 100)) & 1 ? 1 : 0.8; data[o] = ff.col[0] * sh * ban; data[o + 1] = ff.col[1] * sh * ban; data[o + 2] = ff.col[2] * sh * ban; mascara[y * w + x] = 1; }
        else { data[o] = fon[0]; data[o + 1] = fon[1]; data[o + 2] = fon[2]; }
        data[o + 3] = 255;
      }
      return { cam: c, img: { w: w, h: h, data: data }, mascara: mascara };
    });
  };
  /* par estereo rectificado: textura aleatoria; disparidad d(x,y) = d0 + gx*(x-cx)+gy*(y-cy) (+ bulto circular). Devuelve {L,R,disp} (disp respecto a L: xR = xL - d) */
  E.parEstereo = function (w, h, o) {
    o = o || {}; var d0 = o.d0 == null ? 12 : o.d0, gx = o.gx == null ? 0.02 : o.gx, gy = o.gy == null ? 0 : o.gy, bulto = o.bulto == null ? 6 : o.bulto, seed = o.seed || 7;
    function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    var anchoTex = w + 80, tex = new Float32Array(anchoTex * h), i, x, y;
    for (i = 0; i < tex.length; i++) tex[i] = rnd(); // ruido blanco y luego suavizado ligero
    var t2 = new Float32Array(tex.length); for (y = 0; y < h; y++) for (x = 0; x < anchoTex; x++) { var s = 0, c = 0; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var xx = x + dx, yy = y + dy; if (xx >= 0 && xx < anchoTex && yy >= 0 && yy < h) { s += tex[yy * anchoTex + xx]; c++; } } t2[y * anchoTex + x] = s / c; }
    var disp = new Float32Array(w * h), Ld = new Uint8ClampedArray(w * h * 4), Rd = new Uint8ClampedArray(w * h * 4);
    function dd(x, y) { var r = Math.hypot(x - w * 0.5, y - h * 0.5), b = r < h * 0.28 ? bulto * Math.cos(r / (h * 0.28) * Math.PI / 2) : 0; return d0 + gx * (x - w / 2) + gy * (y - h / 2) + b; }
    function tx(x, y) { var xi = Math.floor(x), f = x - xi; xi = Math.max(0, Math.min(anchoTex - 2, xi)); return t2[y * anchoTex + xi] * (1 - f) + t2[y * anchoTex + xi + 1] * f; }
    // imagen izquierda: textura en coordenadas mundo = xL + 40 ; derecha: mismo punto del mundo en xR = xL - d  => xL = xR + d (se resuelve por iteracion)
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var d = dd(x, y), v = tx(x + 40, y) * 255, o2 = (y * w + x) * 4; disp[y * w + x] = d; Ld[o2] = Ld[o2 + 1] = Ld[o2 + 2] = v; Ld[o2 + 3] = 255;
      // pintar R en xR = x - d (con redondeo bilineal por escritura al pixel mas cercano; huecos se rellenan despues)
    }
    var cubierto = new Uint8Array(w * h);
    for (y = 0; y < h; y++) for (x = w - 1; x >= 0; x--) { var xr = Math.round(x - disp[y * w + x]); if (xr >= 0 && xr < w) { var oi = (y * w + xr) * 4, oL = (y * w + x) * 4; Rd[oi] = Ld[oL]; Rd[oi + 1] = Ld[oL + 1]; Rd[oi + 2] = Ld[oL + 2]; Rd[oi + 3] = 255; cubierto[y * w + xr] = 1; } }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (!cubierto[y * w + x]) { var xs = x, v2 = 128; while (xs < w && !cubierto[y * w + xs]) xs++; if (xs < w) v2 = Rd[(y * w + xs) * 4]; else if (x > 0) v2 = Rd[(y * w + x - 1) * 4]; var o3 = (y * w + x) * 4; Rd[o3] = Rd[o3 + 1] = Rd[o3 + 2] = v2; Rd[o3 + 3] = 255; }
    return { L: { w: w, h: h, data: Ld }, R: { w: w, h: h, data: Rd }, disp: disp };
  };
  if (typeof module === 'object' && module.exports) module.exports = E;
})(typeof self !== 'undefined' ? self : globalThis);
