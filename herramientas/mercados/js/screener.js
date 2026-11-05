/* Metricas por activo y reglas del screener. UMD. */
(function (root, factory) {
  var dep = function (n, f) { return typeof require === 'function' && typeof module !== 'undefined' ? require('./' + f) : root[n]; };
  var m = factory(dep('Indicadores', 'indicadores.js'), dep('Riesgo', 'riesgo.js')); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.Screener = m;
})(typeof self !== 'undefined' ? self : this, function (I, R) {
  var CAMPOS = {
    precio: 'Precio', cambio24h: 'Cambio 24h %', cambio7d: 'Cambio 7d %', capitalizacion: 'Capitalizacion', volumen: 'Volumen 24h',
    rsi14: 'RSI(14)', sma20: 'SMA 20', sma50: 'SMA 50', sma200: 'SMA 200', ema12: 'EMA 12', ema26: 'EMA 26', macdHist: 'Histograma MACD', pctB: '%B Bollinger',
    atrPct: 'ATR(14) % del precio', adx14: 'ADX(14)', vol30: 'Volatilidad 30d anual %', dd: 'Drawdown actual %', distMax: 'Distancia a maximo 52s %', ret30: 'Rendimiento 30d %', ret90: 'Rendimiento 90d %'
  };
  var OPS = ['<', '>', '<=', '>=', '='];
  function ult(a) { return a.length ? a[a.length - 1] : NaN; }
  function metricas(velas) {
    var c = I.col(velas, 4), h = I.col(velas, 2), l = I.col(velas, 3), n = c.length, m = { precio: c[n - 1] };
    m.rsi14 = ult(I.rsi(c, 14)); m.sma20 = ult(I.sma(c, 20)); m.sma50 = ult(I.sma(c, 50)); m.sma200 = ult(I.sma(c, 200));
    m.ema12 = ult(I.ema(c, 12)); m.ema26 = ult(I.ema(c, 26)); m.macdHist = ult(I.macd(c).hist); m.pctB = ult(I.bollinger(c, 20, 2).pctB);
    m.atrPct = ult(I.atr(h, l, c, 14)) / c[n - 1] * 100; m.adx14 = ult(I.adx(h, l, c, 14).adx);
    m.vol30 = R.volHist(c, 30, 365) * 100;
    var w = c.slice(-365), mx = Math.max.apply(null, w); m.dd = (c[n - 1] / mx - 1) * 100; m.distMax = m.dd;
    m.ret30 = n > 30 ? (c[n - 1] / c[n - 31] - 1) * 100 : NaN; m.ret90 = n > 90 ? (c[n - 1] / c[n - 91] - 1) * 100 : NaN;
    return m;
  }
  /* regla: {campo, op, valor} o {campo, op, ref: otroCampo} */
  function evaluarRegla(r, m) {
    var a = m[r.campo], b = r.ref ? m[r.ref] : Number(r.valor);
    if (a == null || b == null || !isFinite(a) || !isFinite(b)) return false;
    switch (r.op) { case '<': return a < b; case '>': return a > b; case '<=': return a <= b; case '>=': return a >= b; case '=': return a === b; }
    return false;
  }
  function evaluar(reglas, m) { return reglas.every(function (r) { return evaluarRegla(r, m); }); }
  function describir(r) { return (CAMPOS[r.campo] || r.campo) + ' ' + r.op + ' ' + (r.ref ? (CAMPOS[r.ref] || r.ref) : r.valor); }
  return { CAMPOS: CAMPOS, OPS: OPS, metricas: metricas, evaluarRegla: evaluarRegla, evaluar: evaluar, describir: describir };
});
