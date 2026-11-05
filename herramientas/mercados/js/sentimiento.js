/* Indice de miedo y codicia propio, calculado con datos del contrato (no es el indice de terceros). UMD. */
(function (root, factory) {
  var dep = function (n, f) { return typeof require === 'function' && typeof module !== 'undefined' ? require('./' + f) : root[n]; };
  var m = factory(dep('Riesgo', 'riesgo.js')); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.Sentimiento = m;
})(typeof self !== 'undefined' ? self : this, function (R) {
  function clamp(x) { return Math.max(0, Math.min(100, x)); }
  function mediana(a) { var s = a.slice().sort(function (x, y) { return x - y; }); return s.length ? (s[s.length >> 1] + s[(s.length - 1) >> 1]) / 2 : NaN; }
  function etiqueta(v) { return v < 20 ? 'Miedo extremo' : v < 40 ? 'Miedo' : v < 60 ? 'Neutral' : v < 80 ? 'Codicia' : 'Codicia extrema'; }
  /* entrada: {c24:[% 24h de cada activo], c7:[% 7d] (opcional), ref:[cierres diarios del activo de referencia] (opcional)} */
  function calcular(e) {
    var partes = [];
    function add(id, nombre, peso, valor, explicacion) { if (valor != null && isFinite(valor)) partes.push({ id: id, nombre: nombre, peso: peso, valor: clamp(valor), explicacion: explicacion }); }
    if (e.c24 && e.c24.length) add('amp24', 'Amplitud 24h', 25, e.c24.filter(function (x) { return x > 0; }).length / e.c24.length * 100, 'Porcentaje de activos que suben hoy. Mas del 50% empuja hacia codicia.');
    if (e.c7 && e.c7.length) {
      add('amp7', 'Amplitud 7d', 20, e.c7.filter(function (x) { return x > 0; }).length / e.c7.length * 100, 'Porcentaje de activos que suben en la semana.');
      add('mom', 'Momentum', 20, 50 + mediana(e.c7) * 5, 'Mediana del cambio semanal: +10% equivale a 100 y -10% a 0.');
    }
    if (e.ref && e.ref.length > 100) {
      var c = e.ref, v14 = R.volHist(c, 14, 365), v90 = R.volHist(c, 90, 365), rel = v14 / v90;
      add('vol', 'Volatilidad', 15, 100 - (rel - 0.6) / (1.6 - 0.6) * 100, 'Volatilidad de 14 dias frente a la de 90 dias del activo de referencia: si se dispara, hay miedo.');
      var w = c.slice(-90), mx = Math.max.apply(null, w), mn = Math.min.apply(null, w);
      add('rango', 'Posicion en rango 90d', 20, mx === mn ? 50 : (c[c.length - 1] - mn) / (mx - mn) * 100, 'Donde cotiza el activo de referencia entre su minimo y maximo de 90 dias.');
    }
    var pt = partes.reduce(function (s, p) { return s + p.peso; }, 0);
    var valor = pt ? partes.reduce(function (s, p) { return s + p.valor * p.peso; }, 0) / pt : NaN;
    return { valor: valor, etiqueta: isFinite(valor) ? etiqueta(valor) : 'Sin datos', partes: partes };
  }
  return { calcular: calcular, etiqueta: etiqueta };
});
