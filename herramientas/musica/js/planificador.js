/* Planificador con look-ahead sobre un reloj inyectable (AudioContext.currentTime en la app; reloj simulado en pruebas).
   crearReja: emite ticks de duracion 60/bpm/div con tiempos exactos acumulados. infoPulso: acentos del metronomo. transporte: caja de ritmos + piano roll. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.MuPlan = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var P = {};
  /* o: {reloj(), adelante (s), intervalo (ms), alTick(n, tiempo, info), setTimer, clearTimer} */
  P.crearReja = function (o) {
    var adel = o.adelante || 0.12, intervalo = o.intervalo || 25, st = o.setTimer || setInterval, ct = o.clearTimer || clearInterval, id = null;
    var R = { bpm: 120, div: 1, swing: 0, n: 0, proximo: 0, activo: false };
    function dur() { return 60 / R.bpm / R.div; }
    R.tick = function () {
      if (!R.activo) return; var lim = o.reloj() + adel;
      while (R.proximo < lim) {
        var d = dur(), t = R.proximo + (R.swing && R.n % 2 === 1 ? R.swing * d : 0);
        if (t < o.reloj() - 1e-6) t = o.reloj(); // nunca programar en el pasado
        o.alTick(R.n, t, { dur: d }); R.n++; R.proximo += d;
      }
    };
    R.iniciar = function (t0, n0) { R.n = n0 || 0; R.proximo = t0 == null ? o.reloj() + 0.06 : t0; R.activo = true; R.tick(); if (id == null) id = st(R.tick, intervalo); };
    R.detener = function () { R.activo = false; if (id != null) { ct(id); id = null; } };
    return R;
  };
  /* acento del tick n: compas [num, den]; sub = subdivisiones por pulso. */
  P.infoPulso = function (n, compas, sub) {
    sub = sub || 1; var num = compas[0], den = compas[1], porCompas = num * sub, k = n % porCompas, pulso = Math.floor(k / sub), s = k % sub, compuesto = den === 8 && num >= 6 && num % 3 === 0;
    var tipo = s ? 'sub' : pulso === 0 ? 'fuerte' : (compuesto ? pulso % 3 === 0 : (num >= 4 && num % 2 === 0 && pulso === num / 2 && num > 4)) ? 'medio' : 'debil';
    return { compas: Math.floor(n / porCompas), pulso: pulso, sub: s, tipo: tipo };
  };
  /* transporte: patron {pistas:[{pasos:[0|1|2]}]} (16 pasos) y rollo {pasos, pistas:[{notas:[{nota, ini, dur, vel}]}]} (ini/dur en pasos de 1/16) */
  P.transporte = function (o) {
    var T = { pasos: 16, paso: 0 };
    var reja = P.crearReja({ reloj: o.reloj, adelante: o.adelante, intervalo: o.intervalo, setTimer: o.setTimer, clearTimer: o.clearTimer, alTick: function (n, t, inf) {
      var paso = n % T.pasos; T.paso = paso;
      var pat = o.patron && o.patron(), nP = pat ? (pat.largo || 16) : 16;
      if (pat) pat.pistas.forEach(function (p, i) { var v = p.pasos[paso % nP]; if (v && !p.mute) o.alGolpe(i, t, v === 2 ? 1 : 0.7); });
      var ro = o.rollo && o.rollo(); if (ro) ro.pistas.forEach(function (p, i) { if (p.mute) return; p.notas.forEach(function (nt) { if (Math.floor(nt.ini) === paso) { var off = (nt.ini - Math.floor(nt.ini)) * inf.dur; o.alNota(i, nt.nota, t + off, nt.dur * inf.dur, (nt.vel || 100) / 127); } }); });
      if (o.alPaso) o.alPaso(paso, t, n);
    } });
    reja.div = 4; T.reja = reja;
    Object.defineProperty(T, 'bpm', { get: function () { return reja.bpm; }, set: function (v) { reja.bpm = v; } });
    Object.defineProperty(T, 'swing', { get: function () { return reja.swing; }, set: function (v) { reja.swing = v; } });
    T.iniciar = function (t0) { var ro = o.rollo && o.rollo(); T.pasos = ro ? Math.max(16, ro.pasos || 16) : 16; reja.iniciar(t0); }; T.detener = reja.detener; T.tick = reja.tick;
    return T;
  };
  return P;
});
