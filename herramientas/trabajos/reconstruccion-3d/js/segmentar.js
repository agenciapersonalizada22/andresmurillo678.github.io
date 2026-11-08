/* Segmentacion de siluetas (puro). Imagen: {w,h,data:Uint8ClampedArray RGBA}. Mascara: Uint8Array w*h (1 = objeto). */
(function (root) {
  'use strict';
  var R = root.R3D = root.R3D || {}, S = R.Seg = {};
  S.estimarFondo = function (img) { // mediana por canal del marco exterior
    var w = img.w, h = img.h, d = img.data, g = Math.max(2, Math.round(Math.min(w, h) * 0.04)), r = [], gg = [], b = [];
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { if (x >= g && x < w - g && y >= g && y < h - g) { x = w - g - 1; continue; } var i = (y * w + x) * 4; r.push(d[i]); gg.push(d[i + 1]); b.push(d[i + 2]); }
    function med(a) { a.sort(function (p, q) { return p - q; }); return a[a.length >> 1] || 0; }
    return [med(r), med(gg), med(b)];
  };
  function cc(r, g, b) { return [0.299 * r + 0.587 * g + 0.114 * b, (b - (0.299 * r + 0.587 * g + 0.114 * b)) * 0.564, (r - (0.299 * r + 0.587 * g + 0.114 * b)) * 0.713]; }
  /* tol 0..100. Distancia en YCbCr con la luminancia atenuada (sombras suaves no cuentan) */
  S.porColor = function (img, clave, tol) {
    var w = img.w, h = img.h, d = img.data, m = new Uint8Array(w * h), k = cc(clave[0], clave[1], clave[2]), t2 = Math.pow(tol * 1.2 + 4, 2);
    for (var i = 0; i < w * h; i++) { var c = cc(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]), dy = (c[0] - k[0]) * 0.35, db = c[1] - k[1], dr = c[2] - k[2]; m[i] = dy * dy + db * db + dr * dr > t2 ? 1 : 0; }
    return m;
  };
  S.desdeAlfa = function (img) { var m = new Uint8Array(img.w * img.h), a = 0; for (var i = 0; i < m.length; i++) { m[i] = img.data[i * 4 + 3] > 128 ? 1 : 0; a += m[i]; } return m; };
  S.tieneAlfa = function (img) { for (var i = 3; i < img.data.length; i += 4 * 17) if (img.data[i] < 250) return true; return false; };
  function erosion(m, w, h) { var o = new Uint8Array(m.length); for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) { var i = y * w + x; o[i] = m[i] && m[i - 1] && m[i + 1] && m[i - w] && m[i + w] && m[i - w - 1] && m[i - w + 1] && m[i + w - 1] && m[i + w + 1] ? 1 : 0; } return o; }
  function dilatacion(m, w, h) { var o = new Uint8Array(m.length); for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var i = y * w + x, v = m[i]; if (!v) { v = (x > 0 && m[i - 1]) || (x < w - 1 && m[i + 1]) || (y > 0 && m[i - w]) || (y < h - 1 && m[i + w]) || (x > 0 && y > 0 && m[i - w - 1]) || (x < w - 1 && y > 0 && m[i - w + 1]) || (x > 0 && y < h - 1 && m[i + w - 1]) || (x < w - 1 && y < h - 1 && m[i + w + 1]) ? 1 : 0; } o[i] = v; } return o; }
  S.mayorComponente = function (m, w, h) {
    var et = new Int32Array(m.length), n = 0, mejor = 0, mejorN = 0, pila = new Int32Array(m.length);
    for (var s = 0; s < m.length; s++) {
      if (!m[s] || et[s]) continue; n++; var sp = 0, cnt = 0; pila[sp++] = s; et[s] = n;
      while (sp) { var i = pila[--sp], x = i % w, y = i / w | 0; cnt++; if (x > 0 && m[i - 1] && !et[i - 1]) { et[i - 1] = n; pila[sp++] = i - 1; } if (x < w - 1 && m[i + 1] && !et[i + 1]) { et[i + 1] = n; pila[sp++] = i + 1; } if (y > 0 && m[i - w] && !et[i - w]) { et[i - w] = n; pila[sp++] = i - w; } if (y < h - 1 && m[i + w] && !et[i + w]) { et[i + w] = n; pila[sp++] = i + w; } }
      if (cnt > mejorN) { mejorN = cnt; mejor = n; }
    }
    var o = new Uint8Array(m.length); if (mejor) for (var i2 = 0; i2 < m.length; i2++) o[i2] = et[i2] === mejor ? 1 : 0; return o;
  };
  S.rellenarHuecos = function (m, w, h) { // el fondo no alcanzable desde el borde pasa a objeto
    var f = new Uint8Array(m.length), pila = new Int32Array(m.length), sp = 0;
    function poner(i) { if (!m[i] && !f[i]) { f[i] = 1; pila[sp++] = i; } }
    for (var x = 0; x < w; x++) { poner(x); poner((h - 1) * w + x); } for (var y = 0; y < h; y++) { poner(y * w); poner(y * w + w - 1); }
    while (sp) { var i = pila[--sp], px = i % w, py = i / w | 0; if (px > 0) poner(i - 1); if (px < w - 1) poner(i + 1); if (py > 0) poner(i - w); if (py < h - 1) poner(i + w); }
    var o = new Uint8Array(m.length); for (var k = 0; k < m.length; k++) o[k] = f[k] ? 0 : 1; return o;
  };
  S.limpiar = function (m, w, h, o) {
    o = o || {}; var r = m, i;
    for (i = 0; i < (o.abrir || 0); i++) r = erosion(r, w, h); for (i = 0; i < (o.abrir || 0); i++) r = dilatacion(r, w, h);
    for (i = 0; i < (o.cerrar || 0); i++) r = dilatacion(r, w, h); for (i = 0; i < (o.cerrar || 0); i++) r = erosion(r, w, h);
    if (o.mayor !== false) r = S.mayorComponente(r, w, h); if (o.huecos !== false) r = S.rellenarHuecos(r, w, h); return r;
  };
  S.pintar = function (m, w, h, cx, cy, rad, v) { var r2 = rad * rad; for (var y = Math.max(0, Math.floor(cy - rad)); y <= Math.min(h - 1, Math.ceil(cy + rad)); y++) for (var x = Math.max(0, Math.floor(cx - rad)); x <= Math.min(w - 1, Math.ceil(cx + rad)); x++) if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) m[y * w + x] = v; };
  S.cajaMascara = function (m, w, h) { var x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0; for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (m[y * w + x]) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return n ? { x0: x0, y0: y0, x1: x1, y1: y1, n: n } : null; };
  S.reducir = function (img, maxLado) { // vecino mas cercano promediado (caja) para limitar memoria
    var k = Math.max(img.w, img.h) / maxLado; if (k <= 1) return img; var w = Math.round(img.w / k), h = Math.round(img.h / k), d = new Uint8ClampedArray(w * h * 4);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var x0 = Math.floor(x * k), x1 = Math.max(x0 + 1, Math.floor((x + 1) * k)), y0 = Math.floor(y * k), y1 = Math.max(y0 + 1, Math.floor((y + 1) * k)), r = 0, g = 0, b = 0, a = 0, n = 0; for (var yy = y0; yy < y1 && yy < img.h; yy++) for (var xx = x0; xx < x1 && xx < img.w; xx++) { var i = (yy * img.w + xx) * 4; r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; a += img.data[i + 3]; n++; } var o = (y * w + x) * 4; d[o] = r / n; d[o + 1] = g / n; d[o + 2] = b / n; d[o + 3] = a / n; }
    return { w: w, h: h, data: d };
  };
  if (typeof module === 'object' && module.exports) module.exports = S;
})(typeof self !== 'undefined' ? self : globalThis);
