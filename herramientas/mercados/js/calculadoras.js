/* Calculadoras financieras. UMD. */
(function (root, factory) { var m = factory(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.Calculadoras = m; })(typeof self !== 'undefined' ? self : this, function () {
  function tamanoPosicion(o) {
    var riesgoUnit = Math.abs(o.entrada - o.stop), riesgoMax = o.capital * o.riesgoPct / 100;
    if (!(riesgoUnit > 0) || !(o.capital > 0)) return { error: 'Entrada y stop deben diferir y el capital ser positivo' };
    var u = riesgoMax / riesgoUnit, valor = u * o.entrada, apal = valor / o.capital;
    return { unidades: u, valor: valor, riesgoMax: riesgoMax, pctCapital: apal * 100, apalancamiento: apal, lado: o.stop < o.entrada ? 'largo' : 'corto', aviso: valor > o.capital ? 'La posicion supera el capital: requiere apalancamiento.' : '' };
  }
  function riesgoBeneficio(o) {
    var riesgo = Math.abs(o.entrada - o.stop), ben = Math.abs(o.objetivo - o.entrada);
    if (!(riesgo > 0)) return { error: 'Entrada y stop deben diferir' };
    var rr = ben / riesgo, coherente = o.stop < o.entrada ? o.objetivo > o.entrada : o.objetivo < o.entrada;
    return { riesgo: riesgo, beneficio: ben, ratio: rr, aciertoMinimo: 1 / (1 + rr), coherente: coherente, riesgoPct: riesgo / o.entrada * 100, beneficioPct: ben / o.entrada * 100 };
  }
  /* capital inicial, aporte por periodo, tasa anual nominal %, anos, aportes/ano y capitalizaciones/ano; aportes al final del periodo */
  function interesCompuesto(o) {
    var f = o.frecAportes || 12, m = o.capitalizaciones || 12, r = o.tasaAnual / 100, anos = o.anos, filas = [];
    var tasaPer = Math.pow(1 + r / m, m / f) - 1, bal = o.capital, aport = o.capital;
    for (var y = 1; y <= anos; y++) {
      for (var k = 0; k < f; k++) { bal = bal * (1 + tasaPer) + o.aporte; aport += o.aporte; }
      filas.push({ anio: y, saldo: bal, aportado: aport, intereses: bal - aport });
    }
    return { final: bal, aportado: aport, intereses: bal - aport, filas: filas };
  }
  /* precios: precio de compra en cada periodo (aporte fijo en cada uno); precioActual para valorar */
  function dca(o) {
    var u = 0, inv = 0;
    o.precios.forEach(function (p) { u += o.aporte / p; inv += o.aporte; });
    var actual = o.precioActual != null ? o.precioActual : o.precios[o.precios.length - 1], valor = u * actual;
    return { unidades: u, invertido: inv, costoProm: inv / u, valor: valor, pnl: valor - inv, pnlPct: valor / inv - 1 };
  }
  /* tasas: unidades de cada moneda por 1 USD (USD = 1) */
  function convertir(monto, de, a, tasas) {
    var rd = de === 'USD' ? 1 : tasas[de], ra = a === 'USD' ? 1 : tasas[a];
    if (!rd || !ra) return NaN; return monto / rd * ra;
  }
  /* impuesto simple: tasa corta si se mantuvo <= umbral dias, larga si no; perdidas del mismo tipo compensan */
  function impuestos(o) {
    var cp = 0, lp = 0, u = o.umbralDias == null ? 365 : o.umbralDias;
    o.operaciones.forEach(function (t) { if (t.dias <= u) cp += t.ganancia; else lp += t.ganancia; });
    var base = cp + lp, netoCP = cp, netoLP = lp;
    if (o.compensarCruzado && ((cp < 0) !== (lp < 0))) { var comp = cp < 0 ? Math.min(-cp, lp) : Math.min(-lp, cp); if (cp < 0) { netoCP += comp; netoLP -= comp; } else { netoLP += comp; netoCP -= comp; } }
    var imp = Math.max(0, netoCP) * o.tasaCorto / 100 + Math.max(0, netoLP) * o.tasaLargo / 100;
    return { gananciaCorto: cp, gananciaLargo: lp, base: base, impuesto: imp, neto: base - imp, tasaEfectiva: base > 0 ? imp / base : 0 };
  }
  return { tamanoPosicion: tamanoPosicion, riesgoBeneficio: riesgoBeneficio, interesCompuesto: interesCompuesto, dca: dca, convertir: convertir, impuestos: impuestos };
});
