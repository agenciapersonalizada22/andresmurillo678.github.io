/* Calculos puros de audio: ecualizador (biquad RBJ), ganancias, ReplayGain, compresor, cruce, aleatorio inteligente, tiempos. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.MuCalc = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var C = {};
  C.BANDAS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  C.PRESETS = { 'Plano': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'Graves+': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0], 'Agudos+': [0, 0, 0, 0, 0, 1, 3, 4, 5, 6], 'Voz': [-2, -2, -1, 1, 3, 4, 3, 1, 0, -1], 'Rock': [5, 4, 2, -1, -2, -1, 2, 4, 5, 5], 'Pop': [-1, 1, 3, 4, 3, 0, -1, -1, 1, 2], 'Jazz': [3, 2, 1, 2, -2, -2, 0, 1, 2, 3], 'Clasica': [4, 3, 2, 1, -1, -1, 0, 2, 3, 4], 'Electronica': [6, 5, 1, 0, -2, 2, 1, 2, 5, 6], 'Hip-hop': [6, 5, 2, 3, -1, -1, 2, -1, 2, 3], 'Acustica': [3, 3, 2, 1, 2, 2, 3, 3, 2, 1], 'Loudness': [6, 4, 0, 0, -1, 0, -1, 0, 4, 2], 'Sin graves': [-6, -5, -4, -2, 0, 0, 0, 0, 0, 0] };
  C.dbALin = function (db) { return Math.pow(10, db / 20); };
  C.linADb = function (x) { return 20 * Math.log10(Math.max(x, 1e-9)); };
  /* coeficientes biquad (b0,b1,b2,a1,a2 ya normalizados por a0). tipo: peaking|lowshelf|highshelf|lowpass|highpass */
  C.biquad = function (tipo, f0, gDb, Q, fs) {
    var A = Math.pow(10, gDb / 40), w = 2 * Math.PI * f0 / fs, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * Q), b0, b1, b2, a0, a1, a2, sq = 2 * Math.sqrt(A) * al;
    if (tipo === 'peaking') { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
    else if (tipo === 'lowshelf') { b0 = A * ((A + 1) - (A - 1) * cs + sq); b1 = 2 * A * ((A - 1) - (A + 1) * cs); b2 = A * ((A + 1) - (A - 1) * cs - sq); a0 = (A + 1) + (A - 1) * cs + sq; a1 = -2 * ((A - 1) + (A + 1) * cs); a2 = (A + 1) + (A - 1) * cs - sq; }
    else if (tipo === 'highshelf') { b0 = A * ((A + 1) + (A - 1) * cs + sq); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - sq); a0 = (A + 1) - (A - 1) * cs + sq; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - sq; }
    else if (tipo === 'lowpass') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    else { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
  };
  C.respuestaDb = function (c, f, fs) { // |H(e^jw)| en dB
    var w = 2 * Math.PI * f / fs, cw = Math.cos(w), sw = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
    var nr = c.b0 + c.b1 * cw + c.b2 * c2, ni = -(c.b1 * sw + c.b2 * s2), dr = 1 + c.a1 * cw + c.a2 * c2, di = -(c.a1 * sw + c.a2 * s2);
    return 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
  };
  C.QEQ = 1.41;
  /* respuesta total del EQ de 10 bandas: la 1a y la ultima son shelf, el resto peaking */
  C.curvaEQ = function (gan, fs, freqs) {
    return freqs.map(function (f) { var s = 0; C.BANDAS.forEach(function (b, i) { if (!gan[i]) return; var t = i === 0 ? 'lowshelf' : i === 9 ? 'highshelf' : 'peaking'; s += C.respuestaDb(C.biquad(t, b, gan[i], C.QEQ, fs), f, fs); }); return s; });
  };
  C.tipoBanda = function (i) { return i === 0 ? 'lowshelf' : i === 9 ? 'highshelf' : 'peaking'; };
  /* ganancia total por pre-amplificador: evita recorte si la suma de realces es alta (auto-preamp) */
  C.autoPreamp = function (gan) { var m = Math.max(0, Math.max.apply(null, C.curvaEQ(gan, 48000, C.BANDAS))); return -m; };
  /* ReplayGain por analisis local: objetivo en dBFS de RMS (p95). Devuelve dB aplicados y si se limito por pico */
  C.ganRG = function (p95Db, picoDb, objetivo, evitarClip) {
    var g0 = (objetivo == null ? -16 : objetivo) - p95Db, lim = false;
    g0 = Math.max(-24, Math.min(15, g0));
    if (evitarClip && picoDb + g0 > -0.5) { g0 = -0.5 - picoDb; lim = true; }
    return { db: g0, limitada: lim };
  };
  /* curva estatica del compresor: entrada dB -> salida dB (rodilla suave, como DynamicsCompressorNode simplificado) */
  C.curvaCompresor = function (x, o) {
    var T = o.umbral, R = o.ratio, K = o.rodilla || 0, y;
    if (2 * (x - T) < -K) y = x; else if (K > 0 && 2 * Math.abs(x - T) <= K) y = x + (1 / R - 1) * Math.pow(x - T + K / 2, 2) / (2 * K); else y = T + (x - T) / R;
    return y;
  };
  C.cruce = function (x) { x = Math.max(0, Math.min(1, x)); return { sale: Math.cos(x * Math.PI / 2), entra: Math.sin(x * Math.PI / 2) }; };
  C.ratioTono = function (semitonos, cents) { return Math.pow(2, (semitonos + (cents || 0) / 100) / 12); };
  C.tiempo = function (s) { if (!isFinite(s) || s < 0) s = 0; s = Math.floor(s); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x; };
  /* generador pseudoaleatorio con semilla (mulberry32) */
  C.rng = function (sem) { var a = sem >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  /* orden aleatorio inteligente: pondera favoritas/valoradas/poco escuchadas recientemente y evita repetir artista seguido */
  C.peso = function (p, ahora) {
    var w = 1 + (p.fav ? 0.8 : 0) + ((p.val || 0) ? (p.val - 3) * 0.3 : 0) + Math.min(1, Math.log(1 + (p.reproducciones || 0)) * 0.1);
    if (p.ultima && ahora - p.ultima < 864e5) w *= 0.3; return Math.max(0.1, w);
  };
  C.aleatorio = function (pistas, o) {
    o = o || {}; var rnd = o.rng || Math.random, ahora = o.ahora || Date.now(), claves = pistas.map(function (p) { return { p: p, k: Math.pow(rnd(), 1 / C.peso(p, ahora)) }; });
    claves.sort(function (a, b) { return b.k - a.k; }); var r = claves.map(function (x) { return x.p; });
    for (var i = 1; i < r.length; i++) if (r[i].artista && r[i].artista === r[i - 1].artista) { var j = i + 1; while (j < r.length && r[j].artista === r[i - 1].artista) j++; if (j < r.length) { var x = r[j]; r.splice(j, 1); r.splice(i, 0, x); } }
    return r;
  };
  return C;
});
