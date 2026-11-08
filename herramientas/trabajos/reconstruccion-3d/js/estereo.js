/* Estereo por bloques (puro): rectificacion basica, block matching SAD+gradiente con comprobacion izquierda-derecha, subpixel, profundidad y nube.
   Supone camaras paralelas separadas lateralmente una base conocida B (misma unidad que la profundidad). */
(function (root) {
  'use strict';
  var R = root.R3D = root.R3D || {}, E = R.Estereo = {};
  E.gris = function (img) { var n = img.w * img.h, g = new Float32Array(n), d = img.data; for (var i = 0; i < n; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; return g; };
  function grad(g, w, h) { var o = new Float32Array(g.length); for (var y = 0; y < h; y++) for (var x = 1; x < w - 1; x++) o[y * w + x] = (g[y * w + x + 1] - g[y * w + x - 1]) * 0.5; return o; }
  function caja(a, w, h, r, out) { // suma en ventana (2r+1)^2 con integral
    var W = w + 1, I = new Float64Array(W * (h + 1)), x, y;
    for (y = 0; y < h; y++) { var f = 0; for (x = 0; x < w; x++) { f += a[y * w + x]; I[(y + 1) * W + x + 1] = I[y * W + x + 1] + f; } }
    for (y = 0; y < h; y++) { var y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1); for (x = 0; x < w; x++) { var x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1); out[y * w + x] = (I[y1 * W + x1] - I[y0 * W + x1] - I[y1 * W + x0] + I[y0 * W + x0]) / ((x1 - x0) * (y1 - y0)); } }
  }
  /* L,R: Float32Array de gris. Devuelve disparidad respecto a L (xR = xL - d); NaN = invalida */
  E.bloques = function (L, Rr, w, h, o, progreso) {
    o = o || {}; var dmin = o.dmin || 0, dmax = o.dmax || 48, r = o.ventana || 4, ratio = o.unicidad == null ? 0.92 : o.unicidad, lr = o.lr !== false, maxCosto = o.maxCosto || 30, n = w * h;
    var gl = grad(L, w, h), gr = grad(Rr, w, h), c = new Float32Array(n), a = new Float32Array(n), mejor = new Float32Array(n).fill(1e30), seg = new Float32Array(n).fill(1e30), bd = new Int16Array(n).fill(-1), cm = new Float32Array(n), cp = new Float32Array(n), prev = new Float32Array(n);
    var mejorR = new Float32Array(n).fill(1e30), bdR = new Int16Array(n).fill(-1), d, i, x, y;
    for (d = dmin; d <= dmax; d++) {
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) { i = y * w + x; var xr = x - d; a[i] = xr < 0 ? 255 : Math.abs(L[i] - Rr[y * w + xr]) + 1.5 * Math.abs(gl[i] - gr[y * w + xr]); }
      caja(a, w, h, r, c);
      for (i = 0; i < n; i++) {
        var ci = c[i];
        if (bd[i] === d - 1 && d > dmin) cp[i] = ci;
        if (ci < mejor[i]) { if (bd[i] >= 0 && Math.abs(bd[i] - d) > 1) seg[i] = mejor[i]; mejor[i] = ci; bd[i] = d; cm[i] = d > dmin ? prev[i] : ci; cp[i] = ci; } else if (Math.abs(bd[i] - d) > 1 && ci < seg[i]) seg[i] = ci;
        if (lr) { var xx = i % w - d; if (xx >= 0) { var j = i - d; if (ci < mejorR[j]) { mejorR[j] = ci; bdR[j] = d; } } }
      }
      prev.set(c); if (progreso) progreso((d - dmin) / (dmax - dmin + 1));
    }
    var out = new Float32Array(n).fill(NaN);
    for (i = 0; i < n; i++) {
      var db = bd[i]; if (db < 0 || mejor[i] > maxCosto) continue; if (seg[i] < 1e29 && mejor[i] > ratio * seg[i]) continue;
      x = i % w; if (lr) { var xr2 = x - db; if (xr2 < 0 || Math.abs(bdR[i - db] - db) > 1) continue; }
      var sub = db, den = cm[i] - 2 * mejor[i] + cp[i]; if (db > dmin && db < dmax && den > 1e-6) { sub = db + 0.5 * (cm[i] - cp[i]) / den; if (sub < db - 0.5 || sub > db + 0.5) sub = db; }
      out[i] = sub;
    }
    return out;
  };
  /* filtro de mediana 3x3 que descarta valores aislados */
  E.limpiarDisp = function (d, w, h, minVecinos) {
    var o = new Float32Array(d.length).fill(NaN), mv = minVecinos == null ? 3 : minVecinos;
    for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) { var i = y * w + x, v = d[i]; if (isNaN(v)) continue; var cnt = 0; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; var q = d[i + dy * w + dx]; if (!isNaN(q) && Math.abs(q - v) < 1.5) cnt++; } if (cnt >= mv) o[i] = v; }
    return o;
  };
  /* desajuste vertical (dy) y giro (grados) de la derecha respecto a la izquierda: busqueda gruesa-fina sobre puntos con textura */
  E.estimarDesajuste = function (L, Rr, w, h, o) {
    o = o || {}; var maxDy = o.maxDy == null ? 12 : o.maxDy, maxRot = o.maxRot == null ? 2 : o.maxRot, dxMax = o.dxMax || Math.round(w * 0.12);
    var pts = [], paso = Math.max(6, Math.round(Math.min(w, h) / 14)), r = 3, x, y;
    for (y = maxDy + r + 2; y < h - maxDy - r - 2; y += paso) for (x = dxMax + r + 2; x < w - r - 2; x += paso) { var m = 0, v = 0; for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) m += L[(y + dy) * w + x + dx]; m /= (2 * r + 1) * (2 * r + 1); for (dy = -r; dy <= r; dy++) for (dx = -r; dx <= r; dx++) v += Math.pow(L[(y + dy) * w + x + dx] - m, 2); if (v / ((2 * r + 1) * (2 * r + 1)) > 60) pts.push([x, y]); }
    if (pts.length < 8) return { dy: 0, rot: 0, puntos: pts.length, ok: false };
    function costo(dyv, rot) {
      var cs = Math.cos(rot * Math.PI / 180), sn = Math.sin(rot * Math.PI / 180), tot = 0, used = 0;
      for (var p = 0; p < pts.length; p++) {
        var px = pts[p][0], py = pts[p][1], mejor = 1e30;
        for (var d = 0; d <= dxMax; d++) {
          var s = 0, ok = true;
          for (var qy = -r; qy <= r && ok; qy += 2) for (var qx = -r; qx <= r; qx += 2) { var X = px - d + qx, Y = py + qy, xr = (X - w / 2) * cs - (Y - h / 2) * sn + w / 2, yr = (X - w / 2) * sn + (Y - h / 2) * cs + h / 2 + dyv; if (xr < 0 || xr >= w - 1 || yr < 0 || yr >= h - 1) { ok = false; break; } var x0 = xr | 0, y0 = yr | 0, fx = xr - x0, fy = yr - y0, vr = (Rr[y0 * w + x0] * (1 - fx) + Rr[y0 * w + x0 + 1] * fx) * (1 - fy) + (Rr[(y0 + 1) * w + x0] * (1 - fx) + Rr[(y0 + 1) * w + x0 + 1] * fx) * fy; s += Math.abs(L[(py + qy) * w + px + qx] - vr); }
          if (ok && s < mejor) mejor = s;
        }
        if (mejor < 1e29) { tot += mejor; used++; }
      }
      return used < pts.length / 2 ? 1e30 : tot / used;
    }
    var mejorC = 1e31, mdy = 0, mrot = 0, rots = maxRot > 0 ? [-maxRot, -maxRot / 2, 0, maxRot / 2, maxRot] : [0];
    rots.forEach(function (rot) { for (var dyv = -maxDy; dyv <= maxDy; dyv += 2) { var c = costo(dyv, rot); if (c < mejorC) { mejorC = c; mdy = dyv; mrot = rot; } } });
    for (var f = mdy - 1; f <= mdy + 1; f += 0.5) { var c2 = costo(f, mrot); if (c2 < mejorC) { mejorC = c2; mdy = f; } }
    return { dy: mdy, rot: mrot, puntos: pts.length, ok: mejorC < 1e29 };
  };
  /* aplica (dy, rot) a la imagen derecha para que quede alineada por filas con la izquierda */
  E.rectificarDerecha = function (img, dy, rot) {
    var w = img.w, h = img.h, o = new Uint8ClampedArray(img.data.length), cs = Math.cos(rot * Math.PI / 180), sn = Math.sin(rot * Math.PI / 180);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var xr = (x - w / 2) * cs - (y - h / 2) * sn + w / 2, yr = (x - w / 2) * sn + (y - h / 2) * cs + h / 2 + dy, oi = (y * w + x) * 4;
      if (xr < 0 || xr >= w - 1 || yr < 0 || yr >= h - 1) { o[oi + 3] = 255; continue; }
      var x0 = xr | 0, y0 = yr | 0, fx = xr - x0, fy = yr - y0;
      for (var k = 0; k < 3; k++) o[oi + k] = (img.data[(y0 * w + x0) * 4 + k] * (1 - fx) + img.data[(y0 * w + x0 + 1) * 4 + k] * fx) * (1 - fy) + (img.data[((y0 + 1) * w + x0) * 4 + k] * (1 - fx) + img.data[((y0 + 1) * w + x0 + 1) * 4 + k] * fx) * fy;
      o[oi + 3] = 255;
    }
    return { w: w, h: h, data: o };
  };
  E.focalDesdeFov = function (fov, w) { return (w / 2) / Math.tan(fov * Math.PI / 360); };
  E.profundidad = function (disp, F, B) { var o = new Float32Array(disp.length); for (var i = 0; i < o.length; i++) o[i] = disp[i] > 0.2 ? F * B / disp[i] : NaN; return o; };
  /* nube en coordenadas de la camara izquierda (Y arriba, mirando a -Z). paso: submuestreo; zMax descarta lejania */
  E.nube = function (disp, img, F, B, o) {
    o = o || {}; var w = img.w, h = img.h, cx = w / 2, cy = h / 2, paso = o.paso || 1, zMax = o.zMax || Infinity, pos = [], col = [];
    for (var y = 0; y < h; y += paso) for (var x = 0; x < w; x += paso) { var d = disp[y * w + x]; if (!(d > 0.2)) continue; var Z = F * B / d; if (Z > zMax) continue; pos.push((x - cx) * Z / F, -(y - cy) * Z / F, -Z); var i = (y * w + x) * 4; col.push(img.data[i] / 255, img.data[i + 1] / 255, img.data[i + 2] / 255); }
    return { pos: new Float32Array(pos), col: new Float32Array(col) };
  };
  /* mapa de color tipo turbo (imagen RGBA) para mostrar la disparidad */
  E.coloresDisp = function (disp, w, h, dmin, dmax) {
    var d = new Uint8ClampedArray(w * h * 4);
    for (var i = 0; i < w * h; i++) { var v = disp[i], o = i * 4; d[o + 3] = 255; if (isNaN(v)) { d[o] = d[o + 1] = d[o + 2] = 20; continue; } var t = Math.max(0, Math.min(1, (v - dmin) / ((dmax - dmin) || 1))); d[o] = 255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 3))); d[o + 1] = 255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 2))); d[o + 2] = 255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 1))); }
    return { w: w, h: h, data: d };
  };
  /* video con paralaje lateral: par de cuadros (i,j) y base = recorrido * |j-i| / (n-1) (movimiento uniforme y lateral supuesto) */
  E.baseVideo = function (n, recorrido, i, j) { return n > 1 ? recorrido * Math.abs(j - i) / (n - 1) : 0; };
  /* base recomendada para ver disparidad dispObj px a profundidad Z con focal F */
  E.baseSugerida = function (Z, F, dispObj) { return dispObj * Z / F; };
  if (typeof module === 'object' && module.exports) module.exports = E;
})(typeof self !== 'undefined' ? self : globalThis);
