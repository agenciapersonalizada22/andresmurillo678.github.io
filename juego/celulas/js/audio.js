/* Celulas: sonido sintetizado con WebAudio (sin archivos). */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {};
  var ac = null, mas = null, gm = null, ge = null, vol = { maestro: 0.8, musica: 0.35, efectos: 0.8 }, tMus = 0, ultimo = {}, musOn = false, nota = 0;
  var A = C.Audio = {
    vol: vol,
    iniciar: function () {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
      var AC = G.AudioContext || G.webkitAudioContext; if (!AC) return;
      try {
        ac = new AC(); mas = ac.createGain(); gm = ac.createGain(); ge = ac.createGain();
        gm.connect(mas); ge.connect(mas); mas.connect(ac.destination); A.volumenes();
      } catch (e) { ac = null; }
    },
    volumenes: function (v) {
      if (v) { vol.maestro = v.maestro; vol.musica = v.musica; vol.efectos = v.efectos; }
      if (!ac) return; mas.gain.value = vol.maestro; gm.gain.value = vol.musica * 0.5; ge.gain.value = vol.efectos;
    },
    suspender: function () { if (ac && ac.state === 'running') ac.suspend(); },
    reanudar: function () { if (ac && ac.state === 'suspended') ac.resume(); },
    tono: function (f0, f1, dur, tipo, g, ret) {
      if (!ac || vol.maestro <= 0 || vol.efectos <= 0) return;
      var t = ac.currentTime + (ret || 0), o = ac.createOscillator(), e = ac.createGain();
      o.type = tipo || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g || 0.2, t + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(e); e.connect(ge); o.start(t); o.stop(t + dur + 0.02);
    },
    sfx: function (n, a) {
      if (!ac) return; var ahora = ac.currentTime;
      if (ultimo[n] && ahora - ultimo[n] < (n === 'comer' ? 0.07 : 0.04)) return; ultimo[n] = ahora;
      switch (n) {
        case 'comer': A.tono(300 + Math.min(500, (a || 0) * 2), 520 + (a || 0), 0.07, 'sine', 0.12); break;
        case 'devorar': A.tono(200, 520, 0.14, 'triangle', 0.22); A.tono(520, 780, 0.12, 'triangle', 0.16, 0.1); break;
        case 'dividir': A.tono(260, 640, 0.12, 'square', 0.1); break;
        case 'expulsar': A.tono(380, 170, 0.09, 'triangle', 0.16); break;
        case 'virus': A.tono(120, 40, 0.35, 'sawtooth', 0.22); A.tono(90, 300, 0.2, 'square', 0.08); break;
        case 'muerte': A.tono(420, 60, 0.6, 'sawtooth', 0.2); break;
        case 'victoria': [523, 659, 784, 1046].forEach(function (f, i) { A.tono(f, f, 0.25, 'triangle', 0.18, i * 0.12); }); break;
        case 'logro': A.tono(660, 990, 0.2, 'sine', 0.18); A.tono(990, 1320, 0.25, 'sine', 0.15, 0.15); break;
        case 'clic': A.tono(700, 600, 0.04, 'square', 0.06); break;
        case 'aviso': A.tono(500, 500, 0.12, 'sine', 0.12); break;
      }
    },
    /* musica ambiental: acordes lentos de pads */
    musica: function (on) {
      musOn = on;
      if (!on || !ac || A._mt) return;
      var acordes = [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [-7, -3, 0]];
      function suena() {
        if (!musOn || !ac || ac.state !== 'running' || vol.musica <= 0) return;
        var ch = acordes[nota++ % acordes.length], t = ac.currentTime;
        ch.forEach(function (s) {
          var o = ac.createOscillator(), e = ac.createGain(), f = 220 * Math.pow(2, s / 12);
          o.type = 'sine'; o.frequency.value = f; e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.16, t + 1.6); e.gain.linearRampToValueAtTime(0.0001, t + 5.2);
          o.connect(e); e.connect(gm); o.start(t); o.stop(t + 5.4);
        });
      }
      suena(); A._mt = setInterval(suena, 4000);
    },
    pararMusica: function () { musOn = false; if (A._mt) { clearInterval(A._mt); A._mt = 0; } }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
