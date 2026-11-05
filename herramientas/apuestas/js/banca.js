/* Gestion de banca y calculadoras: Kelly, parlays, sistemas, cobertura, bonos, Monte Carlo. Logica pura. */
(function (g) {
  var A = g.Apuestas = g.Apuestas || {};

  /* Kelly: fraccion de la banca. p probabilidad propia, dec cuota decimal */
  function kelly(p, dec, fraccion) {
    var f = (p * dec - 1) / (dec - 1);
    f = Math.max(0, f) * (fraccion == null ? 1 : fraccion);
    return isFinite(f) ? f : 0;
  }
  /* importe segun metodo: kelly | fraccion de Kelly | porcentaje | unidades */
  function importe(m) {
    switch (m.metodo) {
      case 'kelly': return m.banca * kelly(m.prob, m.cuota, 1);
      case 'kellyFrac': return m.banca * kelly(m.prob, m.cuota, m.fraccion == null ? 0.25 : m.fraccion);
      case 'porcentaje': return m.banca * m.valor / 100;
      case 'unidades': return m.valor * (m.unidad || m.banca / 100);
    }
    return 0;
  }

  /* factor de pago por resultado (multiplicador del importe) */
  function factor(res, dec) {
    switch (res) {
      case 'ganada': return dec;
      case 'perdida': return 0;
      case 'anulada': return 1;
      case 'mediaganada': return 1 + (dec - 1) / 2;
      case 'mediaperdida': return 0.5;
    }
    return NaN;
  }
  function parlay(patas) {
    var dec = 1, prob = 1, todas = true;
    patas.forEach(function (p) { dec *= p.cuota; if (p.prob != null) prob *= p.prob; else todas = false; });
    return { cuota: dec, prob: todas ? prob : null };
  }
  function parlayResultado(patas, importe) {
    var f = 1;
    patas.forEach(function (p) { f *= factor(p.res, p.cuota); });
    return { retorno: importe * f, neto: importe * f - importe };
  }

  function combinaciones(n, k) {
    var out = [], idx = [];
    (function rec(ini) {
      if (idx.length === k) { out.push(idx.slice()); return; }
      for (var i = ini; i < n; i++) { idx.push(i); rec(i + 1); idx.pop(); }
    })(0);
    return out;
  }
  var SISTEMAS = {
    trixie: { n: 3, ks: [2, 3] }, patent: { n: 3, ks: [1, 2, 3] },
    yankee: { n: 4, ks: [2, 3, 4] }, lucky15: { n: 4, ks: [1, 2, 3, 4] },
    canadian: { n: 5, ks: [2, 3, 4, 5] }, lucky31: { n: 5, ks: [1, 2, 3, 4, 5] },
    heinz: { n: 6, ks: [2, 3, 4, 5, 6] }, lucky63: { n: 6, ks: [1, 2, 3, 4, 5, 6] },
    superheinz: { n: 7, ks: [2, 3, 4, 5, 6, 7] }, goliath: { n: 8, ks: [2, 3, 4, 5, 6, 7, 8] }
  };
  /* sistema: apuestas por combinaciones de k patas. unit = importe por apuesta. patas: [{cuota,res?,prob?}] */
  function sistema(patas, ks, unit) {
    var apuestas = [];
    ks.forEach(function (k) { combinaciones(patas.length, k).forEach(function (c) { apuestas.push(c); }); });
    var total = apuestas.length * unit, retorno = 0, retornoTodas = 0, evEsp = 0, completo = true;
    apuestas.forEach(function (c) {
      var f = 1, fAll = 1, fp = 1;
      c.forEach(function (i) {
        var p = patas[i];
        fAll *= p.cuota;
        f *= p.res ? factor(p.res, p.cuota) : NaN;
        if (p.prob == null) completo = false; else fp *= p.prob * p.cuota;
      });
      retorno += unit * f; retornoTodas += unit * fAll; evEsp += unit * fp;
    });
    return { apuestas: apuestas.length, total: total, retornoTodas: retornoTodas, retorno: isNaN(retorno) ? null : retorno, neto: isNaN(retorno) ? null : retorno - total, retornoEsperado: completo ? evEsp : null, evEsperado: completo ? evEsp - total : null };
  }

  /* cobertura (hedge): apuesta original importe S a cuota O; se cubre el resultado contrario a cuota H */
  function cobertura(S, O, H, modo) {
    var h = modo === 'recuperar' ? S / (H - 1) : S * O / H;
    var siGana = S * O - S - h, siCubre = h * H - S - h;
    return { cobertura: h, siGanaOriginal: siGana, siGanaCobertura: siCubre, garantizado: Math.min(siGana, siCubre) };
  }
  /* cash-out justo estimado: retorno potencial dividido por la cuota actual sin margen; margenCasa lo reduce */
  function cashoutJusto(S, O, cuotaActual, margenCasa) {
    return S * O / cuotaActual * (1 - (margenCasa || 0));
  }

  /* matched betting: back en casa a cuota a; lay en exchange a l con comision c (0-1) */
  function matched(B, a, l, c, tipo) {
    c = c || 0;
    var L, gBack, gLay;
    if (tipo === 'gratuita') { L = B * (a - 1) / (l - c); gBack = B * (a - 1) - L * (l - 1); gLay = L * (1 - c); }
    else if (tipo === 'gratuitaSR') { L = B * a / (l - c); gBack = B * a - L * (l - 1); gLay = L * (1 - c); }
    else { L = B * a / (l - c); gBack = B * (a - 1) - L * (l - 1); gLay = L * (1 - c) - B; }
    return { lay: L, responsabilidad: L * (l - 1), siGanaBack: gBack, siGanaLay: gLay, beneficio: Math.min(gBack, gLay), extraccion: Math.min(gBack, gLay) / B };
  }
  /* bono con rollover: perdida esperada aprox = volumen requerido * margen medio */
  function bonoRollover(deposito, bono, rollover, margenMedio, sobre) {
    var base = sobre === 'bono' ? bono : deposito + bono;
    var volumen = base * rollover, perdida = volumen * margenMedio;
    return { volumen: volumen, perdidaEsperada: perdida, valorNeto: bono - perdida };
  }

  /* resumen simple ROI/yield */
  function roiYield(invertido, neto, bancaInicial) {
    return { yield: invertido ? neto / invertido : 0, roi: bancaInicial ? neto / bancaInicial : 0 };
  }

  /* PRNG con semilla (mulberry32) */
  function rng(semilla) {
    var a = semilla >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function percentil(sorted, q) {
    if (!sorted.length) return NaN;
    var pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  /* Monte Carlo de la banca. o: {banca,prob,cuota,apuestas,simulaciones,semilla,metodo,valor,fraccion,umbralRuina,curvas} */
  function montecarlo(o) {
    var R = rng(o.semilla == null ? 1 : o.semilla), N = o.simulaciones || 2000, T = o.apuestas || 100;
    var umbral = o.umbralRuina == null ? 0.01 * o.banca : o.umbralRuina, nCur = Math.min(o.curvas == null ? 20 : o.curvas, N);
    var finales = [], ruinas = 0, dds = [], rachas = [], curvas = [], benef = 0;
    for (var s = 0; s < N; s++) {
      var b = o.banca, pico = b, dd = 0, racha = 0, maxR = 0, ruina = false, cur = nCur > s ? [b] : null;
      for (var i = 0; i < T; i++) {
        if (b <= umbral) { ruina = true; if (cur) cur.push(b); continue; }
        var st = importe({ metodo: o.metodo || 'porcentaje', banca: b, prob: o.prob, cuota: o.cuota, fraccion: o.fraccion, valor: o.valor == null ? 1 : o.valor, unidad: o.unidad });
        st = Math.min(st, b);
        if (R() < o.prob) { b += st * (o.cuota - 1); racha = 0; } else { b -= st; racha++; if (racha > maxR) maxR = racha; }
        if (b > pico) pico = b;
        var d = (pico - b) / pico; if (d > dd) dd = d;
        if (cur) cur.push(b);
      }
      if (b <= umbral) ruina = true;
      if (ruina) ruinas++;
      if (b > o.banca) benef++;
      finales.push(b); dds.push(dd); rachas.push(maxR);
      if (cur) curvas.push(cur);
    }
    var f = finales.slice().sort(function (x, y) { return x - y; }), dd2 = dds.slice().sort(function (x, y) { return x - y; }), rr = rachas.slice().sort(function (x, y) { return x - y; });
    var media = finales.reduce(function (a, c) { return a + c; }, 0) / N;
    var bins = 20, min = f[0], max = f[f.length - 1], hist = [];
    for (var h = 0; h < bins; h++) hist.push(0);
    finales.forEach(function (v) { var k = max === min ? 0 : Math.min(bins - 1, Math.floor((v - min) / (max - min) * bins)); hist[k]++; });
    return { simulaciones: N, apuestas: T, media: media, p5: percentil(f, 0.05), p25: percentil(f, 0.25), mediana: percentil(f, 0.5), p75: percentil(f, 0.75), p95: percentil(f, 0.95), min: min, max: max,
      riesgoRuina: ruinas / N, probBeneficio: benef / N, drawdownMediano: percentil(dd2, 0.5), drawdownP95: percentil(dd2, 0.95), rachaPerdedoraMediana: percentil(rr, 0.5), rachaPerdedoraP95: percentil(rr, 0.95), hist: hist, histMin: min, histMax: max, curvas: curvas };
  }

  A.banca = { kelly: kelly, importe: importe, factor: factor, parlay: parlay, parlayResultado: parlayResultado, combinaciones: combinaciones, SISTEMAS: SISTEMAS, sistema: sistema, cobertura: cobertura, cashoutJusto: cashoutJusto, matched: matched, bonoRollover: bonoRollover, roiYield: roiYield, rng: rng, montecarlo: montecarlo, percentil: percentil };
  if (typeof module !== 'undefined' && module.exports) module.exports = A.banca;
})(typeof window !== 'undefined' ? window : globalThis);
