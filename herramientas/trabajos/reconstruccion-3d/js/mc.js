/* Isosuperficie sobre campo escalar 3D (puro). Variante "marching tetrahedra": cada celda se parte en 6 tetraedros (triangulacion de Freudenthal,
   conforme entre celdas), asi no hacen falta las 256 tablas y la malla sale estanca. Campo > 0 = dentro. Orientacion: normales hacia fuera. */
(function (root) {
  'use strict';
  var R = root.R3D = root.R3D || {}, MC = R.MC = {};
  var ESQ = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  var TET = [[0, 1, 2, 6], [0, 1, 5, 6], [0, 3, 2, 6], [0, 3, 7, 6], [0, 4, 5, 6], [0, 4, 7, 6]];
  /* campo: Float32Array nx*ny*nz (indice x + nx*(y + ny*z)); orig [x,y,z] del nodo 0; paso (numero o [sx,sy,sz]) */
  MC.malla = function (campo, nx, ny, nz, orig, paso, nivel) {
    nivel = nivel || 0; var s = typeof paso === 'number' ? [paso, paso, paso] : paso, pos = [], idx = [], mapa = new Map(), N = nx * ny * nz;
    var nodo = new Int32Array(8), val = new Float32Array(8);
    function vert(a, b) {
      var k = a < b ? a * N + b : b * N + a, j = mapa.get(k); if (j !== undefined) return j;
      var va = campo[a] - nivel, vb = campo[b] - nivel, t = va / (va - vb); if (!isFinite(t)) t = 0.5;
      var ax = a % nx, ay = (a / nx | 0) % ny, az = a / (nx * ny) | 0, bx = b % nx, by = (b / nx | 0) % ny, bz = b / (nx * ny) | 0;
      j = pos.length / 3; pos.push(orig[0] + (ax + (bx - ax) * t) * s[0], orig[1] + (ay + (by - ay) * t) * s[1], orig[2] + (az + (bz - az) * t) * s[2]); mapa.set(k, j); return j;
    }
    function tri(a, b, c, dx, dy, dz) { // orienta con la direccion dentro->fuera
      var ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2], vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
      var d = (uy * vz - uz * vy) * dx + (uz * vx - ux * vz) * dy + (ux * vy - uy * vx) * dz;
      if (d >= 0) idx.push(a, b, c); else idx.push(a, c, b);
    }
    for (var z = 0; z < nz - 1; z++) for (var y = 0; y < ny - 1; y++) for (var x = 0; x < nx - 1; x++) {
      var any = false, all = true;
      for (var c = 0; c < 8; c++) { var e = ESQ[c], id = (x + e[0]) + nx * ((y + e[1]) + ny * (z + e[2])); nodo[c] = id; val[c] = campo[id] - nivel; if (val[c] > 0) any = true; else all = false; }
      if (!any || all) continue;
      for (var t = 0; t < 6; t++) {
        var T = TET[t], ins = [], out = [];
        for (var q = 0; q < 4; q++) (val[T[q]] > 0 ? ins : out).push(T[q]);
        if (!ins.length || !out.length) continue;
        var ci = [0, 0, 0], co = [0, 0, 0]; ins.forEach(function (c2) { for (var k = 0; k < 3; k++) ci[k] += ESQ[c2][k] / ins.length; }); out.forEach(function (c2) { for (var k = 0; k < 3; k++) co[k] += ESQ[c2][k] / out.length; });
        var dx = (co[0] - ci[0]) * s[0], dy = (co[1] - ci[1]) * s[1], dz = (co[2] - ci[2]) * s[2];
        if (ins.length === 1) tri(vert(nodo[ins[0]], nodo[out[0]]), vert(nodo[ins[0]], nodo[out[1]]), vert(nodo[ins[0]], nodo[out[2]]), dx, dy, dz);
        else if (out.length === 1) tri(vert(nodo[out[0]], nodo[ins[0]]), vert(nodo[out[0]], nodo[ins[1]]), vert(nodo[out[0]], nodo[ins[2]]), dx, dy, dz);
        else {
          var a = vert(nodo[ins[0]], nodo[out[0]]), b = vert(nodo[ins[0]], nodo[out[1]]), c3 = vert(nodo[ins[1]], nodo[out[1]]), d = vert(nodo[ins[1]], nodo[out[0]]);
          tri(a, b, c3, dx, dy, dz); tri(a, c3, d, dx, dy, dz);
        }
      }
    }
    return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
  };
  if (typeof module === 'object' && module.exports) module.exports = MC;
})(typeof self !== 'undefined' ? self : globalThis);
