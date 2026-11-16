const assert = require('assert'), F = require('../js/formatos.js'), L = require('../js/lrc.js');
let n = 0; const t = (nombre, f) => { f(); n++; console.log('ok', nombre); };
t('WAV 16 bits roundtrip estereo (error <1/32768)', () => {
  const N = 5000, a = new Float32Array(N), b = new Float32Array(N); for (let i = 0; i < N; i++) { a[i] = 0.8 * Math.sin(i / 7); b[i] = -0.5 * Math.cos(i / 13); }
  const w = F.wavEscribir([a, b], 44100), r = F.wavLeer(w);
  assert.equal(w.length, 44 + N * 4); assert.equal(r.sr, 44100); assert.equal(r.canales.length, 2); assert.equal(r.canales[0].length, N);
  for (let i = 0; i < N; i++) { assert.ok(Math.abs(r.canales[0][i] - a[i]) < 1 / 16384); assert.ok(Math.abs(r.canales[1][i] - b[i]) < 1 / 16384); }
  assert.equal(String.fromCharCode(...w.subarray(0, 4)), 'RIFF');
});
t('WAV float32 roundtrip exacto y recorte de picos en 16 bits', () => {
  const x = Float32Array.from([0, 0.5, -0.25, 1, -1]), r = F.wavLeer(F.wavEscribir([x], 8000, { bits: 32 })); assert.deepEqual([...r.canales[0]], [...x]); assert.ok(r.flotante);
  const r2 = F.wavLeer(F.wavEscribir([Float32Array.from([2, -3])], 8000)); assert.ok(r2.canales[0][0] > 0.999 && r2.canales[0][1] === -1);
});
t('MIDI roundtrip: notas, tempo, compas, programa', () => {
  const p = { ppq: 480, bpm: 93, compas: [6, 8], pistas: [{ nombre: 'Melodia', canal: 0, programa: 5, notas: [{ nota: 60, ini: 0, dur: 240, vel: 100 }, { nota: 64, ini: 240, dur: 480, vel: 80 }, { nota: 67, ini: 960, dur: 1, vel: 127 }, { nota: 72, ini: 100000, dur: 3000, vel: 1 }] }, { nombre: 'Bateria', canal: 9, notas: [{ nota: 36, ini: 0, dur: 120, vel: 110 }, { nota: 38, ini: 480, dur: 120, vel: 90 }] }] };
  const r = F.midiLeer(F.midiEscribir(p));
  assert.equal(r.formato, 1); assert.equal(r.ppq, 480); assert.equal(r.bpm, 93); assert.deepEqual(r.compas, [6, 8]); assert.equal(r.pistas.length, 2);
  assert.equal(r.pistas[0].nombre, 'Melodia'); assert.equal(r.pistas[0].programa, 5); assert.deepEqual(r.pistas[0].notas, p.pistas[0].notas); assert.equal(r.pistas[1].canal, 9); assert.deepEqual(r.pistas[1].notas, p.pistas[1].notas);
});
t('MIDI: cabecera y VLQ largos', () => { const b = F.midiEscribir({ bpm: 120, pistas: [{ nombre: 'x', notas: [{ nota: 60, ini: 2097152, dur: 10, vel: 90 }] }] }); assert.equal(String.fromCharCode(...b.subarray(0, 4)), 'MThd'); assert.equal(F.midiLeer(b).pistas[0].notas[0].ini, 2097152); });
t('LRC: parse con etiquetas, multiples marcas y offset', () => {
  const o = L.parse('[ti:Cancion]\n[ar:Yo]\n[offset:500]\n[00:10.50]Hola\n[00:20.00][01:05.25]Coro\n[00:05.1]Intro\nsin marca'), l = o.lineas;
  assert.equal(o.meta.ti, 'Cancion'); assert.equal(l.length, 4); assert.deepEqual(l.map((x) => x.texto), ['Intro', 'Hola', 'Coro', 'Coro']); assert.ok(Math.abs(l[0].t - 4.6) < 1e-9); assert.ok(Math.abs(l[3].t - 64.75) < 1e-9);
});
t('LRC: indice de linea activa y karaoke por palabras', () => {
  const o = L.parse('[00:01.00]<00:01.00>Una <00:02.00>dos <00:03.00>tres\n[00:05.00]Otra'); assert.equal(L.indice(o.lineas, 0.5), -1); assert.equal(L.indice(o.lineas, 1), 0); assert.equal(L.indice(o.lineas, 4.99), 0); assert.equal(L.indice(o.lineas, 5), 1);
  const k = L.karaoke(o.lineas, 0, 2.5); assert.deepEqual(k.palabras.map((p) => p.estado), ['hecha', 'activa', 'futura']); assert.ok(Math.abs(k.palabras[1].p - 0.5) < 1e-9); assert.equal(o.lineas[0].texto, 'Una dos tres');
});
t('LRC: sincronizar tocando y roundtrip de serializacion', () => {
  const lin = L.desdeTexto('uno\n\n dos \ntres'); assert.equal(lin.length, 3); [1.234, 3.5, 9.999].forEach((x, i) => L.marcar(lin, i, x));
  const s = L.serializar({ meta: { ti: 'T' }, lineas: lin }), o = L.parse(s); assert.equal(o.meta.ti, 'T'); assert.deepEqual(o.lineas.map((x) => [x.t, x.texto]), [[1.23, 'uno'], [3.5, 'dos'], [10, 'tres']]);
  assert.equal(L.fmt(125.678), '02:05.68'); const e = L.serializar(L.parse('[00:01.00]<00:01.00>a <00:01.50>b'), true); assert.equal(e, '[00:01.00]<00:01.00>a <00:01.50>b'); assert.equal(L.parse('solo texto\notro').sincronizada, false);
});
console.log(n + ' pruebas de formatos/LRC OK');
