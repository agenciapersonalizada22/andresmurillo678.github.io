/* Graficas propias en SVG (sin librerias): barras agrupadas, lineas, barras horizontales y dona. Cada una trae resumen accesible y tabla de datos. window.MonGraf */
(function (g) {
  'use strict';
  var U = g.MonUI, h = U.h, G = g.MonGraf = {}, NS = 'http://www.w3.org/2000/svg', W = 360;
  function s(tag, a, kids) { var e = document.createElementNS(NS, tag); for (var k in a || {}) e.setAttribute(k, a[k]); (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return e; }
  function t(x, y, txt, cls, anc) { var e = s('text', { x: x, y: y, 'class': 'mg-t ' + (cls || ''), 'text-anchor': anc || 'middle' }); e.textContent = txt; return e; }
  function nice(max) { if (max <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(max))), f = max / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  function envolver(svg, titulo, resumen, tabla) {
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', titulo + '. ' + resumen);
    var det = tabla ? h('details', { cls: 'mon-det mg-datos' }, [h('summary', { txt: 'Ver datos de la gráfica' }), U.tabla(tabla.cols, tabla.filas, { etq: 'Datos: ' + titulo })]) : null;
    return h('figure', { cls: 'mg-fig' }, [h('figcaption', { txt: titulo }), svg, det]);
  }
  function leyenda(series) { return h('ul', { cls: 'mg-ley' }, series.map(function (x) { return h('li', {}, [h('i', { style: 'background:' + x.color }), x.nombre]); })); }
  function ejeY(svg, min, max, x0, x1, y0, y1, fmt) {
    var paso = nice((max - min) / 4), a = Math.floor(min / paso) * paso, b = Math.ceil(max / paso) * paso, n = Math.round((b - a) / paso);
    for (var i = 0; i <= n; i++) { var v = a + i * paso, y = y1 - (v - a) / (b - a || 1) * (y1 - y0); svg.appendChild(s('line', { x1: x0, x2: x1, y1: y, y2: y, 'class': v === 0 ? 'mg-cero' : 'mg-rej' })); svg.appendChild(t(x0 - 4, y + 3, fmt(v), 'mg-ey', 'end')); }
    return { a: a, b: b };
  }
  /* o: {titulo, labels[], series[{nombre,color,datos[]}], fmt} */
  G.barras = function (o) {
    var H = 210, x0 = 38, x1 = W - 6, y0 = 10, y1 = H - 26, svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'mg-svg', preserveAspectRatio: 'xMidYMid meet' });
    var all = [].concat.apply([], o.series.map(function (x) { return x.datos; })), mx = Math.max.apply(null, all.concat([0])), mn = Math.min.apply(null, all.concat([0]));
    var ej = ejeY(svg, mn, mx || 1, x0, x1, y0, y1, o.fmt || U.compacto), n = o.labels.length, w = (x1 - x0) / n, bw = Math.max(2, Math.min(18, (w - 4) / o.series.length));
    function Y(v) { return y1 - (v - ej.a) / (ej.b - ej.a || 1) * (y1 - y0); }
    o.labels.forEach(function (l, i) {
      var cx = x0 + w * i + w / 2;
      o.series.forEach(function (se, j) { var v = se.datos[i], yy = Y(v), yz = Y(0), bx = cx - bw * o.series.length / 2 + j * bw; svg.appendChild(s('rect', { x: bx, y: Math.min(yy, yz), width: bw - 1, height: Math.max(1, Math.abs(yz - yy)), fill: se.color, rx: 2 }, [s('title', {}, [se.nombre + ' · ' + l + ': ' + (o.fmt || U.compacto)(v)])])); });
      if (n <= 12 || i % 2 === 0) svg.appendChild(t(cx, H - 10, l, 'mg-ex'));
    });
    var res = o.series.map(function (se) { return se.nombre + ' total ' + (o.fmt || U.compacto)(se.datos.reduce(function (a, b) { return a + b; }, 0)); }).join('; ');
    return h('div', {}, [envolver(svg, o.titulo, res, { cols: [{ t: 'Período', k: 'p' }].concat(o.series.map(function (se, j) { return { t: se.nombre, k: 's' + j, der: true }; })), filas: o.labels.map(function (l, i) { var f = { p: l }; o.series.forEach(function (se, j) { f['s' + j] = (o.fmt || U.compacto)(se.datos[i]); }); return f; }) }), leyenda(o.series)]);
  };
  /* lineas: o.series[{nombre,color,datos,punteada}] */
  G.lineas = function (o) {
    var H = 210, x0 = 38, x1 = W - 8, y0 = 10, y1 = H - 26, svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'mg-svg' });
    var all = [].concat.apply([], o.series.map(function (x) { return x.datos; })), mx = Math.max.apply(null, all.concat([0])), mn = Math.min.apply(null, all.concat([0]));
    var ej = ejeY(svg, mn, mx || 1, x0, x1, y0, y1, o.fmt || U.compacto), n = o.labels.length;
    function X(i) { return n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (n - 1); } function Y(v) { return y1 - (v - ej.a) / (ej.b - ej.a || 1) * (y1 - y0); }
    o.labels.forEach(function (l, i) { if (n <= 8 || i % 2 === 0) svg.appendChild(t(X(i), H - 10, l, 'mg-ex')); });
    o.series.forEach(function (se) {
      var d = se.datos.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join('');
      svg.appendChild(s('path', { d: d, fill: 'none', stroke: se.color, 'stroke-width': 2.4, 'stroke-linejoin': 'round', 'stroke-dasharray': se.punteada ? '5 4' : '' }));
      se.datos.forEach(function (v, i) { svg.appendChild(s('circle', { cx: X(i), cy: Y(v), r: 3, fill: se.color }, [s('title', {}, [se.nombre + ' · ' + o.labels[i] + ': ' + (o.fmt || U.compacto)(v)])])); });
    });
    var res = o.series.map(function (se) { return se.nombre + ': de ' + (o.fmt || U.compacto)(se.datos[0]) + ' a ' + (o.fmt || U.compacto)(se.datos[n - 1]); }).join('; ');
    return h('div', {}, [envolver(svg, o.titulo, res, { cols: [{ t: 'Período', k: 'p' }].concat(o.series.map(function (se, j) { return { t: se.nombre, k: 's' + j, der: true }; })), filas: o.labels.map(function (l, i) { var f = { p: l }; o.series.forEach(function (se, j) { f['s' + j] = (o.fmt || U.compacto)(se.datos[i]); }); return f; }) }), leyenda(o.series)]);
  };
  /* barras horizontales: o.filas[{etq,valor}] (negativos en rojo) */
  G.hbarras = function (o) {
    var fm = o.fmt || U.compacto, filas = o.filas.slice(0, o.max || 8), rh = 26, H = Math.max(60, filas.length * rh + 10), x0 = 112, x1 = W - 56, svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'mg-svg' });
    var mx = Math.max.apply(null, filas.map(function (f) { return Math.abs(f.valor); }).concat([1])), neg = filas.some(function (f) { return f.valor < 0; }), z = neg ? x0 + (x1 - x0) / 2 : x0, esc = (neg ? (x1 - x0) / 2 : x1 - x0) / mx;
    svg.appendChild(s('line', { x1: z, x2: z, y1: 2, y2: H - 2, 'class': 'mg-cero' }));
    filas.forEach(function (f, i) {
      var y = 6 + i * rh, w = Math.abs(f.valor) * esc, et = f.etq.length > 17 ? f.etq.slice(0, 16) + '…' : f.etq;
      svg.appendChild(t(x0 - 6, y + 13, et, 'mg-ey', 'end'));
      svg.appendChild(s('rect', { x: f.valor < 0 ? z - w : z, y: y, width: Math.max(1.5, w), height: 17, rx: 3, fill: f.valor < 0 ? 'var(--c-gas)' : (o.color || 'var(--c-ing)') }, [s('title', {}, [f.etq + ': ' + fm(f.valor)])]));
      svg.appendChild(t(f.valor < 0 ? z - w - 4 : z + w + 4, y + 13, fm(f.valor) + (f.nota || ''), 'mg-ey', f.valor < 0 ? 'end' : 'start'));
    });
    return envolver(svg, o.titulo, filas.length ? filas.map(function (f) { return f.etq + ' ' + fm(f.valor); }).join('; ') : 'sin datos', { cols: [{ t: 'Concepto', k: 'e' }, { t: 'Valor', k: 'v', der: true }], filas: filas.map(function (f) { return { e: f.etq, v: fm(f.valor) + (f.nota || '') }; }) });
  };
  var PAL = ['var(--m1)', 'var(--m2)', 'var(--m3)', 'var(--m4)', 'var(--m5)', 'var(--m6)'];
  G.pal = function (i) { return PAL[i % PAL.length]; };
  G.dona = function (o) {
    var fm = o.fmt || U.dinero, filas = o.filas.filter(function (f) { return f.valor > 0; }), tot = filas.reduce(function (a, f) { return a + f.valor; }, 0), svg = s('svg', { viewBox: '0 0 160 160', 'class': 'mg-dona' }), a0 = -Math.PI / 2, R = 62, r = 38;
    if (!tot) return h('p', { cls: 'tr-vacio', txt: 'Sin datos todavía.' });
    var vis = filas.slice(0, 5), resto = filas.slice(5).reduce(function (a, f) { return a + f.valor; }, 0); if (resto) vis.push({ etq: 'Otros', valor: resto });
    vis.forEach(function (f, i) {
      var a1 = a0 + f.valor / tot * Math.PI * 2, gr = a1 - a0 >= Math.PI * 2 - 1e-6 ? Math.PI * 2 - 1e-4 : a1 - a0, b1 = a0 + gr, lg = gr > Math.PI ? 1 : 0;
      var P = function (rr, a) { return (80 + rr * Math.cos(a)).toFixed(2) + ' ' + (80 + rr * Math.sin(a)).toFixed(2); };
      svg.appendChild(s('path', { d: 'M' + P(R, a0) + 'A' + R + ' ' + R + ' 0 ' + lg + ' 1 ' + P(R, b1) + 'L' + P(r, b1) + 'A' + r + ' ' + r + ' 0 ' + lg + ' 0 ' + P(r, a0) + 'Z', fill: PAL[i % PAL.length], stroke: 'var(--panel)', 'stroke-width': 1.5 }, [s('title', {}, [f.etq + ': ' + fm(f.valor)])])); a0 = a1;
    });
    svg.appendChild(t(80, 78, 'Total', 'mg-ey'));
    svg.appendChild(t(80, 94, U.compacto(tot), 'mg-dona-v'));
    var ley = h('ul', { cls: 'mg-ley mg-ley-v' }, vis.map(function (f, i) { return h('li', {}, [h('i', { style: 'background:' + PAL[i % PAL.length] }), f.etq + ' · ' + fm(f.valor) + ' (' + U.num(f.valor / tot * 100, 0) + ' %)']); }));
    var fig = envolver(svg, o.titulo, vis.map(function (f) { return f.etq + ' ' + U.num(f.valor / tot * 100, 0) + '%'; }).join('; '), null);
    return h('div', { cls: 'mg-dona-caja' }, [fig, ley]);
  };
})(window);
