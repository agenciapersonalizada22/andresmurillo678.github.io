/* Solucionador logico: reglas simples, pares de restricciones, cuenta global y enumeracion por componentes.
   Estado S: 0 desconocida, 1 abierta, 2 mina deducida. Nunca adivina: solo devuelve certezas. */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};

  function contexto(w, h, num, total) {
    var t = BM.motor.tablaVec(w, h);
    return { w: w, h: h, n: w * h, vec: t.v, nv: t.c, num: num, total: total };
  }

  function restricciones(X, S) {
    var cons = [];
    for (var i = 0; i < X.n; i++) {
      if (S[i] !== 1 || X.num[i] === 0) continue;
      var r = X.num[i], cells = [];
      for (var k = 0; k < X.nv[i]; k++) { var j = X.vec[i * 8 + k]; if (S[j] === 0) cells.push(j); else if (S[j] === 2) r--; }
      if (cells.length) cons.push({ cells: cells, r: r });
    }
    return cons;
  }

  function enumerar(cells, cs, limite) {
    var m = cells.length, idx = {}, i, k;
    for (i = 0; i < m; i++) idx[cells[i]] = i;
    var cc = []; for (i = 0; i < m; i++) cc.push([]);
    var rem = [], un = [];
    for (k = 0; k < cs.length; k++) { rem.push(cs[k].r); un.push(cs[k].cells.length); for (i = 0; i < cs[k].cells.length; i++) cc[idx[cs[k].cells[i]]].push(k); }
    var cnt = new Float64Array(m), val = new Int8Array(m), total = 0, nodos = 0, abort = false;
    function rec(p) {
      if (abort) return;
      if (++nodos > limite) { abort = true; return; }
      if (p === m) { total++; for (var j = 0; j < m; j++) cnt[j] += val[j]; return; }
      for (var v = 0; v <= 1; v++) {
        var ok = true, l = cc[p], q;
        for (q = 0; q < l.length; q++) { un[l[q]]--; rem[l[q]] -= v; if (rem[l[q]] < 0 || rem[l[q]] > un[l[q]]) ok = false; }
        if (ok) { val[p] = v; rec(p + 1); }
        for (q = 0; q < l.length; q++) { un[l[q]]++; rem[l[q]] += v; }
        if (abort) return;
      }
    }
    rec(0);
    return abort || !total ? null : { total: total, cnt: cnt };
  }

  /* Devuelve {seguras:[], minas:[], nivel} con certezas (vacio si no hay). opts.prob: calcula tambien X.prob */
  function deducir(X, S, opts) {
    opts = opts || {};
    var seg = [], min = [], marca = new Uint8Array(X.n), i, k, j;
    function push(l, c) { if (!marca[c]) { marca[c] = 1; l.push(c); } }
    var cons = restricciones(X, S), nc = cons.length;
    for (k = 0; k < nc; k++) {
      var c = cons[k];
      if (c.r === 0) c.cells.forEach(function (x) { push(seg, x); });
      else if (c.r === c.cells.length) c.cells.forEach(function (x) { push(min, x); });
    }
    if (seg.length || min.length) return { seguras: seg, minas: min, nivel: 1 };

    var cel = {}, a, b;
    for (k = 0; k < nc; k++) cons[k].cells.forEach(function (x) { (cel[x] = cel[x] || []).push(k); });
    var mk = new Int32Array(X.n).fill(-1), visto = new Int32Array(nc).fill(-1);
    for (a = 0; a < nc; a++) {
      var A = cons[a];
      A.cells.forEach(function (x) { mk[x] = a; });
      A.cells.forEach(function (x) {
        cel[x].forEach(function (bb) {
          if (bb <= a || visto[bb] === a) return;
          visto[bb] = a; var B = cons[bb], inter = 0, p;
          for (p = 0; p < B.cells.length; p++) if (mk[B.cells[p]] === a) inter++;
          var la = A.cells.length - inter, lb = B.cells.length - inter, d = A.r - B.r;
          if (d === la) {
            A.cells.forEach(function (y) { if (!B.cells.includes(y)) push(min, y); });
            B.cells.forEach(function (y) { if (mk[y] !== a) push(seg, y); });
          } else if (-d === lb) {
            B.cells.forEach(function (y) { if (mk[y] !== a) push(min, y); });
            A.cells.forEach(function (y) { if (!B.cells.includes(y)) push(seg, y); });
          }
        });
      });
    }
    if (seg.length || min.length) return { seguras: seg, minas: min, nivel: 2 };

    var desc = 0, mm = 0;
    for (i = 0; i < X.n; i++) { if (S[i] === 0) desc++; else if (S[i] === 2) mm++; }
    var resto = X.total - mm;
    if (desc > 0 && resto === 0) { for (i = 0; i < X.n; i++) if (S[i] === 0) seg.push(i); return { seguras: seg, minas: min, nivel: 3 }; }
    if (desc > 0 && resto === desc) { for (i = 0; i < X.n; i++) if (S[i] === 0) min.push(i); return { seguras: seg, minas: min, nivel: 3 }; }

    var comp = new Int32Array(nc).fill(-1), nComp = 0, grupos = [];
    for (k = 0; k < nc; k++) {
      if (comp[k] >= 0) continue;
      var pila = [k], lista = []; comp[k] = nComp;
      while (pila.length) {
        var q = pila.pop(); lista.push(q);
        cons[q].cells.forEach(function (x) { cel[x].forEach(function (r) { if (comp[r] < 0) { comp[r] = nComp; pila.push(r); } }); });
      }
      grupos.push(lista); nComp++;
    }
    var prob = opts.prob ? new Float32Array(X.n).fill(-1) : null, esperadas = 0, enFront = 0;
    grupos.forEach(function (lista) {
      var cells = [], vis = {};
      lista.forEach(function (q) { cons[q].cells.forEach(function (x) { if (!vis[x]) { vis[x] = 1; cells.push(x); } }); });
      if (cells.length > 46) return;
      var res = enumerar(cells, lista.map(function (q) { return cons[q]; }), opts.nodos || 40000);
      if (!res) return;
      for (var p = 0; p < cells.length; p++) {
        if (res.cnt[p] === 0) push(seg, cells[p]); else if (res.cnt[p] === res.total) push(min, cells[p]);
        if (prob) { prob[cells[p]] = res.cnt[p] / res.total; esperadas += prob[cells[p]]; enFront++; }
      }
    });
    if (prob) {
      var libres = desc - enFront;
      if (libres > 0) { var pi = Math.max(0, Math.min(1, (resto - esperadas) / libres)); for (i = 0; i < X.n; i++) if (S[i] === 0 && prob[i] < 0) prob[i] = pi; }
      X.prob = prob;
    }
    return { seguras: seg, minas: min, nivel: 4 };
  }

  function abrirSim(X, S, i) {
    if (S[i] !== 0) return;
    var pila = [i]; S[i] = 1;
    while (pila.length) {
      var c = pila.pop();
      if (X.num[c] !== 0) continue;
      for (var k = 0; k < X.nv[c]; k++) { var j = X.vec[c * 8 + k]; if (S[j] === 0) { S[j] = 1; pila.push(j); } }
    }
  }

  /* Simula a un jugador perfecto sin adivinar. Devuelve {resuelto, S, correcto}. */
  function simular(w, h, mina, inicio, total) {
    var num = BM.motor.calcularNum(w, h, mina), X = contexto(w, h, num, total), S = new Uint8Array(w * h), correcto = true;
    abrirSim(X, S, inicio);
    for (;;) {
      var d = deducir(X, S);
      if (!d.seguras.length && !d.minas.length) break;
      var i;
      for (i = 0; i < d.minas.length; i++) { if (!mina[d.minas[i]]) correcto = false; S[d.minas[i]] = 2; }
      for (i = 0; i < d.seguras.length; i++) { if (mina[d.seguras[i]]) correcto = false; else abrirSim(X, S, d.seguras[i]); }
    }
    var ab = 0; for (var q = 0; q < S.length; q++) if (S[q] === 1) ab++;
    return { resuelto: ab === w * h - total, S: S, X: X, correcto: correcto };
  }

  /* Pista sobre el estado real de la partida (ignora las banderas del jugador). */
  function pista(T) {
    var S = new Uint8Array(T.n), i;
    for (i = 0; i < T.n; i++) S[i] = T.est[i] === 1 ? 1 : T.est[i] === 4 ? 2 : 0;
    var X = contexto(T.w, T.h, T.num, T.minas);
    var minasHalladas = [], d;
    for (var vuelta = 0; vuelta < 80; vuelta++) {
      d = deducir(X, S, { prob: true });
      var s0 = d.seguras.find(function (c) { return T.est[c] !== 1; });
      if (s0 !== undefined) return { tipo: 'segura', idx: s0 };
      var nuevas = d.minas.filter(function (c) { return S[c] !== 2; });
      if (!nuevas.length) break;
      nuevas.forEach(function (c) { S[c] = 2; minasHalladas.push(c); });
    }
    var m = minasHalladas.find(function (c) { return T.est[c] !== 2; });
    if (m !== undefined) return { tipo: 'mina', idx: m };
    var mejor = -1, pm = 2;
    if (X.prob) for (i = 0; i < T.n; i++) if (S[i] === 0 && T.est[i] !== 2 && X.prob[i] >= 0 && X.prob[i] < pm) { pm = X.prob[i]; mejor = i; }
    return mejor >= 0 ? { tipo: 'riesgo', idx: mejor, riesgo: pm } : null;
  }

  /* Riesgo local (0..1) por casilla cerrada para el resaltado de peligro. */
  function riesgoLocal(T) {
    var r = new Float32Array(T.n);
    for (var i = 0; i < T.n; i++) {
      if (T.est[i] !== 1 || T.num[i] === 0) continue;
      var f = 0, u = 0, k, j;
      for (k = 0; k < T.nv[i]; k++) { j = T.vec[i * 8 + k]; if (T.est[j] === 2 || T.est[j] === 4) f++; else if (T.est[j] !== 1) u++; }
      if (!u) continue;
      var p = Math.max(0, T.num[i] - f) / u;
      for (k = 0; k < T.nv[i]; k++) { j = T.vec[i * 8 + k]; if (T.est[j] !== 1 && T.est[j] !== 2 && T.est[j] !== 4 && p > r[j]) r[j] = p; }
    }
    return r;
  }

  BM.solucionador = { contexto: contexto, deducir: deducir, simular: simular, pista: pista, riesgoLocal: riesgoLocal, abrirSim: abrirSim };
  if (typeof module !== 'undefined' && module.exports) module.exports = BM;
})(typeof window !== 'undefined' ? window : globalThis);
