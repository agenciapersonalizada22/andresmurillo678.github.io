const assert = require('assert');
const S = require('./ayuda')(['config.js', 'rejilla.js', 'orbes.js', 'serpiente.js', 'ia.js', 'mundo.js', 'protocolo.js']);
const W = new S.Mundo({ modo: 'ffa', semilla: 21, total: 25 });
for (let i = 0; i < 25; i++) W.nuevoBot();
for (let i = 0; i < 60 * 90; i++) W.paso(S.C.DT);   // 90 s para tener cuerpos largos
const yo = W.vivas.slice().sort((a, b) => b.masa - a.masa)[0];

// ida y vuelta de serpientes
const snap = S.Proto.snapshot(W, yo, 123456);
const json = JSON.stringify(snap), bytes = Buffer.byteLength(json);
const dec = S.Proto.decodificarSerpientes(JSON.parse(json).s);
assert(dec.length >= 1 && dec.length === new Set(dec.map(d => d.id)).size);
let maxErr = 0, nseg = 0;
for (const d of dec) {
  const s = W.porId[d.id]; assert(s, 'id existe');
  assert(Math.abs(d.x - s.x) <= 1 && Math.abs(d.masa - s.masa) <= 0.5);
  assert.strictEqual(d.ns, S.nSegs(Math.round(s.masa)));
  for (let k = 0; k < Math.min(d.ns, s.ns); k++) { const e = Math.hypot(d.segs[k * 2] - s.segs[k * 2], d.segs[k * 2 + 1] - s.segs[k * 2 + 1]); if (e > maxErr) maxErr = e; nseg++; assert(Number.isFinite(e)); }
}
console.log(`snapshot: ${dec.length} serpientes, ${snap.s.length} numeros, ${bytes} bytes, error max de cuerpo ${maxErr.toFixed(1)} px sobre ${nseg} segmentos`);
assert(bytes < 16384, 'cabe en un mensaje'); assert(maxErr < 14, 'reconstruccion fiel: ' + maxErr);

// la mas larga (cientos de segmentos)
const g = new S.Serpiente(99); g.reiniciar(0, 0, 0, 900); for (let i = 0; i < 600; i++) { g.objAng = Math.sin(i / 40) * 3; g.paso(S.C.DT); }
const out = []; S.Proto.codificarSerpiente(g, out); const d2 = S.Proto.decodificarSerpientes(out)[0];
let e2 = 0; for (let k = 0; k < Math.min(d2.ns, g.ns); k++) e2 = Math.max(e2, Math.hypot(d2.segs[k * 2] - g.segs[k * 2], d2.segs[k * 2 + 1] - g.segs[k * 2 + 1]));
console.log(`serpiente larga: ${g.ns} segmentos -> ${out.length - 7} puntos de control, ${JSON.stringify(out).length} bytes, error ${e2.toFixed(1)} px`);
assert(e2 < 16);

// orbes
const om = S.Proto.codificarOrbes(W, yo.x, yo.y), oj = JSON.stringify(om), od = S.Proto.decodificarOrbes(JSON.parse(oj));
console.log(`orbes: ${od.n} en vision, ${oj.length} bytes`);
assert(od.n === om.l.length && om.l.length <= 420 && oj.length < 16000);
for (let i = 0; i < od.n; i++) assert(od.t[i] >= 0 && od.t[i] <= 3 && Math.abs(od.x[i] - yo.x) < 1500);
// cada orbe decodificado existe (a <= 2px) en el mundo
let bien = 0; for (let i = 0; i < Math.min(od.n, 60); i++) { let ok = false; W.orbes.rej.cerca(od.x[i], od.y[i], 6, j => { if (Math.hypot(W.orbes.x[j] - od.x[i], W.orbes.y[j] - od.y[i]) < 2.5) ok = true; return ok; }); if (ok) bien++; }
assert.strictEqual(bien, Math.min(od.n, 60));

// estado/minimapa
const es = S.Proto.codificarEstado(W, yo), mm = S.Proto.decodificarMinimapa(JSON.parse(JSON.stringify(es)).mm);
assert.strictEqual(mm.length, W.vivas.length); assert(Math.abs(mm[0].x - W.vivas[0].x) < 13);
console.log(`estado: ${JSON.stringify(es).length} bytes; rank ${es.rk}/${es.n}`);
// entrada
assert.strictEqual(JSON.stringify(S.Proto.entrada(1.23456, true)), JSON.stringify({ a: 1.23, b: 1 }));
// ancho de banda estimado
console.log(`ancho de banda por cliente estimado: ${(bytes * 18 + oj.length * 5 + JSON.stringify(es).length * 4) / 1024 | 0} KB/s`);
console.log('Protocolo OK');
