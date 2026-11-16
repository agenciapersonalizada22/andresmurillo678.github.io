/* Procesado de senal propio (puro, sin DOM): FFT, deteccion de tono YIN, BPM por onsets, tonalidad (cromagrama + Krumhansl), nivel RMS. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.MuSenal = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var S = {};
  S.NOTAS_LAT = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
  S.NOTAS_ANG = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

  /* ---- FFT radix-2 en sitio ---- */
  var cacheT = {};
  S.fft = function (re, im) {
    var n = re.length, i, j = 0, k, t;
    for (i = 1; i < n; i++) { var b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    var tb = cacheT[n]; if (!tb) { tb = cacheT[n] = { c: new Float64Array(n / 2), s: new Float64Array(n / 2) }; for (i = 0; i < n / 2; i++) { tb.c[i] = Math.cos(2 * Math.PI * i / n); tb.s[i] = -Math.sin(2 * Math.PI * i / n); } }
    for (var len = 2; len <= n; len <<= 1) {
      var h = len >> 1, paso = n / len;
      for (i = 0; i < n; i += len) for (k = 0; k < h; k++) {
        var wr = tb.c[k * paso], wi = tb.s[k * paso], a = i + k, c = a + h, xr = re[c] * wr - im[c] * wi, xi = re[c] * wi + im[c] * wr;
        re[c] = re[a] - xr; im[c] = im[a] - xi; re[a] += xr; im[a] += xi;
      }
    }
  };

  /* ---- notas ---- */
  S.freqMidi = function (m, a4) { return (a4 || 440) * Math.pow(2, (m - 69) / 12); };
  S.nota = function (f, a4) { // -> {midi, pc, octava, cents}
    var x = 69 + 12 * Math.log2(f / (a4 || 440)), m = Math.round(x);
    return { midi: m, pc: ((m % 12) + 12) % 12, octava: Math.floor(m / 12) - 1, cents: Math.round((x - m) * 1000) / 10 };
  };
  S.nombreNota = function (pc, lat) { return (lat === false ? S.NOTAS_ANG : S.NOTAS_LAT)[pc]; };

  /* ---- YIN (de Cheveigne y Kawahara, 2002) ---- */
  S.yin = function (buf, sr, o) {
    o = o || {}; var fmin = o.min || 40, fmax = o.max || 1500, umbral = o.umbral || 0.12, n = buf.length;
    var tauMax = Math.min(Math.floor(sr / fmin), Math.floor(n * 0.6)), tauMin = Math.max(2, Math.floor(sr / fmax)), W = n - tauMax;
    if (W < 64 || tauMax <= tauMin + 2) return null;
    var e = 0, i, tau; for (i = 0; i < n; i++) e += buf[i] * buf[i]; if (Math.sqrt(e / n) < (o.silencio || 0.004)) return null;
    var d = new Float64Array(tauMax + 1), c = new Float64Array(tauMax + 1);
    for (tau = 1; tau <= tauMax; tau++) { var s = 0; for (i = 0; i < W; i++) { var x = buf[i] - buf[i + tau]; s += x * x; } d[tau] = s; }
    var acum = 0; c[0] = 1;
    for (tau = 1; tau <= tauMax; tau++) { acum += d[tau]; c[tau] = acum > 0 ? d[tau] * tau / acum : 1; }
    var t0 = -1;
    for (tau = tauMin; tau < tauMax; tau++) { if (c[tau] < umbral) { while (tau + 1 < tauMax && c[tau + 1] < c[tau]) tau++; t0 = tau; break; } }
    if (t0 < 0) { var mn = 1e9; for (tau = tauMin; tau < tauMax; tau++) if (c[tau] < mn) { mn = c[tau]; t0 = tau; } if (mn > 0.45) return null; }
    var a = c[t0 - 1], b = c[t0], cc = c[t0 + 1], den = a - 2 * b + cc, p = den ? 0.5 * (a - cc) / den : 0;
    return { freq: sr / (t0 + p), prob: Math.max(0, 1 - c[t0]) };
  };

  /* ---- utilidades de senal ---- */
  S.mono = function (canales) { if (canales.length === 1) return canales[0]; var n = canales[0].length, m = new Float32Array(n), c, i; for (c = 0; c < canales.length; c++) for (i = 0; i < n; i++) m[i] += canales[c][i] / canales.length; return m; };
  S.decimar = function (x, sr, objetivo) {
    var f = Math.max(1, Math.round(sr / objetivo)); if (f === 1) return { x: x, sr: sr };
    var n = Math.floor(x.length / f), y = new Float32Array(n), i, j; for (i = 0; i < n; i++) { var s = 0; for (j = 0; j < f; j++) s += x[i * f + j]; y[i] = s / f; }
    return { x: y, sr: sr / f };
  };
  /* nivel: percentil 95 de RMS en ventanas de 50 ms (dBFS) y pico */
  S.nivel = function (x, sr) {
    var w = Math.max(64, Math.round(sr * 0.05)), v = [], pico = 0, i, j;
    for (i = 0; i < x.length; i++) { var a = Math.abs(x[i]); if (a > pico) pico = a; }
    for (i = 0; i + w <= x.length; i += w) { var s = 0; for (j = 0; j < w; j++) s += x[i + j] * x[i + j]; v.push(s / w); }
    if (!v.length) return { rmsDb: -120, picoDb: -120 };
    var tot = v.reduce(function (a, b) { return a + b; }, 0) / v.length;
    v.sort(function (a, b) { return a - b; }); var p95 = v[Math.min(v.length - 1, Math.floor(v.length * 0.95))];
    return { rmsDb: 10 * Math.log10(Math.max(tot, 1e-12)), p95Db: 10 * Math.log10(Math.max(p95, 1e-12)), picoDb: 20 * Math.log10(Math.max(pico, 1e-6)) };
  };

  /* ---- BPM por onsets + autocorrelacion con peine armonico ---- */
  S.bpm = function (x0, sr0) {
    var d = S.decimar(x0, sr0, 11025), x = d.x, sr = d.sr, hop = 128, frame = 512, nf = Math.floor((x.length - frame) / hop), i, j;
    if (nf < 64) return null;
    var e = new Float64Array(nf), mx = 0;
    for (i = 0; i < nf; i++) { var s = 0, o = i * hop; for (j = 1; j < frame; j++) { var dx = x[o + j] - x[o + j - 1]; s += dx * dx; } e[i] = s; if (s > mx) mx = s; }
    if (mx < 1e-9) return null;
    var le = new Float64Array(nf); for (i = 0; i < nf; i++) le[i] = Math.log(1 + 1000 * e[i] / mx);
    var on = new Float64Array(nf), W = Math.round(0.4 * sr / hop);
    for (i = 1; i < nf; i++) { var m = 0, c = 0; for (j = Math.max(0, i - W); j < Math.min(nf, i + W); j++) { m += le[j]; c++; } on[i] = Math.max(0, le[i] - le[i - 1] - 0.0 * m / c); }
    var m2 = 0; for (i = 0; i < nf; i++) m2 += on[i]; m2 /= nf; for (i = 0; i < nf; i++) on[i] = Math.max(0, on[i] - m2 * 0.5);
    var fps = sr / hop, maxLag = Math.floor(fps * 60 / 55 * 8) + 2, ac = new Float64Array(maxLag + 2), n0 = 0;
    for (var l = 0; l <= maxLag && l < nf; l++) { var a = 0; for (i = 0; i + l < nf; i++) a += on[i] * on[i + l]; ac[l] = a / (nf - l); }
    n0 = ac[0] || 1;
    function acf(lag) { var i0 = Math.floor(lag), fr = lag - i0; if (i0 + 1 >= ac.length) return 0; return (ac[i0] * (1 - fr) + ac[i0 + 1] * fr) / n0; }
    var mejor = 0, mejorB = 0, pesos = [1, 0.6, 0.35, 0.2];
    for (var b = 55; b <= 210; b += 0.25) {
      var lag = fps * 60 / b, sc = 0; for (var k = 1; k <= 4; k++) sc += pesos[k - 1] * acf(lag * k);
      var pr = Math.exp(-0.5 * Math.pow(Math.log2(b / 120) / 0.75, 2)); sc *= 0.55 + 0.45 * pr;
      if (sc > mejor) { mejor = sc; mejorB = b; }
    }
    if (!mejorB) return null;
    // refinar con peine fino alrededor del maximo
    var fino = mejorB, fs = 0; for (var b2 = mejorB - 0.5; b2 <= mejorB + 0.5; b2 += 0.02) { var lg = fps * 60 / b2, s2 = 0; for (var kk = 1; kk <= 8; kk++) s2 += (kk <= 4 ? pesos[kk - 1] : 0.15) * acf(lg * kk); if (s2 > fs) { fs = s2; fino = b2; } }
    return { bpm: Math.round(fino * 10) / 10, conf: Math.min(1, mejor) };
  };

  /* ---- tonalidad: cromagrama + perfiles de Krumhansl-Kessler ---- */
  var MAYOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], MENOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  S.cromagrama = function (x0, sr0) {
    var d = S.decimar(x0, sr0, 11025), x = d.x, sr = d.sr, N = 8192, hop = 4096, ch = new Float64Array(12), re = new Float64Array(N), im = new Float64Array(N), win = new Float64Array(N), i, o;
    for (i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    var k0 = Math.ceil(60 * N / sr), k1 = Math.floor(2000 * N / sr), pcs = new Int8Array(k1 + 1), wts = new Float64Array(k1 + 1);
    for (var k = k0; k <= k1; k++) { var m = 69 + 12 * Math.log2((k * sr / N) / 440), r = Math.round(m), dv = Math.abs(m - r); pcs[k] = ((r % 12) + 12) % 12; wts[k] = dv < 0.35 ? (1 - dv / 0.35) * 200 / (200 + k * sr / N) : 0; }
    var frames = 0;
    for (o = 0; o + N <= x.length; o += hop) {
      for (i = 0; i < N; i++) { re[i] = x[o + i] * win[i]; im[i] = 0; } S.fft(re, im);
      var tmp = new Float64Array(12), tot = 0;
      for (k = k0; k <= k1; k++) { var mg = Math.sqrt(re[k] * re[k] + im[k] * im[k]); tmp[pcs[k]] += wts[k] * Math.sqrt(mg); tot += mg; }
      if (tot < 1e-6) continue; var s = 0; for (i = 0; i < 12; i++) s += tmp[i]; for (i = 0; i < 12; i++) ch[i] += tmp[i] / (s || 1); frames++;
    }
    return { ch: ch, frames: frames };
  };
  function pearson(a, b) { var n = 12, ma = 0, mb = 0, i; for (i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n; var sa = 0, sb = 0, sab = 0; for (i = 0; i < n; i++) { sa += (a[i] - ma) * (a[i] - ma); sb += (b[i] - mb) * (b[i] - mb); sab += (a[i] - ma) * (b[i] - mb); } return sa && sb ? sab / Math.sqrt(sa * sb) : 0; }
  var CAM = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];
  S.tonalidadDeCroma = function (ch) {
    var mejor = { r: -2 }, seg = -2;
    for (var t = 0; t < 12; t++) for (var md = 0; md < 2; md++) {
      var perfil = md ? MENOR : MAYOR, rot = new Array(12); for (var i = 0; i < 12; i++) rot[i] = perfil[(i - t + 12) % 12];
      var r = pearson(ch, rot); if (r > mejor.r) { seg = mejor.r; mejor = { r: r, t: t, md: md }; } else if (r > seg) seg = r;
    }
    var cam = mejor.md ? CAM[(mejor.t + 3) % 12] + 'A' : CAM[mejor.t] + 'B';
    return { tonica: mejor.t, modo: mejor.md ? 'menor' : 'mayor', conf: Math.max(0, Math.min(1, (mejor.r - seg) * 4 + 0.2)), r: mejor.r, camelot: cam, nombre: S.NOTAS_LAT[mejor.t] + (mejor.md ? ' menor' : ' mayor') };
  };
  S.tonalidad = function (x, sr) { var c = S.cromagrama(x, sr); if (!c.frames) return null; return S.tonalidadDeCroma(c.ch); };

  /* analisis completo de una senal mono (para la biblioteca) */
  S.analizar = function (x, sr) {
    var ini = 0, fin = x.length, lim = Math.floor(sr * 100);
    if (x.length > lim) { ini = Math.floor((x.length - lim) / 2); fin = ini + lim; }
    var seg = x.subarray(ini, fin), niv = S.nivel(x, sr), b = S.bpm(seg, sr), t = S.tonalidad(seg, sr);
    return { rmsDb: niv.rmsDb, p95Db: niv.p95Db, picoDb: niv.picoDb, bpm: b ? b.bpm : 0, bpmConf: b ? b.conf : 0, tono: t ? t.nombre : '', camelot: t ? t.camelot : '', tonoConf: t ? t.conf : 0 };
  };
  return S;
});
