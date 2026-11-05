/* Cuotas: conversion de formatos, probabilidad implicita, margen, probabilidades justas,
   consenso, valor, arbitraje y middles. Logica pura (navegador y Node). */
(function (g) {
  var A = g.Apuestas = g.Apuestas || {};
  var FORMATOS = ['decimal', 'fraccional', 'americano', 'hongkong', 'malayo', 'indonesio'];

  function aFraccion(hk) {
    var mejor = { n: Math.round(hk), d: 1, e: Infinity };
    for (var d = 1; d <= 100; d++) {
      var n = Math.round(hk * d), e = Math.abs(n / d - hk);
      if (e < mejor.e - 1e-12) { mejor = { n: n, d: d, e: e }; if (e < 1e-9) break; }
    }
    return mejor.n + '/' + mejor.d;
  }
  function deFraccion(s) {
    s = String(s).trim().toLowerCase();
    if (s === 'evens' || s === 'evs' || s === 'par') return 1;
    var m = s.match(/^(\d+(?:[.,]\d+)?)\s*[\/\-:]\s*(\d+(?:[.,]\d+)?)$/);
    if (!m) return NaN;
    return parseFloat(m[1].replace(',', '.')) / parseFloat(m[2].replace(',', '.'));
  }
  function num(v) { return typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.').replace('+', '')); }

  /* valor en `formato` -> cuota decimal (NaN si invalido) */
  function aDecimal(valor, formato) {
    var x, dec;
    switch (formato || 'decimal') {
      case 'decimal': dec = num(valor); break;
      case 'fraccional': x = deFraccion(valor); dec = 1 + x; break;
      case 'americano': x = num(valor); dec = x >= 100 ? 1 + x / 100 : x <= -100 ? 1 + 100 / -x : NaN; break;
      case 'hongkong': dec = 1 + num(valor); break;
      case 'malayo': x = num(valor); dec = x > 0 && x <= 1 ? 1 + x : x < 0 ? 1 + 1 / -x : NaN; break;
      case 'indonesio': x = num(valor); dec = x >= 1 ? 1 + x : x <= -1 ? 1 + 1 / -x : NaN; break;
      default: dec = NaN;
    }
    return isFinite(dec) && dec > 1 ? dec : NaN;
  }
  /* cuota decimal -> texto/numero en `formato` */
  function deDecimal(dec, formato) {
    var hk = dec - 1;
    switch (formato || 'decimal') {
      case 'decimal': return dec;
      case 'fraccional': return aFraccion(hk);
      case 'americano': return dec >= 2 ? Math.round(hk * 100) : -Math.round(100 / hk);
      case 'hongkong': return hk;
      case 'malayo': return hk <= 1 ? hk : -1 / hk;
      case 'indonesio': return hk >= 1 ? hk : -1 / hk;
    }
    return dec;
  }
  function texto(dec, formato) {
    if (!isFinite(dec)) return '-';
    var v = deDecimal(dec, formato);
    if (typeof v === 'string') return v;
    if (formato === 'americano') return (v > 0 ? '+' : '') + v;
    if (formato === 'decimal') return v.toFixed(2);
    return (v > 0 || formato === 'hongkong' ? '' : '') + v.toFixed(3);
  }

  function implicita(dec) { return 1 / dec; }
  function margen(decs) { var s = 0; decs.forEach(function (d) { s += 1 / d; }); return s - 1; }

  /* probabilidades justas (sin margen); metodos: proporcional, shin, potencia */
  function justas(decs, metodo) {
    var q = decs.map(function (d) { return 1 / d; });
    var S = q.reduce(function (a, b) { return a + b; }, 0);
    var res, z = 0, k = 1;
    if (S <= 1 + 1e-12 || metodo === 'proporcional' || !metodo) {
      res = q.map(function (x) { return x / S; });
    } else if (metodo === 'shin') {
      var f = function (zz) {
        var t = 0;
        q.forEach(function (x) { t += (Math.sqrt(zz * zz + 4 * (1 - zz) * x * x / S) - zz) / (2 * (1 - zz)); });
        return t - 1;
      };
      var lo = 0, hi = 0.999999;
      for (var i = 0; i < 200; i++) { var mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
      z = (lo + hi) / 2;
      res = q.map(function (x) { return (Math.sqrt(z * z + 4 * (1 - z) * x * x / S) - z) / (2 * (1 - z)); });
      var s2 = res.reduce(function (a, b) { return a + b; }, 0);
      res = res.map(function (x) { return x / s2; });
    } else if (metodo === 'potencia') {
      var lo2 = 1, hi2 = 200;
      for (var j = 0; j < 200; j++) {
        var m = (lo2 + hi2) / 2, t = 0;
        q.forEach(function (x) { t += Math.pow(x, m); });
        if (t > 1) lo2 = m; else hi2 = m;
      }
      k = (lo2 + hi2) / 2;
      res = q.map(function (x) { return Math.pow(x, k); });
    } else throw new Error('metodo desconocido');
    res.z = z; res.k = k;
    return res;
  }

  /* ---- mercados de un evento ---- */
  var SELS = { h2h: ['local', 'empate', 'visitante'], totales: ['mas', 'menos'], spreads: ['local', 'visitante'] };
  /* -> [{clave, tipo, linea, sels:[..], filas:[{casa, cuotas:{sel:dec}}]}] */
  function mercadosDeEvento(ev) {
    var mapa = {}, orden = [];
    (ev.casas || []).forEach(function (c) {
      Object.keys(c.mercados || {}).forEach(function (tipo) {
        var m = c.mercados[tipo];
        if (!m || !SELS[tipo]) return;
        var linea = (tipo === 'h2h') ? null : m.linea;
        if (tipo !== 'h2h' && typeof linea !== 'number') return;
        var sels = SELS[tipo].filter(function (s) { return typeof m[s] === 'number' && m[s] > 1; });
        if (sels.length !== (tipo === 'h2h' && m.empate == null ? 2 : SELS[tipo].length)) return;
        var clave = tipo + (linea == null ? '' : '@' + linea);
        if (!mapa[clave]) { mapa[clave] = { clave: clave, tipo: tipo, linea: linea, sels: sels, filas: [] }; orden.push(clave); }
        if (mapa[clave].sels.length !== sels.length) return;
        var cu = {}; sels.forEach(function (s) { cu[s] = m[s]; });
        mapa[clave].filas.push({ casa: c.casa, cuotas: cu });
      });
    });
    return orden.map(function (k) { return mapa[k]; });
  }

  function mejores(mercado) {
    var r = {};
    mercado.sels.forEach(function (s) {
      var b = null;
      mercado.filas.forEach(function (f) { if (!b || f.cuotas[s] > b.cuota) b = { casa: f.casa, cuota: f.cuotas[s] }; });
      r[s] = b;
    });
    return r;
  }

  function esRef(casa, ref) { return ref && String(casa).toLowerCase() === String(ref).toLowerCase(); }

  /* consenso: promedio de probabilidades justas de las casas; si hay casa de referencia, se usa solo esa */
  function consenso(mercado, opts) {
    opts = opts || {};
    var metodo = opts.metodo || 'shin', ref = opts.referencia, usar = mercado.filas;
    var refFila = ref ? mercado.filas.filter(function (f) { return esRef(f.casa, ref); })[0] : null;
    var fuente = 'consenso';
    if (refFila) { usar = [refFila]; fuente = 'referencia'; }
    var acc = mercado.sels.map(function () { return 0; });
    usar.forEach(function (f) {
      var p = justas(mercado.sels.map(function (s) { return f.cuotas[s]; }), metodo);
      p.forEach(function (x, i) { acc[i] += x; });
    });
    var prob = {};
    mercado.sels.forEach(function (s, i) { prob[s] = acc[i] / usar.length; });
    return { prob: prob, n: usar.length, fuente: fuente };
  }

  /* apuestas de valor: cuota de cada casa vs probabilidad justa. edge = p*cuota - 1 = EV por unidad */
  function valor(ev, opts) {
    opts = opts || {};
    var minEdge = opts.minEdge == null ? 0.02 : opts.minEdge, minCasas = opts.minCasas || 3, out = [];
    mercadosDeEvento(ev).forEach(function (m) {
      var c = consenso(m, opts);
      if (c.fuente === 'consenso' && c.n < minCasas) return;
      m.filas.forEach(function (f) {
        if (c.fuente === 'referencia' && esRef(f.casa, opts.referencia)) return;
        m.sels.forEach(function (s) {
          var e = c.prob[s] * f.cuotas[s] - 1;
          if (e >= minEdge) out.push({ evento: ev, mercado: m.clave, linea: m.linea, sel: s, casa: f.casa, cuota: f.cuotas[s], prob: c.prob[s], edge: e, ev: e, fuente: c.fuente, n: c.n });
        });
      });
    });
    return out.sort(function (a, b) { return b.edge - a.edge; });
  }

  /* reparto de arbitraje: banca total, cuotas -> {stakes, retorno, ganancia, roi} */
  function repartoArbitraje(cuotas, banca, redondeo) {
    var S = cuotas.reduce(function (a, c) { return a + 1 / c; }, 0);
    var stakes = cuotas.map(function (c) {
      var s = banca * (1 / c) / S;
      return redondeo ? Math.round(s / redondeo) * redondeo : s;
    });
    var total = stakes.reduce(function (a, b) { return a + b; }, 0);
    var rets = stakes.map(function (s, i) { return s * cuotas[i]; });
    var minRet = Math.min.apply(null, rets);
    return { S: S, stakes: stakes, invertido: total, retorno: minRet, ganancia: minRet - total, roi: (minRet - total) / total, garantizado: minRet > total };
  }
  function arbitraje(ev, banca, opts) {
    opts = opts || {}; banca = banca || 100;
    var out = [];
    mercadosDeEvento(ev).forEach(function (m) {
      if (m.filas.length < 2) return;
      var b = mejores(m), cu = m.sels.map(function (s) { return b[s].cuota; });
      var S = cu.reduce(function (a, c) { return a + 1 / c; }, 0);
      if (S < 1 - 1e-12) {
        var r = repartoArbitraje(cu, banca, opts.redondeo);
        out.push({ evento: ev, mercado: m.clave, linea: m.linea, patas: m.sels.map(function (s, i) { return { sel: s, casa: b[s].casa, cuota: cu[i], importe: r.stakes[i] }; }), S: S, ganancia: r.ganancia, roi: r.roi, invertido: r.invertido });
      }
    });
    return out;
  }
  /* middles: totales (mas en linea baja + menos en linea alta) y spreads */
  function repartoMiddle(oa, ob, banca) {
    var s1 = banca * ob / (oa + ob), s2 = banca - s1;
    var fuera = s1 * oa - banca, dentro = s1 * oa + s2 * ob - banca;
    return { s1: s1, s2: s2, fuera: fuera, dentro: dentro };
  }
  function middles(ev, banca) {
    banca = banca || 100; var out = [], ms = mercadosDeEvento(ev);
    function par(tipo, selA, selB, lineaOk) {
      var L = ms.filter(function (m) { return m.tipo === tipo; });
      L.forEach(function (ma) { L.forEach(function (mb) {
        if (ma === mb) return;
        var ba = mejores(ma)[selA], bb = mejores(mb)[selB];
        if (!ba || !bb || !lineaOk(ma.linea, mb.linea) || ba.casa === bb.casa) return;
        var r = repartoMiddle(ba.cuota, bb.cuota, banca);
        out.push({ evento: ev, tipo: tipo, lineaA: ma.linea, selA: selA, casaA: ba.casa, cuotaA: ba.cuota, lineaB: mb.linea, selB: selB, casaB: bb.casa, cuotaB: bb.cuota, ventana: Math.abs(mb.linea - ma.linea), reparto: r });
      }); });
    }
    par('totales', 'mas', 'menos', function (a, b) { return b > a; });
    /* spreads: la linea es la del local; local gana si margen+linea>0. Ventana si linea del visitante b < linea del local a */
    par('spreads', 'local', 'visitante', function (a, b) { return b < a; });
    return out.sort(function (x, y) { return y.ventana - x.ventana; });
  }

  /* EV y valor de una apuesta con probabilidad propia */
  function ev(prob, dec) { return prob * dec - 1; }

  A.cuotas = { FORMATOS: FORMATOS, aDecimal: aDecimal, deDecimal: deDecimal, texto: texto, implicita: implicita, margen: margen, justas: justas, mercadosDeEvento: mercadosDeEvento, mejores: mejores, consenso: consenso, valor: valor, arbitraje: arbitraje, repartoArbitraje: repartoArbitraje, middles: middles, repartoMiddle: repartoMiddle, ev: ev, aFraccion: aFraccion };
  if (typeof module !== 'undefined' && module.exports) module.exports = A.cuotas;
})(typeof window !== 'undefined' ? window : globalThis);
