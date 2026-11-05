/* Conversion y formato de monedas con mercados/divisas.json ({base:'USD', tasas:{EUR:0.92}}). UMD. */
(function (g, fab) {
  if (typeof module === 'object' && module.exports) module.exports = fab();
  else { g.Of = g.Of || {}; g.Of.moneda = fab(); }
})(typeof self !== 'undefined' ? self : this, function () {
  var PAIS_MONEDA = { US: 'USD', ES: 'EUR', MX: 'MXN', CO: 'COP', AR: 'ARS', BR: 'BRL', CL: 'CLP', PE: 'PEN', DO: 'DOP', GB: 'GBP', EU: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR' };
  var MONEDA_PAIS = { USD: 'US', EUR: 'EU', MXN: 'MX', COP: 'CO', ARS: 'AR', BRL: 'BR', CLP: 'CL', PEN: 'PE', DOP: 'DO', GBP: 'GB' };
  function convertir(monto, de, a, tasas) {
    if (!de || !a || de === a) return monto;
    var t = tasas || {}, td = de === 'USD' ? 1 : t[de], ta = a === 'USD' ? 1 : t[a];
    if (!td || !ta) return monto;
    return monto / td * ta;
  }
  function puede(de, a, tasas) { return de === a || ((de === 'USD' || (tasas && tasas[de])) && (a === 'USD' || (tasas && tasas[a]))); }
  function formato(monto, mon, locale) {
    if (monto == null || !isFinite(monto)) return '-';
    var dec = Math.abs(monto) >= 1000 || mon === 'COP' || mon === 'CLP' ? 0 : 2;
    try { return new Intl.NumberFormat(locale || 'es', { style: 'currency', currency: mon || 'USD', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(monto); }
    catch (e) { return (mon || '') + ' ' + monto.toFixed(dec); }
  }
  return { convertir: convertir, puede: puede, formato: formato, PAIS_MONEDA: PAIS_MONEDA, MONEDA_PAIS: MONEDA_PAIS };
});
