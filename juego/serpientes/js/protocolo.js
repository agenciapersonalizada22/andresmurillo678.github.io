/* Protocolo de red compacto: snapshots con interes por vision, orbes empaquetados, minimapa y estado. Sin DOM. */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, P = S.Proto = {}, TAU = S.TAU;
  P.VISION = 1700; P.MAX_ORBES_MSG = 420; P.MAX_BYTES = 14000;

  function ctlInfo(masaInt) {
    var ns = S.nSegs(masaInt), stride = Math.max(2, Math.ceil(ns / 56));
    return { ns: ns, ncp: Math.ceil((ns - 1) / stride) + 1 };
  }
  P.ctlInfo = ctlInfo;
  function idx(c, ncp, ns) { return ncp <= 1 ? 0 : Math.round(c * (ns - 1) / (ncp - 1)); }

  /* Entrada de serpiente: [id, flags, x, y, ang8, masa, ncp, paquete...] */
  P.codificarSerpiente = function (s, out) {
    var m = Math.round(s.masa), inf = ctlInfo(m), px = Math.round(s.x), py = Math.round(s.y), ns = inf.ns;
    out.push(s.id, (s.turbo ? 1 : 0) | (s.inmune > 0 ? 2 : 0), px, py, Math.round(((s.ang + TAU) % TAU) / TAU * 256) & 255, m, inf.ncp);
    var cx = px, cy = py;
    for (var c = 1; c < inf.ncp; c++) {
      var k = Math.min(idx(c, inf.ncp, ns), s.ns - 1), dx = Math.round((s.segs[k * 2] - cx) / 2), dy = Math.round((s.segs[k * 2 + 1] - cy) / 2);
      dx = S.clamp(dx, -255, 255); dy = S.clamp(dy, -255, 255);
      out.push((dx + 256) * 512 + dy + 256); cx += dx * 2; cy += dy * 2;
    }
  };
  /* Catmull-Rom entre puntos de control -> segs (Float32Array ns*2) */
  function suavizar(cp, ncp, ns, segs) {
    var j = 0;
    for (var c = 0; c < ncp - 1; c++) {
      var a = idx(c, ncp, ns), b = idx(c + 1, ncp, ns), p0 = Math.max(0, c - 1), p3 = Math.min(ncp - 1, c + 2);
      for (var k = a; k < b || (c === ncp - 2 && k === b); k++) {
        var u = b === a ? 0 : (k - a) / (b - a), u2 = u * u, u3 = u2 * u;
        for (var d = 0; d < 2; d++) {
          var q0 = cp[p0 * 2 + d], q1 = cp[c * 2 + d], q2 = cp[(c + 1) * 2 + d], q3 = cp[p3 * 2 + d];
          segs[k * 2 + d] = 0.5 * (2 * q1 + (-q0 + q2) * u + (2 * q0 - 5 * q1 + 4 * q2 - q3) * u2 + (-q0 + 3 * q1 - 3 * q2 + q3) * u3);
        }
      }
    }
    if (ncp === 1) { segs[0] = cp[0]; segs[1] = cp[1]; }
  }
  P.decodificarSerpientes = function (arr) {
    var res = [], i = 0;
    while (i < arr.length) {
      var id = arr[i], fl = arr[i + 1], x = arr[i + 2], y = arr[i + 3], ang = arr[i + 4] / 256 * TAU, masa = arr[i + 5], ncp = arr[i + 6], inf = ctlInfo(masa);
      var cp = new Float32Array(ncp * 2); cp[0] = x; cp[1] = y;
      var cx = x, cy = y;
      for (var c = 1; c < ncp; c++) { var v = arr[i + 6 + c], dx = Math.floor(v / 512) - 256, dy = v % 512 - 256; cx += dx * 2; cy += dy * 2; cp[c * 2] = cx; cp[c * 2 + 1] = cy; }
      var ns = inf.ns, segs = new Float32Array(ns * 2);
      suavizar(cp, Math.max(ncp, 1), ns, segs);
      res.push({ id: id, turbo: !!(fl & 1), inmune: !!(fl & 2), x: x, y: y, ang: ang > Math.PI ? ang - TAU : ang, masa: masa, ns: ns, segs: segs });
      i += 6 + ncp;
    }
    return res;
  };
  /* Snapshot para el cliente `cs` (su serpiente o null): solo serpientes dentro de su vision */
  P.snapshot = function (W, cs, t, cx, cy) {
    var out = [], v = W.vivas, lim = P.VISION * P.VISION, n = 0;
    if (cs && cs.vivo) { cx = cs.x; cy = cs.y; }
    var cand = [];
    for (var i = 0; i < v.length; i++) {
      var s = v[i], dmin = 1e12;
      for (var k = 0; k < s.ns; k += 6) { var dx = s.segs[k * 2] - cx, dy = s.segs[k * 2 + 1] - cy, d = dx * dx + dy * dy; if (d < dmin) dmin = d; }
      var kk = s.ns - 1, dx2 = s.segs[kk * 2] - cx, dy2 = s.segs[kk * 2 + 1] - cy; if (dx2 * dx2 + dy2 * dy2 < dmin) dmin = dx2 * dx2 + dy2 * dy2;
      if (dmin <= lim || s === cs) cand.push([dmin, s]);
    }
    cand.sort(function (a, b) { return a[0] - b[0]; });
    for (var j = 0; j < cand.length; j++) {
      var len0 = out.length; P.codificarSerpiente(cand[j][1], out);
      if (out.length * 8 > P.MAX_BYTES && j > 0) { out.length = len0; break; }
      n++;
    }
    return { t: Math.round(t), s: out };
  };
  /* Orbes en vision, empaquetados: ((dx2+1024)*2048+(dy2+1024))*4+tipo */
  P.codificarOrbes = function (W, cx, cy) {
    cx = Math.round(cx); cy = Math.round(cy);
    var o = W.orbes, l = [], rad = 1400;
    for (var intento = 0; intento < 3; intento++) {
      l.length = 0;
      var r2 = rad * rad;
      o.rej.cerca(cx, cy, rad, function (i) {
        var dx = o.x[i] - cx, dy = o.y[i] - cy;
        if (dx * dx + dy * dy <= r2) {
          var a = S.clamp(Math.round(dx / 2) + 1024, 0, 2047), b = S.clamp(Math.round(dy / 2) + 1024, 0, 2047);
          l.push((a * 2048 + b) * 4 + S.tipoOrbe(o.v[i]));
        }
        return false;
      });
      if (l.length <= P.MAX_ORBES_MSG) break;
      rad *= 0.72;
    }
    return { c: [cx, cy], l: l };
  };
  P.decodificarOrbes = function (m, dest) {
    var l = m.l, n = l.length, cx = m.c[0], cy = m.c[1];
    if (!dest || dest.x.length < n) dest = { x: new Float32Array(Math.max(n, 512)), y: new Float32Array(Math.max(n, 512)), t: new Uint8Array(Math.max(n, 512)), n: 0 };
    for (var i = 0; i < n; i++) {
      var v = l[i], t = v & 3, q = Math.floor(v / 4), a = Math.floor(q / 2048), b = q % 2048;
      dest.x[i] = cx + (a - 1024) * 2; dest.y[i] = cy + (b - 1024) * 2; dest.t[i] = t;
    }
    dest.n = n; dest.cx = cx; dest.cy = cy; return dest;
  };
  /* Estado global: top10, minimapa (cabezas), modo */
  P.codificarEstado = function (W, cs) {
    var top = W.tabla(10).map(function (s) { return [s.id, Math.round(W.modo.id === 'rey' ? s.pt * 10 : s.masa)]; });
    var mm = [], v = W.vivas;
    for (var i = 0; i < v.length; i++) mm.push(v[i].id, (Math.round((v[i].x + 3000) / 12)) * 512 + Math.round((v[i].y + 3000) / 12));
    var rank = 0, tabla = W.tabla();
    if (cs) rank = tabla.indexOf(cs) + 1;
    return { top: top, n: v.length, rk: rank, mm: mm, tl: Math.round(W.t), z: W.zona ? [Math.round(W.zona.x), Math.round(W.zona.y), W.zona.r, Math.round(W.t - W.zona.desde)] : 0, rc: Math.round(W.Rc), eq: [Math.round(W.eqMasa[0]), Math.round(W.eqMasa[1])] };
  };
  P.decodificarMinimapa = function (mm) {
    var r = [];
    for (var i = 0; i < mm.length; i += 2) { var q = mm[i + 1]; r.push({ id: mm[i], x: Math.floor(q / 512) * 12 - 3000, y: (q % 512) * 12 - 3000 }); }
    return r;
  };
  P.roster = function (W, codSkin) {
    return W.vivas.map(function (s) { return [s.id, s.nombre, codSkin(s.skin), s.equipo, s.bot ? 1 : 0]; });
  };
  P.entrada = function (ang, turbo) { return { a: Math.round(ang * 100) / 100, b: turbo ? 1 : 0 }; };
})(typeof window !== 'undefined' ? window : globalThis);
