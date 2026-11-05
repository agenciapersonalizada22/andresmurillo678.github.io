/* Matrices afines [a,b,c,d,e,f] como en canvas. mul(m,n) = aplicar n y luego m. */
(function (r, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else r.Matriz = f(); })(this, function () {
  var M = {};
  M.ident = function () { return [1, 0, 0, 1, 0, 0]; };
  M.mul = function (m, n) {
    return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  };
  M.inv = function (m) {
    var d = m[0] * m[3] - m[1] * m[2];
    if (!d) return null;
    return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d];
  };
  M.punto = function (m, x, y) { return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] }; };
  M.traslacion = function (x, y) { return [1, 0, 0, 1, x, y]; };
  M.escala = function (sx, sy) { return [sx, 0, 0, sy, 0, 0]; };
  M.rotacion = function (grados) { var a = grados * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; };
  /* T(x,y) * R(rot) * S(sx,sy) */
  M.componer = function (x, y, rot, sx, sy) { return M.mul(M.traslacion(x, y), M.mul(M.rotacion(rot || 0), M.escala(sx == null ? 1 : sx, sy == null ? 1 : sy))); };
  M.descomponer = function (m) {
    var sx = Math.hypot(m[0], m[1]), det = m[0] * m[3] - m[1] * m[2];
    var sy = det / (sx || 1);
    return { x: m[4], y: m[5], rot: Math.atan2(m[1], m[0]) * 180 / Math.PI, sx: sx, sy: sy };
  };
  /* esquinas de un rect centrado (w x h) bajo m */
  M.esquinas = function (m, w, h) {
    var hw = w / 2, hh = h / 2;
    return [M.punto(m, -hw, -hh), M.punto(m, hw, -hh), M.punto(m, hw, hh), M.punto(m, -hw, hh)];
  };
  M.caja = function (pts) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(function (p) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };
  M.igual = function (a, b, e) { e = e || 1e-9; for (var i = 0; i < 6; i++) if (Math.abs(a[i] - b[i]) > e) return false; return true; };
  return M;
});
