/* Estadisticas de riesgo/rendimiento. UMD. */
(function (root, factory) { var m = factory(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.Riesgo = m; })(typeof self !== 'undefined' ? self : this, function () {
  function retornos(c) { var o = []; for (var i = 1; i < c.length; i++) o.push(c[i] / c[i - 1] - 1); return o; }
  function retornosLog(c) { var o = []; for (var i = 1; i < c.length; i++) o.push(Math.log(c[i] / c[i - 1])); return o; }
  function media(x) { var s = 0; for (var i = 0; i < x.length; i++) s += x[i]; return x.length ? s / x.length : NaN; }
  function desv(x) { if (x.length < 2) return NaN; var m = media(x), s = 0; for (var i = 0; i < x.length; i++) s += (x[i] - m) * (x[i] - m); return Math.sqrt(s / (x.length - 1)); }
  function volHist(c, n, anual) { n = n || 30; anual = anual || 365; var r = retornosLog(c).slice(-n); return desv(r) * Math.sqrt(anual); }
  function volSerie(c, n, anual) {
    n = n || 30; anual = anual || 365; var r = retornosLog(c), o = new Array(c.length).fill(NaN);
    for (var i = n; i < c.length; i++) o[i] = desv(r.slice(i - n, i)) * Math.sqrt(anual);
    return o;
  }
  function drawdown(c) { var m = -Infinity; return c.map(function (v) { if (v > m) m = v; return v / m - 1; }); }
  function maxDrawdown(c) {
    var pico = 0, mx = 0, d = 0, h = 0, dp = 0;
    for (var i = 0; i < c.length; i++) {
      if (c[i] > c[pico]) pico = i;
      var q = c[i] / c[pico] - 1;
      if (q < mx) { mx = q; d = pico; h = i; }
    }
    return { max: mx, desde: d, hasta: h };
  }
  function sharpe(r, rfAnual, periodos) {
    periodos = periodos || 365; rfAnual = rfAnual || 0;
    var ex = r.map(function (v) { return v - rfAnual / periodos; }), s = desv(ex);
    return s ? media(ex) / s * Math.sqrt(periodos) : NaN;
  }
  function cov(a, b) { var ma = media(a), mb = media(b), s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb); return s / (a.length - 1); }
  function beta(r, rb) { var n = Math.min(r.length, rb.length); r = r.slice(-n); rb = rb.slice(-n); var v = cov(rb, rb); return v ? cov(r, rb) / v : NaN; }
  function correl(a, b) { var n = Math.min(a.length, b.length); a = a.slice(-n); b = b.slice(-n); var d = desv(a) * desv(b); return d ? cov(a, b) / d : NaN; }
  function cagr(ini, fin, dias) { return dias > 0 && ini > 0 ? Math.pow(fin / ini, 365 / dias) - 1 : NaN; }
  function dia(t) { return Math.floor(t / 86400000); }
  /* series: [{id, velas}] -> {dias:[..], cierres:{id:[..]}} usando solo los dias comunes (cierre del dia) */
  function alinear(series) {
    var mapas = series.map(function (s) { var m = {}; s.velas.forEach(function (b) { m[dia(b[0])] = b[4]; }); return m; });
    var dias = Object.keys(mapas[0] || {}).map(Number).filter(function (d) { return mapas.every(function (m) { return m[d] != null; }); }).sort(function (a, b) { return a - b; });
    var out = {}; series.forEach(function (s, i) { out[s.id] = dias.map(function (d) { return mapas[i][d]; }); });
    return { dias: dias, cierres: out };
  }
  function matrizCorrelacion(series) {
    var al = alinear(series), ids = series.map(function (s) { return s.id; }), r = ids.map(function (id) { return retornos(al.cierres[id]); });
    return { ids: ids, n: al.dias.length - 1, m: ids.map(function (_, i) { return ids.map(function (_, j) { return i === j ? 1 : correl(r[i], r[j]); }); }) };
  }
  function normalizar(c, base) { base = base || 100; return c.map(function (v) { return v / c[0] * base; }); }
  return { retornos: retornos, retornosLog: retornosLog, media: media, desv: desv, volHist: volHist, volSerie: volSerie, drawdown: drawdown, maxDrawdown: maxDrawdown,
    sharpe: sharpe, beta: beta, correl: correl, cov: cov, cagr: cagr, alinear: alinear, matrizCorrelacion: matrizCorrelacion, normalizar: normalizar };
});
