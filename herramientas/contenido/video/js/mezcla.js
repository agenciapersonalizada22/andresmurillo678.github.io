/* Mezcla de audio de la linea de tiempo (pura): volumen, fundidos, velocidad con/sin tono, inversion. VE.mezcla */
(function (g) {
  var Z = {};
  /* Cambio de velocidad conservando el tono: solapado-suma con ventana Hann (50%). */
  Z.estirar = function (x, sr, vel) {
    var N = Math.max(64, Math.round(0.05 * sr) & ~1), ho = N / 2, hi = ho * vel;
    var outLen = Math.max(1, Math.round(x.length / vel)), out = new Float32Array(outLen + N), w = new Float32Array(N);
    for (var n = 0; n < N; n++) w[n] = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / N);
    var D = Math.round(0.01 * sr), W = Math.min(N, 256), prev = 0;
    for (var k = 0; k * ho < outLen; k++) {
      var po = k * ho, pi = Math.round(k * hi);
      if (k > 0 && vel !== 1) {
        var ref = prev + ho, best = -Infinity, bp = pi;
        for (var c = Math.max(0, pi - D); c <= pi + D; c += 3) {
          if (c + W >= x.length || ref + W >= x.length) break;
          var cor = 0; for (var q = 0; q < W; q += 3) cor += x[c + q] * x[ref + q];
          if (cor > best) { best = cor; bp = c; }
        }
        pi = bp;
      }
      prev = pi;
      for (var j = 0; j < N; j++) { var i = pi + j; if (i >= x.length) break; out[po + j] += x[i] * w[j]; }
    }
    return out.subarray(0, outLen);
  };
  function segmento(x, sr, c) {
    var a = Math.max(0, Math.floor(c.off * sr)), b = Math.min(x.length, Math.ceil((c.off + c.dur * c.vel) * sr));
    var s = a < b ? x.subarray(a, b) : new Float32Array(0);
    if (c.inv) { var r = new Float32Array(s.length); for (var i = 0; i < s.length; i++) r[i] = s[s.length - 1 - i]; s = r; }
    var estirado = c.vel !== 1 && c.tono !== false && s.length > 0;
    if (estirado) s = Z.estirar(s, sr, c.vel);
    return { s: s, tasa: estirado ? 1 : c.vel };
  }
  /* o: {clips, obtener(medio)->{sr,ch:[Float32Array]}|null, sr, ini, dur}. Devuelve [L,R]. */
  Z.mezclar = function (o) {
    var sr = o.sr, n = Math.max(0, Math.round(o.dur * sr)), L = new Float32Array(n), R = new Float32Array(n);
    o.clips.forEach(function (c) {
      if (c.mute || !(c.vol > 0) || c.cong) return;
      var fin = c.ini + c.dur; if (fin <= o.ini || c.ini >= o.ini + o.dur) return;
      var src = o.obtener(c.medio); if (!src || !src.ch || !src.ch.length) return;
      var ck = o.cache ? c.id + '|' + c.medio + '|' + c.off + '|' + c.dur + '|' + c.vel + '|' + c.inv + '|' + c.tono : null, chs = ck && o.cache[ck];
      if (!chs) { chs = src.ch.map(function (x) { return segmento(x, src.sr, c); }); if (ck) o.cache[ck] = chs; }
      var s0 = Math.max(0, Math.floor((c.ini - o.ini) * sr)), s1 = Math.min(n, Math.ceil((fin - o.ini) * sr));
      for (var i = s0; i < s1; i++) {
        var local = o.ini + i / sr - c.ini; if (local < 0 || local >= c.dur) continue;
        var gan = c.vol;
        if (c.fi > 0 && local < c.fi) gan *= local / c.fi;
        if (c.fo > 0 && c.dur - local < c.fo) gan *= (c.dur - local) / c.fo;
        for (var k = 0; k < 2; k++) {
          var ch = chs[k < chs.length ? k : 0], pos = local * src.sr * ch.tasa, i0 = Math.floor(pos), fr = pos - i0, s = ch.s;
          if (i0 >= s.length) continue;
          var v = s[i0] * (1 - fr) + (i0 + 1 < s.length ? s[i0 + 1] : s[i0]) * fr;
          if (k === 0) L[i] += v * gan; else R[i] += v * gan;
        }
      }
    });
    for (var j = 0; j < n; j++) { L[j] = Math.max(-1, Math.min(1, L[j])); R[j] = Math.max(-1, Math.min(1, R[j])); }
    return [L, R];
  };
  Z.pico = function (x) { var m = 0; for (var i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i])); return m; };
  /* Picos para forma de onda: n cubetas con maximo absoluto */
  Z.picos = function (x, n) {
    var r = new Float32Array(n), paso = x.length / n;
    for (var i = 0; i < n; i++) { var a = Math.floor(i * paso), b = Math.max(a + 1, Math.floor((i + 1) * paso)), m = 0; for (var j = a; j < b && j < x.length; j++) { var v = Math.abs(x[j]); if (v > m) m = v; } r[i] = m; }
    return r;
  };
  g.VE = g.VE || {}; g.VE.mezcla = Z;
  if (typeof module !== 'undefined') module.exports = Z;
})(typeof window !== 'undefined' ? window : globalThis);
