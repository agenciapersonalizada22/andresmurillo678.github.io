/* Analisis de precio: descuento real vs historial, precio inflado, mejor precio historico y puntaje de "calor". UMD. */
(function (g, fab) {
  if (typeof module === 'object' && module.exports) module.exports = fab();
  else { g.Of = g.Of || {}; g.Of.calor = fab(); }
})(typeof self !== 'undefined' ? self : this, function () {
  var DIA = 86400000;
  function mediana(a) {
    if (!a.length) return NaN;
    var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  /* historial previo: quita la cola de puntos iguales al precio actual (el propio precio de hoy) y limita a `dias` */
  function previo(hist, precio, ahora, dias) {
    if (!hist || !hist.length) return [];
    var h = hist.filter(function (p) { return p && isFinite(p[1]) && ahora - p[0] <= (dias || 90) * DIA; }).sort(function (a, b) { return a[0] - b[0]; });
    while (h.length && Math.abs(h[h.length - 1][1] - precio) <= precio * 0.005) h.pop();
    return h;
  }
  function analizar(it, hist, ahora) {
    ahora = ahora || Date.now();
    var precio = it.precio, antes = it.precioAntes > precio ? it.precioAntes : null;
    var declarado = antes ? 1 - precio / antes : Math.max(0, (it.descuentoPct || 0) / 100);
    var pv = previo(hist, precio, ahora, 90), precios = pv.map(function (p) { return p[1]; });
    var span = pv.length > 1 ? pv[pv.length - 1][0] - pv[0][0] : 0;
    var r = { declarado: declarado, descReal: declarado, ref: antes, n: pv.length, sinHistorial: true, inflado: false, motivo: '',
      mejorHistorico: false, cercaMinimo: false, minimo: null, maximo: null, mediana: null, rareza: 0.3 };
    if (pv.length >= 3 && span >= 5 * DIA) {
      var med = mediana(precios), mn = Math.min.apply(null, precios), mx = Math.max.apply(null, precios);
      r.sinHistorial = false; r.ref = med; r.mediana = med; r.minimo = mn; r.maximo = mx;
      r.descReal = Math.max(0, 1 - precio / med);
      var mas = precios.filter(function (x) { return x > precio * 1.005; }).length;
      r.rareza = mas / precios.length;
      if (antes && antes > mx * 1.1) { r.inflado = true; r.motivo = 'El precio anterior declarado (' + Math.round(antes) + ') nunca aparece en el historial (maximo ' + Math.round(mx) + ').'; }
      else if (antes && declarado >= 0.2 && declarado - r.descReal >= 0.15) { r.inflado = true; r.motivo = 'Descuento declarado ' + Math.round(declarado * 100) + '% frente a ' + Math.round(r.descReal * 100) + '% real respecto a la mediana de 90 dias.'; }
      if (pv.length >= 5) { r.mejorHistorico = precio <= mn * 1.0005; r.cercaMinimo = !r.mejorHistorico && precio <= mn * 1.03; }
    }
    return r;
  }
  /* 0..100: descuento real (45) + rareza (25) + frescura (30), con bonos/penalizaciones */
  function puntaje(it, an, ahora, fresco) {
    ahora = ahora || Date.now();
    var edadH = Math.max(0, (ahora - (it._ts || Date.parse(it.fecha) || ahora)) / 3600000);
    var frescura = Math.pow(0.5, edadH / (fresco || 18));
    var d = an.sinHistorial ? an.declarado * 0.7 : an.descReal;
    if (an.inflado) d *= 0.4;
    var s = 45 * Math.min(1, d / 0.6) + 25 * an.rareza + 30 * frescura;
    if (an.mejorHistorico) s += 10; else if (an.cercaMinimo) s += 4;
    if (it.cupon) s += 3;
    var vence = it._vence || (it.vence ? Date.parse(it.vence) : 0);
    if (vence && vence < ahora) s *= 0.2;
    return Math.max(0, Math.min(100, Math.round(s)));
  }
  function nivel(c) { return c >= 75 ? 'muy caliente' : c >= 55 ? 'caliente' : c >= 35 ? 'tibia' : 'fria'; }
  return { analizar: analizar, puntaje: puntaje, nivel: nivel, mediana: mediana, previo: previo };
});
