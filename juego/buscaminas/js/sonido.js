/* Sonido procedural (WebAudio): efectos y musica ambiental generados, sin archivos. */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};
  var S = { activo: true }, ctx = null, maestro, efectos, musica, ruido = null, musTimer = 0, musOn = false, paso = 0;

  function crear() {
    if (ctx) return true;
    var C = G.AudioContext || G.webkitAudioContext; if (!C) return false;
    try { ctx = new C(); } catch (e) { return false; }
    maestro = ctx.createGain(); efectos = ctx.createGain(); musica = ctx.createGain();
    efectos.connect(maestro); musica.connect(maestro); maestro.connect(ctx.destination);
    var b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ruido = b; S.volumenes(); return true;
  }
  S.volumenes = function () {
    if (!ctx) return;
    var a = BM.ajustes.gen, t = ctx.currentTime;
    maestro.gain.setTargetAtTime(S.activo ? a.volMaestro : 0, t, 0.03); efectos.gain.setTargetAtTime(a.volEfectos, t, 0.03); musica.gain.setTargetAtTime(a.volMusica * 0.5, t, 0.1);
  };
  S.despertar = function () { if (crear() && ctx.state === 'suspended') ctx.resume(); };
  S.suspender = function () { if (ctx && ctx.state === 'running') ctx.suspend(); };
  S.reanudar = function () { if (ctx && ctx.state === 'suspended') ctx.resume(); };

  function tono(f, dur, tipo, vol, t0, f2, dest) {
    if (!ctx) return;
    var o = ctx.createOscillator(), g = ctx.createGain(), t = (t0 || ctx.currentTime);
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || efectos); o.start(t); o.stop(t + dur + 0.05);
  }
  function soplo(dur, vol, f0, f1, tipo) {
    if (!ctx) return;
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
    s.buffer = ruido; fl.type = tipo || 'lowpass'; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(efectos); s.start(t); s.stop(t + dur + 0.05);
  }
  var NOTAS = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
  S.abrir = function (n) { if (!S.activo || !crear()) return; tono(520 + (n || 0) * 45, 0.07, 'triangle', 0.12); };
  S.cascada = function (k) { if (!S.activo || !crear()) return; var t = ctx.currentTime; for (var i = 0; i < Math.min(6, 2 + (k >> 4)); i++) tono(380 + i * 70, 0.09, 'sine', 0.07, t + i * 0.035); };
  S.bandera = function (poner) { if (!S.activo || !crear()) return; tono(poner ? 300 : 230, 0.1, 'square', 0.07, 0, poner ? 420 : 160); };
  S.acorde = function () { if (!S.activo || !crear()) return; tono(440, 0.06, 'triangle', 0.1); tono(660, 0.09, 'triangle', 0.08, ctx.currentTime + 0.05); };
  S.explosion = function () { if (!S.activo || !crear()) return; soplo(0.9, 0.9, 2600, 80, 'lowpass'); tono(110, 0.7, 'sawtooth', 0.25, 0, 30); };
  S.pierde = function () { if (!S.activo || !crear()) return; var t = ctx.currentTime; [330, 262, 196, 131].forEach(function (f, i) { tono(f, 0.28, 'triangle', 0.16, t + 0.5 + i * 0.2); }); };
  S.gana = function () { if (!S.activo || !crear()) return; var t = ctx.currentTime; [523, 659, 784, 1047, 1319].forEach(function (f, i) { tono(f, 0.3, 'triangle', 0.15, t + i * 0.1); tono(f * 2, 0.2, 'sine', 0.05, t + i * 0.1 + 0.03); }); };
  S.pista = function () { if (!S.activo || !crear()) return; tono(880, 0.12, 'sine', 0.14); tono(1320, 0.25, 'sine', 0.1, ctx.currentTime + 0.1); };
  S.tictac = function () { if (!S.activo || !crear()) return; tono(1000, 0.04, 'square', 0.05); };
  S.vida = function () { if (!S.activo || !crear()) return; tono(180, 0.4, 'sawtooth', 0.15, 0, 60); };
  S.nivel = function () { if (!S.activo || !crear()) return; var t = ctx.currentTime; [392, 523, 659].forEach(function (f, i) { tono(f, 0.2, 'triangle', 0.14, t + i * 0.08); }); };
  S.click = function () { if (!S.activo || !crear()) return; tono(700, 0.03, 'square', 0.04); };

  function nota() {
    if (!musOn || !ctx || ctx.state !== 'running') return;
    var t = ctx.currentTime, base = [0, 2, 4, 2, 5, 4, 2, 1][paso++ % 8], f = NOTAS[base] / 2;
    tono(f, 3.4, 'sine', 0.12, t, 0, musica); tono(f * 1.5, 3.4, 'sine', 0.06, t + 0.02, 0, musica);
    if (paso % 2) tono(NOTAS[(base + 3) % 8], 1.4, 'triangle', 0.04, t + 1.1, 0, musica);
  }
  S.musica = function (on) {
    musOn = on && S.activo; clearInterval(musTimer);
    if (musOn && crear()) { S.volumenes(); nota(); musTimer = setInterval(nota, 2600); }
  };
  S.alternar = function () { S.activo = !S.activo; if (S.activo) S.despertar(); S.volumenes(); return S.activo; };
  BM.sonido = S;
})(window);
