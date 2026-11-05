/* Calculos de rendimiento sobre metricas manuales. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.Metricas = m; })(typeof self !== 'undefined' ? self : this, function () {
  var CLAVES = ['vistas', 'likes', 'comentarios', 'compartidos', 'clics'];
  function val(p, k) { return +((p.metricas || {})[k]) || 0; }
  function interacciones(p) { return val(p, 'likes') + val(p, 'comentarios') + val(p, 'compartidos'); }
  function engagement(p) { var v = val(p, 'vistas'); return v > 0 ? interacciones(p) / v * 100 : null; }
  function valor(p, m) { return m === 'engagement' ? engagement(p) : m === 'interacciones' ? interacciones(p) : val(p, m); }
  function agrupar(pubs, dim, metrica) {
    var mp = {};
    pubs.forEach(function (p) { var v = valor(p, metrica); if (v == null) return; var k = (dim === 'hora' ? (p.hora || '').slice(0, 2) + ':00' : p[dim]) || '(sin ' + dim + ')'; var o = mp[k] = mp[k] || { clave: k, n: 0, suma: 0 }; o.n++; o.suma += v; });
    return Object.keys(mp).map(function (k) { var o = mp[k]; o.promedio = o.suma / o.n; return o; }).sort(function (a, b) { return b.promedio - a.promedio; });
  }
  function serie(pubs, metrica) { return pubs.filter(function (p) { return p.fecha && valor(p, metrica) != null; }).sort(function (a, b) { return (a.fecha + (a.hora || '')) < (b.fecha + (b.hora || '')) ? -1 : 1; }).map(function (p) { return { fecha: p.fecha, valor: valor(p, metrica), titulo: p.titulo, red: p.red, id: p.id }; }); }
  function totales(pubs) { var t = { n: pubs.length }; CLAVES.forEach(function (k) { t[k] = pubs.reduce(function (a, p) { return a + val(p, k); }, 0); }); t.engagement = t.vistas ? (t.likes + t.comentarios + t.compartidos) / t.vistas * 100 : null; return t; }
  function mejoresHoras(pubs, red, metrica, minimo) {
    var l = agrupar(pubs.filter(function (p) { return p.estado === 'publicado' && (!red || p.red === red); }), 'hora', metrica || 'vistas');
    return l.filter(function (x) { return x.n >= (minimo || 1); }).slice(0, 3);
  }
  return { CLAVES: CLAVES, engagement: engagement, interacciones: interacciones, valor: valor, agrupar: agrupar, serie: serie, totales: totales, mejoresHoras: mejoresHoras };
});
