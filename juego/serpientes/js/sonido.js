/* Sonido sintetizado con WebAudio: efectos y musica ambiental generativa. */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, A = S.Almacen, Z = S.Sonido = {};
  var ac = null, mg, fx, mu, turboNodo = null, tMus = 0, musOn = false, proximo = 0, paso = 0;
  var ESC = [0, 3, 5, 7, 10, 12, 15, 17];
  function nota(n) { return 110 * Math.pow(2, n / 12); }
  Z.iniciar = function () {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    var C = G.AudioContext || G.webkitAudioContext; if (!C) return;
    ac = new C(); mg = ac.createGain(); fx = ac.createGain(); mu = ac.createGain(); fx.connect(mg); mu.connect(mg); mg.connect(ac.destination); Z.volumenes();
  };
  Z.volumenes = function () {
    if (!ac) return; var a = A.aj.audio; mg.gain.value = a.maestro; fx.gain.value = a.efectos; mu.gain.value = a.musica * 0.5;
  };
  Z.suspender = function (s) { if (!ac) return; if (s) ac.suspend(); else ac.resume(); };
  function tono(f, d, tipo, vol, f2, delay) {
    if (!ac || A.aj.audio.efectos <= 0) return;
    var t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(fx); o.start(t); o.stop(t + d + 0.02);
  }
  var ultCome = 0;
  Z.efecto = function (n) {
    if (!ac) return;
    var ahora = ac.currentTime;
    if (n === 'come') { if (ahora - ultCome < 0.05) return; ultCome = ahora; tono(520 + Math.random() * 300, 0.09, 'sine', 0.18, 900); }
    else if (n === 'muerte') { tono(300, 0.7, 'sawtooth', 0.3, 40); tono(120, 0.8, 'square', 0.2, 30); }
    else if (n === 'kill') { tono(440, 0.12, 'square', 0.2, 880); tono(660, 0.18, 'square', 0.2, 1320, 0.08); }
    else if (n === 'logro') { [523, 659, 784, 1046].forEach(function (f, i) { tono(f, 0.25, 'triangle', 0.22, 0, i * 0.09); }); }
    else if (n === 'fin') { [392, 523, 659, 784].forEach(function (f, i) { tono(f, 0.4, 'triangle', 0.25, 0, i * 0.14); }); }
    else if (n === 'click') tono(700, 0.05, 'square', 0.08);
  };
  Z.turbo = function (on) {
    if (!ac) return;
    if (on && !turboNodo) {
      var b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      var s = ac.createBufferSource(); s.buffer = b; s.loop = true; var f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
      var g = ac.createGain(); g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(0.1, ac.currentTime + 0.1); s.connect(f); f.connect(g); g.connect(fx); s.start(); turboNodo = { s: s, g: g };
    } else if (!on && turboNodo) {
      var t = turboNodo; turboNodo = null; t.g.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 0.12); t.s.stop(ac.currentTime + 0.15);
    }
  };
  function pasoMusica() {
    if (!ac || !musOn || A.aj.audio.musica <= 0) return;
    while (proximo < ac.currentTime + 0.6) {
      var t = Math.max(proximo, ac.currentTime), n = ESC[(paso * 3 + (paso >> 2)) % ESC.length] + (paso % 16 < 8 ? 0 : -2);
      var o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = nota(n + 12);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.18, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9); o.connect(g); g.connect(mu); o.start(t); o.stop(t + 1);
      if (paso % 8 === 0) { var b = ac.createOscillator(), bg = ac.createGain(); b.type = 'triangle'; b.frequency.value = nota(n - 12); bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(0.3, t + 0.2); bg.gain.exponentialRampToValueAtTime(0.0001, t + 3.2); b.connect(bg); bg.connect(mu); b.start(t); b.stop(t + 3.4); }
      proximo = t + 0.42; paso++;
    }
  }
  Z.musica = function (on) { musOn = on; if (on && !tMus) tMus = setInterval(pasoMusica, 250); if (!on && tMus) { clearInterval(tMus); tMus = 0; } };
})(typeof window !== 'undefined' ? window : globalThis);
