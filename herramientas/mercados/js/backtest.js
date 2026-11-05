/* Backtesting sencillo, solo largo. La senal se calcula con el cierre de la vela i y se ejecuta en la APERTURA de la vela i+1 (sin mirar al futuro). UMD. */
(function (root, factory) {
  var dep = function (n, f) { return typeof require === 'function' && typeof module !== 'undefined' ? require('./' + f) : root[n]; };
  var m = factory(dep('Indicadores', 'indicadores.js'), dep('Riesgo', 'riesgo.js'));
  if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.Backtest = m;
})(typeof self !== 'undefined' ? self : this, function (I, R) {
  /* estrategias -> array de posicion deseada por vela (1 largo, 0 fuera, NaN sin datos), decidida al cierre */
  function senales(velas, est) {
    var c = I.col(velas, 4), h = I.col(velas, 2), l = I.col(velas, 3), p = est.params || {}, n = c.length, s = new Array(n).fill(NaN), i;
    if (est.tipo === 'manual') return est.senales.slice();
    if (est.tipo === 'cruce') {
      var a = I.sma(c, p.rapida || 20), b = I.sma(c, p.lenta || 50);
      for (i = 0; i < n; i++) if (isFinite(a[i]) && isFinite(b[i])) s[i] = a[i] > b[i] ? 1 : 0;
    } else if (est.tipo === 'rsi') {
      var r = I.rsi(c, p.periodo || 14), pos = 0;
      for (i = 0; i < n; i++) if (isFinite(r[i])) { if (r[i] < (p.compra || 30)) pos = 1; else if (r[i] > (p.venta || 70)) pos = 0; s[i] = pos; }
    } else if (est.tipo === 'breakout') {
      var ent = p.entrada || 20, sal = p.salida || 10, pos2 = 0;
      for (i = ent; i < n; i++) {
        var mx = -Infinity, mn = Infinity, j;
        for (j = i - ent; j < i; j++) mx = Math.max(mx, h[j]);
        for (j = Math.max(0, i - sal); j < i; j++) mn = Math.min(mn, l[j]);
        if (!pos2 && c[i] > mx) pos2 = 1; else if (pos2 && c[i] < mn) pos2 = 0;
        s[i] = pos2;
      }
    } else throw new Error('Estrategia desconocida: ' + est.tipo);
    return s;
  }
  function ejecutar(velas, est, op) {
    op = op || {};
    var capital = op.capital == null ? 10000 : op.capital, com = (op.comisionPct || 0) / 100, desl = (op.deslizamientoPct || 0) / 100;
    var s = senales(velas, est), n = velas.length, efectivo = capital, cant = 0, trades = [], entrada = null, eq = new Array(n), pos = 0;
    for (var i = 0; i < n; i++) {
      var o = velas[i][1];
      var deseada = i > 0 && isFinite(s[i - 1]) ? s[i - 1] : 0;
      if (deseada === 1 && pos === 0) {
        var px = o * (1 + desl), coste = efectivo; cant = (coste / (1 + com)) / px; efectivo = 0; pos = 1;
        entrada = { i: i, t: velas[i][0], precio: px, costo: coste };
      } else if (deseada === 0 && pos === 1) {
        var pv = o * (1 - desl), ing = cant * pv * (1 - com);
        trades.push({ entrada: entrada.t, salida: velas[i][0], pe: entrada.precio, ps: pv, cant: cant, pnl: ing - entrada.costo, pct: ing / entrada.costo - 1, barras: i - entrada.i });
        efectivo = ing; cant = 0; pos = 0; entrada = null;
      }
      eq[i] = efectivo + cant * velas[i][4];
    }
    if (pos === 1) { var u = velas[n - 1][4]; trades.push({ entrada: entrada.t, salida: velas[n - 1][0], pe: entrada.precio, ps: u, cant: cant, pnl: cant * u - entrada.costo, pct: cant * u / entrada.costo - 1, abierta: true, barras: n - 1 - entrada.i }); }
    var bh = velas.map(function (b) { return capital / velas[0][1] * b[4]; });
    return { equity: eq, buyHold: bh, trades: trades, senales: s, metricas: metricas(eq, trades, velas, capital, bh) };
  }
  function metricas(eq, trades, velas, capital, bh) {
    var dias = (velas[velas.length - 1][0] - velas[0][0]) / 86400000 || 1, fin = eq[eq.length - 1];
    var r = R.retornos(eq), cerr = trades.filter(function (t) { return !t.abierta; }), gan = cerr.filter(function (t) { return t.pnl > 0; });
    var gp = 0, pp = 0; trades.forEach(function (t) { if (t.pnl > 0) gp += t.pnl; else pp -= t.pnl; });
    return {
      retornoTotal: fin / capital - 1, cagr: R.cagr(capital, fin, dias), maxDD: R.maxDrawdown(eq).max, sharpe: R.sharpe(r, 0, 365),
      operaciones: trades.length, aciertos: cerr.length ? gan.length / cerr.length : NaN, factorBeneficio: pp ? gp / pp : (gp ? Infinity : NaN),
      capitalFinal: fin, retornoBH: bh[bh.length - 1] / capital - 1, maxDDBH: R.maxDrawdown(bh).max, dias: dias
    };
  }
  var ADVERTENCIAS = [
    'Sesgo de supervivencia: solo se prueban activos que existen hoy; los que quebraron o desaparecieron no aparecen.',
    'Sobreajuste: afinar parametros hasta que el pasado luzca bien casi nunca se repite en el futuro.',
    'Sesgo de anticipacion: aqui las senales usan el cierre y se ejecutan en la apertura siguiente, pero cualquier dato corregido a posteriori podria distorsionar.',
    'Costes reales: comisiones, deslizamiento, impuestos y liquidez pueden ser mayores a lo simulado.',
    'Muestra limitada: pocas operaciones o un solo ciclo de mercado no son evidencia estadistica.',
    'Rendimientos pasados no garantizan resultados futuros. Informacion educativa, no asesoria financiera.'
  ];
  return { senales: senales, ejecutar: ejecutar, ADVERTENCIAS: ADVERTENCIAS };
});
