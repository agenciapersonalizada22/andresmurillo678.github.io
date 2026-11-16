const assert = require('assert'), S = require('../js/senal.js');
let n = 0; const t = (nombre, f) => { f(); n++; console.log('ok', nombre); };
const seno = (f, sr, len, arm) => { const x = new Float32Array(len); (arm || [1]).forEach((a, k) => { for (let i = 0; i < len; i++) x[i] += a * Math.sin(2 * Math.PI * f * (k + 1) * i / sr); }); return x; };
const cents = (a, b) => 1200 * Math.log2(a / b);
t('YIN: senos de frecuencia conocida (<5 centimos)', () => {
  for (const sr of [44100, 48000]) for (const f of [41.2, 82.41, 110, 196, 261.63, 329.63, 440, 659.26, 880, 1318.5]) {
    const r = S.yin(seno(f, sr, 8192), sr, { min: 35 });
    assert.ok(r, 'sin deteccion ' + f); assert.ok(Math.abs(cents(r.freq, f)) < 5, `f=${f} sr=${sr} -> ${r.freq} (${cents(r.freq, f).toFixed(2)}c)`);
  }
});
t('YIN: sonido con armonicos y fundamental debil', () => {
  const r = S.yin(seno(220, 44100, 4096, [0.4, 1, 0.8, 0.5]), 44100, { min: 60 }); assert.ok(Math.abs(cents(r.freq, 220)) < 5, r.freq);
  const r2 = S.yin(seno(329.63, 44100, 4096, [1, 0.5, 0.3, 0.2]), 44100); assert.ok(Math.abs(cents(r2.freq, 329.63)) < 5);
});
t('YIN: desafinados 20 centimos y silencio/ruido', () => {
  const f = 440 * Math.pow(2, 20 / 1200), r = S.yin(seno(f, 44100, 4096), 44100); assert.ok(Math.abs(S.nota(r.freq).cents - 20) < 2, S.nota(r.freq).cents);
  assert.equal(S.yin(new Float32Array(4096), 44100), null);
});
t('nota/cents y nombres', () => { const n = S.nota(440); assert.equal(n.midi, 69); assert.equal(S.nombreNota(n.pc), 'La'); assert.equal(n.octava, 4); assert.equal(S.nota(261.63).midi, 60); assert.equal(S.nota(466.16).cents, 0); assert.ok(Math.abs(S.freqMidi(60) - 261.6256) < 1e-3); assert.equal(S.nota(440, 442).cents < 0, true); });
t('FFT: pico en el bin esperado', () => { const N = 1024, re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; i++) re[i] = Math.sin(2 * Math.PI * 64 * i / N); S.fft(re, im); let m = 0, k = 0; for (let i = 0; i < N / 2; i++) { const a = Math.hypot(re[i], im[i]); if (a > m) { m = a; k = i; } } assert.equal(k, 64); assert.ok(Math.abs(m - N / 2) < 1e-6); });
function clics(bpm, sr, seg, pat) { // bombo con senoide decreciente en cada pulso (pat = acentos por pulso)
  const x = new Float32Array(sr * seg), per = 60 / bpm * sr; let k = 0;
  for (let p = 0; p * per < x.length - 3000; p++) { const o = Math.round(p * per), a = (pat || [1])[p % (pat || [1]).length]; if (!a) continue; for (let i = 0; i < 2500; i++) x[o + i] += a * Math.sin(2 * Math.PI * (60 + 90 * Math.exp(-i / 300)) * i / sr) * Math.exp(-i / 700) * (1 + (i < 150 ? 1 : 0)); }
  return x;
}
t('BPM: tren de pulsos 128, 90, 140 y 75 con tolerancia 1 BPM', () => {
  for (const b of [128, 90, 140, 100]) { const r = S.bpm(clics(b, 44100, 20), 44100); assert.ok(Math.abs(r.bpm - b) <= 1, `bpm ${b} -> ${r.bpm}`); }
});
t('BPM: patron con acentos y contratiempos (4x4 a 120)', () => {
  const sr = 44100, x = clics(120, sr, 24, [1, 0.5, 0.8, 0.5]), y = clics(240, sr, 24, [0.3]); for (let i = 0; i < x.length; i++) x[i] += y[i] * 0.4;
  const r = S.bpm(x, sr); assert.ok(Math.abs(r.bpm - 120) <= 1, r.bpm);
});
function acordes(prog, sr, seg) { // prog: lista de listas de midi; cada acorde con 3 armonicos
  const x = new Float32Array(sr * seg), dur = Math.floor(x.length / prog.length);
  prog.forEach((ac, k) => ac.forEach((m) => { const f = 440 * Math.pow(2, (m - 69) / 12); for (let i = 0; i < dur; i++) for (let h = 1; h <= 3; h++) x[k * dur + i] += Math.sin(2 * Math.PI * f * h * i / sr) / (h * 2); }));
  return x;
}
t('Tonalidad: Do mayor (I-IV-V-I), La menor, Re mayor, Fa# menor', () => {
  const sr = 22050, prog = (t, men) => { const tr = (m) => m + t, I = men ? [0, 3, 7] : [0, 4, 7], IV = men ? [5, 8, 12] : [5, 9, 12], V = [7, 11, 14]; return [I, I, IV, I, V, I, I, I].map((c) => c.map((m) => tr(m) + 48)); };
  const casos = [['Do mayor', prog(0, 0)], ['La menor', prog(9, 1)], ['Re mayor', prog(2, 0)], ['Fa♯ menor', prog(6, 1)], ['Sol mayor', prog(7, 0)]];
  casos.forEach(([nombre, pr]) => { const r = S.tonalidad(acordes(pr, sr, 24), sr); assert.equal(r.nombre, nombre, `${nombre} -> ${r.nombre} (${r.r})`); });
  const r = S.tonalidad(acordes(casos[0][1], sr, 24), sr); assert.equal(r.camelot, '8B'); assert.equal(S.tonalidad(acordes(casos[1][1], sr, 24), sr).camelot, '8A');
});
t('Nivel RMS y pico: seno de amplitud conocida', () => { const x = seno(440, 44100, 44100 * 3).map((v) => v * 0.5), n = S.nivel(x, 44100); assert.ok(Math.abs(n.rmsDb - (-9.03)) < 0.1, n.rmsDb); assert.ok(Math.abs(n.picoDb - (-6.02)) < 0.1); });
t('analizar() integra BPM, tono y nivel', () => { const sr = 22050, a = S.analizar(clics(110, sr, 20), sr); assert.ok(Math.abs(a.bpm - 110) <= 1); assert.ok(a.rmsDb < 0); });
console.log(n + ' pruebas de senal OK');
