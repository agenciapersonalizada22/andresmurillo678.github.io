/* Pistas de demostracion generadas localmente (WAV con etiquetas LIST INFO): sirven para probar el reproductor sin tener musica a mano. window.MuDemo */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.MuDemo = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DEMOS = [
    { titulo: 'Amanecer en Do', artista: 'Estudio de Música', album: 'Demostraciones', genero: 'Demo', bpm: 120, tonica: 48, menor: false, seg: 24 },
    { titulo: 'Noche en La menor', artista: 'Estudio de Música', album: 'Demostraciones', genero: 'Demo', bpm: 96, tonica: 57, menor: true, seg: 24 },
    { titulo: 'Marcha en Re', artista: 'Estudio de Música', album: 'Demostraciones', genero: 'Demo', bpm: 140, tonica: 50, menor: false, seg: 24 }
  ];
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function render(d, sr) {
    var n = Math.floor(d.seg * sr), L = new Float32Array(n), R = new Float32Array(n), beat = 60 / d.bpm * sr, prog = [[0, 4, 7], [0, 4, 7], [5, 9, 12], [0, 4, 7], [7, 11, 14], [0, 4, 7]];
    if (d.menor) prog = [[0, 3, 7], [0, 3, 7], [5, 8, 12], [0, 3, 7], [7, 11, 14], [0, 3, 7]];
    var compas = beat * 4, i, k, ac, h;
    for (i = 0; i < n; i++) {
      var c = Math.floor(i / compas), a = prog[c % prog.length], tc = (i % compas) / sr, v = 0, w = 0;
      for (k = 0; k < a.length; k++) for (h = 1; h <= 3; h++) v += Math.sin(2 * Math.PI * hz(d.tonica + 12 + a[k]) * h * i / sr) / (h * 3.2) * (0.6 + 0.4 * Math.exp(-tc * 0.8));
      var nb = Math.floor(i / (beat / 2)), tn = (i % (beat / 2)) / sr, mel = d.tonica + 24 + a[nb % a.length] + (nb % 8 > 3 ? 12 : 0);
      w = Math.sin(2 * Math.PI * hz(mel) * i / sr) * Math.exp(-tn * 9) * 0.22;
      var tb = (i % beat) / sr, bombo = Math.sin(2 * Math.PI * (50 + 110 * Math.exp(-tb * 28)) * tb) * Math.exp(-tb * 7) * 0.7 * (1 + (tb < 0.004 ? 0.3 : 0));
      var tb2 = ((i + beat / 2) % beat) / sr, hat = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * Math.exp(-tb2 * 60) * 0.08;
      var bajo = Math.sin(2 * Math.PI * hz(d.tonica - 12 + a[0]) * i / sr) * 0.26;
      var fin = Math.min(1, (n - i) / (sr * 0.3), i / (sr * 0.02));
      L[i] = (v * 0.55 + w + bombo + hat + bajo) * 0.5 * fin; R[i] = (v * 0.55 + w * 0.8 + bombo + hat * 1.2 + bajo) * 0.5 * fin;
    }
    return [L, R];
  }
  function info(wav, d) { // inserta LIST INFO antes de 'data'
    var enc = new TextEncoder(), items = [['INAM', d.titulo], ['IART', d.artista], ['IPRD', d.album], ['IGNR', d.genero], ['ICRD', '2026']], partes = [enc.encode('INFO')];
    items.forEach(function (it) { var t = enc.encode(it[1] + '\u0000'), cab = new Uint8Array(8), dv = new DataView(cab.buffer); cab.set(enc.encode(it[0])); dv.setUint32(4, t.length, true); partes.push(cab, t); if (t.length & 1) partes.push(new Uint8Array(1)); });
    var n = partes.reduce(function (a, p) { return a + p.length; }, 0), lc = new Uint8Array(8 + n), dv2 = new DataView(lc.buffer); lc.set(enc.encode('LIST')); dv2.setUint32(4, n, true); var o = 8; partes.forEach(function (p) { lc.set(p, o); o += p.length; });
    var out = new Uint8Array(wav.length + lc.length); out.set(wav.subarray(0, 36)); out.set(lc, 36); out.set(wav.subarray(36), 36 + lc.length); new DataView(out.buffer).setUint32(4, out.length - 8, true); return out;
  }
  return {
    LISTA: DEMOS,
    generar: function (i, sr) { sr = sr || 22050; var d = DEMOS[i % DEMOS.length], ch = render(d, sr), w = (typeof module === 'object' ? require('./formatos.js') : self.MuFmt).wavEscribir(ch, sr); return { nombre: 'demo-' + (i + 1) + '-' + d.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.wav', bytes: info(w, d), meta: d }; }
  };
});
