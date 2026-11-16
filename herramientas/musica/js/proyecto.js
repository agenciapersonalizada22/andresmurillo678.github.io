/* Modelo de proyecto de estudio (caja de ritmos + piano roll multipista), eventos exactos y exportacion/importacion MIDI. Puro. window.MuProy */
(function (g, f) { var m = f(typeof module === 'object' ? require('./formatos.js') : g.MuFmt); if (typeof module === 'object' && module.exports) module.exports = m; else g.MuProy = m; })(typeof self !== 'undefined' ? self : this, function (F) {
  'use strict';
  var P = {};
  P.PISTAS_RITMO = ['Bombo', 'Caja', 'Hi-hat cerrado', 'Hi-hat abierto', 'Palmas', 'Tom', 'Rim', 'Cencerro'];
  P.CLAVES_RITMO = ['bombo', 'caja', 'hatc', 'hata', 'palmas', 'tom', 'rim', 'cencerro'];
  P.GM_RITMO = [36, 38, 42, 46, 39, 45, 37, 56];
  P.nuevo = function (nombre) {
    return { nombre: nombre || 'Proyecto nuevo', bpm: 100, compas: [4, 4], swing: 0, kit: '808', largo: 16,
      patron: { largo: 16, pistas: P.PISTAS_RITMO.map(function (n, i) { return { nombre: n, sonido: P.CLAVES_RITMO[i], mute: false, vol: 1, pasos: new Array(16).fill(0) }; }) },
      rollo: { pasos: 32, pistas: [{ nombre: 'Melodía', preset: 'Lead brillante', vol: 1, mute: false, notas: [] }, { nombre: 'Bajo', preset: 'Bajo profundo', vol: 1, mute: false, notas: [] }] }, patch: null };
  };
  P.ejemplo = function () {
    var p = P.nuevo('Ritmo de ejemplo'); p.bpm = 110; var set = function (i, idx) { idx.forEach(function (k) { p.patron.pistas[i].pasos[k] = k % 4 === 0 && i === 0 ? 2 : 1; }); };
    set(0, [0, 6, 8, 11]); set(1, [4, 12]); set(2, [0, 2, 4, 6, 8, 10, 12, 14]); set(3, [15]); set(4, [12]);
    var mel = [[0, 60, 2], [2, 63, 2], [4, 67, 2], [6, 70, 1], [8, 67, 2], [10, 63, 2], [12, 65, 3], [16, 60, 2], [18, 63, 2], [20, 67, 2], [22, 72, 1], [24, 70, 2], [26, 67, 2], [28, 63, 4]], bajo = [[0, 36, 4], [4, 36, 4], [8, 39, 4], [12, 34, 4], [16, 36, 4], [20, 36, 4], [24, 39, 4], [28, 34, 4]];
    p.rollo.pistas[0].notas = mel.map(function (n) { return { ini: n[0], nota: n[1], dur: n[2], vel: 100 }; }); p.rollo.pistas[1].notas = bajo.map(function (n) { return { ini: n[0], nota: n[1], dur: n[2], vel: 110 }; }); return p;
  };
  /* eventos con tiempos en segundos para 'vueltas' repeticiones del rollo */
  P.eventos = function (p, vueltas) {
    var d = 60 / p.bpm / 4, sw = p.swing || 0, pr = Math.max(16, p.rollo.pasos), total = pr * (vueltas || 1), golpes = [], notas = [], largo = p.patron.largo || 16;
    function tp(n) { return n * d + (n % 2 === 1 ? sw * d : 0); }
    for (var s = 0; s < total; s++) p.patron.pistas.forEach(function (t, i) { var v = t.pasos[s % largo]; if (v && !t.mute) golpes.push({ pista: i, t: tp(s), vel: (v === 2 ? 1 : 0.7) * (t.vol == null ? 1 : t.vol) }); });
    for (var v = 0; v < (vueltas || 1); v++) p.rollo.pistas.forEach(function (t, i) { if (t.mute) return; t.notas.forEach(function (n) { var abs = v * pr + Math.floor(n.ini); notas.push({ pista: i, nota: n.nota, t: tp(abs) + (n.ini - Math.floor(n.ini)) * d, dur: n.dur * d, vel: (n.vel || 100) / 127 * (t.vol == null ? 1 : t.vol) }); }); });
    golpes.sort(function (a, b) { return a.t - b.t; }); notas.sort(function (a, b) { return a.t - b.t; });
    return { golpes: golpes, notas: notas, duracion: total * d, d: d };
  };
  var GM = { 'Piano eléctrico': 4, 'Lead brillante': 81, 'Bajo profundo': 38, 'Pad cálido': 89, 'Pluck': 46, 'Órgano': 16, 'Campanas': 14 };
  P.programaGM = function (preset) { return GM[preset] != null ? GM[preset] : 80; };
  /* MIDI: 480 ppq, 1 paso = 120 ticks. Pista 10 (canal 9) para la caja de ritmos */
  P.aMidi = function (p) {
    var ppq = 480, tk = ppq / 4, pistas = [], notas = [], largo = p.patron.largo || 16, pr = Math.max(16, p.rollo.pasos);
    for (var s = 0; s < pr; s++) p.patron.pistas.forEach(function (t, i) { var v = t.pasos[s % largo]; if (v && !t.mute) notas.push({ nota: P.GM_RITMO[i] || 36, ini: s * tk, dur: tk / 2, vel: v === 2 ? 118 : 88 }); });
    if (notas.length) pistas.push({ nombre: 'Ritmo', canal: 9, notas: notas });
    var ch = 0; p.rollo.pistas.forEach(function (t, i) { if (ch === 9) ch++; pistas.push({ nombre: t.nombre || 'Pista ' + (i + 1), canal: ch++, programa: P.programaGM(t.preset), notas: t.notas.map(function (n) { return { nota: n.nota, ini: Math.round(n.ini * tk), dur: Math.max(1, Math.round(n.dur * tk)), vel: n.vel || 100 }; }) }); });
    return F.midiEscribir({ ppq: ppq, bpm: p.bpm, compas: p.compas || [4, 4], pistas: pistas });
  };
  P.desdeMidi = function (bytes, nombre) {
    var m = F.midiLeer(bytes), p = P.nuevo(nombre || 'MIDI importado'), tk = m.ppq / 4; p.bpm = Math.max(40, Math.min(240, Math.round(m.bpm))); p.compas = m.compas; p.rollo.pistas = []; var max = 0;
    m.pistas.forEach(function (t) {
      if (t.canal === 9) { t.notas.forEach(function (n) { var i = P.GM_RITMO.indexOf(n.nota); if (i >= 0) { var s = Math.round(n.ini / tk); if (s < 16) p.patron.pistas[i].pasos[s] = n.vel > 105 ? 2 : 1; } }); return; }
      var notas = t.notas.map(function (n) { var ini = Math.round(n.ini / tk * 4) / 4, du = Math.max(0.25, Math.round(n.dur / tk * 4) / 4); max = Math.max(max, ini + du); return { ini: ini, nota: n.nota, dur: du, vel: n.vel }; });
      if (notas.length && p.rollo.pistas.length < 8) p.rollo.pistas.push({ nombre: t.nombre || 'Pista', preset: 'Lead brillante', vol: 1, mute: false, notas: notas });
    });
    p.rollo.pasos = Math.max(16, Math.min(64, Math.ceil(max / 16) * 16)); if (!p.rollo.pistas.length) p.rollo.pistas.push({ nombre: 'Melodía', preset: 'Lead brillante', vol: 1, mute: false, notas: [] });
    return p;
  };
  return P;
});
