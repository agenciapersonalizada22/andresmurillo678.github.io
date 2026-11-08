/* Graficas propias en canvas (lineas con proyeccion, barras). Colores desde las variables del tema. window.CGraf */
(function (g) {
  'use strict';
  var G = g.CGraf = {}, M = g.CIA.metricas;
  function css(n, d) { var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || d; }
  function prep(c, w, hh) { var r = g.devicePixelRatio || 1; c.width = Math.round(w * r); c.height = Math.round(hh * r); c.style.width = '100%'; c.style.height = hh + 'px'; var x = c.getContext('2d'); x.setTransform(r, 0, 0, r, 0, 0); x.clearRect(0, 0, w, hh); return x; }
  function ejes(x, w, hh, esc, fechas, m) {
    x.font = '12px system-ui, sans-serif'; x.fillStyle = css('--suave', '#666'); x.strokeStyle = css('--borde', '#ddd'); x.lineWidth = 1; x.textBaseline = 'middle'; x.textAlign = 'right';
    esc.marcas.forEach(function (v) { var y = m.t + (1 - (v - esc.min) / (esc.max - esc.min)) * (hh - m.t - m.b); x.beginPath(); x.moveTo(m.l, y); x.lineTo(w - m.r, y); x.stroke(); x.fillText(v >= 1000 ? (v / 1000) + 'k' : String(v), m.l - 6, y); });
    x.textAlign = 'center'; x.textBaseline = 'top'; var k = Math.min(fechas.length, Math.max(2, Math.floor((w - m.l - m.r) / 70))); for (var i = 0; i < k; i++) { var j = k === 1 ? 0 : Math.round(i * (fechas.length - 1) / (k - 1)); x.fillText(fechas[j].slice(5), m.l + (fechas.length === 1 ? 0 : j / (fechas.length - 1)) * (w - m.l - m.r), hh - m.b + 6); }
  }
  /* series: [{nombre, color, puntos:[{fecha,valor}], proy:[{fecha,valor}]?}] */
  G.linea = function (canvas, series, o) {
    o = o || {}; var w = Math.max(240, canvas.parentNode.clientWidth || 320), hh = o.alto || 220, x = prep(canvas, w, hh), m = { l: 44, r: 12, t: 12, b: 28 };
    var todas = []; series.forEach(function (s) { s.puntos.concat(s.proy || []).forEach(function (p) { todas.push(p); }); });
    if (!todas.length) { x.fillStyle = css('--suave', '#666'); x.font = '14px system-ui'; x.textAlign = 'center'; x.fillText('Sin datos', w / 2, hh / 2); return; }
    var fechas = Object.keys(todas.reduce(function (a, p) { a[p.fecha] = 1; return a; }, {})).sort(), vals = todas.map(function (p) { return p.valor; }), esc = M.escala(Math.min.apply(null, vals.concat(o.cero ? [0] : [])), Math.max.apply(null, vals)), t0 = Date.parse(fechas[0]), t1 = Date.parse(fechas[fechas.length - 1]) || t0 + 1;
    ejes(x, w, hh, esc, fechas, m);
    function px(f) { return m.l + (t1 === t0 ? 0 : (Date.parse(f) - t0) / (t1 - t0)) * (w - m.l - m.r); } function py(v) { return m.t + (1 - (v - esc.min) / (esc.max - esc.min)) * (hh - m.t - m.b); }
    series.forEach(function (s) {
      x.strokeStyle = s.color; x.fillStyle = s.color; x.lineWidth = 2.5; x.lineJoin = 'round'; x.setLineDash([]); x.beginPath(); s.puntos.forEach(function (p, i) { i ? x.lineTo(px(p.fecha), py(p.valor)) : x.moveTo(px(p.fecha), py(p.valor)); }); x.stroke();
      s.puntos.forEach(function (p) { x.beginPath(); x.arc(px(p.fecha), py(p.valor), 3.5, 0, 6.3); x.fill(); });
      if (s.proy && s.proy.length) { x.setLineDash([6, 5]); x.lineWidth = 2; x.beginPath(); var u = s.puntos[s.puntos.length - 1]; x.moveTo(px(u.fecha), py(u.valor)); s.proy.forEach(function (p) { x.lineTo(px(p.fecha), py(p.valor)); }); x.stroke(); x.setLineDash([]); }
    });
  };
  G.barras = function (canvas, datos, o) {
    o = o || {}; var w = Math.max(240, canvas.parentNode.clientWidth || 320), hh = o.alto || 200, x = prep(canvas, w, hh), m = { l: 44, r: 12, t: 12, b: 28 };
    if (!datos.length) { x.fillStyle = css('--suave', '#666'); x.font = '14px system-ui'; x.textAlign = 'center'; x.fillText('Sin datos', w / 2, hh / 2); return; }
    var esc = M.escala(0, Math.max.apply(null, datos.map(function (d) { return d.valor; })) || 1); ejes(x, w, hh, esc, ['00-00'], m);
    var bw = Math.min(56, (w - m.l - m.r) / datos.length * 0.7), paso = (w - m.l - m.r) / datos.length;
    datos.forEach(function (d, i) { var cx = m.l + paso * (i + 0.5), y = m.t + (1 - d.valor / esc.max) * (hh - m.t - m.b); x.fillStyle = d.color || css('--acento', '#3e63dd'); x.fillRect(cx - bw / 2, y, bw, hh - m.b - y); x.fillStyle = css('--suave', '#666'); x.textAlign = 'center'; x.textBaseline = 'top'; x.font = '12px system-ui'; x.fillText(String(d.etq).slice(0, 10), cx, hh - m.b + 6); });
  };
  /* tabla accesible equivalente */
  G.tabla = function (cabeceras, filas) {
    var h = g.Tr.h; return h('div', { style: 'overflow-x:auto' }, [h('table', { cls: 'cia-tabla' }, [h('thead', {}, [h('tr', {}, cabeceras.map(function (c) { return h('th', { scope: 'col', txt: c }); }))]), h('tbody', {}, filas.map(function (f) { return h('tr', {}, f.map(function (c) { return h('td', { txt: String(c) }); })); }))])]);
  };
})(window);
