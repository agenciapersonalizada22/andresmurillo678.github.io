const assert = require('assert'), C = require('../js/calc.js'), P = require('../js/planificador.js'), T = require('../js/teoria.js');
let n = 0; const t = (nombre, f) => { f(); n++; console.log('ok', nombre); };
const cerca = (a, b, e, m) => assert.ok(Math.abs(a - b) <= e, (m || '') + ` ${a} vs ${b}`);
/* ---------- ecualizador y ganancias ---------- */
t('EQ: pico en la frecuencia central = ganancia pedida; lejos ~0 dB', () => {
  for (const g of [-12, -6, 3, 9]) { const c = C.biquad('peaking', 1000, g, 1.41, 48000); cerca(C.respuestaDb(c, 1000, 48000), g, 0.01, 'centro'); cerca(C.respuestaDb(c, 20, 48000), 0, 0.3); cerca(C.respuestaDb(c, 20000, 48000), 0, 0.5); }
});
t('EQ: shelves y filtros', () => {
  const lo = C.biquad('lowshelf', 100, 6, 0.707, 44100), hi = C.biquad('highshelf', 8000, -6, 0.707, 44100);
  cerca(C.respuestaDb(lo, 20, 44100), 6, 0.1); cerca(C.respuestaDb(lo, 10000, 44100), 0, 0.1); cerca(C.respuestaDb(hi, 20000, 44100), -6, 0.5); cerca(C.respuestaDb(hi, 100, 44100), 0, 0.1);
  cerca(C.respuestaDb(C.biquad('lowpass', 1000, 0, 0.7071, 48000), 1000, 48000), -3.01, 0.02);
});
t('EQ: curva de presets y preamp automatico evita realces', () => {
  const plano = C.curvaEQ(C.PRESETS['Plano'], 48000, C.BANDAS); plano.forEach((x) => cerca(x, 0, 1e-9));
  const r = C.curvaEQ(C.PRESETS['Rock'], 48000, C.BANDAS); assert.ok(r[0] > 3 && r[1] > 3); assert.ok(C.autoPreamp(C.PRESETS['Rock']) < 0); assert.equal(C.autoPreamp(C.PRESETS['Plano']), -0);
  Object.keys(C.PRESETS).forEach((k) => assert.equal(C.PRESETS[k].length, 10));
});
t('dB <-> lineal y relacion de tono', () => { cerca(C.dbALin(-6.0206), 0.5, 1e-4); cerca(C.linADb(2), 6.0206, 1e-3); cerca(C.ratioTono(12), 2, 1e-12); cerca(C.ratioTono(-12), 0.5, 1e-12); cerca(C.ratioTono(0, 50), Math.pow(2, 1 / 24), 1e-12); });
t('ReplayGain: objetivo, limites y evitar recorte', () => {
  assert.equal(C.ganRG(-20, -3, -16, true).db, 4 > 2.5 ? 2.5 : 4); // pico -3: solo +2.5 antes de -0.5 dBFS
  cerca(C.ganRG(-20, -12, -16, true).db, 4, 1e-9); cerca(C.ganRG(-10, -1, -16, true).db, -6, 1e-9); assert.equal(C.ganRG(-20, -3, -16, true).limitada, true); assert.equal(C.ganRG(-40, -30, -16, false).db, 15); assert.equal(C.ganRG(0, 0, -16, true).db <= -0.5, true);
});
t('Compresor: curva estatica (umbral/ratio/rodilla)', () => {
  const o = { umbral: -24, ratio: 4, rodilla: 0 }; cerca(C.curvaCompresor(-40, o), -40, 1e-9); cerca(C.curvaCompresor(-24, o), -24, 1e-9); cerca(C.curvaCompresor(0, o), -24 + 24 / 4, 1e-9);
  const k = { umbral: -24, ratio: 4, rodilla: 12 }; cerca(C.curvaCompresor(-24, k), -24 + (0.25 - 1) * 36 / 24, 1e-9); assert.ok(C.curvaCompresor(-10, k) < -10);
  const lim = { umbral: -1, ratio: 20, rodilla: 0 }; assert.ok(C.curvaCompresor(6, lim) < 0);
});
t('Cruce de potencia constante', () => { for (let x = 0; x <= 1; x += 0.1) { const c = C.cruce(x); cerca(c.sale * c.sale + c.entra * c.entra, 1, 1e-12); } assert.equal(C.cruce(0).entra, 0); });
t('Aleatorio inteligente: permutacion, sin artista repetido seguido, favoritas antes, determinista', () => {
  const rng0 = C.rng(7), ps = []; for (let i = 0; i < 60; i++) ps.push({ id: i, artista: 'A' + (i % 6), fav: i < 6, val: i % 5 ? 0 : 5, reproducciones: i, ultima: 0 });
  const r = C.aleatorio(ps, { rng: rng0, ahora: 1e12 }); assert.equal(r.length, 60); assert.equal(new Set(r.map((x) => x.id)).size, 60);
  for (let i = 1; i < r.length; i++) assert.notEqual(r[i].artista, r[i - 1].artista);
  assert.deepEqual(C.aleatorio(ps, { rng: C.rng(3), ahora: 1e12 }).map((x) => x.id), C.aleatorio(ps, { rng: C.rng(3), ahora: 1e12 }).map((x) => x.id));
  let sf = 0, sn = 0; for (let s = 0; s < 80; s++) { const o = C.aleatorio(ps, { rng: C.rng(100 + s), ahora: 1e12 }); sf += o.findIndex((x) => x.id === 0); sn += o.findIndex((x) => x.id === 7); } assert.ok(sf < sn, `fav ${sf} noFav ${sn}`);
  assert.ok(C.peso({ ultima: 1e12 - 1000 }, 1e12) < C.peso({ ultima: 0 }, 1e12));
});
t('Formato de tiempo', () => { assert.equal(C.tiempo(0), '0:00'); assert.equal(C.tiempo(65.9), '1:05'); assert.equal(C.tiempo(3725), '1:02:05'); assert.equal(C.tiempo(NaN), '0:00'); });
/* ---------- planificador con reloj simulado ---------- */
function simular(reja, dur, paso, azar) { // avanza el reloj llamando tick()
  const rng = C.rng(5); let t = 0; while (t < dur) { reja.tick(); t += azar ? paso * (0.4 + 2 * rng()) : paso; reloj.t = t; } reja.tick();
}
const reloj = { t: 0 };
t('Metronomo: tiempos exactos (sin deriva) a 120 BPM con subdivisiones', () => {
  reloj.t = 0; const ev = []; const R = P.crearReja({ reloj: () => reloj.t, adelante: 0.12, alTick: (n, tt, i) => ev.push({ n, t: tt, a: reloj.t }), setTimer: () => 1, clearTimer: () => {} });
  R.bpm = 120; R.div = 2; R.activo = true; R.proximo = 1; reloj.t = 0.9; let tt = 0.9; while (tt < 300) { R.tick(); tt += 0.025; reloj.t = tt; }
  assert.ok(ev.length >= 1100); ev.forEach((e, i) => { assert.equal(e.n, i); cerca(e.t, 1 + i * 0.25, 1e-9, 'tick ' + i); assert.ok(e.a <= e.t + 1e-9 && e.t - e.a <= 0.12 + 1e-9); });
});
t('Metronomo: tiempos exactos con temporizador irregular (jitter 10-60 ms)', () => {
  reloj.t = 0; const ev = []; const R = P.crearReja({ reloj: () => reloj.t, adelante: 0.2, alTick: (n, tt) => ev.push(tt), setTimer: () => 1, clearTimer: () => {} });
  R.bpm = 97; R.div = 3; R.activo = true; R.proximo = 0.5; simular(R, 120, 0.035, true); const d = 60 / 97 / 3; ev.forEach((e, i) => cerca(e, 0.5 + i * d, 1e-9)); assert.ok(ev.length > 570);
});
t('Metronomo: cambio de tempo y swing', () => {
  reloj.t = 0; const ev = []; const R = P.crearReja({ reloj: () => reloj.t, adelante: 0.05, alTick: (n, tt) => ev.push(tt), setTimer: () => 1, clearTimer: () => {} });
  R.bpm = 60; R.activo = true; R.proximo = 0; let tt = 0; while (tt < 4.6) { if (Math.abs(tt - 2) < 1e-9) R.bpm = 120; R.tick(); tt = Math.round((tt + 0.01) * 1000) / 1000; reloj.t = tt; }
  assert.deepEqual(ev.slice(0, 3).map((x) => +x.toFixed(6)), [0, 1, 2]); assert.deepEqual(ev.slice(3, 6).map((x) => +x.toFixed(6)), [3, 3.5, 4]);
  const e2 = []; const S = P.crearReja({ reloj: () => reloj.t, adelante: 0.5, alTick: (n, tt) => e2.push(tt), setTimer: () => 1, clearTimer: () => {} }); S.bpm = 120; S.div = 4; S.swing = 0.25; S.activo = true; S.proximo = 0; reloj.t = 0; S.tick();
  cerca(e2[0], 0, 1e-12); cerca(e2[1], 0.125 + 0.25 * 0.125, 1e-12); cerca(e2[2], 0.25, 1e-12);
});
t('Acentos del metronomo: 4/4, 3/4, 6/8 compuesto, 5/4 y subdivisiones', () => {
  const tipos = (c, sub, k) => Array.from({ length: k }, (_, i) => P.infoPulso(i, c, sub).tipo[0]).join('');
  assert.equal(tipos([4, 4], 1, 8), 'fdddfddd'); assert.equal(tipos([3, 4], 1, 6), 'fddfdd'); assert.equal(tipos([6, 8], 1, 6), 'fddmdd'); assert.equal(tipos([4, 4], 2, 8), 'fsdsdsds'); assert.equal(P.infoPulso(9, [4, 4], 2).compas, 1);
});
t('Transporte: caja de ritmos y piano roll exactos con reloj simulado', () => {
  reloj.t = 0; const golpes = [], notas = [], pasos = [];
  const patron = { pistas: [{ pasos: [2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0] }, { pasos: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1], mute: false }, { pasos: new Array(16).fill(1), mute: true }] };
  const rollo = { pasos: 32, pistas: [{ notas: [{ nota: 60, ini: 0, dur: 2, vel: 127 }, { nota: 64, ini: 17.5, dur: 1, vel: 64 }] }] };
  const T0 = P.transporte({ reloj: () => reloj.t, adelante: 0.1, patron: () => patron, rollo: () => rollo, alGolpe: (p, tt, v) => golpes.push([p, tt, v]), alNota: (p, nt, tt, d, v) => notas.push([nt, tt, d, v]), alPaso: (s) => pasos.push(s), setTimer: () => 1, clearTimer: () => {} });
  T0.bpm = 120; T0.reja.activo = true; T0.pasos = 32; T0.reja.proximo = 0; let tt = 0; while (tt < 3.85) { T0.tick(); tt += 0.02; reloj.t = tt; } // 2 compases de 2s = 4 s = 32 pasos
  const d = 0.125; assert.deepEqual(pasos.slice(0, 18), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
  const bombo = golpes.filter((g) => g[0] === 0); assert.deepEqual(bombo.slice(0, 4).map((g) => [+g[1].toFixed(6), g[2]]), [[0, 1], [0.5, 0.7], [1, 1], [1.5, 0.7]]); assert.equal(bombo.length, 8); assert.equal(golpes.filter((g) => g[0] === 2).length, 0);
  assert.equal(notas.length, 2); cerca(notas[0][1], 0, 1e-12); cerca(notas[0][2], 0.25, 1e-12); assert.equal(notas[0][3], 1); cerca(notas[1][1], 17 * d + 0.5 * d, 1e-12);
});
/* ---------- teoria ---------- */
t('Teoria: escalas, acordes, circulo de quintas y diatonicos', () => {
  assert.deepEqual(T.pcs(0, T.ESCALAS['Mayor (jonia)']), [0, 2, 4, 5, 7, 9, 11]); assert.deepEqual(T.pcs(9, T.ACORDES['Menor']), [9, 0, 4]);
  assert.deepEqual([0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5].map((p) => T.armadura(p)), [0, 1, 2, 3, 4, 5, 6, -5, -4, -3, -2, -1]); assert.equal(T.relativaMenor(0), 9);
  assert.deepEqual(T.diatonicos(0).map((d) => d.nombre), ['Do', 'Rem', 'Mim', 'Fa', 'Sol', 'Lam', 'Sidim']); assert.deepEqual(T.diatonicos(5).map((d) => d.nombre).slice(0, 4), ['Fa', 'Solm', 'Lam', 'Si♭']); assert.equal(T.nombre(1, true), 'Re♭'); assert.equal(T.nombre(10, false, true), 'A♯');
});
t('Digitacion de guitarra: solo notas del acorde y raiz en el bajo', () => {
  for (const [r, tp] of [[0, 'Mayor'], [9, 'Menor'], [7, 'Septima (dom7)'], [2, 'Mayor'], [4, 'Menor'], [5, 'Mayor 7']]) {
    const d = T.digitacion(r, tp), set = T.pcs(r, T.ACORDES[tp]); const usadas = d.trastes.filter((x) => x >= 0); assert.ok(usadas.length >= 4, tp + r);
    d.trastes.forEach((f, c) => { if (f >= 0) assert.ok(set.includes((T.CUERDAS[c] + f) % 12), `acorde ${r}${tp} cuerda ${c} traste ${f}`); });
  }
});
t('Lector de ritmo: evaluacion de toques', () => {
  const esp = [0, 500, 1000, 1500]; let r = T.evaluarRitmo(esp, [10, 495, 1030, 1480]); assert.equal(r.pct, 100); assert.equal(r.perfecto, true); assert.deepEqual(r.items.map((i) => i.errorMs), [10, -5, 30, -20]);
  r = T.evaluarRitmo(esp, [0, 500, 1100]); assert.equal(r.items[3].toque, null); assert.ok(r.pct < 80 && r.perfecto === false); r = T.evaluarRitmo(esp, [0, 500, 1000, 1500, 1700, 1800]); assert.equal(r.extras, 2); assert.ok(r.pct < 100);
  r = T.evaluarRitmo(esp, [120, 640, 1160, 1650]); assert.ok(r.pct > 20 && r.pct < 60);
});
console.log(n + ' pruebas de calculos/planificador/teoria OK');
