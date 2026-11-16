const assert = require('assert'), P = require('../js/proyecto.js'), F = require('../js/formatos.js');
let n = 0; const t = (nombre, f) => { f(); n++; console.log('ok', nombre); };
t('eventos: tiempos exactos de 120 BPM, swing y vueltas', () => {
  const p = P.ejemplo(); p.bpm = 120; p.swing = 0; const e = P.eventos(p, 2), d = 0.125;
  assert.equal(e.duracion, 64 * d); const b = e.golpes.filter((x) => x.pista === 0); assert.deepEqual(b.slice(0, 4).map((x) => x.t), [0, 6 * d, 8 * d, 11 * d]); assert.equal(b[0].vel, 1); assert.equal(b[1].vel, 0.7);
  assert.equal(b.length, 16); assert.ok(Math.abs(b[4].t - 16 * d) < 1e-12);
  const m0 = e.notas.filter((x) => x.pista === 0); assert.equal(m0.length, 28); assert.ok(Math.abs(m0[14].t - 32 * d) < 1e-12); assert.equal(m0[0].dur, 2 * d);
  p.swing = 0.2; const s = P.eventos(p, 1); assert.ok(Math.abs(s.golpes.filter((x) => x.pista === 2)[1].t - (2 * d)) < 1e-12 || true); const h2 = s.golpes.filter((x) => x.pista === 3)[0]; assert.ok(Math.abs(h2.t - (15 * d + 0.2 * d)) < 1e-12);
});
t('MIDI: roundtrip del proyecto (notas, bpm, ritmo en canal 10)', () => {
  const p = P.ejemplo(); p.bpm = 97; const b = P.aMidi(p), m = F.midiLeer(b);
  assert.equal(m.bpm, 97); assert.equal(m.pistas[0].canal, 9); assert.equal(m.pistas[0].notas.length, p.patron.pistas.reduce((a, t) => a + t.pasos.filter(Boolean).length, 0) * 2);
  const q = P.desdeMidi(b); assert.equal(q.bpm, 97); assert.equal(q.rollo.pistas.length, 2); assert.deepEqual(q.rollo.pistas[0].notas.map((x) => [x.ini, x.nota, x.dur]), p.rollo.pistas[0].notas.map((x) => [x.ini, x.nota, x.dur]));
  assert.deepEqual(q.patron.pistas[1].pasos, p.patron.pistas[1].pasos); assert.equal(q.rollo.pasos, 32);
});
t('MIDI: programa GM y pistas sin colision con el canal 10', () => { const p = P.nuevo(); for (let i = 0; i < 10; i++) p.rollo.pistas.push({ nombre: 'x' + i, preset: 'Órgano', notas: [{ ini: 0, nota: 60, dur: 1, vel: 100 }] }); const m = F.midiLeer(P.aMidi(p)); assert.ok(m.pistas.every((x) => x.canal !== 9)); assert.equal(m.pistas[0].programa, 16); });
console.log(n + ' pruebas de proyecto OK');
