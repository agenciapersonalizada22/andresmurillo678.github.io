/* node pruebas/analisis.test.js : algoritmos puros con frames sinteticos de resultado conocido */
const assert = require('assert'); const A = require('../js/analisis.js'); const { Tuberia } = require('../js/tuberia.js');
let n = 0; function ok(nombre, f) { try { f(); n++; console.log('ok  ' + nombre); } catch (e) { console.log('FALLA ' + nombre + ': ' + e.message); process.exitCode = 1; } }
const W = 160, H = 90;
function frame(fn) { const d = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = fn(x, y), i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } return d; }
const fondo = [60, 60, 60];
function cuadro(cx, cy, s, col, bg) { return frame((x, y) => (x >= cx - s / 2 && x < cx + s / 2 && y >= cy - s / 2 && y < cy + s / 2) ? col : (bg || fondo)); }
let semilla = 7; function rnd() { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 4294967296; }

ok('diferencia: cuadro de 10x10 => 100 px y pct conocido', () => {
  const a = A.gris(cuadro(30, 40, 10, [250, 250, 250]), W, H), b = A.gris(cuadro(80, 40, 10, [250, 250, 250]), W, H);
  const r = A.diferencia(a, b, W, H, 20, null); assert.strictEqual(r.cuenta, 200); assert.ok(Math.abs(r.pct - 200 / 14400) < 1e-9);
  const same = A.diferencia(a, a, W, H, 20, null); assert.strictEqual(same.cuenta, 0);
});
ok('mascara: zona excluir elimina el movimiento dentro; incluir lo restringe', () => {
  const a = A.gris(cuadro(30, 40, 10, [250, 250, 250]), W, H), b = A.gris(cuadro(30, 40, 10, [60, 60, 60]), W, H);
  const exc = A.construirMascara([{ tipo: 'excluir', puntos: A.rectAPuntos(0, 0, 0.5, 1) }], W, H); assert.strictEqual(A.diferencia(a, b, W, H, 20, exc).cuenta, 0);
  const inc = A.construirMascara([{ tipo: 'incluir', puntos: A.rectAPuntos(0.5, 0, 1, 1) }], W, H); assert.strictEqual(A.diferencia(a, b, W, H, 20, inc).cuenta, 0);
  const inc2 = A.construirMascara([{ tipo: 'incluir', puntos: A.rectAPuntos(0, 0, 0.5, 1) }], W, H); assert.strictEqual(A.diferencia(a, b, W, H, 20, inc2).cuenta, 100);
});
ok('sensibilidad: mas sensibilidad => umbral de pixel menor', () => { assert.ok(A.umbrales(90).pixel < A.umbrales(10).pixel); assert.ok(A.umbrales(90).minPct < A.umbrales(10).minPct); });
ok('blobs: dos cuadrados => dos componentes con centroide exacto', () => {
  const m = new Uint8Array(W * H); const poner = (x0, y0, s) => { for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) m[y * W + x] = 1; }; poner(10, 10, 8); poner(100, 50, 12);
  const b = A.blobs(m, W, H, 4); assert.strictEqual(b.length, 2); assert.strictEqual(b[0].area, 144); assert.ok(Math.abs(b[0].cx - 105.5) < 1e-9); assert.strictEqual(b[1].area, 64);
});
ok('seguimiento: dos objetos conservan su id y uno nuevo recibe otro', () => {
  const s = new A.Seguidor({ maxDist: 0.1, minEdad: 2 }); let ids = [];
  for (let k = 0; k < 10; k++) { const r = s.actualizar([{ cx: 0.1 + k * 0.02, cy: 0.3, x0: 0, y0: 0, x1: 0.1, y1: 0.1, area: 0.01 }, { cx: 0.9 - k * 0.02, cy: 0.7, x0: 0, y0: 0, x1: 0.1, y1: 0.1, area: 0.01 }], k); ids.push(r.activas.map(p => p.id).sort().join()); }
  assert.strictEqual(ids[9], '1,2'); assert.ok(ids.slice(1).every(x => x === '1,2'));
  const r = s.actualizar([{ cx: 0.3, cy: 0.3, x0: 0, y0: 0, x1: 0.1, y1: 0.1, area: 0.01 }, { cx: 0.7, cy: 0.7, x0: 0, y0: 0, x1: 0.1, y1: 0.1, area: 0.01 }, { cx: 0.5, cy: 0.1, x0: 0, y0: 0, x1: 0.1, y1: 0.1, area: 0.01 }], 11);
  assert.strictEqual(r.activas.length, 2); assert.strictEqual(s.pistas.length, 3); assert.strictEqual(s.pistas[2].id, 3);
});
ok('linea virtual: un cruce A->B, luego vuelta B->A, sin contar de mas', () => {
  const lin = { id: 'l1', nombre: 'puerta', x1: 0.5, y1: 0, x2: 0.5, y2: 1 };
  assert.strictEqual(A.cruce(0.4, 0.5, 0.6, 0.5, lin), 1); assert.strictEqual(A.cruce(0.6, 0.5, 0.4, 0.5, lin), -1); assert.strictEqual(A.cruce(0.1, 0.5, 0.4, 0.5, lin), 0); assert.strictEqual(A.cruce(0.4, 1.5, 0.6, 1.5, lin), 0);
  const s = new A.Seguidor({ minEdad: 2, maxDist: 0.2 }), c = new A.ContadorLineas([lin]);
  for (let k = 0; k < 40; k++) { const x = k < 20 ? 0.1 + k * 0.04 : 0.86 - (k - 20) * 0.04; s.actualizar([{ cx: x, cy: 0.5, x0: 0, y0: 0, x1: 0.1, y1: 0.1, area: 0.01 }], k); c.actualizar(s.pistas); }
  const t = c.totales().l1; assert.strictEqual(t.ab, 1); assert.strictEqual(t.ba, 1);
});
ok('escenas: un corte duro entre dos escenas distintas (y ninguno en ruido)', () => {
  const det = new A.DetectorEscena({ umbral: 0.3 }); const cortes = [];
  for (let k = 0; k < 30; k++) { const col = k < 15 ? [30, 90, 200] : [220, 80, 40]; const d = frame((x, y) => [Math.min(255, col[0] + rnd() * 6), col[1] + rnd() * 6, col[2] + rnd() * 6]); const r = det.procesar(A.histColor(d, W, H), k * 0.1); if (r.corte) cortes.push(k); }
  assert.deepStrictEqual(cortes, [15]);
});
ok('calidad: nitido vs desenfocado, oscuro, sobreexpuesto, ruido', () => {
  const tabla = A.gris(frame((x, y) => ((x >> 2) + (y >> 2)) % 2 ? [220, 220, 220] : [30, 30, 30]), W, H);
  const liso = A.gris(frame((x) => [x + 20, x + 20, x + 20]), W, H);
  const qn = A.calidad(tabla, W, H), ql = A.calidad(liso, W, H); assert.ok(qn.nitidez > 100 * Math.max(1, ql.nitidez)); assert.ok(ql.nitidez < 1);
  assert.ok(A.estadoCalidad(ql, {}).desenfocado); assert.ok(!A.estadoCalidad(qn, {}).desenfocado);
  assert.ok(A.estadoCalidad(A.calidad(A.gris(frame(() => [5, 5, 5]), W, H), W, H)).oscuro); assert.ok(A.estadoCalidad(A.calidad(A.gris(frame(() => [250, 250, 250]), W, H), W, H)).sobreexpuesto);
  const ruido = A.gris(frame(() => { const v = 120 + (rnd() - 0.5) * 40; return [v, v, v]; }), W, H), qr = A.calidad(ruido, W, H); assert.ok(qr.ruido > 4 && qr.ruido < 14, 'ruido ' + qr.ruido);   // sigma uniforme +-20 = 11.5
  assert.ok(A.calidad(A.gris(frame(() => [120, 120, 120]), W, H), W, H).ruido < 0.01);
});
ok('color dominante y objeto por color', () => {
  const d = frame((x, y) => x < 100 ? [220, 30, 30] : [30, 30, 220]); const c = A.colorDominante(d, W, H, 1);
  assert.strictEqual(c.nombre, 'rojo'); assert.ok(Math.abs(c.pct - 100 / 160) < 0.01); assert.strictEqual(c.paleta[1].nombre, 'azul');
  assert.strictEqual(A.nombreColor(255, 255, 255), 'blanco'); assert.strictEqual(A.nombreColor(0, 200, 0), 'verde'); assert.strictEqual(A.nombreColor(255, 160, 0), 'naranja'); assert.strictEqual(A.nombreColor(90, 60, 30), 'marrón');
  const e = frame((x, y) => (x > 40 && x < 60 && y > 20 && y < 50) ? [20, 200, 40] : [120, 120, 120]); const m = A.mascaraColor(e, W, H, [0, 220, 0], 40);
  assert.strictEqual(m.cuenta, 19 * 29); const b = A.blobs(m.mascara, W, H, 5); assert.strictEqual(b.length, 1); assert.ok(Math.abs(b[0].cx - 50) < 1e-9);
  assert.strictEqual(A.mascaraColor(e, W, H, [200, 0, 0], 40).cuenta, 0);
});
ok('estabilizacion: desplazamiento conocido (3,-2) y suavizado de trayectoria', () => {
  semilla = 3; const base = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) base[y * W + x] = ((Math.sin(x * 0.3) + Math.cos(y * 0.25)) * 50 + 128 + rnd() * 30) | 0;
  const sh = (dx, dy) => { const o = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const sx = Math.min(W - 1, Math.max(0, x - dx)), sy = Math.min(H - 1, Math.max(0, y - dy)); o[y * W + x] = base[sy * W + sx]; } return o; };
  const d = A.estimarDesplazamiento(base, sh(3, -2), W, H, 6); assert.strictEqual(d.dx, 3); assert.strictEqual(d.dy, -2);
  assert.strictEqual(A.estimarDesplazamiento(base, base, W, H, 6).dx, 0);
  const est = new A.Estabilizador({ alfa: 0.9 }); let raw = [], cor = [], prev = 0;
  for (let k = 0; k < 60; k++) { const p = (k % 2 ? 4 : -4); const c = est.paso({ dx: p - prev, dy: 0 }, W, H); prev = p; raw.push(p); cor.push(p + c.x * W); }
  const v = a => { const m = a.reduce((x, y) => x + y) / a.length; return a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length; };
  assert.ok(v(cor.slice(20)) < v(raw.slice(20)) * 0.15, 'varianza ' + v(cor.slice(20)) + ' vs ' + v(raw.slice(20)));
});
ok('reencuadre 9:16 sigue al objeto sin salirse del cuadro', () => {
  const r = new A.Reencuadre(); let rc = r.rect(1920, 1080); assert.ok(Math.abs(rc.w - 607.5) < 1e-6 && rc.h === 1080);
  let ant = r.cx; for (let k = 0; k < 120; k++) { rc = r.paso(0.85, 1920, 1080); assert.ok(r.cx >= ant - 1e-12); ant = r.cx; assert.ok(rc.x >= 0 && rc.x + rc.w <= 1920 + 1e-6); }
  assert.ok(r.cx > 0.8 && r.cx <= 1 - 607.5 / 1920 / 2 + 1e-9, 'cx ' + r.cx);
  const q = new A.Reencuadre(); for (let k = 0; k < 20; k++) q.paso(0.52, 1920, 1080); assert.strictEqual(q.cx, 0.5);   // zona muerta
});
ok('segmentos, silencios y cortes automaticos', () => {
  const t = [], v = []; for (let i = 0; i < 100; i++) { t.push(i * 0.1); v.push((i >= 20 && i < 40) || (i >= 45 && i < 50) || (i >= 80 && i < 82) ? 1 : 0); }
  const s = A.segmentos(t, v, 1, { fusion: 0.6, minDur: 0.5 }); assert.deepStrictEqual(s.map(x => x.map(y => Math.round(y * 10) / 10)), [[2, 5]]);
  const rms = []; for (let i = 0; i < 100; i++) rms.push(i >= 30 && i < 60 ? 0.0001 : 0.1); const sil = A.silencios(rms, 0.1, -45, 1); assert.strictEqual(sil.length, 1); assert.ok(Math.abs(sil[0][0] - 3) < 1e-9 && Math.abs(sil[0][1] - 6) < 1e-9);
  const m = t.map((x, i) => ({ t: x, mov: v[i] * 0.05, corte: i === 60 })); const mc = A.autoCortes(m, 10, { modo: 'silencio', silencios: sil, minDur: 1 }); assert.deepStrictEqual(mc.map(c => [c.ini, c.fin]), [[0, 3], [6, 10]]);
  assert.deepStrictEqual(A.autoCortes(m, 10, { modo: 'escena' }).map(c => [c.ini, c.fin]), [[0, 6], [6, 10]]);
  const mj = A.autoCortes(m.map((x, i) => Object.assign(x, { mov: i >= 20 && i < 40 ? 0.1 : 0.001 })), 10, { modo: 'mejores', largo: 2, total: 2 }); assert.strictEqual(mj.length, 1); assert.ok(mj[0].ini >= 1.9 && mj[0].fin <= 4.1);
});
ok('EDL, SRT, CSV, picos', () => {
  const c = [{ ini: 1, fin: 3, motivo: 'a' }, { ini: 5, fin: 6.4, motivo: 'b' }], e = A.edl(c, { fps: 25, titulo: 'T', clip: 'v.mp4' }).split('\n');
  assert.strictEqual(e[3], '001  AX       V     C        00:00:01:00 00:00:03:00 00:00:00:00 00:00:02:00'); assert.ok(e.indexOf('002  AX       V     C        00:00:05:00 00:00:06:10 00:00:02:00 00:00:03:10') > 0);
  assert.strictEqual(A.tSrt(3661.5), '01:01:01,500'); assert.strictEqual(A.srt([{ ini: 0, fin: 1.25, texto: 'hola' }]), '1\n00:00:00,000 --> 00:00:01,250\nhola\n');
  assert.strictEqual(A.csv(c).split('\n')[1], '1,1.000,3.000,2.000,"a",'); assert.strictEqual(A.tc(3600 + 61 + 0.4, 25), '01:01:01:10');
  const p = A.picos([0, 1, 2, 3, 4, 5, 6], [0, 5, 1, 0, 9, 2, 0], { n: 2, sep: 2 }); assert.deepStrictEqual(p.map(x => x.t), [1, 4]);
});
ok('tuberia completa: objeto que cruza la linea, movimiento, escena, calor', () => {
  const tub = new Tuberia({ sensibilidad: 60, lineas: [{ id: 'p', nombre: 'pasillo', x1: 0.5, y1: 0, x2: 0.5, y2: 1 }], zonas: [] }); const ev = []; let ult;
  for (let k = 0; k < 45; k++) { const r = tub.procesar(cuadro(10 + k * 3.2, 45, 14, [240, 240, 240]), W, H, k * 0.125); ev.push(...r.eventos); ult = r; }
  const cr = ev.filter(e => e.tipo === 'cruce_linea'); assert.strictEqual(cr.length, 1, 'cruces ' + cr.length); assert.strictEqual(cr[0].dir, 'ab');
  assert.ok(ev.some(e => e.tipo === 'movimiento')); assert.ok(ev.some(e => e.tipo === 'objeto_nuevo')); assert.strictEqual(ev.filter(e => e.tipo === 'escena').length, 0);
  assert.deepStrictEqual(ult.cruces.p, { ab: 1, ba: 0 }); const c = tub.mapaCalor(); assert.ok(c.n > 30 && Math.max.apply(null, c.datos) === 255);
  const reg = tub.celdasCalor(8, 6); assert.strictEqual(reg.length, 48); assert.ok(reg[3 * 8 + 0] > 0 && reg[0] === 0);
  const cut = []; for (let k = 0; k < 6; k++) cut.push(...tub.procesar(cuadro(150, 45, 14, [20, 20, 20], [200, 40, 40]), W, H, 10 + k * 0.125).eventos); assert.ok(cut.some(e => e.tipo === 'escena'));
});
ok('tuberia: objeto por color y estados de calidad con histeresis', () => {
  const tub = new Tuberia({ objetoColor: { rgb: [0, 220, 0], tol: 40 }, movimiento: true }); const ev = [];
  for (let k = 0; k < 6; k++) ev.push(...tub.procesar(frame((x, y) => (x > 70 && x < 90 && y > 30 && y < 50) ? [20, 200, 30] : [110, 110, 110]), W, H, k * 0.2).eventos);
  assert.strictEqual(ev.filter(e => e.tipo === 'objeto_color').length, 1);
  const t2 = new Tuberia({}); const e2 = []; for (let k = 0; k < 10; k++) e2.push(...t2.procesar(frame(() => [4, 4, 4]), W, H, k * 0.2).eventos); assert.strictEqual(e2.filter(e => e.tipo === 'oscuro').length, 1);
});
console.log(n + ' pruebas ok');
