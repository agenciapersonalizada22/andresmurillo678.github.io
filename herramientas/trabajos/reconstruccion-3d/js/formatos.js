/* Lectura y escritura de OBJ, PLY, STL, glTF/GLB basico y CSV de puntos (puro). Entrada ArrayBuffer/Uint8Array o texto; salida Malla. */
(function (root) {
  'use strict';
  var R = root.R3D = root.R3D || {}, F = R.Formatos = {}, M = R.Malla;
  function texto(b) { if (typeof b === 'string') return b; var u = b instanceof Uint8Array ? b : new Uint8Array(b); if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(u); return Buffer.from(u).toString('utf8'); }
  function bytes(b) { if (typeof b === 'string') return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(b) : new Uint8Array(Buffer.from(b)); return b instanceof Uint8Array ? b : new Uint8Array(b); }
  function codificar(s) { return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : new Uint8Array(Buffer.from(s)); }
  function unir(partes) { var n = 0; partes.forEach(function (p) { n += p.length; }); var o = new Uint8Array(n), k = 0; partes.forEach(function (p) { o.set(p, k); k += p.length; }); return o; }
  function triangular(cara) { var t = []; for (var i = 1; i < cara.length - 1; i++) t.push(cara[0], cara[i], cara[i + 1]); return t; }
  F.TIPOS = ['obj', 'ply', 'stl', 'gltf', 'glb', 'csv', 'txt', 'xyz', 'pts'];
  F.extension = function (n) { var m = /\.([a-z0-9]+)$/i.exec(n || ''); return m ? m[1].toLowerCase() : ''; };

  /* ---------- OBJ ---------- */
  F.leerOBJ = function (b, nombre) {
    var L = texto(b).split(/\r?\n/), pos = [], col = [], idx = [], hayCol = false, nv = 0, i, ln, p;
    for (i = 0; i < L.length; i++) {
      ln = L[i]; if (ln.charCodeAt(0) === 118 && ln.charCodeAt(1) === 32) { p = ln.trim().split(/\s+/); pos.push(+p[1], +p[2], +p[3]); if (p.length >= 7) { hayCol = true; col.push(+p[4], +p[5], +p[6]); } else col.push(0.7, 0.7, 0.7); nv++; }
      else if (ln.charCodeAt(0) === 102 && ln.charCodeAt(1) === 32) { p = ln.trim().split(/\s+/).slice(1).map(function (s) { var k = parseInt(s, 10); return k < 0 ? nv + k : k - 1; }); if (p.length >= 3) idx.push.apply(idx, triangular(p)); }
    }
    if (!nv) throw new Error('El OBJ no tiene vértices.');
    if (hayCol && col.some(function (v) { return v > 1.0001; })) col = col.map(function (v) { return v / 255; });
    return M.nueva(new Float32Array(pos), new Uint32Array(idx), hayCol ? new Float32Array(col) : null, nombre);
  };
  F.escribirOBJ = function (m) {
    var s = ['# Reconstruccion 3D - Trabajos', 'o ' + (m.nombre || 'modelo').replace(/\s+/g, '_')], n = m.pos.length / 3, i, c = m.col;
    for (i = 0; i < n; i++) s.push('v ' + f6(m.pos[i * 3]) + ' ' + f6(m.pos[i * 3 + 1]) + ' ' + f6(m.pos[i * 3 + 2]) + (c ? ' ' + f6(c[i * 3]) + ' ' + f6(c[i * 3 + 1]) + ' ' + f6(c[i * 3 + 2]) : ''));
    if (m.idx) for (i = 0; i < m.idx.length; i += 3) s.push('f ' + (m.idx[i] + 1) + ' ' + (m.idx[i + 1] + 1) + ' ' + (m.idx[i + 2] + 1));
    return s.join('\n') + '\n';
  };
  function f6(v) { return String(Math.round(v * 1e6) / 1e6); }

  /* ---------- PLY ---------- */
  var TP = { char: [1, 'Int8'], uchar: [1, 'Uint8'], short: [2, 'Int16'], ushort: [2, 'Uint16'], int: [4, 'Int32'], uint: [4, 'Uint32'], float: [4, 'Float32'], double: [8, 'Float64'], int8: [1, 'Int8'], uint8: [1, 'Uint8'], int16: [2, 'Int16'], uint16: [2, 'Uint16'], int32: [4, 'Int32'], uint32: [4, 'Uint32'], float32: [4, 'Float32'], float64: [8, 'Float64'] };
  F.leerPLY = function (b, nombre) {
    var u = bytes(b), fin = -1, k; for (k = 0; k < Math.min(u.length - 10, 20000); k++) if (u[k] === 10 && texto(u.subarray(k + 1, k + 11)) === 'end_header' ) { fin = k + 1; break; }
    if (fin < 0) throw new Error('PLY sin cabecera válida.');
    var fl = u.indexOf(10, fin); var cab = texto(u.subarray(0, fl)).split(/\r?\n/), start = fl + 1, formato = 'ascii', els = [], el = null;
    cab.forEach(function (l) { var p = l.trim().split(/\s+/); if (p[0] === 'format') formato = p[1]; else if (p[0] === 'element') { el = { nombre: p[1], n: +p[2], props: [] }; els.push(el); } else if (p[0] === 'property' && el) { if (p[1] === 'list') el.props.push({ lista: true, cnt: p[2], tipo: p[3], nombre: p[4] }); else el.props.push({ tipo: p[1], nombre: p[2] }); } });
    var pos = [], col = [], idx = [], hayCol = false;
    if (formato === 'ascii') {
      var T = texto(u.subarray(start)).split(/\r?\n/), li = 0;
      els.forEach(function (e) { for (var i = 0; i < e.n; i++) { var p = (T[li++] || '').trim().split(/\s+/), q = 0, reg = {}; e.props.forEach(function (pr) { if (pr.lista) { var c = +p[q++], arr = []; for (var j = 0; j < c; j++) arr.push(+p[q++]); reg[pr.nombre] = arr; } else reg[pr.nombre] = +p[q++]; }); usar(e, reg); } });
    } else {
      var le = formato === 'binary_little_endian', dv = new DataView(u.buffer, u.byteOffset, u.byteLength), o = start;
      function leer(t) { var d = TP[t]; if (!d) throw new Error('Tipo PLY no soportado: ' + t); var v = dv['get' + d[1]](o, le); o += d[0]; return v; }
      els.forEach(function (e) { for (var i = 0; i < e.n; i++) { var reg = {}; e.props.forEach(function (pr) { if (pr.lista) { var c = leer(pr.cnt), arr = []; for (var j = 0; j < c; j++) arr.push(leer(pr.tipo)); reg[pr.nombre] = arr; } else reg[pr.nombre] = leer(pr.tipo); }); usar(e, reg); } });
    }
    function usar(e, r) {
      if (e.nombre === 'vertex') { pos.push(r.x, r.y, r.z); if (r.red != null) { hayCol = true; col.push(r.red, r.green, r.blue); } else if (r.r != null) { hayCol = true; col.push(r.r, r.g, r.b); } else col.push(0.7, 0.7, 0.7); }
      else if (e.nombre === 'face') { var l = r.vertex_indices || r.vertex_index; if (l && l.length >= 3) idx.push.apply(idx, triangular(l)); }
    }
    if (!pos.length) throw new Error('El PLY no tiene vértices.');
    if (hayCol) { var gr = col.some(function (v) { return v > 1.0001; }); if (gr) col = col.map(function (v) { return v / 255; }); }
    return M.nueva(new Float32Array(pos), new Uint32Array(idx), hayCol ? new Float32Array(col) : null, nombre);
  };
  F.escribirPLY = function (m, binario) {
    var n = m.pos.length / 3, nf = m.idx ? m.idx.length / 3 : 0, c = m.col, h = ['ply', 'format ' + (binario ? 'binary_little_endian' : 'ascii') + ' 1.0', 'comment Reconstruccion 3D - Trabajos', 'element vertex ' + n, 'property float x', 'property float y', 'property float z'];
    if (c) h.push('property uchar red', 'property uchar green', 'property uchar blue'); if (nf) h.push('element face ' + nf, 'property list uchar int vertex_indices'); h.push('end_header');
    var cab = h.join('\n') + '\n', i;
    function b8(v) { return Math.max(0, Math.min(255, Math.round(v * 255))); }
    if (!binario) { var s = [h.join('\n')]; for (i = 0; i < n; i++) s.push(f6(m.pos[i * 3]) + ' ' + f6(m.pos[i * 3 + 1]) + ' ' + f6(m.pos[i * 3 + 2]) + (c ? ' ' + b8(c[i * 3]) + ' ' + b8(c[i * 3 + 1]) + ' ' + b8(c[i * 3 + 2]) : '')); for (i = 0; i < nf; i++) s.push('3 ' + m.idx[i * 3] + ' ' + m.idx[i * 3 + 1] + ' ' + m.idx[i * 3 + 2]); return codificar(s.join('\n') + '\n'); }
    var hb = codificar(cab), vs = 12 + (c ? 3 : 0), buf = new ArrayBuffer(n * vs + nf * 13), dv = new DataView(buf), o = 0;
    for (i = 0; i < n; i++) { dv.setFloat32(o, m.pos[i * 3], true); dv.setFloat32(o + 4, m.pos[i * 3 + 1], true); dv.setFloat32(o + 8, m.pos[i * 3 + 2], true); o += 12; if (c) { dv.setUint8(o++, b8(c[i * 3])); dv.setUint8(o++, b8(c[i * 3 + 1])); dv.setUint8(o++, b8(c[i * 3 + 2])); } }
    for (i = 0; i < nf; i++) { dv.setUint8(o++, 3); for (var k = 0; k < 3; k++) { dv.setInt32(o, m.idx[i * 3 + k], true); o += 4; } }
    return unir([hb, new Uint8Array(buf)]);
  };

  /* ---------- STL ---------- */
  F.leerSTL = function (b, nombre) {
    var u = bytes(b), n = u.length >= 84 ? new DataView(u.buffer, u.byteOffset + 80, 4).getUint32(0, true) : 0, pos = [];
    if (u.length >= 84 && 84 + n * 50 === u.length) {
      var dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
      for (var i = 0; i < n; i++) { var o = 84 + i * 50 + 12; for (var v = 0; v < 9; v++) pos.push(dv.getFloat32(o + v * 4, true)); }
    } else {
      var t = texto(u), re = /vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/g, mm; while ((mm = re.exec(t))) pos.push(+mm[1], +mm[2], +mm[3]);
      if (!pos.length) throw new Error('STL vacío o dañado.');
    }
    var nv = pos.length / 3, idx = new Uint32Array(nv); for (var j = 0; j < nv; j++) idx[j] = j;
    return M.soldar(M.nueva(new Float32Array(pos), idx, null, nombre), 1e-5);
  };
  F.escribirSTL = function (m, binario) {
    if (!m.idx) throw new Error('STL necesita triángulos (una nube de puntos no se puede exportar a STL).');
    var nf = m.idx.length / 3, p = m.pos, i;
    function nrm(a, b, c) { var ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2], x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx, l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; }
    if (binario === false) { var s = ['solid ' + (m.nombre || 'modelo').replace(/\s+/g, '_')]; for (i = 0; i < nf; i++) { var a = m.idx[i * 3] * 3, b2 = m.idx[i * 3 + 1] * 3, c2 = m.idx[i * 3 + 2] * 3, n = nrm(a, b2, c2); s.push('facet normal ' + n.join(' '), ' outer loop'); [a, b2, c2].forEach(function (q) { s.push('  vertex ' + p[q] + ' ' + p[q + 1] + ' ' + p[q + 2]); }); s.push(' endloop', 'endfacet'); } s.push('endsolid'); return codificar(s.join('\n') + '\n'); }
    var buf = new ArrayBuffer(84 + nf * 50), dv = new DataView(buf), enc = codificar('Reconstruccion 3D - Trabajos'); new Uint8Array(buf).set(enc.subarray(0, 79)); dv.setUint32(80, nf, true);
    for (i = 0; i < nf; i++) { var o = 84 + i * 50, A = m.idx[i * 3] * 3, B = m.idx[i * 3 + 1] * 3, C = m.idx[i * 3 + 2] * 3, nn = nrm(A, B, C); for (var k = 0; k < 3; k++) dv.setFloat32(o + k * 4, nn[k], true); [A, B, C].forEach(function (q, j) { for (var k2 = 0; k2 < 3; k2++) dv.setFloat32(o + 12 + j * 12 + k2 * 4, p[q + k2], true); }); }
    return new Uint8Array(buf);
  };

  /* ---------- glTF / GLB ---------- */
  var CT = { 5120: [1, 'Int8'], 5121: [1, 'Uint8'], 5122: [2, 'Int16'], 5123: [2, 'Uint16'], 5125: [4, 'Uint32'], 5126: [4, 'Float32'] }, NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  function b64b(s) { if (typeof atob === 'function') { var t = atob(s), u = new Uint8Array(t.length); for (var i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; } return new Uint8Array(Buffer.from(s, 'base64')); }
  F.leerGLTF = function (b, nombre) {
    var u = bytes(b), json, bin = null, avisos = [];
    if (u.length > 12 && u[0] === 0x67 && u[1] === 0x6c && u[2] === 0x54 && u[3] === 0x46) {
      var dv = new DataView(u.buffer, u.byteOffset, u.byteLength), o = 12;
      while (o + 8 <= u.length) { var len = dv.getUint32(o, true), tipo = dv.getUint32(o + 4, true), dat = u.subarray(o + 8, o + 8 + len); if (tipo === 0x4E4F534A) json = JSON.parse(texto(dat)); else if (tipo === 0x004E4942 && !bin) bin = dat; o += 8 + len; }
    } else json = JSON.parse(texto(u));
    if (!json || !json.meshes) throw new Error('glTF sin mallas.');
    if ((json.extensionsRequired || []).some(function (e) { return /draco|meshopt/i.test(e); })) throw new Error('Este glTF usa compresión Draco/Meshopt, que no está soportada. Expórtalo sin compresión.');
    var bufs = (json.buffers || []).map(function (bf, i) { if (bf.uri) { if (/^data:/.test(bf.uri)) return b64b(bf.uri.split(',')[1]); throw new Error('El glTF referencia archivos externos («' + bf.uri + '»). Usa un .glb o un .gltf con datos incrustados.'); } return bin; });
    function acc(i) {
      var a = json.accessors[i], bv = json.bufferViews[a.bufferView || 0], d = bufs[bv.buffer], c = CT[a.componentType], nc = NC[a.type], st = bv.byteStride || c[0] * nc, base = (bv.byteOffset || 0) + (a.byteOffset || 0), out = new Float64Array(a.count * nc), v = new DataView(d.buffer, d.byteOffset, d.byteLength);
      for (var k = 0; k < a.count; k++) for (var j = 0; j < nc; j++) { var x = v['get' + c[1]](base + k * st + j * c[0], true); if (a.normalized) { x = a.componentType === 5121 ? x / 255 : a.componentType === 5123 ? x / 65535 : x; } out[k * nc + j] = x; }
      return { d: out, nc: nc, n: a.count, ct: a.componentType, norm: a.normalized };
    }
    var pos = [], col = [], idx = [], hayCol = false, nv = 0;
    function mulV(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; }
    function mmul(a, b) { var o = new Array(16), i, j, k; for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) { var s = 0; for (k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
    function matNodo(n) { if (n.matrix) return n.matrix; var t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1], x = q[0], y = q[1], z = q[2], w = q[3]; return [(1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0, 2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0, 2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1]; }
    function malla(mi, mat) {
      json.meshes[mi].primitives.forEach(function (pr) {
        var modo = pr.mode == null ? 4 : pr.mode; if (modo !== 4 && modo !== 0) { avisos.push('primitiva modo ' + modo + ' omitida'); return; }
        var P = acc(pr.attributes.POSITION), base = nv, mc = pr.material != null && json.materials && json.materials[pr.material] && json.materials[pr.material].pbrMetallicRoughness && json.materials[pr.material].pbrMetallicRoughness.baseColorFactor;
        var C = pr.attributes.COLOR_0 != null ? acc(pr.attributes.COLOR_0) : null; if (json.materials && pr.material != null && json.materials[pr.material].pbrMetallicRoughness && json.materials[pr.material].pbrMetallicRoughness.baseColorTexture) avisos.push('las texturas de imagen no se cargan (se usa color por vértice o color base)');
        for (var i = 0; i < P.n; i++) { var q = mulV(mat, P.d[i * 3], P.d[i * 3 + 1], P.d[i * 3 + 2]); pos.push(q[0], q[1], q[2]); if (C) { hayCol = true; var k = C.norm || C.ct === 5126 ? 1 : (C.ct === 5121 ? 1 / 255 : 1 / 65535); col.push(C.d[i * C.nc] * k, C.d[i * C.nc + 1] * k, C.d[i * C.nc + 2] * k); } else if (mc) { hayCol = true; col.push(mc[0], mc[1], mc[2]); } else col.push(0.7, 0.7, 0.7); }
        nv += P.n;
        if (modo === 4) { if (pr.indices != null) { var I = acc(pr.indices); for (var j = 0; j + 2 < I.n; j += 3) idx.push(base + I.d[j], base + I.d[j + 1], base + I.d[j + 2]); } else for (var j2 = 0; j2 + 2 < P.n; j2 += 3) idx.push(base + j2, base + j2 + 1, base + j2 + 2); }
      });
    }
    function nodo(i, padre) { var n = json.nodes[i], mat = mmul(padre, matNodo(n)); if (n.mesh != null) malla(n.mesh, mat); (n.children || []).forEach(function (h) { nodo(h, mat); }); }
    var I4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    if (json.nodes && json.scenes) { var esc = json.scenes[json.scene || 0]; (esc.nodes || []).forEach(function (i) { nodo(i, I4); }); } else json.meshes.forEach(function (_, i) { malla(i, I4); });
    if (!nv) throw new Error('El glTF no contiene geometría compatible.');
    var r = M.nueva(new Float32Array(pos), new Uint32Array(idx), hayCol ? new Float32Array(col) : null, nombre); r.avisos = avisos.filter(function (v, i, a) { return a.indexOf(v) === i; }); return r;
  };
  F.escribirGLB = function (m) {
    var n = m.pos.length / 3, bb = M.caja(m), nf = m.idx ? m.idx.length : 0, partes = [], bvs = [], accs = [], off = 0, att = {};
    function add(arr, target) { var u = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength), pad = (4 - u.length % 4) % 4, b = new Uint8Array(u.length + pad); b.set(u); partes.push(b); bvs.push({ buffer: 0, byteOffset: off, byteLength: u.length, target: target }); off += b.length; return bvs.length - 1; }
    var pv = add(new Float32Array(m.pos), 34962); accs.push({ bufferView: pv, componentType: 5126, count: n, type: 'VEC3', min: bb.min, max: bb.max }); att.POSITION = 0;
    if (m.col) { var cv = add(new Float32Array(m.col), 34962); accs.push({ bufferView: cv, componentType: 5126, count: n, type: 'VEC3' }); att.COLOR_0 = accs.length - 1; }
    var prim = { attributes: att, mode: nf ? 4 : 0 }; if (nf) { var iv = add(new Uint32Array(m.idx), 34963); accs.push({ bufferView: iv, componentType: 5125, count: nf, type: 'SCALAR' }); prim.indices = accs.length - 1; }
    var json = { asset: { version: '2.0', generator: 'Reconstruccion 3D - Trabajos' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: m.nombre || 'modelo' }], meshes: [{ primitives: [prim] }], accessors: accs, bufferViews: bvs, buffers: [{ byteLength: off }] };
    var js = codificar(JSON.stringify(json)), pj = (4 - js.length % 4) % 4, jb = new Uint8Array(js.length + pj).fill(32); jb.set(js);
    var bin = unir(partes), total = 12 + 8 + jb.length + 8 + bin.length, out = new Uint8Array(total), dv = new DataView(out.buffer);
    dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true); dv.setUint32(12, jb.length, true); dv.setUint32(16, 0x4E4F534A, true); out.set(jb, 20); var o = 20 + jb.length; dv.setUint32(o, bin.length, true); dv.setUint32(o + 4, 0x004E4942, true); out.set(bin, o + 8);
    return out;
  };

  /* ---------- CSV / XYZ de puntos (incluye LiDAR exportado) ---------- */
  var ALX = ['x', 'east', 'easting', 'lon', 'longitude', 'px'], ALY = ['y', 'north', 'northing', 'lat', 'latitude', 'py'], ALZ = ['z', 'elevation', 'elev', 'alt', 'altitude', 'height', 'h', 'pz'], ALR = ['r', 'red', 'rojo'], ALG = ['g', 'green', 'verde'], ALB = ['b', 'blue', 'azul'], ALI = ['intensity', 'i', 'intensidad', 'reflectance', 'amplitude'];
  F.leerCSV = function (t, nombre) {
    t = texto(t).replace(/^﻿/, ''); var L = t.split(/\r?\n/).filter(function (l) { return l.trim() && l.trim()[0] !== '#' && l.trim().substr(0, 2) !== '//'; });
    if (!L.length) throw new Error('El archivo de puntos está vacío.');
    var sep = [',', ';', '\t', ' '].map(function (s) { return [s, L[0].trim().split(s === ' ' ? /\s+/ : s).length]; }).sort(function (a, b) { return b[1] - a[1]; })[0][0], split = function (l) { return l.trim().split(sep === ' ' ? /\s+/ : sep); };
    var p0 = split(L[0]), cab = p0.some(function (c) { return isNaN(parseFloat(c)); }), ix = { x: 0, y: 1, z: 2, r: -1, g: -1, b: -1, i: -1 }, ini = 0;
    if (cab) { ini = 1; var nm = p0.map(function (c) { return c.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''); }); function f(al) { for (var k = 0; k < al.length; k++) { var q = nm.indexOf(al[k]); if (q >= 0) return q; } return -1; } ix = { x: f(ALX), y: f(ALY), z: f(ALZ), r: f(ALR), g: f(ALG), b: f(ALB), i: f(ALI) }; if (ix.x < 0 || ix.y < 0 || ix.z < 0) throw new Error('No encuentro columnas X, Y, Z en el encabezado (' + p0.join(', ') + ').'); }
    else if (p0.length >= 6) { ix.r = 3; ix.g = 4; ix.b = 5; }
    var pos = [], col = [], inten = [], max = 0, minI = Infinity, maxI = -Infinity, malas = 0, i;
    for (i = ini; i < L.length; i++) { var p = split(L[i]), x = parseFloat(p[ix.x]), y = parseFloat(p[ix.y]), z = parseFloat(p[ix.z]); if (!isFinite(x) || !isFinite(y) || !isFinite(z)) { malas++; continue; } pos.push(x, y, z); if (ix.r >= 0) { var r = +p[ix.r], g = +p[ix.g], b = +p[ix.b]; col.push(r, g, b); if (r > max) max = r; if (g > max) max = g; if (b > max) max = b; } if (ix.i >= 0) { var iv = +p[ix.i]; inten.push(iv); if (iv < minI) minI = iv; if (iv > maxI) maxI = iv; } }
    if (!pos.length) throw new Error('No hay filas numéricas válidas.');
    var d = max > 1.0001 ? 255 : 1, c = null; if (col.length) c = new Float32Array(col.map(function (v) { return v / d; })); else if (inten.length) { c = new Float32Array(inten.length * 3); for (i = 0; i < inten.length; i++) { var v = (inten[i] - minI) / ((maxI - minI) || 1); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = 0.15 + 0.85 * v; } }
    var r2 = M.nueva(new Float32Array(pos), null, c, nombre); r2.tipo = 'nube'; r2.avisos = malas ? [malas + ' fila(s) ignoradas por no ser numéricas'] : []; return r2;
  };
  F.escribirCSV = function (m) { var s = ['x,y,z' + (m.col ? ',r,g,b' : '')], n = m.pos.length / 3; for (var i = 0; i < n; i++) s.push(f6(m.pos[i * 3]) + ',' + f6(m.pos[i * 3 + 1]) + ',' + f6(m.pos[i * 3 + 2]) + (m.col ? ',' + Math.round(m.col[i * 3] * 255) + ',' + Math.round(m.col[i * 3 + 1] * 255) + ',' + Math.round(m.col[i * 3 + 2] * 255) : '')); return s.join('\n') + '\n'; };

  /* ---------- entrada unificada ---------- */
  F.leer = function (nombre, datos) {
    var ext = F.extension(nombre), u = bytes(datos), m;
    if (ext === 'obj') m = F.leerOBJ(u, nombre); else if (ext === 'ply') m = F.leerPLY(u, nombre); else if (ext === 'stl') m = F.leerSTL(u, nombre);
    else if (ext === 'glb' || ext === 'gltf') m = F.leerGLTF(u, nombre); else if (ext === 'csv' || ext === 'txt' || ext === 'xyz' || ext === 'pts') m = F.leerCSV(u, nombre);
    else throw new Error('Formato «.' + ext + '» no soportado. Usa OBJ, PLY, STL, glTF/GLB o CSV de puntos.');
    m.nombre = (nombre || 'modelo').replace(/\.[^.]+$/, ''); m.zArriba = ext === 'stl' || ext === 'csv' || ext === 'xyz' || ext === 'pts' || ext === 'txt'; return m;
  };
  /* exporta a bytes; opts {ejeZ:boolean para convertir Y-arriba a Z-arriba, binario} */
  F.exportar = function (m, formato, o) {
    o = o || {}; var c = o.ejeZ ? M.ejeZaY(M.clonar(m), true) : m;
    if (formato === 'obj') return codificar(F.escribirOBJ(c)); if (formato === 'ply') return F.escribirPLY(c, o.binario !== false); if (formato === 'stl') return F.escribirSTL(c, o.binario !== false);
    if (formato === 'glb') return F.escribirGLB(c); if (formato === 'csv') return codificar(F.escribirCSV(c)); throw new Error('Formato de exportación desconocido: ' + formato);
  };
  if (typeof module === 'object' && module.exports) module.exports = F;
})(typeof self !== 'undefined' ? self : globalThis);
