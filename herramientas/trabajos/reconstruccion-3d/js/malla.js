/* Malla / nube de puntos (puro). Y arriba. Malla: {tipo:'malla'|'nube', nombre, pos:Float32Array, idx:Uint32Array|null, col:Float32Array|null (rgb 0..1)} */
(function (root) {
  'use strict';
  var R = root.R3D = root.R3D || {}, M = R.Malla = {};
  M.nueva = function (pos, idx, col, nombre) { return { tipo: idx && idx.length ? 'malla' : 'nube', nombre: nombre || 'Modelo', pos: pos, idx: idx && idx.length ? idx : null, col: col || null }; };
  M.nVert = function (m) { return m.pos.length / 3 | 0; };
  M.nTri = function (m) { return m.idx ? m.idx.length / 3 | 0 : 0; };
  M.bytes = function (m) { return m.pos.byteLength + (m.idx ? m.idx.byteLength : 0) + (m.col ? m.col.byteLength : 0); };
  M.caja = function (m) {
    var p = m.pos, mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (var i = 0; i < p.length; i += 3) for (var k = 0; k < 3; k++) { var v = p[i + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; }
    if (!p.length) return { min: [0, 0, 0], max: [0, 0, 0], tam: [0, 0, 0] };
    return { min: mn, max: mx, tam: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] };
  };
  M.volumen = function (m) { // con signo (positivo si las caras miran hacia fuera); malla cerrada
    if (!m.idx) return 0; var p = m.pos, ix = m.idx, v = 0;
    for (var t = 0; t < ix.length; t += 3) {
      var a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
      v += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
    }
    return v / 6;
  };
  M.area = function (m) {
    if (!m.idx) return 0; var p = m.pos, ix = m.idx, s = 0;
    for (var t = 0; t < ix.length; t += 3) {
      var a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3, ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      s += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
    }
    return s;
  };
  /* aristas de borde (usadas una sola vez): 0 = estanca (con vertices soldados) */
  M.aristasAbiertas = function (m) {
    if (!m.idx) return -1; var mapa = new Map(), ix = m.idx, n = ix.length, K = m.pos.length / 3 + 1;
    for (var t = 0; t < n; t += 3) for (var e = 0; e < 3; e++) { var a = ix[t + e], b = ix[t + (e + 1) % 3], k = a < b ? a * K + b : b * K + a; mapa.set(k, (mapa.get(k) || 0) + 1); }
    var ab = 0; mapa.forEach(function (c) { if (c !== 2) ab++; }); return ab;
  };
  M.normales = function (m) {
    var p = m.pos, nv = p.length / 3, nr = new Float32Array(p.length);
    if (!m.idx) return nr; var ix = m.idx;
    for (var t = 0; t < ix.length; t += 3) {
      var a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3, ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      [a, b, c].forEach(function (o) { nr[o] += nx; nr[o + 1] += ny; nr[o + 2] += nz; });
    }
    for (var i = 0; i < nv; i++) { var o = i * 3, l = Math.hypot(nr[o], nr[o + 1], nr[o + 2]) || 1; nr[o] /= l; nr[o + 1] /= l; nr[o + 2] /= l; }
    return nr;
  };
  /* suelda vertices coincidentes (STL, cajas) y quita triangulos degenerados */
  M.soldar = function (m, eps) {
    eps = eps || 1e-6; var p = m.pos, nv = p.length / 3, mapa = new Map(), rem = new Uint32Array(nv), pos = [], col = m.col ? [] : null, q = 1 / eps, n = 0;
    for (var i = 0; i < nv; i++) {
      var k = Math.round(p[i * 3] * q) + '_' + Math.round(p[i * 3 + 1] * q) + '_' + Math.round(p[i * 3 + 2] * q), j = mapa.get(k);
      if (j === undefined) { j = n++; mapa.set(k, j); pos.push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]); if (col) col.push(m.col[i * 3], m.col[i * 3 + 1], m.col[i * 3 + 2]); }
      rem[i] = j;
    }
    var idx = []; if (m.idx) for (var t = 0; t < m.idx.length; t += 3) { var a = rem[m.idx[t]], b = rem[m.idx[t + 1]], c = rem[m.idx[t + 2]]; if (a !== b && b !== c && a !== c) idx.push(a, b, c); }
    var r = M.nueva(new Float32Array(pos), new Uint32Array(idx), col && new Float32Array(col), m.nombre); if (!m.idx) r.tipo = 'nube'; return r;
  };
  /* simplificacion por agrupacion de vertices en celdas (rapida, aproximada); objetivo = triangulos deseados */
  M.decimar = function (m, objetivo) {
    if (!m.idx) { // nube: submuestreo uniforme
      var nv0 = m.pos.length / 3; if (nv0 <= objetivo) return m; var paso = nv0 / objetivo, pos = new Float32Array(objetivo * 3), col = m.col ? new Float32Array(objetivo * 3) : null;
      for (var i = 0; i < objetivo; i++) { var s = Math.floor(i * paso) * 3; pos.set(m.pos.subarray(s, s + 3), i * 3); if (col) col.set(m.col.subarray(s, s + 3), i * 3); }
      return M.nueva(pos, null, col, m.nombre);
    }
    if (M.nTri(m) <= objetivo) return m;
    var bb = M.caja(m), dim = Math.max(bb.tam[0], bb.tam[1], bb.tam[2]) || 1, lo = dim / 4096, hi = dim / 2, mejor = null;
    for (var it = 0; it < 14; it++) { var c = Math.sqrt(lo * hi), r = agrupar(m, bb, c); if (M.nTri(r) > objetivo) lo = c; else { hi = c; mejor = r; } }
    return mejor || agrupar(m, bb, hi);
  };
  function agrupar(m, bb, celda) {
    var p = m.pos, nv = p.length / 3, mapa = new Map(), rem = new Uint32Array(nv), acc = [], cnt = [], n = 0, inv = 1 / celda, hascol = !!m.col;
    for (var i = 0; i < nv; i++) {
      var k = Math.floor((p[i * 3] - bb.min[0]) * inv) + ',' + Math.floor((p[i * 3 + 1] - bb.min[1]) * inv) + ',' + Math.floor((p[i * 3 + 2] - bb.min[2]) * inv), j = mapa.get(k);
      if (j === undefined) { j = n++; mapa.set(k, j); acc.push(0, 0, 0, 0, 0, 0); cnt.push(0); }
      rem[i] = j; cnt[j]++; acc[j * 6] += p[i * 3]; acc[j * 6 + 1] += p[i * 3 + 1]; acc[j * 6 + 2] += p[i * 3 + 2];
      if (hascol) { acc[j * 6 + 3] += m.col[i * 3]; acc[j * 6 + 4] += m.col[i * 3 + 1]; acc[j * 6 + 5] += m.col[i * 3 + 2]; }
    }
    var pos = new Float32Array(n * 3), col = hascol ? new Float32Array(n * 3) : null;
    for (var j2 = 0; j2 < n; j2++) { var c = cnt[j2]; pos[j2 * 3] = acc[j2 * 6] / c; pos[j2 * 3 + 1] = acc[j2 * 6 + 1] / c; pos[j2 * 3 + 2] = acc[j2 * 6 + 2] / c; if (col) { col[j2 * 3] = acc[j2 * 6 + 3] / c; col[j2 * 3 + 1] = acc[j2 * 6 + 4] / c; col[j2 * 3 + 2] = acc[j2 * 6 + 5] / c; } }
    var idx = [], seen = new Set(); for (var t = 0; t < m.idx.length; t += 3) { var a = rem[m.idx[t]], b = rem[m.idx[t + 1]], d = rem[m.idx[t + 2]]; if (a === b || b === d || a === d) continue; var key = [a, b, d].sort(function (x, y) { return x - y; }).join('_'); if (seen.has(key)) continue; seen.add(key); idx.push(a, b, d); }
    return M.nueva(pos, new Uint32Array(idx), col, m.nombre);
  }
  M.fusionar = function (a, b) {
    var na = a.pos.length / 3, pos = new Float32Array(a.pos.length + b.pos.length); pos.set(a.pos); pos.set(b.pos, a.pos.length);
    var col = null; if (a.col || b.col) { col = new Float32Array(pos.length).fill(0.7); if (a.col) col.set(a.col); if (b.col) col.set(b.col, a.pos.length); }
    var ia = a.idx || new Uint32Array(0), ib = b.idx || new Uint32Array(0), idx = new Uint32Array(ia.length + ib.length); idx.set(ia); for (var i = 0; i < ib.length; i++) idx[ia.length + i] = ib[i] + na;
    return M.nueva(pos, idx, col, a.nombre);
  };
  /* Z arriba -> Y arriba: (x,y,z)->(x,z,-y); inverso con inv=true */
  M.ejeZaY = function (m, inv) {
    var p = m.pos, n = p.length; for (var i = 0; i < n; i += 3) { var y = p[i + 1], z = p[i + 2]; if (inv) { p[i + 1] = -z; p[i + 2] = y; } else { p[i + 1] = z; p[i + 2] = -y; } } return m;
  };
  M.centrarBase = function (m) { var b = M.caja(m), p = m.pos, cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2; for (var i = 0; i < p.length; i += 3) { p[i] -= cx; p[i + 1] -= b.min[1]; p[i + 2] -= cz; } return m; };
  M.escalar = function (m, k) { for (var i = 0; i < m.pos.length; i++) m.pos[i] *= k; return m; };
  M.clonar = function (m) { return { tipo: m.tipo, nombre: m.nombre, pos: new Float32Array(m.pos), idx: m.idx && new Uint32Array(m.idx), col: m.col && new Float32Array(m.col) }; };
  M.estadisticas = function (m) { var b = M.caja(m), s = { tipo: m.tipo, vertices: M.nVert(m), triangulos: M.nTri(m), caja: b, bytes: M.bytes(m) }; if (m.idx) { s.area = M.area(m); s.abiertas = M.aristasAbiertas(m); s.volumen = Math.abs(M.volumen(m)); s.estanca = s.abiertas === 0; } return s; };
  /* cuantizacion compacta para guardar mallas pequenas en la cuenta: {b:[min,max], p:b64 Int16, i:b64 (Uint16/Uint32), c:b64 Uint8} */
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return typeof btoa === 'function' ? btoa(s) : Buffer.from(u8).toString('base64'); }
  function deb64(s) { if (typeof atob === 'function') { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; } return new Uint8Array(Buffer.from(s, 'base64')); }
  M.compactar = function (m) {
    var bb = M.caja(m), n = m.pos.length / 3, q = new Uint16Array(m.pos.length), o = { tipo: m.tipo, nombre: m.nombre, min: bb.min, max: bb.max, n: n };
    for (var i = 0; i < m.pos.length; i++) { var k = i % 3, r = (bb.max[k] - bb.min[k]) || 1; q[i] = Math.round((m.pos[i] - bb.min[k]) / r * 65535); }
    o.p = b64(new Uint8Array(q.buffer));
    if (m.idx) { var i16 = n < 65536, ix = i16 ? Uint16Array.from(m.idx) : m.idx; o.i = b64(new Uint8Array(ix.buffer, ix.byteOffset, ix.byteLength)); o.i16 = i16; }
    if (m.col) { var c = new Uint8Array(m.col.length); for (var j = 0; j < c.length; j++) c[j] = Math.max(0, Math.min(255, Math.round(m.col[j] * 255))); o.c = b64(c); }
    return o;
  };
  M.descompactar = function (o) {
    var pb = deb64(o.p), q = new Uint16Array(pb.buffer, pb.byteOffset, pb.byteLength / 2), pos = new Float32Array(q.length);
    for (var i = 0; i < q.length; i++) { var k = i % 3, r = (o.max[k] - o.min[k]) || 1; pos[i] = o.min[k] + q[i] / 65535 * r; }
    var idx = null; if (o.i) { var ib = deb64(o.i); idx = o.i16 ? Uint32Array.from(new Uint16Array(ib.buffer, ib.byteOffset, ib.byteLength / 2)) : new Uint32Array(ib.buffer.slice(ib.byteOffset, ib.byteOffset + ib.byteLength)); }
    var col = null; if (o.c) { var cb = deb64(o.c); col = new Float32Array(cb.length); for (var j = 0; j < cb.length; j++) col[j] = cb[j] / 255; }
    return M.nueva(pos, idx, col, o.nombre);
  };
  if (typeof module === 'object' && module.exports) module.exports = M;
})(typeof self !== 'undefined' ? self : globalThis);
