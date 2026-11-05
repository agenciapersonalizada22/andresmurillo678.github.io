var T = require('./util'), C = require('../js/cuotas.js'), B = require('../js/banca.js');
var cerca = T.cerca, igual = T.igual;
// conversion
cerca(C.aDecimal('3/2', 'fraccional'), 2.5, 1e-9, 'frac'); cerca(C.aDecimal('+150', 'americano'), 2.5, 1e-9, 'am+');
cerca(C.aDecimal(-200, 'americano'), 1.5, 1e-9, 'am-'); cerca(C.aDecimal(1.5, 'hongkong'), 2.5, 1e-9, 'hk');
cerca(C.aDecimal(-0.6667, 'malayo'), 2.5, 1e-3, 'my-'); cerca(C.aDecimal(0.5, 'malayo'), 1.5, 1e-9, 'my+');
cerca(C.aDecimal(1.5, 'indonesio'), 2.5, 1e-9, 'id+'); cerca(C.aDecimal(-2, 'indonesio'), 1.5, 1e-9, 'id-');
cerca(C.aDecimal('evens', 'fraccional'), 2, 1e-9, 'evens'); cerca(C.aDecimal('2,5', 'decimal'), 2.5, 1e-9, 'coma');
T.cierto(isNaN(C.aDecimal(0.9, 'decimal')) && isNaN(C.aDecimal(50, 'americano')), 'invalidos');
igual(C.deDecimal(2.5, 'fraccional'), '3/2', 'a frac'); igual(C.deDecimal(2.5, 'americano'), 150, 'a am');
igual(C.deDecimal(1.5, 'americano'), -200, 'a am-'); igual(C.deDecimal(1.91, 'fraccional'), '91/100', 'frac 1.91');
igual(C.deDecimal(2, 'americano'), 100, 'am 100'); igual(C.deDecimal(2, 'fraccional'), '1/1', 'frac evens');
cerca(C.deDecimal(2.5, 'malayo'), -1 / 1.5, 1e-9, 'a malayo'); cerca(C.deDecimal(1.5, 'malayo'), 0.5, 1e-9, 'a malayo+');
cerca(C.deDecimal(1.5, 'indonesio'), -2, 1e-9, 'a indo'); cerca(C.deDecimal(2.5, 'indonesio'), 1.5, 1e-9, 'a indo+');
['decimal', 'fraccional', 'americano', 'hongkong', 'malayo', 'indonesio'].forEach(function (f) {
  [1.25, 1.5, 1.91, 2, 2.37, 3.4, 7.5].forEach(function (d) {
    var v = C.deDecimal(d, f), back = C.aDecimal(v, f); cerca(back, d, f === 'americano' || f === 'fraccional' ? 0.02 : 1e-9, 'ida y vuelta ' + f + ' ' + d);
  });
});
// implicita y margen
cerca(C.implicita(4), 0.25, 1e-12, 'implicita'); cerca(C.margen([1.9, 1.9]), 2 / 1.9 - 1, 1e-12, 'margen 2v');
cerca(C.margen([2, 3.5, 4]), 0.0357142857, 1e-8, 'margen 3v');
// probabilidades justas (referencia calculada con implementacion independiente en Python)
var prop = C.justas([2, 3.5, 4], 'proporcional');
cerca(prop[0], 0.48275862, 1e-8, 'prop0'); cerca(prop[1], 0.27586207, 1e-8, 'prop1'); cerca(prop[2], 0.24137931, 1e-8, 'prop2');
var pot = C.justas([2, 3.5, 4], 'potencia');
cerca(pot.k, 1.034636784, 1e-6, 'k potencia'); cerca(pot[0], 0.48813876, 1e-7, 'pot0'); cerca(pot[2], 0.23827945, 1e-7, 'pot2');
var sh = C.justas([2, 3.5, 4], 'shin');
cerca(sh.z, 0.017891312, 1e-6, 'z shin'); cerca(sh[0], 0.48673363, 1e-6, 'shin0'); cerca(sh[1], 0.27432840, 1e-6, 'shin1'); cerca(sh[2], 0.23893797, 1e-6, 'shin2');
['proporcional', 'shin', 'potencia'].forEach(function (m) {
  var p = C.justas([1.8, 3.6, 4.5], m); cerca(p[0] + p[1] + p[2], 1, 1e-9, 'suma 1 ' + m);
  var q = C.justas([2, 2], m); cerca(q[0], 0.5, 1e-9, 'simetrico ' + m);
  var sinMargen = C.justas([2, 4, 4], m); cerca(sinMargen[0], 0.5, 1e-9, 'sin margen ' + m);
});
T.cierto(sh[0] > prop[0] && pot[0] > prop[0], 'favorito gana prob. con shin y potencia');
// EV
cerca(C.ev(0.55, 2), 0.1, 1e-12, 'ev');
// evento sintetico
function casa(n, l, e, v) { return { casa: n, mercados: { h2h: { local: l, empate: e, visitante: v } } }; }
var ev = { id: 'x', casas: [casa('Pinnacle', 2.0, 3.5, 4.0), casa('A', 2.05, 3.4, 3.9), casa('B', 1.95, 3.6, 4.2), casa('C', 2.3, 3.3, 3.8)] };
var ms = C.mercadosDeEvento(ev); igual(ms.length, 1, 'un mercado'); igual(ms[0].filas.length, 4, '4 filas');
var mj = C.mejores(ms[0]); igual(mj.local.casa, 'C', 'mejor local'); igual(mj.visitante.cuota, 4.2, 'mejor visitante');
var val = C.valor(ev, { referencia: 'Pinnacle', metodo: 'proporcional', minEdge: 0.02 });
T.cierto(val.length >= 1 && val[0].casa === 'C' && val[0].sel === 'local', 'valor: C local');
cerca(val[0].edge, 0.48275862 * 2.3 - 1, 1e-6, 'edge');
// arbitraje 2 vias: 2.1/2.1 con 100 de banca
var r2 = C.repartoArbitraje([2.1, 2.1], 100);
cerca(r2.stakes[0], 50, 1e-9, 'stake 50'); cerca(r2.ganancia, 5, 1e-9, 'ganancia 5'); cerca(r2.roi, 0.05, 1e-9, 'roi arbitraje');
var r3 = C.repartoArbitraje([3, 3.6, 4.2], 1000);
cerca(r3.S, 1 / 3 + 1 / 3.6 + 1 / 4.2, 1e-12, 'S'); cerca(r3.retorno, 1000 / r3.S, 1e-6, 'retorno igual en todos');
cerca(r3.stakes[0] * 3, r3.stakes[1] * 3.6, 1e-9, 'retornos iguales'); cerca(r3.ganancia, 1000 / r3.S - 1000, 1e-6, 'ganancia 3 vias');
var rr = C.repartoArbitraje([2, 2.5], 100, 10); cerca(rr.stakes[0], 60, 1e-9, 'redondeo 60'); cerca(rr.ganancia, 0, 1e-9, 'redondeo reduce ganancia'); T.cierto(!rr.garantizado, 'ya no garantizado');
var evArb = { id: 'y', casas: [casa('A', 2.2, 3.5, 3.6), casa('B', 2.0, 3.0, 4.0), casa('C', 1.9, 3.7, 3.0)] };
var arb = C.arbitraje(evArb, 100); igual(arb.length, 1, 'surebet detectada'); igual(arb[0].patas.map(function (p) { return p.casa; }).join(), 'A,C,B', 'casas del arbitraje');
cerca(arb[0].S, 1 / 2.2 + 1 / 3.7 + 1 / 4.0, 1e-9, 'S arb');
igual(C.arbitraje({ id: 'z', casas: [casa('Pinnacle', 2.0, 3.5, 4.0), casa('A', 2.05, 3.4, 3.9), casa('B', 1.95, 3.6, 4.2)] }, 100).length, 0, 'sin surebet');
// middle
var evM = { id: 'm', casas: [{ casa: 'A', mercados: { totales: { linea: 2.5, mas: 1.95, menos: 1.85 } } }, { casa: 'B', mercados: { totales: { linea: 3.5, mas: 1.8, menos: 1.95 } } }] };
var mid = C.middles(evM, 100); igual(mid.length, 1, 'un middle'); igual(mid[0].ventana, 1, 'ventana 1');
var rm = C.repartoMiddle(1.95, 1.95, 100); cerca(rm.fuera, -2.5, 1e-9, 'perdida fuera');
cerca(rm.dentro, 50 * 1.95 + 50 * 1.95 - 100, 1e-9, 'ganancia dentro');
// Kelly
cerca(B.kelly(0.55, 2), 0.1, 1e-12, 'kelly'); cerca(B.kelly(0.55, 2, 0.5), 0.05, 1e-12, 'kelly 1/2'); cerca(B.kelly(0.4, 3), 0.1, 1e-12, 'kelly 3.0');
cerca(B.kelly(0.4, 2), 0, 1e-12, 'kelly sin edge'); cerca(B.importe({ metodo: 'porcentaje', banca: 1000, valor: 2 }), 20, 1e-9, '2%');
cerca(B.importe({ metodo: 'unidades', banca: 1000, valor: 3 }), 30, 1e-9, '3u'); cerca(B.importe({ metodo: 'kellyFrac', banca: 1000, prob: 0.55, cuota: 2, fraccion: 0.25 }), 25, 1e-9, '1/4 kelly');
// parlays y sistemas
var pl = B.parlay([{ cuota: 1.5, prob: 0.7 }, { cuota: 2, prob: 0.5 }, { cuota: 3, prob: 0.34 }]);
cerca(pl.cuota, 9, 1e-12, 'cuota parlay'); cerca(pl.prob, 0.119, 1e-12, 'prob parlay');
cerca(B.parlayResultado([{ cuota: 1.5, res: 'ganada' }, { cuota: 2, res: 'anulada' }, { cuota: 3, res: 'mediaganada' }], 10).retorno, 10 * 1.5 * 1 * 2, 1e-9, 'parlay con anulada y media');
cerca(B.parlayResultado([{ cuota: 1.5, res: 'ganada' }, { cuota: 2, res: 'perdida' }], 10).retorno, 0, 1e-12, 'parlay perdido');
var legs = function (n, res) { var a = []; for (var i = 0; i < n; i++) a.push({ cuota: 2, res: res ? res[i] : 'ganada', prob: 0.5 }); return a; };
var S = B.SISTEMAS;
var tri = B.sistema(legs(3), S.trixie.ks, 1); igual(tri.apuestas, 4, 'trixie 4'); cerca(tri.retorno, 3 * 4 + 8, 1e-9, 'trixie todas'); cerca(tri.total, 4, 1e-12, 'trixie total');
var yan = B.sistema(legs(4), S.yankee.ks, 1); igual(yan.apuestas, 11, 'yankee 11'); cerca(yan.retorno, 6 * 4 + 4 * 8 + 16, 1e-9, 'yankee todas');
var l15 = B.sistema(legs(4), S.lucky15.ks, 1); igual(l15.apuestas, 15, 'lucky15'); cerca(l15.retorno, 4 * 2 + 72, 1e-9, 'lucky15 todas');
igual(B.sistema(legs(5), S.canadian.ks, 1).apuestas, 26, 'canadian'); igual(B.sistema(legs(6), S.heinz.ks, 1).apuestas, 57, 'heinz'); igual(B.sistema(legs(8), S.goliath.ks, 1).apuestas, 247, 'goliath');
var triUno = B.sistema(legs(3, ['ganada', 'perdida', 'perdida']), S.trixie.ks, 1); cerca(triUno.retorno, 0, 1e-12, 'trixie un acierto = 0'); cerca(triUno.neto, -4, 1e-12, 'neto -4');
var triDos = B.sistema(legs(3, ['ganada', 'ganada', 'perdida']), S.trixie.ks, 2); cerca(triDos.retorno, 2 * 4, 1e-9, 'trixie dos aciertos: un doble');
cerca(B.sistema(legs(3), S.trixie.ks, 1).retornoEsperado, 3 * 1 + 1 * 1, 1e-9, 'esperado: cada p*c=1 => retorno = nº apuestas');
// cobertura
var h = B.cobertura(100, 3, 2.5); cerca(h.cobertura, 120, 1e-9, 'hedge'); cerca(h.siGanaOriginal, 80, 1e-9, 'hedge gana1'); cerca(h.siGanaCobertura, 80, 1e-9, 'hedge gana2');
var h2 = B.cobertura(100, 3, 2.5, 'recuperar'); cerca(h2.cobertura, 100 / 1.5, 1e-9, 'hedge recuperar'); cerca(h2.siGanaCobertura, 0, 1e-9, 'recupera stake');
cerca(B.cashoutJusto(100, 3, 1.5, 0), 200, 1e-9, 'cashout justo'); cerca(B.cashoutJusto(100, 3, 1.5, 0.05), 190, 1e-9, 'cashout con margen');
// matched betting
var mq = B.matched(10, 3, 3.2, 0.05); cerca(mq.lay, 30 / 3.15, 1e-9, 'lay calificar'); cerca(mq.siGanaBack, mq.siGanaLay, 1e-9, 'igualado'); cerca(mq.beneficio, -0.952381, 1e-5, 'perdida calificar');
var mf = B.matched(10, 5, 5.2, 0.05, 'gratuita'); cerca(mf.lay, 40 / 5.15, 1e-9, 'lay gratuita'); cerca(mf.beneficio, 40 / 5.15 * 0.95, 1e-9, 'beneficio gratuita'); cerca(mf.siGanaBack, mf.siGanaLay, 1e-9, 'gratuita igualada');
cerca(B.bonoRollover(100, 100, 5, 0.05).perdidaEsperada, 50, 1e-9, 'rollover');
cerca(B.roiYield(500, 25, 1000).yield, 0.05, 1e-12, 'yield'); cerca(B.roiYield(500, 25, 1000).roi, 0.025, 1e-12, 'roi');
// Monte Carlo
var a1 = B.montecarlo({ banca: 1000, prob: 0.5, cuota: 2, apuestas: 50, simulaciones: 500, semilla: 42, metodo: 'porcentaje', valor: 2 });
var a2 = B.montecarlo({ banca: 1000, prob: 0.5, cuota: 2, apuestas: 50, simulaciones: 500, semilla: 42, metodo: 'porcentaje', valor: 2 });
igual(a1.media, a2.media, 'determinista con semilla'); T.cierto(B.montecarlo({ banca: 1000, prob: 0.5, cuota: 2, apuestas: 50, simulaciones: 500, semilla: 7, metodo: 'porcentaje', valor: 2 }).media !== a1.media, 'otra semilla distinta');
var g = B.montecarlo({ banca: 1000, prob: 1, cuota: 2, apuestas: 100, simulaciones: 10, semilla: 1, metodo: 'porcentaje', valor: 1 });
cerca(g.mediana, 1000 * Math.pow(1.01, 100), 1e-6, 'crecimiento deterministico'); cerca(g.riesgoRuina, 0, 0, 'sin ruina'); cerca(g.probBeneficio, 1, 0, 'siempre beneficio');
var p = B.montecarlo({ banca: 1000, prob: 0, cuota: 2, apuestas: 100, simulaciones: 10, semilla: 1, metodo: 'porcentaje', valor: 1 });
cerca(p.mediana, 1000 * Math.pow(0.99, 100), 1e-6, 'caida deterministica'); cerca(p.drawdownMediano, 1 - Math.pow(0.99, 100), 1e-9, 'drawdown'); igual(p.rachaPerdedoraMediana, 100, 'racha');
var j = B.montecarlo({ banca: 1000, prob: 0.5, cuota: 2, apuestas: 100, simulaciones: 20000, semilla: 123, metodo: 'porcentaje', valor: 1 });
cerca(j.media, 1000, 8, 'juego justo: esperanza = banca (estadistico)');
var f = B.montecarlo({ banca: 1000, prob: 0.55, cuota: 2, apuestas: 100, simulaciones: 5000, semilla: 5, metodo: 'unidades', valor: 1, unidad: 10 });
cerca(f.media, 1000 + 100 * 10 * 0.1, 8, 'apuesta fija: esperanza = banca + n*u*edge');
var ru = B.montecarlo({ banca: 100, prob: 0.5, cuota: 2, apuestas: 200, simulaciones: 2000, semilla: 9, metodo: 'unidades', valor: 10, unidad: 5 });
T.cierto(ru.riesgoRuina > 0.3 && ru.riesgoRuina < 1, 'ruina plausible con 50% por apuesta: ' + ru.riesgoRuina);
var hs = 0; a1.hist.forEach(function (x) { hs += x; }); igual(hs, 500, 'histograma suma N'); igual(a1.curvas.length, 20, 'curvas'); igual(a1.curvas[0].length, 51, 'longitud curva');
T.fin('cuotas+banca');
