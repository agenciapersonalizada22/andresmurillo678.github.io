/* Indicadores tecnicos con formulas estandar. Arrays de numeros; los huecos iniciales son NaN. UMD (navegador, worker, Node). */
(function (root, factory) { var m = factory(); if (typeof module !== 'undefined' && module.exports) module.exports = m; else root.Indicadores = m; })(typeof self !== 'undefined' ? self : this, function () {
  function llenar(n) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = NaN; return a; }
  function desde(x, fn) { var s = 0; while (s < x.length && !isFinite(x[s])) s++; return llenar(s).concat(fn(x.slice(s))); }
  function col(v, k) { return v.map(function (b) { return b[k]; }); }

  function sma(x, n) {
    return desde(x, function (x) {
      var o = llenar(x.length), s = 0;
      for (var i = 0; i < x.length; i++) { s += x[i]; if (i >= n) s -= x[i - n]; if (i >= n - 1) o[i] = s / n; }
      return o;
    });
  }
  function ema(x, n) {
    return desde(x, function (x) {
      var o = llenar(x.length), a = 2 / (n + 1), s = 0;
      for (var i = 0; i < x.length; i++) {
        if (i < n - 1) s += x[i];
        else if (i === n - 1) { s += x[i]; o[i] = s / n; }
        else o[i] = a * x[i] + (1 - a) * o[i - 1];
      }
      return o;
    });
  }
  function wma(x, n) {
    return desde(x, function (x) {
      var o = llenar(x.length), num = 0, sum = 0, d = n * (n + 1) / 2;
      for (var i = 0; i < x.length; i++) {
        if (i < n) { num += (i + 1) * x[i]; sum += x[i]; }
        else { num = num + n * x[i] - sum; sum = sum + x[i] - x[i - n]; }
        if (i >= n - 1) o[i] = num / d;
      }
      return o;
    });
  }
  function rsi(x, n) {
    n = n || 14;
    var o = llenar(x.length), g = 0, p = 0;
    function v(g, p) { return p === 0 ? (g === 0 ? 50 : 100) : 100 - 100 / (1 + g / p); }
    for (var i = 1; i < x.length; i++) {
      var d = x[i] - x[i - 1], u = d > 0 ? d : 0, w = d < 0 ? -d : 0;
      if (i <= n) { g += u; p += w; if (i === n) { g /= n; p /= n; o[i] = v(g, p); } }
      else { g = (g * (n - 1) + u) / n; p = (p * (n - 1) + w) / n; o[i] = v(g, p); }
    }
    return o;
  }
  function macd(x, rapida, lenta, senal) {
    rapida = rapida || 12; lenta = lenta || 26; senal = senal || 9;
    var f = ema(x, rapida), s = ema(x, lenta), m = x.map(function (_, i) { return f[i] - s[i]; });
    var sg = ema(m, senal);
    return { macd: m, senal: sg, hist: m.map(function (v, i) { return v - sg[i]; }) };
  }
  function bollinger(x, n, k) {
    n = n || 20; k = k == null ? 2 : k;
    var mid = sma(x, n), up = llenar(x.length), low = llenar(x.length), pb = llenar(x.length), bw = llenar(x.length);
    for (var i = n - 1; i < x.length; i++) {
      if (!isFinite(mid[i])) continue;
      var s = 0; for (var j = i - n + 1; j <= i; j++) s += (x[j] - mid[i]) * (x[j] - mid[i]);
      var sd = Math.sqrt(s / n);
      up[i] = mid[i] + k * sd; low[i] = mid[i] - k * sd;
      pb[i] = up[i] === low[i] ? 0.5 : (x[i] - low[i]) / (up[i] - low[i]);
      bw[i] = mid[i] ? (up[i] - low[i]) / mid[i] : NaN;
    }
    return { mid: mid, sup: up, inf: low, pctB: pb, ancho: bw };
  }
  function tr(h, l, c) {
    var o = new Array(h.length);
    for (var i = 0; i < h.length; i++) o[i] = i === 0 ? h[i] - l[i] : Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
    return o;
  }
  function atr(h, l, c, n) {
    n = n || 14;
    var t = tr(h, l, c), o = llenar(h.length), s = 0;
    for (var i = 0; i < t.length; i++) {
      if (i < n - 1) s += t[i];
      else if (i === n - 1) { s += t[i]; o[i] = s / n; }
      else o[i] = (o[i - 1] * (n - 1) + t[i]) / n;
    }
    return o;
  }
  function adx(h, l, c, n) {
    n = n || 14;
    var N = h.length, pdi = llenar(N), mdi = llenar(N), ad = llenar(N), dx = llenar(N);
    var t = tr(h, l, c), sT = 0, sP = 0, sM = 0, sd = 0;
    for (var i = 1; i < N; i++) {
      var up = h[i] - h[i - 1], dn = l[i - 1] - l[i];
      var pd = up > dn && up > 0 ? up : 0, md = dn > up && dn > 0 ? dn : 0;
      if (i <= n) { sT += t[i]; sP += pd; sM += md; }
      else { sT = sT - sT / n + t[i]; sP = sP - sP / n + pd; sM = sM - sM / n + md; }
      if (i >= n) {
        pdi[i] = sT ? 100 * sP / sT : 0; mdi[i] = sT ? 100 * sM / sT : 0;
        var q = pdi[i] + mdi[i]; dx[i] = q ? 100 * Math.abs(pdi[i] - mdi[i]) / q : 0;
        if (i < 2 * n) { sd += dx[i]; if (i === 2 * n - 1) ad[i] = sd / n; }
        else ad[i] = (ad[i - 1] * (n - 1) + dx[i]) / n;
      }
    }
    return { adx: ad, pdi: pdi, mdi: mdi };
  }
  function estocastico(h, l, c, n, sk, sd) {
    n = n || 14; sk = sk || 3; sd = sd || 3;
    var raw = llenar(c.length);
    for (var i = n - 1; i < c.length; i++) {
      var hh = -Infinity, ll = Infinity;
      for (var j = i - n + 1; j <= i; j++) { if (h[j] > hh) hh = h[j]; if (l[j] < ll) ll = l[j]; }
      raw[i] = hh === ll ? 50 : 100 * (c[i] - ll) / (hh - ll);
    }
    var k = sk > 1 ? sma(raw, sk) : raw;
    return { k: k, d: sma(k, sd) };
  }
  function obv(c, v) {
    var o = new Array(c.length); o[0] = 0;
    for (var i = 1; i < c.length; i++) o[i] = o[i - 1] + (c[i] > c[i - 1] ? v[i] : c[i] < c[i - 1] ? -v[i] : 0);
    return o;
  }
  function esIntradia(velas) {
    if (velas.length < 3) return false;
    var d = []; for (var i = 1; i < Math.min(velas.length, 50); i++) d.push(velas[i][0] - velas[i - 1][0]);
    d.sort(function (a, b) { return a - b; });
    return d[d.length >> 1] < 72000000;
  }
  function vwap(velas) {
    var o = new Array(velas.length), pv = 0, vv = 0, dia = null;
    for (var i = 0; i < velas.length; i++) {
      var d = Math.floor(velas[i][0] / 86400000);
      if (d !== dia) { dia = d; pv = 0; vv = 0; }
      var tp = (velas[i][2] + velas[i][3] + velas[i][4]) / 3;
      pv += tp * velas[i][5]; vv += velas[i][5];
      o[i] = vv ? pv / vv : tp;
    }
    return o;
  }
  function maxMin(x, i, n, max) {
    var r = max ? -Infinity : Infinity;
    for (var j = i - n + 1; j <= i; j++) r = max ? Math.max(r, x[j]) : Math.min(r, x[j]);
    return r;
  }
  function ichimoku(h, l, c, tn, kn, sn, desp) {
    tn = tn || 9; kn = kn || 26; sn = sn || 52; desp = desp || 26;
    var N = h.length, ten = llenar(N), kij = llenar(N), sa = llenar(N + desp), sb = llenar(N + desp), ch = llenar(N);
    for (var i = 0; i < N; i++) {
      if (i >= tn - 1) ten[i] = (maxMin(h, i, tn, true) + maxMin(l, i, tn, false)) / 2;
      if (i >= kn - 1) kij[i] = (maxMin(h, i, kn, true) + maxMin(l, i, kn, false)) / 2;
      if (i >= kn - 1) sa[i + desp] = (ten[i] + kij[i]) / 2;
      if (i >= sn - 1) sb[i + desp] = (maxMin(h, i, sn, true) + maxMin(l, i, sn, false)) / 2;
      if (i - desp >= 0) ch[i - desp] = c[i];
    }
    return { tenkan: ten, kijun: kij, spanA: sa, spanB: sb, chikou: ch };
  }
  function pivotes(alto, bajo, cierre) {
    var p = (alto + bajo + cierre) / 3, r = alto - bajo;
    return { P: p, R1: 2 * p - bajo, S1: 2 * p - alto, R2: p + r, S2: p - r, R3: alto + 2 * (p - bajo), S3: bajo - 2 * (alto - p) };
  }
  function fractales(h, l, k) {
    k = k || 2; var altos = [], bajos = [];
    for (var i = k; i < h.length - k; i++) {
      var a = true, b = true;
      for (var j = 1; j <= k; j++) {
        if (!(h[i] > h[i - j] && h[i] > h[i + j])) a = false;
        if (!(l[i] < l[i - j] && l[i] < l[i + j])) b = false;
      }
      if (a) altos.push(i); if (b) bajos.push(i);
    }
    return { altos: altos, bajos: bajos };
  }
  function nivelesSR(velas, tol, max) {
    tol = tol || 0.015; max = max || 6;
    var h = col(velas, 2), l = col(velas, 3), f = fractales(h, l, 2), ult = velas[velas.length - 1][4];
    var pts = f.altos.map(function (i) { return { i: i, p: h[i] }; }).concat(f.bajos.map(function (i) { return { i: i, p: l[i] }; }));
    pts.sort(function (a, b) { return a.p - b.p; });
    var gr = [];
    pts.forEach(function (q) {
      var g = gr[gr.length - 1];
      if (g && Math.abs(q.p - g.suma / g.n) / (g.suma / g.n) <= tol) { g.suma += q.p; g.n++; g.ult = Math.max(g.ult, q.i); }
      else gr.push({ suma: q.p, n: 1, ult: q.i });
    });
    return gr.map(function (g) {
      var p = g.suma / g.n;
      return { precio: p, toques: g.n, reciente: g.ult / velas.length, tipo: p < ult ? 'soporte' : 'resistencia', fuerza: g.n + g.ult / velas.length };
    }).sort(function (a, b) { return b.fuerza - a.fuerza; }).slice(0, max).sort(function (a, b) { return b.precio - a.precio; });
  }
  function heikinAshi(v) {
    var o = [], po, pc;
    for (var i = 0; i < v.length; i++) {
      var c = (v[i][1] + v[i][2] + v[i][3] + v[i][4]) / 4, a = i ? (po + pc) / 2 : (v[i][1] + v[i][4]) / 2;
      o.push([v[i][0], a, Math.max(v[i][2], a, c), Math.min(v[i][3], a, c), c, v[i][5]]); po = a; pc = c;
    }
    return o;
  }
  function agregar(v, marco) {
    if (marco === 'D' || !marco) return v;
    var o = [], cur = null, kk = null;
    v.forEach(function (b) {
      var d = new Date(b[0]), k;
      if (marco === 'W') { var wd = (d.getUTCDay() + 6) % 7; k = Math.floor(b[0] / 86400000) - wd; }
      else k = d.getUTCFullYear() * 12 + d.getUTCMonth();
      if (k !== kk) { if (cur) o.push(cur); cur = b.slice(); kk = k; }
      else { cur[2] = Math.max(cur[2], b[2]); cur[3] = Math.min(cur[3], b[3]); cur[4] = b[4]; cur[5] += b[5]; }
    });
    if (cur) o.push(cur);
    return o;
  }
  return { sma: sma, ema: ema, wma: wma, rsi: rsi, macd: macd, bollinger: bollinger, tr: tr, atr: atr, adx: adx, estocastico: estocastico, obv: obv,
    vwap: vwap, esIntradia: esIntradia, ichimoku: ichimoku, pivotes: pivotes, fractales: fractales, nivelesSR: nivelesSR, heikinAshi: heikinAshi, agregar: agregar, col: col };
});
