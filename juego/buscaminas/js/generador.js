/* Generador de tableros: aleatorio con primer clic seguro y modo "sin adivinar" (reparacion hasta ser resoluble sin azar). */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};
  var ahora = typeof performance !== 'undefined' ? function () { return performance.now(); } : function () { return Date.now(); };

  function zona(w, h, minas, inicio) {
    var ex = [inicio];
    if (w * h - 9 >= minas) { var t = BM.motor.tablaVec(w, h); for (var k = 0; k < t.c[inicio]; k++) ex.push(t.v[inicio * 8 + k]); }
    return ex;
  }

  function colocarAzar(w, h, minas, ex, rng) {
    var n = w * h, mina = new Uint8Array(n), bloq = new Uint8Array(n), cand = [], i;
    ex.forEach(function (e) { bloq[e] = 1; });
    for (i = 0; i < n; i++) if (!bloq[i]) cand.push(i);
    for (i = 0; i < minas; i++) {
      var j = i + Math.floor(rng() * (cand.length - i)), t = cand[i]; cand[i] = cand[j]; cand[j] = t; mina[cand[i]] = 1;
    }
    return mina;
  }

  function perturbar(w, h, mina, S, rng) {
    var n = w * h, t = BM.motor.tablaVec(w, h), F = [], I = [], i, k;
    for (i = 0; i < n; i++) {
      if (S[i] !== 0) continue;
      var fr = false; for (k = 0; k < t.c[i]; k++) if (S[t.v[i * 8 + k]] === 1) { fr = true; break; }
      (fr ? F : I).push(i);
    }
    var mf = F.filter(function (c) { return mina[c]; });
    if (!mf.length) mf = I.filter(function (c) { return mina[c]; }).slice(0, 3);
    var quitar = [];
    mf.forEach(function (c) { if (rng() < 0.6 || quitar.length === 0) quitar.push(c); });
    quitar.forEach(function (c) { mina[c] = 0; });
    var dest = [];
    for (i = 0; i < I.length; i++) if (!mina[I[i]]) dest.push(I[i]);
    var nI = dest.length;
    for (i = 0; i < F.length; i++) if (!mina[F[i]]) dest.push(F[i]);
    quitar.forEach(function () {
      var pI = nI > 0 && rng() < 0.75, p;
      if (pI) p = Math.floor(rng() * nI); else p = nI + Math.floor(rng() * (dest.length - nI || 1));
      if (p >= dest.length) p = Math.floor(rng() * dest.length);
      mina[dest[p]] = 1;
      var u = dest.length - 1;
      if (p < nI) { dest[p] = dest[nI - 1]; dest[nI - 1] = dest[u]; nI--; } else dest[p] = dest[u];
      dest.pop();
    });
  }

  /* generar(w,h,minas,inicio,rng,{sinAdivinar,maxMs}) -> {mina, garantizado, iteraciones} */
  function generar(w, h, minas, inicio, rng, opts) {
    opts = opts || {};
    var ex = zona(w, h, minas, inicio), n = w * h;
    minas = Math.min(minas, n - ex.length);
    var mina = colocarAzar(w, h, minas, ex, rng);
    if (!opts.sinAdivinar) return { mina: mina, garantizado: false, iteraciones: 0, inicio: inicio };
    var t0 = ahora(), maxMs = opts.maxMs || 2500, it = 0, mejor = mina.slice(), intento = 0;
    for (;;) {
      var r = BM.solucionador.simular(w, h, mina, inicio, minas);
      it++;
      if (r.resuelto) return { mina: mina, garantizado: true, iteraciones: it, inicio: inicio };
      if (ahora() - t0 > maxMs) break;
      if (++intento > 80) { mina = colocarAzar(w, h, minas, ex, rng); intento = 0; continue; }
      perturbar(w, h, mina, r.S, rng);
    }
    return { mina: mejor, garantizado: false, iteraciones: it, inicio: inicio };
  }

  /* Tablero determinista por semilla con inicio predefinido (diario / multijugador). */
  function porSemilla(w, h, minas, semilla, opts) {
    var rng = BM.azar.crear(semilla);
    var x = Math.floor(w / 2 + (rng() - 0.5) * Math.max(1, w / 3)), y = Math.floor(h / 2 + (rng() - 0.5) * Math.max(1, h / 3));
    x = Math.max(1, Math.min(w - 2, x)); y = Math.max(1, Math.min(h - 2, y));
    var inicio = y * w + x;
    var g = generar(w, h, minas, inicio, rng, { sinAdivinar: !opts || opts.sinAdivinar !== false, maxMs: 4000 });
    g.inicio = inicio; return g;
  }

  BM.generador = { generar: generar, porSemilla: porSemilla, zona: zona };
  if (typeof module !== 'undefined' && module.exports) module.exports = BM;
})(typeof window !== 'undefined' ? window : globalThis);
