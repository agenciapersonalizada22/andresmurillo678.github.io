/* Nitidez de cuadros y seleccion de cuadros espaciados (puro). */
(function (root) {
  'use strict';
  var R = root.R3D = root.R3D || {}, N = R.Nitidez = {};
  /* varianza del laplaciano sobre gris reducido; img {w,h,data RGBA}; mayor = mas nitido (comparable solo entre cuadros del mismo video) */
  N.medir = function (img, lado) {
    lado = lado || 160; var k = Math.max(1, Math.max(img.w, img.h) / lado), w = Math.max(3, Math.floor(img.w / k)), h = Math.max(3, Math.floor(img.h / k)), g = new Float32Array(w * h), x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var sx = Math.min(img.w - 1, Math.floor(x * k)), sy = Math.min(img.h - 1, Math.floor(y * k)), o = (sy * img.w + sx) * 4; g[y * w + x] = 0.299 * img.data[o] + 0.587 * img.data[o + 1] + 0.114 * img.data[o + 2]; }
    var s = 0, s2 = 0, n = 0; for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) { var l = 4 * g[y * w + x] - g[y * w + x - 1] - g[y * w + x + 1] - g[(y - 1) * w + x] - g[(y + 1) * w + x]; s += l; s2 += l * l; n++; }
    return n ? s2 / n - (s / n) * (s / n) : 0;
  };
  function mediana(a) { var b = a.slice().sort(function (p, q) { return p - q; }); return b.length ? b[b.length >> 1] : 0; }
  /* cands [{t, nit}] -> indices elegidos (<= n): el mas nitido de cada tramo temporal; se descartan los borrosos (< umbralRel * mediana) */
  N.seleccionar = function (cands, n, umbralRel) {
    umbralRel = umbralRel == null ? 0.5 : umbralRel; if (!cands.length) return { elegidos: [], descartados: [] };
    var med = mediana(cands.map(function (c) { return c.nit; })), t0 = cands[0].t, t1 = cands[cands.length - 1].t, span = (t1 - t0) || 1, mejor = {}, descartados = [];
    cands.forEach(function (c, i) {
      if (c.nit < umbralRel * med) { descartados.push(i); return; }
      var b = Math.min(n - 1, Math.floor((c.t - t0) / span * n)); if (mejor[b] === undefined || c.nit > cands[mejor[b]].nit) mejor[b] = i;
    });
    var el = Object.keys(mejor).map(function (k) { return mejor[k]; }).sort(function (a, b) { return a - b; });
    return { elegidos: el, descartados: descartados, mediana: med };
  };
  if (typeof module === 'object' && module.exports) module.exports = N;
})(typeof self !== 'undefined' ? self : globalThis);
