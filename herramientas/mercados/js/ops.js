/* Operaciones pesadas: se ejecutan en el Web Worker (o en el hilo principal si no hay Worker). UMD. */
(function (root, factory) {
  var dep = function (n, f) { return typeof require === 'function' && typeof module !== 'undefined' ? require('./' + f) : root[n]; };
  var m = factory(dep('Indicadores', 'indicadores.js'), dep('Riesgo', 'riesgo.js'), dep('Patrones', 'patrones.js'), dep('Backtest', 'backtest.js'), dep('Screener', 'screener.js'));
  if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.Ops = m;
})(typeof self !== 'undefined' ? self : this, function (I, R, P, B, S) {
  /* Catalogo de indicadores del grafico. Cada uno devuelve una capa: {panel, capas:[{k, n, valores|sup/inf/a/b, ancho?}], niveles?, rango?} */
  var CATALOGO = {
    sma: { nombre: 'SMA', panel: 'precio', params: { n: 20 } }, ema: { nombre: 'EMA', panel: 'precio', params: { n: 50 } }, wma: { nombre: 'WMA', panel: 'precio', params: { n: 20 } },
    bb: { nombre: 'Bollinger', panel: 'precio', params: { n: 20, k: 2 } }, ichimoku: { nombre: 'Ichimoku', panel: 'precio', params: {} }, vwap: { nombre: 'VWAP', panel: 'precio', params: {} },
    rsi: { nombre: 'RSI', panel: 'sub', params: { n: 14 } }, macd: { nombre: 'MACD', panel: 'sub', params: { r: 12, l: 26, s: 9 } }, estoc: { nombre: 'Estocastico', panel: 'sub', params: { n: 14, k: 3, d: 3 } },
    atr: { nombre: 'ATR', panel: 'sub', params: { n: 14 } }, adx: { nombre: 'ADX', panel: 'sub', params: { n: 14 } }, obv: { nombre: 'OBV', panel: 'sub', params: {} },
    vol: { nombre: 'Volatilidad 30d', panel: 'sub', params: { n: 30 } }, dd: { nombre: 'Drawdown', panel: 'sub', params: {} }
  };
  function indicador(velas, id, p) {
    var c = I.col(velas, 4), h = I.col(velas, 2), l = I.col(velas, 3), v = I.col(velas, 5), q = Object.assign({}, CATALOGO[id].params, p || {});
    switch (id) {
      case 'sma': return { panel: 'precio', capas: [{ k: 'linea', n: 'SMA ' + q.n, valores: I.sma(c, q.n) }] };
      case 'ema': return { panel: 'precio', capas: [{ k: 'linea', n: 'EMA ' + q.n, valores: I.ema(c, q.n) }] };
      case 'wma': return { panel: 'precio', capas: [{ k: 'linea', n: 'WMA ' + q.n, valores: I.wma(c, q.n) }] };
      case 'bb': { var b = I.bollinger(c, q.n, q.k); return { panel: 'precio', capas: [{ k: 'banda', n: 'BB ' + q.n + ',' + q.k, sup: b.sup, inf: b.inf }, { k: 'linea', n: 'BB media', valores: b.mid, ancho: 1 }] }; }
      case 'ichimoku': { var k = I.ichimoku(h, l, c); return { panel: 'precio', capas: [{ k: 'nube', n: 'Nube', a: k.spanA, b: k.spanB }, { k: 'linea', n: 'Tenkan', valores: k.tenkan }, { k: 'linea', n: 'Kijun', valores: k.kijun }, { k: 'linea', n: 'Chikou', valores: k.chikou, ancho: 1 }] }; }
      case 'vwap': return { panel: 'precio', capas: [{ k: 'linea', n: 'VWAP', valores: I.vwap(velas) }] };
      case 'rsi': return { panel: 'sub', rango: [0, 100], niveles: [30, 70], capas: [{ k: 'linea', n: 'RSI ' + q.n, valores: I.rsi(c, q.n) }] };
      case 'macd': { var m = I.macd(c, q.r, q.l, q.s); return { panel: 'sub', capas: [{ k: 'barras', n: 'Hist', valores: m.hist }, { k: 'linea', n: 'MACD', valores: m.macd }, { k: 'linea', n: 'Senal', valores: m.senal }], niveles: [0] }; }
      case 'estoc': { var s = I.estocastico(h, l, c, q.n, q.k, q.d); return { panel: 'sub', rango: [0, 100], niveles: [20, 80], capas: [{ k: 'linea', n: '%K', valores: s.k }, { k: 'linea', n: '%D', valores: s.d }] }; }
      case 'atr': return { panel: 'sub', capas: [{ k: 'linea', n: 'ATR ' + q.n, valores: I.atr(h, l, c, q.n) }] };
      case 'adx': { var a = I.adx(h, l, c, q.n); return { panel: 'sub', rango: [0, 100], niveles: [25], capas: [{ k: 'linea', n: 'ADX', valores: a.adx }, { k: 'linea', n: '+DI', valores: a.pdi, ancho: 1 }, { k: 'linea', n: '-DI', valores: a.mdi, ancho: 1 }] }; }
      case 'obv': return { panel: 'sub', capas: [{ k: 'linea', n: 'OBV', valores: I.obv(c, v) }] };
      case 'vol': return { panel: 'sub', capas: [{ k: 'linea', n: 'Vol. hist. anual', valores: R.volSerie(c, q.n, 365) }] };
      case 'dd': return { panel: 'sub', niveles: [0], capas: [{ k: 'barras', n: 'Drawdown', valores: R.drawdown(c).map(function (x) { return x * 100; }) }] };
    }
    throw new Error('Indicador desconocido ' + id);
  }
  var OPS = {
    capas: function (a) { return a.specs.map(function (s) { var r = indicador(a.velas, s.id, s.params); r.id = s.id; r.uid = s.uid || s.id; return r; }); },
    backtest: function (a) { return B.ejecutar(a.velas, a.estrategia, a.opciones); },
    metricas: function (a) { return a.items.map(function (x) { return { key: x.key, m: S.metricas(x.velas) }; }); },
    patrones: function (a) { return P.detectar(a.velas, a.ultimas); },
    resumen: function (a) {
      var c = I.col(a.velas, 4), mdd = R.maxDrawdown(c), r = R.retornos(c), o = { vol30: R.volHist(c, 30, 365), maxDD: mdd, sharpe: R.sharpe(r, 0, 365), sr: I.nivelesSR(a.velas), piv: I.pivotes(a.velas[a.velas.length - 2 < 0 ? 0 : a.velas.length - 2][2], a.velas[Math.max(0, a.velas.length - 2)][3], a.velas[Math.max(0, a.velas.length - 2)][4]) };
      if (a.bench) { var al = R.alinear([{ id: 'x', velas: a.velas }, { id: 'b', velas: a.bench }]), rx = R.retornos(al.cierres.x), rb = R.retornos(al.cierres.b); o.beta = R.beta(rx, rb); o.correl = R.correl(rx, rb); o.nComun = al.dias.length; }
      return o;
    },
    correlacion: function (a) { return R.matrizCorrelacion(a.series); }
  };
  function ejecutar(op, args) { if (!OPS[op]) throw new Error('Operacion desconocida ' + op); return OPS[op](args); }
  return { CATALOGO: CATALOGO, ejecutar: ejecutar, indicador: indicador };
});
