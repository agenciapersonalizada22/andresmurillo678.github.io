/* Modelador de plano asistido (puro): paredes con medidas, aberturas, mobiliario; estadisticas y extrusion a 3D. Plano (x,y) -> mundo (x, altura, z=y). Unidades: metros. */
(function (root) {
  'use strict';
  var R = root.R3D = root.R3D || {}, P = R.Plano = {}, M = R.Malla, n0 = 0;
  P.id = function (p) { return (p || 'e') + (Date.now().toString(36).slice(-4)) + (n0++).toString(36); };
  P.nuevo = function () { return { u: 'm', alto: 2.5, grosor: 0.12, paredes: [], aberturas: [], muebles: [], techo: true, suelo: true }; };
  P.MUEBLES = [{ nombre: 'Cama doble', w: 1.4, d: 1.9, h: 0.5 }, { nombre: 'Cama sencilla', w: 0.9, d: 1.9, h: 0.5 }, { nombre: 'Mesa', w: 1.4, d: 0.8, h: 0.75 }, { nombre: 'Sofá', w: 2.0, d: 0.9, h: 0.85 }, { nombre: 'Escritorio', w: 1.2, d: 0.6, h: 0.75 }, { nombre: 'Armario', w: 1.2, d: 0.6, h: 2.0 }, { nombre: 'Silla', w: 0.45, d: 0.45, h: 0.9 }, { nombre: 'Nevera', w: 0.7, d: 0.7, h: 1.8 }, { nombre: 'Estante', w: 0.8, d: 0.3, h: 1.8 }, { nombre: 'Caja libre', w: 1, d: 1, h: 1 }];
  P.ABERTURAS = { puerta: { ancho: 0.9, alto: 2.05, antepecho: 0 }, ventana: { ancho: 1.2, alto: 1.1, antepecho: 0.9 } };
  P.longitud = function (w) { return Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); };
  P.rectangulo = function (m, w, d, x0, y0) { x0 = x0 || 0; y0 = y0 || 0; var q = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + d], [x0, y0 + d]]; for (var i = 0; i < 4; i++) m.paredes.push({ id: P.id('p'), a: q[i].slice(), b: q[(i + 1) % 4].slice() }); return m; };
  /* pared desde un punto con longitud y angulo (grados, 0 = +x, sentido horario en pantalla porque y crece hacia abajo) */
  P.puntoPolar = function (a, largo, angGrados) { var r = angGrados * Math.PI / 180; return [a[0] + largo * Math.cos(r), a[1] + largo * Math.sin(r)]; };
  P.snapAngulo = function (a, p, paso) { var dx = p[0] - a[0], dy = p[1] - a[1], L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), s = (paso || 15) * Math.PI / 180, q = Math.round(ang / s) * s; return [a[0] + L * Math.cos(q), a[1] + L * Math.sin(q)]; };
  P.redondear = function (v, paso) { return Math.round(v / paso) * paso; };
  P.puntoCercano = function (m, p, tol) { var mejor = null, md = tol; m.paredes.forEach(function (w) { [w.a, w.b].forEach(function (q) { var d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < md) { md = d; mejor = q; } }); }); return mejor; };
  P.sobrePared = function (m, p, tol) { // {pared, pos (m desde a), dist}
    var mejor = null, md = tol; m.paredes.forEach(function (w) { var L = P.longitud(w); if (!L) return; var ux = (w.b[0] - w.a[0]) / L, uy = (w.b[1] - w.a[1]) / L, s = (p[0] - w.a[0]) * ux + (p[1] - w.a[1]) * uy, d = Math.abs(-(p[0] - w.a[0]) * uy + (p[1] - w.a[1]) * ux); if (s >= 0 && s <= L && d < md) { md = d; mejor = { pared: w, pos: s, dist: d }; } }); return mejor;
  };
  function areaFirmada(pts) { var s = 0; for (var i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
  P.area = function (pts) { return Math.abs(areaFirmada(pts)); };
  /* bucles cerrados formados por las paredes (extremos unidos con tolerancia) */
  P.bucles = function (m, tol) {
    tol = tol || 0.06; var nodos = [], adj = [];
    function nodo(p) { for (var i = 0; i < nodos.length; i++) if (Math.hypot(nodos[i][0] - p[0], nodos[i][1] - p[1]) <= tol) return i; nodos.push(p.slice()); adj.push([]); return nodos.length - 1; }
    var aristas = m.paredes.map(function (w, i) { var a = nodo(w.a), b = nodo(w.b); if (a !== b) { adj[a].push([b, i]); adj[b].push([a, i]); } return [a, b]; });
    var usada = {}, res = [];
    aristas.forEach(function (e, i) {
      if (usada[i] || e[0] === e[1]) return; var ruta = [e[0]], cur = e[1], arista = i, ok = false, vistos = {}; usada[i] = 1; vistos[e[0]] = 1;
      for (var g = 0; g < m.paredes.length + 2; g++) {
        ruta.push(cur); if (cur === ruta[0]) { ok = true; break; } if (vistos[cur]) break; vistos[cur] = 1;
        var sig = null; adj[cur].forEach(function (q) { if (!sig && q[1] !== arista && !usada[q[1]]) sig = q; }); if (!sig) break; usada[sig[1]] = 1; arista = sig[1]; cur = sig[0];
      }
      if (ok && ruta.length > 3) { ruta.pop(); res.push(ruta.map(function (k) { return nodos[k]; })); }
    });
    return res;
  };
  P.habitacion = function (m) { var b = P.bucles(m), mejor = null, ma = 0; b.forEach(function (l) { var a = P.area(l); if (a > ma) { ma = a; mejor = l; } }); return mejor; };
  P.estadisticas = function (m) {
    var hab = P.habitacion(m), area = hab ? P.area(hab) : 0, per = hab ? hab.reduce(function (s, p, i) { var q = hab[(i + 1) % hab.length]; return s + Math.hypot(q[0] - p[0], q[1] - p[1]); }, 0) : 0, H = m.alto, bruta = 0, aber = 0;
    m.paredes.forEach(function (w) { bruta += P.longitud(w) * (w.alto || H); }); m.aberturas.forEach(function (a) { aber += a.ancho * a.alto; });
    var foot = m.muebles.reduce(function (s, q) { return s + q.w * q.d; }, 0), nPuertas = m.aberturas.filter(function (a) { return a.tipo === 'puerta'; }).length;
    return { cerrada: !!hab, area: area, perimetro: per, volumen: area * H, paredes: m.paredes.length, longitudParedes: m.paredes.reduce(function (s, w) { return s + P.longitud(w); }, 0), areaParedes: bruta - aber, areaAberturas: aber, puertas: nPuertas, ventanas: m.aberturas.length - nPuertas, muebles: m.muebles.length, huellaMuebles: foot, areaLibre: Math.max(0, area - foot) };
  };
  /* ---------- geometria ---------- */
  function Acum() { this.pos = []; this.col = []; this.idx = []; }
  Acum.prototype.tri = function (a, b, c, col, haciaFuera) { // haciaFuera: vector normal esperado (o null)
    var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (haciaFuera && n[0] * haciaFuera[0] + n[1] * haciaFuera[1] + n[2] * haciaFuera[2] < 0) { var t = b; b = c; c = t; }
    var k = this.pos.length / 3; [a, b, c].forEach(function (p) { this.pos.push(p[0], p[1], p[2]); this.col.push(col[0], col[1], col[2]); }, this); this.idx.push(k, k + 1, k + 2);
  };
  Acum.prototype.caja = function (C, u, n, hu, hn, hy, col) { // u,n horizontales; arriba = y
    var self = this, ejes = [[u, hu], [n, hn], [[0, 1, 0], hy]];
    function pt(su, sn, sy) { return [C[0] + su * hu * u[0] + sn * hn * n[0], C[1] + sy * hy, C[2] + su * hu * u[2] + sn * hn * n[2]]; }
    [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]].forEach(function (f) {
      var k = f[0], s = f[1], o1 = (k + 1) % 3, o2 = (k + 2) % 3, v = [0, 0, 0], q = [];
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c2) { var d = [0, 0, 0]; d[k] = s; d[o1] = c2[0]; d[o2] = c2[1]; q.push(pt(d[0], d[1], d[2])); }); void v;
      var dir = [ejes[k][0][0] * s, ejes[k][0][1] * s, ejes[k][0][2] * s]; self.tri(q[0], q[1], q[2], col, dir); self.tri(q[0], q[2], q[3], col, dir);
    });
  };
  function orejas(pts) { // triangulacion por recorte de orejas (poligono simple, x-z); devuelve indices
    var n = pts.length, ind = [], i; for (i = 0; i < n; i++) ind.push(i); if (areaFirmada(pts) < 0) ind.reverse(); var tris = [], guard = 0;
    function dentro(p, a, b, c) { var d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]), d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]), d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); }
    while (ind.length > 3 && guard++ < 10000) {
      var cortado = false;
      for (i = 0; i < ind.length; i++) {
        var a = pts[ind[(i + ind.length - 1) % ind.length]], b = pts[ind[i]], c = pts[ind[(i + 1) % ind.length]];
        if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) <= 1e-12) continue; var ok = true;
        for (var j = 0; j < ind.length; j++) { var q = ind[j]; if (q === ind[(i + ind.length - 1) % ind.length] || q === ind[i] || q === ind[(i + 1) % ind.length]) continue; if (dentro(pts[q], a, b, c)) { ok = false; break; } }
        if (ok) { tris.push([ind[(i + ind.length - 1) % ind.length], ind[i], ind[(i + 1) % ind.length]]); ind.splice(i, 1); cortado = true; break; }
      }
      if (!cortado) break;
    }
    if (ind.length === 3) tris.push([ind[0], ind[1], ind[2]]); return tris;
  }
  var C_PARED = [0.88, 0.86, 0.82], C_VENT = [0.55, 0.78, 0.95], C_SUELO = [0.62, 0.5, 0.38], C_TECHO = [0.95, 0.95, 0.95];
  function colorMueble(nombre) { var h = 0; for (var i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) | 0; var t = (h >>> 0) % 360 / 360; return [0.45 + 0.35 * Math.abs(Math.sin(t * 6.28)), 0.4 + 0.3 * Math.abs(Math.sin(t * 6.28 + 2)), 0.4 + 0.3 * Math.abs(Math.sin(t * 6.28 + 4))]; }
  P.extruir = function (m) {
    var A = new Acum(), H = m.alto;
    m.paredes.forEach(function (w) {
      var L = P.longitud(w); if (L < 1e-6) return; var t = w.grosor || m.grosor, h = w.alto || H, ux = (w.b[0] - w.a[0]) / L, uy = (w.b[1] - w.a[1]) / L, u = [ux, 0, uy], n = [-uy, 0, ux];
      var abs = m.aberturas.filter(function (o) { return o.pared === w.id; }).map(function (o) { var a = Math.max(0, o.pos - o.ancho / 2), b = Math.min(L, o.pos + o.ancho / 2); return { a: a, b: b, y0: o.antepecho || 0, y1: Math.min(h, (o.antepecho || 0) + o.alto), tipo: o.tipo }; }).filter(function (o) { return o.b > o.a; }).sort(function (p, q) { return p.a - q.a; });
      function pieza(s0, s1, y0, y1, col) { if (s1 - s0 < 1e-4 || y1 - y0 < 1e-4) return; var s = (s0 + s1) / 2; A.caja([w.a[0] + ux * s, (y0 + y1) / 2, w.a[1] + uy * s], u, n, (s1 - s0) / 2, t / 2, (y1 - y0) / 2, col); }
      var cur = -t / 2; abs.forEach(function (o) { pieza(cur, o.a, 0, h, C_PARED); if (o.y0 > 0) pieza(o.a, o.b, 0, o.y0, C_PARED); if (o.y1 < h) pieza(o.a, o.b, o.y1, h, C_PARED); if (o.tipo === 'ventana') { var s = (o.a + o.b) / 2; A.caja([w.a[0] + ux * s, (o.y0 + o.y1) / 2, w.a[1] + uy * s], u, n, (o.b - o.a) / 2, 0.01, (o.y1 - o.y0) / 2, C_VENT); } cur = Math.max(cur, o.b); });
      pieza(cur, L + t / 2, 0, h, C_PARED);
    });
    var hab = P.habitacion(m);
    if (hab && (m.suelo || m.techo)) { var pts = hab.map(function (p) { return [p[0], p[1]]; }), tr = orejas(pts); tr.forEach(function (t) { var q = t.map(function (i) { return pts[i]; }); if (m.suelo) A.tri([q[0][0], -0.02, q[0][1]], [q[1][0], -0.02, q[1][1]], [q[2][0], -0.02, q[2][1]], C_SUELO, [0, 1, 0]); if (m.techo) A.tri([q[0][0], H, q[0][1]], [q[1][0], H, q[1][1]], [q[2][0], H, q[2][1]], C_TECHO, [0, -1, 0]); }); }
    m.muebles.forEach(function (q) { var r = (q.rot || 0) * Math.PI / 180, u = [Math.cos(r), 0, Math.sin(r)], n = [-Math.sin(r), 0, Math.cos(r)]; A.caja([q.x, q.h / 2, q.y], u, n, q.w / 2, q.d / 2, q.h / 2, q.color || colorMueble(q.nombre)); });
    return M.nueva(new Float32Array(A.pos), new Uint32Array(A.idx), new Float32Array(A.col), 'Plano 3D');
  };
  if (typeof module === 'object' && module.exports) module.exports = P;
})(typeof self !== 'undefined' ? self : globalThis);
