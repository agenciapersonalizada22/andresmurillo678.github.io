/* Poses de camara a partir del plan/log de vuelo del modulo drones (puro). Mundo: X este, Y arriba, Z = -norte. Aproximado: GPS/plan no son poses reales. */
(function (root) {
  'use strict';
  var R = root.R3D = root.R3D || {}, S = R.Poses = {};
  /* pts [{x,y,alt}] (m, plan local este/norte). n puntos equiespaciados por longitud de arco */
  S.muestrearRuta = function (pts, n) {
    if (!pts.length) return []; if (pts.length === 1 || n === 1) return [pts[0]];
    var acc = [0], i; for (i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, (pts[i].alt || 0) - (pts[i - 1].alt || 0)));
    var tot = acc[acc.length - 1] || 1, out = [], j = 1;
    for (i = 0; i < n; i++) { var s = tot * i / (n - 1); while (j < pts.length - 1 && acc[j] < s) j++; var a = pts[j - 1], b = pts[j], f = (acc[j] - acc[j - 1]) ? (s - acc[j - 1]) / (acc[j] - acc[j - 1]) : 0; f = Math.max(0, Math.min(1, f)); out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, alt: (a.alt || 0) + ((b.alt || 0) - (a.alt || 0)) * f }); }
    return out;
  };
  S.centro = function (pts) { var c = [0, 0]; pts.forEach(function (p) { c[0] += p.x / pts.length; c[1] += p.y / pts.length; }); return c; };
  /* describe si la ruta parece una orbita alrededor de c: radio medio, dispersion y altura media */
  S.orbita = function (pts, c) {
    var r = pts.map(function (p) { return Math.hypot(p.x - c[0], p.y - c[1]); }), m = r.reduce(function (a, b) { return a + b; }, 0) / (r.length || 1), v = Math.sqrt(r.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (r.length || 1)), alt = pts.reduce(function (a, p) { return a + (p.alt || 0); }, 0) / (pts.length || 1);
    return { radio: m, dispersion: m ? v / m : 1, alt: alt, esOrbita: m > 0.5 && v / m < 0.25 };
  };
  /* camaras del hull a partir de posiciones del dron y un centro de interes (x,y en m del plan; ty = altura del objetivo en m) */
  S.camaras = function (pts, centro, ty, F, w, h) {
    var H = R.Hull; return pts.map(function (p) { var c = H.camara([p.x - centro[0], p.alt, -(p.y - centro[1])], [0, ty || 0, 0], F, w, h); c.ang = Math.atan2(p.x - centro[0], -(p.y - centro[1])) * 180 / Math.PI; return c; });
  };
  /* log {muestras:[{t,lat,lon,alt}]} -> posiciones en los tiempos de los cuadros (s de video + desfase) */
  S.desdeLog = function (muestras, tiempos, desfase) {
    var m = muestras.filter(function (s) { return isFinite(s.lat) && isFinite(s.lon); }); if (m.length < 2) throw new Error('El log necesita al menos 2 muestras con lat/lon.');
    var o = m[0], RT = 6371008.8, rad = Math.PI / 180, kx = RT * Math.cos(o.lat * rad) * rad, ky = RT * rad;
    var P = m.map(function (s) { return { t: s.t, x: (s.lon - o.lon) * kx, y: (s.lat - o.lat) * ky, alt: s.alt || 0 }; }), j = 1;
    return tiempos.map(function (t) { var tt = P[0].t + t + (desfase || 0); while (j < P.length - 1 && P[j].t < tt) j++; var a = P[j - 1], b = P[j], f = b.t === a.t ? 0 : Math.max(0, Math.min(1, (tt - a.t) / (b.t - a.t))); return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, alt: a.alt + (b.alt - a.alt) * f }; });
  };
  if (typeof module === 'object' && module.exports) module.exports = S;
})(typeof self !== 'undefined' ? self : globalThis);
