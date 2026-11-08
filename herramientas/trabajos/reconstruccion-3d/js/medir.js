/* Mediciones sobre mallas (puro): distancia, angulo, area de poligono 3D, secciones por plano, comparacion de versiones. */
(function (root) {
  'use strict';
  var R = root.R3D = root.R3D || {}, D = R.Medir = {};
  D.distancia = function (a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); };
  D.angulo = function (a, v, b) { var u = [a[0] - v[0], a[1] - v[1], a[2] - v[2]], w = [b[0] - v[0], b[1] - v[1], b[2] - v[2]], c = (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / ((Math.hypot(u[0], u[1], u[2]) * Math.hypot(w[0], w[1], w[2])) || 1); return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI; };
  D.perimetro = function (pts, cerrado) { var s = 0; for (var i = 1; i < pts.length; i++) s += D.distancia(pts[i - 1], pts[i]); if (cerrado && pts.length > 2) s += D.distancia(pts[pts.length - 1], pts[0]); return s; };
  D.areaPoligono = function (pts) { // area del poligono 3D (se asume casi plano): |suma de productos cruz| / 2
    var sx = 0, sy = 0, sz = 0, o = pts[0]; for (var i = 1; i < pts.length - 1; i++) { var a = [pts[i][0] - o[0], pts[i][1] - o[1], pts[i][2] - o[2]], b = [pts[i + 1][0] - o[0], pts[i + 1][1] - o[1], pts[i + 1][2] - o[2]]; sx += a[1] * b[2] - a[2] * b[1]; sy += a[2] * b[0] - a[0] * b[2]; sz += a[0] * b[1] - a[1] * b[0]; } return Math.hypot(sx, sy, sz) / 2;
  };
  /* planaridad: desviacion maxima de los puntos al plano medio (para avisar si el area es poco fiable) */
  D.desvioPlano = function (pts) {
    if (pts.length < 4) return 0; var c = [0, 0, 0], i; pts.forEach(function (p) { c[0] += p[0] / pts.length; c[1] += p[1] / pts.length; c[2] += p[2] / pts.length; });
    var nx = 0, ny = 0, nz = 0; for (i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; nx += (a[1] - c[1]) * (b[2] - c[2]) - (a[2] - c[2]) * (b[1] - c[1]); ny += (a[2] - c[2]) * (b[0] - c[0]) - (a[0] - c[0]) * (b[2] - c[2]); nz += (a[0] - c[0]) * (b[1] - c[1]) - (a[1] - c[1]) * (b[0] - c[0]); }
    var l = Math.hypot(nx, ny, nz) || 1, m = 0; pts.forEach(function (p) { var d = Math.abs(((p[0] - c[0]) * nx + (p[1] - c[1]) * ny + (p[2] - c[2]) * nz) / l); if (d > m) m = d; }); return m;
  };
  /* segmentos de interseccion de la malla con el plano n.x = d (n unitaria). Devuelve Float32Array [ax,ay,az,bx,by,bz,...] */
  D.contorno = function (m, n, d) {
    if (!m.idx) return new Float32Array(0); var p = m.pos, ix = m.idx, out = [], v = [0, 0, 0], s = [0, 0, 0];
    for (var t = 0; t < ix.length; t += 3) {
      for (var k = 0; k < 3; k++) { var o = ix[t + k] * 3; s[k] = p[o] * n[0] + p[o + 1] * n[1] + p[o + 2] * n[2] - d; }
      var pts = []; for (var e = 0; e < 3; e++) { var a = e, b = (e + 1) % 3; if ((s[a] > 0) !== (s[b] > 0)) { var f = s[a] / (s[a] - s[b]), oa = ix[t + a] * 3, ob = ix[t + b] * 3; pts.push(p[oa] + (p[ob] - p[oa]) * f, p[oa + 1] + (p[ob + 1] - p[oa + 1]) * f, p[oa + 2] + (p[ob + 2] - p[oa + 2]) * f); } }
      if (pts.length === 6) for (var q = 0; q < 6; q++) out.push(pts[q]);
    }
    void v; return new Float32Array(out);
  };
  D.longitudSegmentos = function (seg) { var s = 0; for (var i = 0; i < seg.length; i += 6) s += Math.hypot(seg[i + 3] - seg[i], seg[i + 4] - seg[i + 1], seg[i + 5] - seg[i + 2]); return s; };
  /* area encerrada por los contornos de una seccion (une segmentos en bucles; suma con signo de los bucles proyectados al plano principal). Aproximada. */
  D.areaSeccion = function (seg, n) {
    var K = 1e4, mapa = new Map(), i; function clave(x, y, z) { return Math.round(x * K) + '_' + Math.round(y * K) + '_' + Math.round(z * K); }
    var ns = seg.length / 6, usado = new Uint8Array(ns);
    for (i = 0; i < ns; i++) { var ka = clave(seg[i * 6], seg[i * 6 + 1], seg[i * 6 + 2]), kb = clave(seg[i * 6 + 3], seg[i * 6 + 4], seg[i * 6 + 5]); (mapa.get(ka) || mapa.set(ka, []).get(ka)).push(i); (mapa.get(kb) || mapa.set(kb, []).get(kb)).push(i); }
    var area = 0;
    for (i = 0; i < ns; i++) {
      if (usado[i]) continue; var bucle = [[seg[i * 6], seg[i * 6 + 1], seg[i * 6 + 2]]], cur = i, fin = clave(seg[i * 6 + 3], seg[i * 6 + 4], seg[i * 6 + 5]); usado[i] = 1; bucle.push([seg[i * 6 + 3], seg[i * 6 + 4], seg[i * 6 + 5]]);
      for (var guard = 0; guard < ns; guard++) { var lst = mapa.get(fin) || [], sig = -1; for (var q = 0; q < lst.length; q++) if (!usado[lst[q]]) { sig = lst[q]; break; } if (sig < 0) break; usado[sig] = 1; var a = clave(seg[sig * 6], seg[sig * 6 + 1], seg[sig * 6 + 2]); if (a === fin) { fin = clave(seg[sig * 6 + 3], seg[sig * 6 + 4], seg[sig * 6 + 5]); bucle.push([seg[sig * 6 + 3], seg[sig * 6 + 4], seg[sig * 6 + 5]]); } else { fin = a; bucle.push([seg[sig * 6], seg[sig * 6 + 1], seg[sig * 6 + 2]]); } cur = sig; }
      void cur; if (bucle.length > 3) { var sx = 0, sy = 0, sz = 0; for (var j = 1; j < bucle.length - 1; j++) { var u = [bucle[j][0] - bucle[0][0], bucle[j][1] - bucle[0][1], bucle[j][2] - bucle[0][2]], w = [bucle[j + 1][0] - bucle[0][0], bucle[j + 1][1] - bucle[0][1], bucle[j + 1][2] - bucle[0][2]]; sx += u[1] * w[2] - u[2] * w[1]; sy += u[2] * w[0] - u[0] * w[2]; sz += u[0] * w[1] - u[1] * w[0]; } area += (sx * n[0] + sy * n[1] + sz * n[2]) / 2; }
    }
    return Math.abs(area);
  };
  /* comparacion de dos versiones: diferencias de volumen/area/caja y desviacion media/maxima de A respecto a los vertices de B (hash espacial; aproximado) */
  D.comparar = function (A, B, muestras) {
    var Ma = R.Malla, ea = Ma.estadisticas(A), eb = Ma.estadisticas(B), r = { a: ea, b: eb, dVolumen: (eb.volumen || 0) - (ea.volumen || 0), dArea: (eb.area || 0) - (ea.area || 0), dCaja: [0, 1, 2].map(function (k) { return eb.caja.tam[k] - ea.caja.tam[k]; }) };
    var bb = Ma.caja(B), dim = Math.max(bb.tam[0], bb.tam[1], bb.tam[2]) || 1, nb = B.pos.length / 3, celda = dim / Math.max(4, Math.cbrt(nb) * 1.2), h = new Map(), i;
    function key(x, y, z) { return Math.floor(x / celda) + ',' + Math.floor(y / celda) + ',' + Math.floor(z / celda); }
    for (i = 0; i < nb; i++) { var k = key(B.pos[i * 3], B.pos[i * 3 + 1], B.pos[i * 3 + 2]); (h.get(k) || h.set(k, []).get(k)).push(i); }
    var na = A.pos.length / 3, paso = Math.max(1, Math.floor(na / (muestras || 3000))), sum = 0, mx = 0, cnt = 0;
    for (i = 0; i < na; i += paso) {
      var x = A.pos[i * 3], y = A.pos[i * 3 + 1], z = A.pos[i * 3 + 2], mejor = Infinity, rad = 1;
      for (; rad <= 8 && mejor === Infinity; rad++) { var cx = Math.floor(x / celda), cy = Math.floor(y / celda), cz = Math.floor(z / celda); for (var dx = -rad; dx <= rad; dx++) for (var dy = -rad; dy <= rad; dy++) for (var dz = -rad; dz <= rad; dz++) { var l = h.get((cx + dx) + ',' + (cy + dy) + ',' + (cz + dz)); if (l) for (var q = 0; q < l.length; q++) { var d = Math.hypot(B.pos[l[q] * 3] - x, B.pos[l[q] * 3 + 1] - y, B.pos[l[q] * 3 + 2] - z); if (d < mejor) mejor = d; } } }
      if (mejor < Infinity) { sum += mejor; if (mejor > mx) mx = mejor; cnt++; }
    }
    r.desvMedia = cnt ? sum / cnt : NaN; r.desvMax = mx; r.muestras = cnt; return r;
  };
  if (typeof module === 'object' && module.exports) module.exports = D;
})(typeof self !== 'undefined' ? self : globalThis);
