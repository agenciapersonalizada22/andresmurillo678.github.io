/* Modelos simples y transparentes: Poisson (futbol), Elo, regresion logistica. No son predicciones fiables. */
(function (g) {
  var A = g.Apuestas = g.Apuestas || {};

  function pmf(k, l) { var p = Math.exp(-l); for (var i = 1; i <= k; i++) p *= l / i; return p; }
  /* matriz de marcadores hasta max goles; rho = correccion Dixon-Coles opcional (0 = Poisson independiente) */
  function poisson(lamL, lamV, o) {
    o = o || {}; var max = o.max || 12, rho = o.rho || 0, M = [], tot = 0;
    for (var i = 0; i <= max; i++) { M[i] = []; for (var j = 0; j <= max; j++) {
      var p = pmf(i, lamL) * pmf(j, lamV), t = 1;
      if (rho) { if (i === 0 && j === 0) t = 1 - lamL * lamV * rho; else if (i === 0 && j === 1) t = 1 + lamL * rho; else if (i === 1 && j === 0) t = 1 + lamV * rho; else if (i === 1 && j === 1) t = 1 - rho; }
      M[i][j] = p * t; tot += M[i][j];
    } }
    var r = { local: 0, empate: 0, visitante: 0, btts: 0, matriz: M, top: [] }, lista = [];
    for (i = 0; i <= max; i++) for (j = 0; j <= max; j++) {
      var q = M[i][j] / tot; M[i][j] = q;
      if (i > j) r.local += q; else if (i === j) r.empate += q; else r.visitante += q;
      if (i > 0 && j > 0) r.btts += q;
      lista.push({ gl: i, gv: j, p: q });
    }
    r.top = lista.sort(function (a, b) { return b.p - a.p; }).slice(0, 5);
    r.totales = function (linea) { var mas = 0; for (var a = 0; a <= max; a++) for (var b = 0; b <= max; b++) if (a + b > linea) mas += M[a][b]; return { mas: mas, menos: 1 - mas }; };
    r.handicap = function (h) { var gana = 0; for (var a = 0; a <= max; a++) for (var b = 0; b <= max; b++) if (a - b + h > 0) gana += M[a][b]; return gana; };
    return r;
  }
  /* fuerza de ataque/defensa a partir de resultados [{local,visitante,gl,gv}] */
  function estimarFuerzas(partidos, o) {
    o = o || {}; var k = o.suavizado == null ? 2 : o.suavizado;
    var n = partidos.length; if (!n) return null;
    var mL = 0, mV = 0;
    partidos.forEach(function (p) { mL += p.gl; mV += p.gv; });
    mL /= n; mV /= n;
    var eq = {};
    function get(x) { return eq[x] || (eq[x] = { pj: 0, gfL: 0, gcL: 0, nL: 0, gfV: 0, gcV: 0, nV: 0 }); }
    partidos.forEach(function (p) {
      var a = get(p.local), b = get(p.visitante);
      a.gfL += p.gl; a.gcL += p.gv; a.nL++; b.gfV += p.gv; b.gcV += p.gl; b.nV++;
    });
    var res = {}, media = (mL + mV) / 2;
    Object.keys(eq).forEach(function (x) {
      var e = eq[x], pj = e.nL + e.nV;
      var gf = (e.gfL + e.gfV + k * media) / (pj + k), gc = (e.gcL + e.gcV + k * media) / (pj + k);
      res[x] = { ataque: gf / media, defensa: gc / media, pj: pj };
    });
    return { mediaLocal: mL, mediaVisitante: mV, equipos: res };
  }
  function golesEsperados(f, local, visitante) {
    var a = f.equipos[local], b = f.equipos[visitante];
    if (!a || !b) return null;
    var media = (f.mediaLocal + f.mediaVisitante) / 2;
    return { lamL: f.mediaLocal / media * a.ataque * b.defensa * media, lamV: f.mediaVisitante / media * b.ataque * a.defensa * media };
  }
  /* "Local 2-1 Visitante" o "Local,Visitante,2,1" por linea */
  function parsearResultados(txt) {
    var out = [], malas = [];
    String(txt).split(/\r?\n/).forEach(function (ln, i) {
      ln = ln.trim(); if (!ln || ln[0] === '#') return;
      var m = ln.match(/^(.+?)\s+(\d+)\s*[-:–]\s*(\d+)\s+(.+)$/) || null, r = null;
      if (m) r = { local: m[1].trim(), visitante: m[4].trim(), gl: +m[2], gv: +m[3] };
      else {
        var c = ln.split(/[;,\t]/).map(function (s) { return s.trim(); });
        if (c.length >= 4 && /^\d+$/.test(c[2]) && /^\d+$/.test(c[3])) r = { local: c[0], visitante: c[1], gl: +c[2], gv: +c[3] };
        else if (c.length >= 5 && /^\d+$/.test(c[3]) && /^\d+$/.test(c[4])) r = { fecha: c[0], local: c[1], visitante: c[2], gl: +c[3], gv: +c[4] };
      }
      if (r) out.push(r); else malas.push(i + 1);
    });
    return { partidos: out, malas: malas };
  }

  /* Elo */
  function eloEsperado(ra, rb, ventaja) { return 1 / (1 + Math.pow(10, -((ra + (ventaja || 0)) - rb) / 400)); }
  function eloActualizar(ra, rb, resA, o) {
    o = o || {}; var K = o.K || 20, e = eloEsperado(ra, rb, o.ventaja), mult = 1;
    if (o.dif) mult = o.dif <= 1 ? 1 : o.dif === 2 ? 1.5 : (11 + o.dif) / 8;
    var d = K * mult * (resA - e);
    return [ra + d, rb - d];
  }
  /* partidos [{local,visitante,gl,gv}] en orden cronologico */
  function eloCalcular(partidos, o) {
    o = o || {}; var base = o.base || 1500, R = {}, N = {};
    partidos.forEach(function (p) {
      var a = R[p.local] == null ? base : R[p.local], b = R[p.visitante] == null ? base : R[p.visitante];
      var res = p.gl > p.gv ? 1 : p.gl === p.gv ? 0.5 : 0;
      var n = eloActualizar(a, b, res, { K: o.K, ventaja: o.ventaja == null ? 60 : o.ventaja, dif: o.usarGoles ? Math.abs(p.gl - p.gv) : 0 });
      R[p.local] = n[0]; R[p.visitante] = n[1]; N[p.local] = (N[p.local] || 0) + 1; N[p.visitante] = (N[p.visitante] || 0) + 1;
    });
    return { ratings: R, partidos: N };
  }
  /* 1X2 a partir de Elo: E = pL + 0.5 pE; pE = base * 4E(1-E) (heuristica) */
  function elo1x2(ra, rb, o) {
    o = o || {}; var e = eloEsperado(ra, rb, o.ventaja == null ? 60 : o.ventaja), pe = (o.empateBase == null ? 0.26 : o.empateBase) * 4 * e * (1 - e);
    return { local: e - pe / 2, empate: pe, visitante: 1 - e - pe / 2, esperado: e };
  }
  /* regresion logistica con descenso de gradiente, estandarizando variables. X: filas de numeros, y: 0/1 */
  function sigmoide(z) { return 1 / (1 + Math.exp(-z)); }
  function logistica(X, y, o) {
    o = o || {}; var n = X.length, d = X[0].length, it = o.iter || 3000, lr = o.lr || 0.3, l2 = o.l2 == null ? 0.001 : o.l2;
    var mu = [], sd = [], j, i;
    for (j = 0; j < d; j++) {
      var m = 0, v = 0; for (i = 0; i < n; i++) m += X[i][j]; m /= n;
      for (i = 0; i < n; i++) v += (X[i][j] - m) * (X[i][j] - m);
      mu.push(m); sd.push(Math.sqrt(v / n) || 1);
    }
    var Z = X.map(function (r) { return r.map(function (x, k) { return (x - mu[k]) / sd[k]; }); });
    var w = [], b = 0; for (j = 0; j < d; j++) w.push(0);
    for (var t = 0; t < it; t++) {
      var gw = w.map(function () { return 0; }), gb = 0;
      for (i = 0; i < n; i++) {
        var z = b; for (j = 0; j < d; j++) z += w[j] * Z[i][j];
        var e = sigmoide(z) - y[i]; gb += e; for (j = 0; j < d; j++) gw[j] += e * Z[i][j];
      }
      b -= lr * gb / n; for (j = 0; j < d; j++) w[j] -= lr * (gw[j] / n + l2 * w[j]);
    }
    var modelo = { w: w, b: b, mu: mu, sd: sd };
    modelo.predecir = function (x) { var z = b; for (var k = 0; k < d; k++) z += w[k] * (x[k] - mu[k]) / sd[k]; return sigmoide(z); };
    var ll = 0; for (i = 0; i < n; i++) { var p = Math.min(1 - 1e-12, Math.max(1e-12, modelo.predecir(X[i]))); ll += y[i] ? Math.log(p) : Math.log(1 - p); }
    modelo.logVerosimilitud = ll; modelo.n = n;
    return modelo;
  }

  A.modelos = { pmf: pmf, poisson: poisson, estimarFuerzas: estimarFuerzas, golesEsperados: golesEsperados, parsearResultados: parsearResultados, eloEsperado: eloEsperado, eloActualizar: eloActualizar, eloCalcular: eloCalcular, elo1x2: elo1x2, logistica: logistica, sigmoide: sigmoide };
  if (typeof module !== 'undefined' && module.exports) module.exports = A.modelos;
})(typeof window !== 'undefined' ? window : globalThis);
