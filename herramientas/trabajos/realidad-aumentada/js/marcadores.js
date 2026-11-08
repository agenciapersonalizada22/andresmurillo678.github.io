/* Marcadores cuadrados propios tipo ArUco 4x4 (diccionario generado aqui, no es el de OpenCV): generacion, dibujo y deteccion sin librerias.
   Cuadricula 6x6: borde negro de 1 celda + 4x4 bits de datos (1 = blanco). Deteccion: gris -> umbral adaptativo -> componentes oscuras ->
   casco convexo -> mejor cuadrilatero -> bordes ajustados por minimos cuadrados -> muestreo de la cuadricula -> id y rotacion. window.RA.Marcadores */
(function (root) {
  'use strict';
  var RA = root.RA = root.RA || {}, G = RA.Geo || (typeof require === 'function' ? require('./geo.js') : null), M = RA.Marcadores = {};
  var OFF = 0.25; M.N = 4; M.TOTAL = 6; M.MAX_ID = 50; M.DIST_MIN = 4;

  /* ---------- diccionario ---------- */
  function rot90(c) { var r = 0, i, j; for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) if ((c >> ((3 - j) * 4 + i)) & 1) r |= 1 << (i * 4 + j); return r; }
  function pop(x) { var n = 0; while (x) { n += x & 1; x >>= 1; } return n; }
  function mulberry(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function generar(n, dmin) {
    var rnd = mulberry(20240607), lista = [], rots = [], tries = 0;
    while (lista.length < n && tries++ < 400000) {
      var c = Math.floor(rnd() * 65536), p = pop(c); if (p < 5 || p > 11) continue;
      var r = [c, rot90(c)]; r.push(rot90(r[1])); r.push(rot90(r[2]));
      var ok = true, k, j;
      for (k = 1; k < 4 && ok; k++) if (pop(c ^ r[k]) < dmin) ok = false;
      for (j = 0; j < rots.length && ok; j++) for (k = 0; k < 4 && ok; k++) if (pop(c ^ rots[j][k]) < dmin) ok = false;
      if (ok) { lista.push(c); rots.push(r); }
    }
    return lista;
  }
  M.codigos = generar(M.MAX_ID, M.DIST_MIN);
  var TABLA = new Int32Array(65536).fill(-1), TABLA_ERR = new Uint8Array(65536);
  (function () {
    var i, k, c, b;
    M.codigos.forEach(function (cod, id) { c = cod; for (k = 0; k < 4; k++) { TABLA[c] = id * 4 + k; TABLA_ERR[c] = 0; c = rot90(c); } });
    M.codigos.forEach(function (cod, id) { c = cod; for (k = 0; k < 4; k++) { for (b = 0; b < 16; b++) { var v = c ^ (1 << b); if (TABLA[v] < 0) { TABLA[v] = id * 4 + k; TABLA_ERR[v] = 1; } } c = rot90(c); } });
  })();
  M.matriz = function (id) { // 6x6, 1 = blanco
    var c = M.codigos[id], m = [], i, j; for (i = 0; i < 6; i++) { m.push([]); for (j = 0; j < 6; j++) m[i].push(i > 0 && i < 5 && j > 0 && j < 5 ? (c >> ((i - 1) * 4 + (j - 1))) & 1 : 0); } return m;
  };
  M.svg = function (id, o) { // zona silenciosa de 1 celda; devuelve <g> en unidades de celda (0..8)
    o = o || {}; var m = M.matriz(id), s = ['<rect x="0" y="0" width="8" height="8" fill="#fff"/>'], i, j;
    for (i = 0; i < 6; i++) for (j = 0; j < 6; j++) if (!m[i][j]) s.push('<rect x="' + (j + 1) + '" y="' + (i + 1) + '" width="1.02" height="1.02" fill="#000"/>');
    return s.join('');
  };
  M.svgCompleto = function (id, px) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="' + px + '" height="' + px + '" shape-rendering="crispEdges">' + M.svg(id) + '</svg>'; };
  M.dibujarCanvas = function (ctx, id, x, y, lado) { // dibuja solo el cuadro de 6x6 (sin zona silenciosa)
    var m = M.matriz(id), c = lado / 6, i, j; ctx.fillStyle = '#000'; for (i = 0; i < 6; i++) for (j = 0; j < 6; j++) if (!m[i][j]) ctx.fillRect(x + j * c - 0.3, y + i * c - 0.3, c + 0.6, c + 0.6);
  };

  /* ---------- procesado de imagen ---------- */
  function reducir(g, w, h, f) {
    var nw = Math.floor(w / f), nh = Math.floor(h / f), o = new Uint8Array(nw * nh), x, y;
    for (y = 0; y < nh; y++) for (x = 0; x < nw; x++) {
      var sx = (x + 0.5) * f - 0.5, sy = (y + 0.5) * f - 0.5, x0 = Math.max(0, Math.floor(sx - f / 4)), x1 = Math.min(w - 1, Math.ceil(sx + f / 4)), y0 = Math.max(0, Math.floor(sy - f / 4)), y1 = Math.min(h - 1, Math.ceil(sy + f / 4)), s = 0, n = 0, i, j;
      for (j = y0; j <= y1; j++) for (i = x0; i <= x1; i++) { s += g[j * w + i]; n++; }
      o[y * nw + x] = s / n;
    }
    return { g: o, w: nw, h: nh };
  }
  function integral(g, w, h) { var I = new Int32Array((w + 1) * (h + 1)), x, y; for (y = 0; y < h; y++) { var fila = 0; for (x = 0; x < w; x++) { fila += g[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + fila; } } return I; }
  function binarizar(g, w, h, ven, c) {
    var I = integral(g, w, h), B = new Uint8Array(w * h), W1 = w + 1, r = ven >> 1, x, y;
    for (y = 0; y < h; y++) {
      var y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
      for (x = 0; x < w; x++) {
        var x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1), s = I[y1 * W1 + x1] - I[y0 * W1 + x1] - I[y1 * W1 + x0] + I[y0 * W1 + x0];
        B[y * w + x] = g[y * w + x] * ((x1 - x0) * (y1 - y0)) < s - c * ((x1 - x0) * (y1 - y0)) ? 1 : 0;
      }
    }
    return B;
  }
  function suavizar3(g, w, h) {
    var o = new Uint8Array(w * h), x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var s = 0, n = 0, j, i; for (j = Math.max(0, y - 1); j <= Math.min(h - 1, y + 1); j++) for (i = Math.max(0, x - 1); i <= Math.min(w - 1, x + 1); i++) { s += g[j * w + i]; n++; }
      o[y * w + x] = s / n;
    }
    return o;
  }

  /* ---------- geometria del contorno ---------- */
  function casco(pts) { // cadena monotona; pts [[x,y]]
    pts.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var u = [], l = [], i;
    function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    for (i = 0; i < pts.length; i++) { while (l.length >= 2 && cr(l[l.length - 2], l[l.length - 1], pts[i]) <= 0) l.pop(); l.push(pts[i]); }
    for (i = pts.length - 1; i >= 0; i--) { while (u.length >= 2 && cr(u[u.length - 2], u[u.length - 1], pts[i]) <= 0) u.pop(); u.push(pts[i]); }
    u.pop(); l.pop(); return l.concat(u);
  }
  function dpCadena(p, a, b, eps, sal) { // Douglas-Peucker en el tramo (a,b) abierto; empuja indices
    var mx = -1, im = -1, i, ax = p[a][0], ay = p[a][1], dx = p[b][0] - ax, dy = p[b][1] - ay, L = Math.hypot(dx, dy) || 1;
    for (i = a + 1; i < b; i++) { var d = Math.abs((p[i][0] - ax) * dy - (p[i][1] - ay) * dx) / L; if (d > mx) { mx = d; im = i; } }
    if (mx > eps) { dpCadena(p, a, im, eps, sal); sal.push(im); dpCadena(p, im, b, eps, sal); }
  }
  function simplificar(h, maxN) {
    var n = h.length, eps = 1, i, ia = 0, ib = 0, d, mx = -1;
    if (n <= maxN) return h;
    for (i = 1; i < n; i++) { d = Math.hypot(h[i][0] - h[0][0], h[i][1] - h[0][1]); if (d > mx) { mx = d; ib = i; } }
    for (var t = 0; t < 12; t++, eps *= 1.5) {
      var s1 = [], s2 = [], r;
      dpCadena(h, 0, ib, eps, s1);
      var h2 = h.slice(ib).concat([h[0]]); dpCadena(h2, 0, h2.length - 1, eps, s2);
      r = [0].concat(s1, [ib], s2.map(function (k) { return (k + ib) % n; }));
      if (r.length <= maxN) return r.map(function (k) { return h[k]; });
    }
    return h.slice(0, maxN);
  }
  function mejorCuad(h) { // cuadrilatero convexo de mayor area con vertices del casco (en orden)
    var n = h.length, best = 0, q = null, i, j, k, l;
    function tri(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
    for (i = 0; i < n; i++) for (j = i + 2; j < n; j++) {
      var kb = -1, ka = 0, lb = -1, la = 0;
      for (k = i + 1; k < j; k++) { var a = Math.abs(tri(h[i], h[k], h[j])); if (a > ka) { ka = a; kb = k; } }
      for (l = j + 1; l < n + i; l++) { var a2 = Math.abs(tri(h[i], h[l % n], h[j])); if (a2 > la) { la = a2; lb = l % n; } }
      if (kb >= 0 && lb >= 0 && ka + la > best) { best = ka + la; q = [h[i], h[kb], h[j], h[lb]]; }
    }
    return q ? { q: q, area: best / 2 } : null;
  }
  function ajustarRecta(pts) { // MCT total -> {px,py,dx,dy}
    var n = pts.length, mx = 0, my = 0, i; pts.forEach(function (p) { mx += p[0]; my += p[1]; }); mx /= n; my /= n;
    var sxx = 0, sxy = 0, syy = 0; pts.forEach(function (p) { var a = p[0] - mx, b = p[1] - my; sxx += a * a; sxy += a * b; syy += b * b; });
    var th = 0.5 * Math.atan2(2 * sxy, sxx - syy); return { px: mx, py: my, dx: Math.cos(th), dy: Math.sin(th) };
  }
  function cortar(a, b) { var det = a.dx * -b.dy - a.dy * -b.dx; if (Math.abs(det) < 1e-9) return null; var rx = b.px - a.px, ry = b.py - a.py, t = (rx * -b.dy - ry * -b.dx) / det; return [a.px + t * a.dx, a.py + t * a.dy]; }
  function refinar(q, borde, cen) { // q: 4 esquinas en orden; borde: puntos del contorno
    var rectas = [], i;
    for (i = 0; i < 4; i++) {
      var a = q[i], b = q[(i + 1) % 4], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, pts = [];
      borde.forEach(function (p) { var t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (L * L), d = Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / L; if (t > 0.08 && t < 0.92 && d < Math.max(2, L * 0.04)) pts.push(p); });
      if (pts.length < 4) return q;
      var r = ajustarRecta(pts), nx = -r.dy, ny = r.dx; if ((cen[0] - r.px) * nx + (cen[1] - r.py) * ny > 0) { nx = -nx; ny = -ny; } // normal hacia afuera
      r.px += nx * OFF; r.py += ny * OFF; rectas.push(r);
    }
    var o = [];
    for (i = 0; i < 4; i++) { var c = cortar(rectas[(i + 3) % 4], rectas[i]); if (!c) return q; o.push(c); }
    return o;
  }

  /* ---------- decodificacion ---------- */
  function muestra(g, w, h, x, y) { // bilineal
    if (x < 0) x = 0; if (y < 0) y = 0; if (x > w - 1.001) x = w - 1.001; if (y > h - 1.001) y = h - 1.001;
    var x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * w + x0;
    return g[i] * (1 - fx) * (1 - fy) + g[i + 1] * fx * (1 - fy) + g[i + w] * (1 - fx) * fy + g[i + w + 1] * fx * fy;
  }
  M.leerCuadricula = function (g, w, h, q, maxErr) {
    var H = G.cuadAHom(q); if (!H) return null;
    var v = [], i, j, k, offs = [[0, 0], [-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]];
    for (i = 0; i < 6; i++) for (j = 0; j < 6; j++) {
      var s = 0; for (k = 0; k < 5; k++) { var p = G.aplicar(H, (j + 0.5 + offs[k][0]) / 6, (i + 0.5 + offs[k][1]) / 6); s += muestra(g, w, h, p[0], p[1]); }
      v.push(s / 5);
    }
    var ord = v.slice().sort(function (a, b) { return a - b; }), lo = 0, hi = 0; for (k = 0; k < 12; k++) { lo += ord[k]; hi += ord[35 - k]; } lo /= 12; hi /= 12;
    if (hi - lo < 25) return null;
    var th = (lo + hi) / 2, mal = 0;
    for (i = 0; i < 6; i++) for (j = 0; j < 6; j++) if ((i === 0 || i === 5 || j === 0 || j === 5) && v[i * 6 + j] > th) mal++;
    if (mal > 1) return null;
    var pat = 0; for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) if (v[(i + 1) * 6 + j + 1] > th) pat |= 1 << (i * 4 + j);
    var t = TABLA[pat]; if (t < 0) return null; var err = TABLA_ERR[pat]; if (err > (maxErr == null ? 1 : maxErr)) return null;
    return { id: t >> 2, rot: t & 3, err: err + mal };
  };

  /* ---------- deteccion ---------- */
  /* gris: Uint8Array w*h. opciones {maxLado=480, minLado=10, maxErr=1} -> [{id, esquinas:[TL,TR,BR,BL] (px de la imagen original, centro de pixel = indice), lado, rot, err}] */
  M.detectar = function (gris, w, h, o) {
    o = o || {}; var maxLado = o.maxLado || 480, minLado = o.minLado || 10, f = Math.max(1, Math.max(w, h) / maxLado), g = gris, gw = w, gh = h, res = [];
    if (f > 1.05) { var r = reducir(gris, w, h, f); g = r.g; gw = r.w; gh = r.h; } else f = 1;
    var gs = suavizar3(g, gw, gh), ven = Math.max(15, Math.round(Math.max(gw, gh) / 8)) | 1, B = binarizar(gs, gw, gh, ven, o.contraste || 10);
    var vis = new Uint8Array(gw * gh), pila = new Int32Array(gw * gh), x, y;
    for (y = 1; y < gh - 1; y++) for (x = 1; x < gw - 1; x++) {
      var i0 = y * gw + x; if (!B[i0] || vis[i0]) continue;
      var n = 0, sp = 0, mnx = x, mxx = x, mny = y, mxy = y, borde = false; pila[sp++] = i0; vis[i0] = 1;
      while (sp) {
        var i = pila[--sp], px = i % gw, py = (i - px) / gw; pila[gw * gh - 1 - n] = i; n++;
        if (px < mnx) mnx = px; if (px > mxx) mxx = px; if (py < mny) mny = py; if (py > mxy) mxy = py;
        if (px === 0 || py === 0 || px === gw - 1 || py === gh - 1) borde = true;
        var nb = [i - 1, i + 1, i - gw, i + gw], k;
        for (k = 0; k < 4; k++) { var j = nb[k]; if (j >= 0 && j < gw * gh && B[j] && !vis[j]) { if ((k < 2 && Math.abs((j % gw) - px) > 1)) continue; vis[j] = 1; pila[sp++] = j; } }
      }
      var bw = mxx - mnx + 1, bh = mxy - mny + 1;
      if (borde || bw < minLado || bh < minLado || n < 24 || bw > gw * 0.97 || bh > gh * 0.97) continue;
      var rmin = {}, rmax = {}, cmin = {}, cmax = {}, ps = [], q, t;
      for (t = 0; t < n; t++) { var ii = pila[gw * gh - 1 - t], qx = ii % gw, qy = (ii - qx) / gw; if (rmin[qy] === undefined || qx < rmin[qy]) rmin[qy] = qx; if (rmax[qy] === undefined || qx > rmax[qy]) rmax[qy] = qx; if (cmin[qx] === undefined || qy < cmin[qx]) cmin[qx] = qy; if (cmax[qx] === undefined || qy > cmax[qx]) cmax[qx] = qy; }
      var seen = {}, borde2 = [];
      function add(px2, py2) { var kk = py2 * gw + px2; if (!seen[kk]) { seen[kk] = 1; borde2.push([px2, py2]); } }
      for (q in rmin) { add(rmin[q], +q); add(rmax[q], +q); } for (q in cmin) { add(+q, cmin[q]); add(+q, cmax[q]); }
      var hull = casco(borde2.slice()); if (hull.length < 4) continue;
      var ar = 0; for (t = 0; t < hull.length; t++) { var a = hull[t], b = hull[(t + 1) % hull.length]; ar += a[0] * b[1] - a[1] * b[0]; } ar = Math.abs(ar) / 2;
      if (ar < minLado * minLado * 0.6 || n < 0.1 * ar) continue;
      var bq = mejorCuad(simplificar(hull, 40)); if (!bq || bq.area < 0.82 * ar) continue;
      var cen = [(bq.q[0][0] + bq.q[1][0] + bq.q[2][0] + bq.q[3][0]) / 4, (bq.q[0][1] + bq.q[1][1] + bq.q[2][1] + bq.q[3][1]) / 4];
      var qq = bq.q.slice(); // orden horario en imagen (y abajo)
      var cz = (qq[1][0] - qq[0][0]) * (qq[2][1] - qq[0][1]) - (qq[1][1] - qq[0][1]) * (qq[2][0] - qq[0][0]); if (cz < 0) qq.reverse();
      var lmin = Infinity, lmax = 0; for (t = 0; t < 4; t++) { var L = Math.hypot(qq[t][0] - qq[(t + 1) % 4][0], qq[t][1] - qq[(t + 1) % 4][1]); lmin = Math.min(lmin, L); lmax = Math.max(lmax, L); }
      if (lmin < minLado * 0.8 || lmax > lmin * 6) continue;
      var fin = refinar(qq, borde2, cen).map(function (p) { return [(p[0] + 0.5) * f - 0.5, (p[1] + 0.5) * f - 0.5]; });
      var dec = M.leerCuadricula(gris, w, h, fin, o.maxErr); if (!dec) continue;
      var ord = []; for (t = 0; t < 4; t++) ord.push(fin[(dec.rot + t) % 4]);
      res.push({ id: dec.id, esquinas: ord, rot: dec.rot, err: dec.err, lado: Math.sqrt(Math.abs(ar)) * f });
    }
    var unicos = {}; res.forEach(function (d) { if (!unicos[d.id] || d.lado > unicos[d.id].lado) unicos[d.id] = d; });
    return Object.keys(unicos).map(function (k) { return unicos[k]; });
  };
  /* RGBA (ImageData.data) -> gris */
  M.aGris = function (rgba, w, h) { var g = new Uint8Array(w * h), i; for (i = 0; i < w * h; i++) g[i] = (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) >> 8; return g; };
  if (typeof module === 'object' && module.exports) module.exports = M;
})(typeof self !== 'undefined' ? self : this);
