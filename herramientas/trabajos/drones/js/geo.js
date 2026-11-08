/* Geodesia local (equirectangular, valida a escala de una mision). Ejes: x este, y norte, en metros. window.DronGeo */
(function (g, f) { const m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.DronGeo = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const G = {}, R = 6371008.8, RAD = Math.PI / 180, DEG = 180 / Math.PI;
  G.aGeo = (o, x, y) => ({ lat: o.lat + y / R * DEG, lon: o.lon + x / (R * Math.cos(o.lat * RAD)) * DEG });
  G.aLocal = (o, lat, lon) => ({ x: (lon - o.lon) * RAD * R * Math.cos(o.lat * RAD), y: (lat - o.lat) * RAD * R });
  G.haversine = (a1, o1, a2, o2) => { const dl = (a2 - a1) * RAD, dn = (o2 - o1) * RAD, s = Math.sin(dl / 2) ** 2 + Math.cos(a1 * RAD) * Math.cos(a2 * RAD) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(s))); };
  G.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  G.rumbo = (x1, y1, x2, y2) => ((Math.atan2(x2 - x1, y2 - y1) * DEG) % 360 + 360) % 360;
  G.norm360 = a => ((a % 360) + 360) % 360;
  G.difAng = (a, b) => { let d = G.norm360(b - a); return d > 180 ? d - 360 : d; };
  G.valido = o => !!o && isFinite(o.lat) && isFinite(o.lon) && Math.abs(o.lat) <= 90 && Math.abs(o.lon) <= 180;
  return G;
});
