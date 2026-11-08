/* Graficas propias en SVG/HTML (sin librerias). Cada una devuelve un <figure> con resumen accesible y tabla «Ver datos». window.AnaGraf */
(function (g) {
  'use strict';
  var h = g.Tr.h, G = g.AnaGraf = {}, NS = 'http://www.w3.org/2000/svg', PAL = ['var(--g1)', 'var(--g2)', 'var(--g3)', 'var(--g4)', 'var(--g5)', 'var(--g6)'];
  G.PAL = PAL;
  function num(v, dec) { return (+v).toLocaleString('es', { maximumFractionDigits: dec == null ? 2 : dec }); }
  G.num = num;
  function svg(w, hh, label) { var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 ' + w + ' ' + hh); s.setAttribute('role', 'img'); s.setAttribute('aria-label', label); s.setAttribute('class', 'an-svg'); return s; }
  function el(p, tag, a, txt) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; p.appendChild(e); return e; }
  function figura(titulo, nodo, resumen, filas, leyenda) {
    var f = h('figure', { cls: 'an-fig' }, [titulo ? h('figcaption', { txt: titulo }) : null, nodo]);
    if (leyenda) f.appendChild(h('ul', { cls: 'an-ley' }, leyenda.map(function (l) { return h('li', {}, [h('i', { style: 'background:' + l.color, 'aria-hidden': 'true' }), l.etq]); })));
    if (filas && filas.length) {
      var t = h('table', { cls: 'an-tabla' }, [h('tbody', {}, filas.map(function (r) { return h('tr', {}, r.map(function (c, i) { return h(i ? 'td' : 'th', { txt: String(c) }); })); }))]);
      f.appendChild(h('details', { cls: 'an-det' }, [h('summary', { txt: 'Ver datos' }), t]));
    }
    f.setAttribute('aria-label', (titulo ? titulo + '. ' : '') + resumen); return f;
  }
  function vacio(titulo, msg) { return h('figure', { cls: 'an-fig an-fig-vacia' }, [titulo ? h('figcaption', { txt: titulo }) : null, h('p', { cls: 'tr-vacio', txt: msg || 'Sin datos' })]); }
  G.vacio = vacio;

  G.barras = function (o) {
    var d = o.datos || [], W = 320, H = o.alto || 150, pl = 6, pb = 20, pt = 16, n = d.length;
    if (!n || d.every(function (x) { return !x.valor; })) return vacio(o.titulo, o.vacio || 'Sin actividad en este periodo');
    var mx = Math.max.apply(null, d.map(function (x) { return x.valor; }).concat([1])), bw = (W - pl * 2) / n, s = svg(W, H, o.titulo + ': ' + d.length + ' barras, máximo ' + num(mx));
    el(s, 'line', { x1: pl, x2: W - pl, y1: H - pb, y2: H - pb, class: 'an-eje' });
    d.forEach(function (x, i) {
      var bh = (H - pb - pt) * x.valor / mx, bx = pl + i * bw + bw * 0.12;
      el(s, 'rect', { x: bx.toFixed(1), y: (H - pb - bh).toFixed(1), width: (bw * 0.76).toFixed(1), height: Math.max(x.valor ? 1.5 : 0, bh).toFixed(1), rx: 2, style: 'fill:' + (x.color || o.color || PAL[0]) });
      if (n <= 14 || i === 0 || i === n - 1 || i % Math.ceil(n / 6) === 0) el(s, 'text', { x: (bx + bw * 0.38).toFixed(1), y: H - 6, 'text-anchor': 'middle', class: 'an-et' }, String(x.etq).slice(n > 8 ? -5 : -8));
      if (x.valor === mx) el(s, 'text', { x: (bx + bw * 0.38).toFixed(1), y: Math.max(11, H - pb - bh - 3).toFixed(1), 'text-anchor': 'middle', class: 'an-val' }, num(x.valor, 1));
    });
    return figura(o.titulo, s, 'máximo ' + num(mx) + (o.unidad ? ' ' + o.unidad : ''), d.map(function (x) { return [x.etq, num(x.valor) + (o.unidad ? ' ' + o.unidad : '')]; }));
  };
  G.agrupadas = function (o) {
    var et = o.etqs || [], ss = o.series || [], W = 320, H = o.alto || 160, pb = 20, pt = 14, pl = 4;
    var mx = 1; ss.forEach(function (s) { s.datos.forEach(function (v) { if (Math.abs(v) > mx) mx = Math.abs(v); }); });
    if (!et.length || !ss.length || ss.every(function (s) { return s.datos.every(function (v) { return !v; }); })) return vacio(o.titulo, o.vacio);
    var gw = (W - pl * 2) / et.length, bw = gw * 0.8 / ss.length, s = svg(W, H, o.titulo + ': ' + ss.map(function (x) { return x.nombre; }).join(' y ') + ' por ' + et.length + ' periodos'), y0 = H - pb;
    el(s, 'line', { x1: pl, x2: W - pl, y1: y0, y2: y0, class: 'an-eje' });
    et.forEach(function (e, i) {
      ss.forEach(function (se, j) { var v = se.datos[i] || 0, bh = (H - pb - pt) * Math.abs(v) / mx; el(s, 'rect', { x: (pl + i * gw + gw * 0.1 + j * bw).toFixed(1), y: (v >= 0 ? y0 - bh : y0).toFixed(1), width: (bw - 1).toFixed(1), height: Math.max(v ? 1.5 : 0, bh).toFixed(1), rx: 2, style: 'fill:' + se.color }); });
      el(s, 'text', { x: (pl + i * gw + gw / 2).toFixed(1), y: H - 6, 'text-anchor': 'middle', class: 'an-et' }, String(e).slice(-5));
    });
    el(s, 'text', { x: W - pl, y: 10, 'text-anchor': 'end', class: 'an-val' }, 'máx. ' + num(mx, 0));
    return figura(o.titulo, s, 'máximo ' + num(mx, 0), et.map(function (e, i) { return [e].concat(ss.map(function (se) { return num(se.datos[i] || 0); })); }), ss.map(function (x) { return { etq: x.nombre, color: x.color }; }));
  };
  G.linea = function (o) {
    var et = o.etqs || [], ss = o.series || [], W = 320, H = o.alto || 140, pl = 6, pr = 6, pt = 12, pb = 20;
    var vals = []; ss.forEach(function (s) { s.datos.forEach(function (v) { if (v != null) vals.push(v); }); });
    if (et.length < 2 || !vals.length) return vacio(o.titulo, o.vacio || 'Hacen falta al menos dos puntos');
    var mn = Math.min.apply(null, vals.concat([0])), mx = Math.max.apply(null, vals.concat([1])), rg = mx - mn || 1, s = svg(W, H, o.titulo + ': de ' + num(vals[0]) + ' a ' + num(vals[vals.length - 1]));
    function X(i) { return pl + (W - pl - pr) * i / (et.length - 1); } function Y(v) { return pt + (H - pt - pb) * (1 - (v - mn) / rg); }
    el(s, 'line', { x1: pl, x2: W - pr, y1: Y(mn), y2: Y(mn), class: 'an-eje' });
    ss.forEach(function (se) {
      var pts = [], seg = []; se.datos.forEach(function (v, i) { if (v == null) { if (seg.length) pts.push(seg); seg = []; } else seg.push([X(i), Y(v)]); }); if (seg.length) pts.push(seg);
      pts.forEach(function (sg) { el(s, 'polyline', { points: sg.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '), fill: 'none', 'stroke-width': 2.2, 'stroke-linejoin': 'round', style: 'stroke:' + se.color }); if (sg.length < 40) sg.forEach(function (p) { el(s, 'circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 2.6, style: 'fill:' + se.color }); }); });
    });
    el(s, 'text', { x: pl, y: H - 6, class: 'an-et' }, String(et[0]).slice(-5)); el(s, 'text', { x: W - pr, y: H - 6, 'text-anchor': 'end', class: 'an-et' }, String(et[et.length - 1]).slice(-5)); el(s, 'text', { x: W - pr, y: 9, 'text-anchor': 'end', class: 'an-val' }, 'máx. ' + num(mx, 1));
    return figura(o.titulo, s, 'rango ' + num(mn) + ' a ' + num(mx), et.map(function (e, i) { return [e].concat(ss.map(function (se) { return se.datos[i] == null ? '—' : num(se.datos[i]); })); }), ss.length > 1 ? ss.map(function (x) { return { etq: x.nombre, color: x.color }; }) : null);
  };
  G.dona = function (o) {
    var p = (o.partes || []).filter(function (x) { return x.valor > 0; }), tot = p.reduce(function (a, x) { return a + x.valor; }, 0);
    if (!tot) return vacio(o.titulo, o.vacio);
    var s = svg(120, 120, o.titulo + ': ' + p.map(function (x) { return x.etq + ' ' + Math.round(100 * x.valor / tot) + ' %'; }).join(', ')), R = 46, C = 2 * Math.PI * R, off = 0;
    p.forEach(function (x, i) { var len = C * x.valor / tot; el(s, 'circle', { cx: 60, cy: 60, r: R, fill: 'none', 'stroke-width': 18, 'stroke-dasharray': len.toFixed(2) + ' ' + (C - len).toFixed(2), 'stroke-dashoffset': (-off).toFixed(2), transform: 'rotate(-90 60 60)', style: 'stroke:' + (x.color || PAL[i % PAL.length]) }); off += len; });
    el(s, 'text', { x: 60, y: 58, 'text-anchor': 'middle', class: 'an-dona-n' }, o.centro != null ? String(o.centro) : num(tot, 0)); el(s, 'text', { x: 60, y: 72, 'text-anchor': 'middle', class: 'an-et' }, o.centroEtq || '');
    return figura(o.titulo, s, p.length + ' partes', p.map(function (x) { return [x.etq, num(x.valor) + ' (' + Math.round(100 * x.valor / tot) + ' %)']; }), p.map(function (x, i) { return { etq: x.etq + ' · ' + num(x.valor, 0), color: x.color || PAL[i % PAL.length] }; }));
  };
  /* barras horizontales en HTML: texto siempre legible y se adaptan al ancho */
  G.hbarras = function (o) {
    var it = (o.items || []), mx = Math.max.apply(null, it.map(function (x) { return x.valor; }).concat([o.max || 0, 1e-9]));
    if (!it.length) return vacio(o.titulo, o.vacio);
    var ul = h('ul', { cls: 'an-hb' }, it.map(function (x, i) {
      return h('li', {}, [h('span', { cls: 'an-hb-e', txt: x.etq }), h('span', { cls: 'an-hb-b', 'aria-hidden': 'true' }, [h('i', { style: 'width:' + Math.max(1.5, 100 * x.valor / mx).toFixed(1) + '%;background:' + (x.color || o.color || PAL[i % PAL.length]) })]), h('span', { cls: 'an-hb-v', txt: x.texto != null ? x.texto : num(x.valor) })]);
    }));
    return h('figure', { cls: 'an-fig' }, [o.titulo ? h('figcaption', { txt: o.titulo }) : null, ul]);
  };
  /* medidor de porcentaje (0..1) con nivel */
  G.medidor = function (pct, nivel, etq) {
    var v = Math.max(0, Math.min(1, pct || 0)); return h('div', { cls: 'an-med an-' + (nivel || 'ok'), role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(v * 100), 'aria-label': etq || 'Uso' }, [h('i', { style: 'width:' + (v * 100).toFixed(1) + '%' })]);
  };
})(window);
