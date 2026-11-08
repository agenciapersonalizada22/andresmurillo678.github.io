/* Graficas propias en SVG (cadenas) para pantalla e informe impreso. Cada funcion devuelve markup con viewBox 0 0 400 alto. window.VGraf */
(function (g, f) { var m = f(g.VAnalisis || require('./analisis.js')); if (typeof module === 'object' && module.exports) module.exports = m; else g.VGraf = m; })(typeof self !== 'undefined' ? self : this, function (A) {
  'use strict';
  var G = {}, PAL = ['#3e63dd', '#12b886', '#f59f00', '#e03131', '#7048e8', '#0b7285', '#c2255c', '#5c940d', '#868e96', '#d9480f'];
  G.PAL = PAL;
  var TEMAS = { pantalla: { txt: 'var(--txt)', sub: 'var(--suave)', rej: 'var(--borde)', fondo: 'var(--panel2)' }, papel: { txt: '#111', sub: '#555', rej: '#cfd4e0', fondo: '#f1f3f9' } };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function txt(x, y, s, T, o) { o = o || {}; return '<text x="' + r1(x) + '" y="' + r1(y) + '" font-size="' + (o.s || 9) + '" text-anchor="' + (o.a || 'start') + '" style="fill:' + (o.c || T.sub) + (o.b ? ';font-weight:700' : '') + '">' + esc(s) + '</text>'; }
  function ejeT(x0, x1, y, t1, T) {
    var n = 5, o = ''; for (var i = 0; i <= n; i++) { var x = x0 + (x1 - x0) * i / n; o += '<line x1="' + r1(x) + '" x2="' + r1(x) + '" y1="' + (y - 4) + '" y2="' + y + '" style="stroke:' + T.rej + '"/>' + txt(x, y + 9, A.fmtT(t1 * i / n), T, { a: i === 0 ? 'start' : i === n ? 'end' : 'middle', s: 8 }); } return o;
  }
  function vacio(msg, alto, T) { return '<svg viewBox="0 0 400 ' + alto + '" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="' + alto + '" rx="6" style="fill:' + T.fondo + '"/>' + txt(200, alto / 2 + 3, msg, T, { a: 'middle' }) + '</svg>'; }
  G.nombres = { movimiento: 'Movimiento', sin_movimiento: 'Fin movimiento', objeto_nuevo: 'Objeto nuevo', cruce_linea: 'Cruce de línea', escena: 'Cambio de escena', desenfoque: 'Desenfoque', oscuro: 'Oscuro', sobreexpuesto: 'Sobreexpuesto', objeto_color: 'Objeto de color', qr: 'QR', codigo: 'Cód. barras', rostro: 'Rostro', texto: 'Texto', ia_evento: 'IA', habla: 'Voz' };
  G.lineaTiempo = function (eventos, dur, tema) {
    var T = TEMAS[tema || 'pantalla'], tipos = {}; eventos.forEach(function (e) { if (e.tipo !== 'sin_movimiento') (tipos[e.tipo] = tipos[e.tipo] || []).push(e); });
    var ks = Object.keys(tipos).sort(function (a, b) { return tipos[b].length - tipos[a].length; }); if (!ks.length || !(dur > 0)) return vacio('Sin eventos todavía', 70, T);
    var rh = 16, top = 6, alto = top + ks.length * rh + 22, x0 = 82, x1 = 392, o = '<svg viewBox="0 0 400 ' + alto + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Eventos en la línea de tiempo">';
    ks.forEach(function (k, i) {
      var y = top + i * rh + rh / 2, c = PAL[i % PAL.length]; o += '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + y + '" y2="' + y + '" style="stroke:' + T.rej + '"/>' + txt(4, y + 3, (G.nombres[k] || k) + ' (' + tipos[k].length + ')', T, { s: 8.5 });
      tipos[k].slice(0, 500).forEach(function (e) { var x = x0 + (x1 - x0) * Math.min(1, e.t / dur); o += '<rect x="' + r1(x - 1.2) + '" y="' + (y - 5) + '" width="2.4" height="10" rx="1" fill="' + c + '"/>'; });
    });
    return o + ejeT(x0, x1, top + ks.length * rh + 4, dur, T) + '</svg>';
  };
  G.serie = function (t, v, o, tema) {
    o = o || {}; var T = TEMAS[tema || 'pantalla'], alto = o.alto || 90; if (!t.length) return vacio('Sin datos', alto, T);
    var dur = Math.max(o.dur || 0, t[t.length - 1]) || 1, max = o.max || Math.max.apply(null, v.filter(function (x) { return x != null; }).concat([o.min1 || 1e-9])), x0 = 30, x1 = 394, yb = alto - 18, yt = 8, c = o.color || PAL[0];
    var paso = Math.max(1, Math.floor(t.length / 220)), pts = []; for (var i = 0; i < t.length; i += paso) { var m = v[i] == null ? 0 : v[i]; for (var k = i; k < Math.min(t.length, i + paso); k++) if (v[k] != null && v[k] > m) m = v[k]; pts.push([x0 + (x1 - x0) * t[i] / dur, yb - (yb - yt) * Math.min(1, m / max)]); }
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + r1(p[0]) + ' ' + r1(o.escalon && i ? pts[i - 1][1] : p[1]) + (o.escalon && i ? 'L' + r1(p[0]) + ' ' + r1(p[1]) : ''); }).join('');
    var s = '<svg viewBox="0 0 400 ' + alto + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(o.titulo || 'Serie') + '">' + txt(2, 9, o.titulo || '', T, { c: T.txt, b: 1, s: 9 });
    [0, 0.5, 1].forEach(function (q) { var y = yb - (yb - yt) * q; s += '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + r1(y) + '" y2="' + r1(y) + '" style="stroke:' + T.rej + '"/>' + txt(x0 - 3, y + 3, (o.fmt ? o.fmt(max * q) : r1(max * q)), T, { a: 'end', s: 7.5 }); });
    s += '<path d="' + d + 'L' + r1(pts[pts.length - 1][0]) + ' ' + yb + 'L' + r1(pts[0][0]) + ' ' + yb + 'Z" fill="' + c + '" fill-opacity=".22" stroke="none"/><path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="1.4" stroke-linejoin="round"/>';
    (o.picos || []).forEach(function (p) { var x = x0 + (x1 - x0) * p.t / dur, y = yb - (yb - yt) * Math.min(1, p.v / max); s += '<circle cx="' + r1(x) + '" cy="' + r1(y) + '" r="2.6" fill="' + c + '" stroke="#fff" stroke-width=".8"/>' + txt(x, Math.max(10, y - 4), A.fmtT(p.t), T, { a: 'middle', s: 7.5, c: T.txt }); });
    return s + ejeT(x0, x1, yb + 2, dur, T) + '</svg>';
  };
  G.barrasCruces = function (lineas, cruces, tema) {
    var T = TEMAS[tema || 'pantalla'], l = lineas.filter(function (x) { return cruces && cruces[x.id]; }); if (!lineas.length) return vacio('Sin líneas virtuales (dibújalas en «En vivo»)', 60, T);
    var alto = 22 + lineas.length * 26, mx = Math.max.apply(null, [1].concat(lineas.map(function (x) { var c = cruces && cruces[x.id] || { ab: 0, ba: 0 }; return Math.max(c.ab, c.ba); }))), o = '<svg viewBox="0 0 400 ' + alto + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cruces por línea">';
    lineas.forEach(function (x, i) { var c = cruces && cruces[x.id] || { ab: 0, ba: 0 }, y = 8 + i * 26; o += txt(2, y + 8, x.nombre || x.id, T, { c: T.txt, b: 1, s: 9 }) + '<rect x="90" y="' + y + '" width="' + r1(290 * c.ab / mx / 1) + '" height="9" rx="2" fill="' + PAL[0] + '"/>' + txt(94 + 290 * c.ab / mx, y + 8, 'A→B ' + c.ab, T, { s: 8 }) + '<rect x="90" y="' + (y + 11) + '" width="' + r1(290 * c.ba / mx) + '" height="9" rx="2" fill="' + PAL[2] + '"/>' + txt(94 + 290 * c.ba / mx, y + 19, 'B→A ' + c.ba, T, { s: 8 }); });
    return o + '</svg>';
  };
  G.celdasCalor = function (celdas, nx, ny, tema) {
    var T = TEMAS[tema || 'pantalla'], mx = Math.max.apply(null, [1].concat(Array.prototype.slice.call(celdas))), cw = 400 / nx, ch = 0.5625 * 400 / ny * (ny / ny), alto = ch * ny; if (!celdas.length) return vacio('Sin datos de calor', 60, T);
    var o = '<svg viewBox="0 0 400 ' + r1(alto) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapa de calor por zonas"><rect width="400" height="' + r1(alto) + '" style="fill:' + T.fondo + '"/>';
    for (var y = 0; y < ny; y++) for (var x = 0; x < nx; x++) { var v = celdas[y * nx + x] / mx, c = A.rampaCalor(Math.round(v * 255)); if (v > 0.01) o += '<rect x="' + r1(x * cw) + '" y="' + r1(y * ch) + '" width="' + r1(cw) + '" height="' + r1(ch) + '" fill="rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')" fill-opacity="' + r1(Math.max(0.35, c[3] / 255)) + '"/>' + txt(x * cw + cw / 2, y * ch + ch / 2 + 3, Math.round(v * 100) + '%', T, { a: 'middle', s: 8, c: v > 0.5 ? '#000' : T.txt }); }
    return o + '</svg>';
  };
  G.colores = function (colores, tema) {
    var T = TEMAS[tema || 'pantalla'], k = Object.keys(colores).sort(function (a, b) { return colores[b] - colores[a]; }).slice(0, 6), tot = k.reduce(function (s, x) { return s + colores[x]; }, 0); if (!k.length) return vacio('Sin datos de color', 40, T);
    var HEX = { rojo: '#e03131', naranja: '#f08c00', amarillo: '#fcc419', verde: '#2f9e44', cian: '#15aabf', azul: '#1c7ed6', morado: '#7048e8', rosa: '#f783ac', magenta: '#d6336c', negro: '#222', blanco: '#f1f3f5', gris: '#868e96', 'gris oscuro': '#495057', 'gris claro': '#ced4da', 'marrón': '#8d5524' }, o = '<svg viewBox="0 0 400 ' + (10 + k.length * 14) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Colores dominantes">';
    k.forEach(function (n, i) { var p = colores[n] / tot; o += txt(2, 14 + i * 14, n, T, { c: T.txt, s: 9 }) + '<rect x="80" y="' + (6 + i * 14) + '" width="' + r1(280 * p) + '" height="9" rx="2" fill="' + (HEX[n] || '#888') + '" stroke="' + T.rej + '" stroke-width=".5"/>' + txt(84 + 280 * p, 14 + i * 14, Math.round(p * 100) + ' %', T, { s: 8 }); });
    return o + '</svg>';
  };
  return G;
});
