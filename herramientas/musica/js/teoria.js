/* Teoria musical pura: escalas, acordes, intervalos, circulo de quintas, digitaciones de guitarra. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.MuTeo = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var T = {};
  T.SOST = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
  T.BEM = ['Do', 'Re♭', 'Re', 'Mi♭', 'Mi', 'Fa', 'Sol♭', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];
  T.SOST_A = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']; T.BEM_A = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  T.nombre = function (pc, bem, ang) { pc = ((pc % 12) + 12) % 12; return (ang ? (bem ? T.BEM_A : T.SOST_A) : (bem ? T.BEM : T.SOST))[pc]; };
  T.ESCALAS = { 'Mayor (jonia)': [0, 2, 4, 5, 7, 9, 11], 'Menor natural (eolia)': [0, 2, 3, 5, 7, 8, 10], 'Menor armonica': [0, 2, 3, 5, 7, 8, 11], 'Menor melodica': [0, 2, 3, 5, 7, 9, 11], 'Dorica': [0, 2, 3, 5, 7, 9, 10], 'Frigia': [0, 1, 3, 5, 7, 8, 10], 'Lidia': [0, 2, 4, 6, 7, 9, 11], 'Mixolidia': [0, 2, 4, 5, 7, 9, 10], 'Locria': [0, 1, 3, 5, 6, 8, 10], 'Pentatonica mayor': [0, 2, 4, 7, 9], 'Pentatonica menor': [0, 3, 5, 7, 10], 'Blues': [0, 3, 5, 6, 7, 10], 'Cromatica': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 'Tonos enteros': [0, 2, 4, 6, 8, 10] };
  T.ACORDES = { 'Mayor': [0, 4, 7], 'Menor': [0, 3, 7], 'Disminuido': [0, 3, 6], 'Aumentado': [0, 4, 8], 'Sus2': [0, 2, 7], 'Sus4': [0, 5, 7], 'Septima (dom7)': [0, 4, 7, 10], 'Mayor 7': [0, 4, 7, 11], 'Menor 7': [0, 3, 7, 10], 'Semidisminuido (m7b5)': [0, 3, 6, 10], 'Disminuido 7': [0, 3, 6, 9], 'Sexta': [0, 4, 7, 9], 'Menor 6': [0, 3, 7, 9], 'Novena (9)': [0, 4, 7, 10, 14], 'Mayor 9': [0, 4, 7, 11, 14], 'Menor 9': [0, 3, 7, 10, 14] };
  T.SIMBOLO = { 'Mayor': '', 'Menor': 'm', 'Disminuido': 'dim', 'Aumentado': 'aug', 'Sus2': 'sus2', 'Sus4': 'sus4', 'Septima (dom7)': '7', 'Mayor 7': 'maj7', 'Menor 7': 'm7', 'Semidisminuido (m7b5)': 'm7♭5', 'Disminuido 7': 'dim7', 'Sexta': '6', 'Menor 6': 'm6', 'Novena (9)': '9', 'Mayor 9': 'maj9', 'Menor 9': 'm9' };
  T.INTERVALOS = ['Unisono', '2ª menor', '2ª mayor', '3ª menor', '3ª mayor', '4ª justa', 'Tritono', '5ª justa', '6ª menor', '6ª mayor', '7ª menor', '7ª mayor', 'Octava'];
  T.pcs = function (raiz, forma) { return forma.map(function (i) { return ((raiz + i) % 12 + 12) % 12; }); };
  /* circulo de quintas: orden de tonicas mayores (pc) */
  T.QUINTAS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
  T.armadura = function (pcMayor) { var i = T.QUINTAS.indexOf(pcMayor), n = i <= 6 ? i : i - 12; return n === 6 ? 6 : n; }; // + sostenidos, - bemoles (Fa#/Sol♭ = 6)
  T.usaBemoles = function (pcMayor) { return T.armadura(pcMayor) < 0 || pcMayor === 5; };
  T.relativaMenor = function (pcMayor) { return (pcMayor + 9) % 12; };
  T.diatonicos = function (pcMayor) {
    var esc = T.pcs(pcMayor, T.ESCALAS['Mayor (jonia)']), tipos = ['Mayor', 'Menor', 'Menor', 'Mayor', 'Mayor', 'Menor', 'Disminuido'], rom = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'], bem = T.usaBemoles(pcMayor);
    return esc.map(function (pc, i) { return { grado: rom[i], pc: pc, tipo: tipos[i], nombre: T.nombre(pc, bem) + T.SIMBOLO[tipos[i]], notas: T.pcs(pc, T.ACORDES[tipos[i]]) }; });
  };
  /* guitarra: afinacion estandar (MIDI) y digitacion sugerida */
  T.CUERDAS = [40, 45, 50, 55, 59, 64];
  T.digitacion = function (raiz, tipo) {
    var set = T.pcs(raiz, T.ACORDES[tipo]), mejor = null;
    for (var base = 0; base <= 9; base++) {
      var tr = [], usadas = 0, silenciadas = 0, min = 99, max = 0, tonos = {};
      for (var c = 0; c < 6; c++) {
        var op = null;
        for (var f = base === 0 ? 0 : base; f <= base + 3; f++) { var pc = (T.CUERDAS[c] + f) % 12; if (set.indexOf(pc) >= 0 && !(base > 0 && f === 0)) { op = f; break; } }
        if (c < 5 && op == null) op = -1; else if (op == null) op = -1;
        tr.push(op); if (op >= 0) { usadas++; tonos[(T.CUERDAS[c] + op) % 12] = 1; if (op > 0) { min = Math.min(min, op); max = Math.max(max, op); } } else silenciadas++;
      }
      var raizBajo = tr.findIndex(function (x) { return x >= 0; }), okRaiz = raizBajo >= 0 && (T.CUERDAS[raizBajo] + tr[raizBajo]) % 12 === raiz % 12, completo = Object.keys(tonos).length >= Math.min(3, set.length);
      var puntos = usadas * 3 - silenciadas - (max - (min === 99 ? 0 : min)) - base * 0.2 + (okRaiz ? 4 : 0) + (completo ? 5 : -10);
      if (!mejor || puntos > mejor.puntos) mejor = { trastes: tr, puntos: puntos, base: base };
    }
    return mejor;
  };
  /* parseo/cuantizacion para el lector de ritmo: patrones en pulsos (negra = 1) */
  T.PATRONES_RITMO = [
    [[0, 1], [1, 1], [2, 1], [3, 1]], [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1], [3, 1]], [[0, 0.5], [0.5, 0.5], [1, 1], [2, 0.5], [2.5, 0.5], [3, 1]], [[0, 2], [2, 1], [3, 1]], [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]],
    [[0, 1], [1, 1], [2, 0.5], [2.5, 0.5], [3, 0.5], [3.5, 0.5]], [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 1], [3, 1]], [[0, 1], [1.5, 0.5], [2, 1], [3, 0.5], [3.5, 0.5]], [[0, 0.25], [0.25, 0.25], [0.5, 0.5], [1, 1], [2, 1], [3, 1]], [[0, 1], [1, 0.5], [1.5, 0.25], [1.75, 0.25], [2, 1], [3, 1]]
  ];
  /* evalua toques (ms) contra instantes esperados (ms): empareja el toque libre mas cercano dentro de la ventana */
  T.evaluarRitmo = function (esperados, toques, ventana) {
    ventana = ventana || 250; var usados = {}, items = [], pts = 0;
    esperados.forEach(function (e) {
      var mejor = -1, md = 1e9; toques.forEach(function (t, j) { if (usados[j]) return; var d = Math.abs(t - e); if (d < md) { md = d; mejor = j; } });
      if (mejor >= 0 && md <= ventana) { usados[mejor] = 1; var err = toques[mejor] - e, a = Math.abs(err), p = a <= 40 ? 1 : a <= 80 ? 0.8 : a <= 140 ? 0.5 : 0.2; pts += p; items.push({ esperado: e, toque: toques[mejor], errorMs: Math.round(err), puntos: p }); }
      else items.push({ esperado: e, toque: null, errorMs: null, puntos: 0 });
    });
    var extras = toques.length - Object.keys(usados).length; pts = Math.max(0, pts - 0.15 * extras);
    return { items: items, extras: extras, pct: esperados.length ? Math.round(pts / esperados.length * 100) : 0, perfecto: items.length > 0 && items.every(function (i) { return i.toque != null && Math.abs(i.errorMs) <= 60; }) && extras === 0 };
  };
  return T;
});
