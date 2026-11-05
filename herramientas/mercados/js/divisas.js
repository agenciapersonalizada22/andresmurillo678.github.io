/* Fuerza relativa de monedas a partir de tasas con base USD. UMD. */
(function (root, factory) { var m = factory(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.DivisasCalc = m; })(typeof self !== 'undefined' ? self : this, function () {
  /* hist: {EUR:[[fecha,tasa]..]} unidades de EUR por USD. Devuelve rendimiento de cada moneda frente al USD en los ultimos `dias` y su fuerza vs el promedio de la cesta. */
  function fuerza(hist, dias) {
    var ret = { USD: 0 };
    Object.keys(hist).forEach(function (m) {
      var h = hist[m]; if (!h || h.length < 2) return;
      var ini = h[Math.max(0, h.length - 1 - dias)][1], fin = h[h.length - 1][1];
      if (ini > 0 && fin > 0) ret[m] = -Math.log(fin / ini) * 100;
    });
    var ks = Object.keys(ret), prom = ks.reduce(function (s, k) { return s + ret[k]; }, 0) / ks.length;
    return ks.map(function (k) { return { moneda: k, vsUSD: ret[k], fuerza: ret[k] - prom }; }).sort(function (a, b) { return b.fuerza - a.fuerza; });
  }
  return { fuerza: fuerza };
});
