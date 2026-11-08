// Pruebas de fisica y bot (sin DOM). Ejecutar: node juego/hockey/pruebas/fisica.test.mjs
import { createRequire } from 'module';
import assert from 'assert';
const req = createRequire(import.meta.url);
const F = req('../js/fisica.js'), B = req('../js/bot.js');
let n = 0; const ok = (nombre, f) => { f(); n++; console.log('ok -', nombre); };
const paso = (s, seg) => { for (let t = 0; t < seg; t += s.C.paso) F.paso(s, s.C.paso); };
const limpio = (o) => { const s = F.crear(o); s.espera = 0; s.pucks = []; return s; };
const disco = (s, x, y, vx, vy) => { s.pucks.push({ x, y, vx, vy, r: s.C.puckR, ultimo: -1, vida: 0, extra: false, giro: 0 }); return s.pucks[0]; };

ok('rebote en pared lateral conserva energia aproximada', () => {
  const s = limpio(); const p = disco(s, 380, 400, 600, 0); paso(s, 0.1);
  assert(p.vx < 0 && Math.abs(p.vx) > 450 && Math.abs(p.vx) < 600);
});
ok('friccion reduce la velocidad', () => {
  const s = limpio(); const p = disco(s, 200, 400, 0, 300); paso(s, 0.5);
  assert(p.vy < 300 && p.vy > 200);
});
ok('gol arriba suma al jugador 0 y reinicia saque del otro lado', () => {
  const s = limpio(); disco(s, 200, 40, 0, -800); paso(s, 0.3);
  assert.deepStrictEqual(s.marcador, [1, 0]); assert.strictEqual(s.sacaLado, 1); assert(s.espera > 0);
  paso(s, 2); assert.strictEqual(s.pucks.length, 1); assert(s.pucks[0].y < 400);
});
ok('gol abajo suma al jugador 1', () => {
  const s = limpio(); disco(s, 200, 760, 0, 900); paso(s, 0.3); assert.deepStrictEqual(s.marcador, [0, 1]);
});
ok('fuera del hueco hay pared (sin gol)', () => {
  const s = limpio(); const p = disco(s, 40, 30, 0, -900); paso(s, 0.2);
  assert.deepStrictEqual(s.marcador, [0, 0]); assert(p.vy > 0);
});
ok('el poste desvia el disco', () => {
  const s = limpio(); const gl = 200 - s.C.goalW / 2; const p = disco(s, gl + 2, 60, 0, -900); paso(s, 0.15);
  assert.deepStrictEqual(s.marcador, [0, 0]); assert(p.vy > -900);
});
ok('el mazo golpea el disco transfiriendo velocidad', () => {
  const s = limpio(); const m = s.mallets[0]; m.x = m.tx = 200; m.y = 700; m.ty = 300; m.vmax = 2000;
  const p = disco(s, 200, 600, 0, 0); paso(s, 0.2);
  assert(p.vy < -800, 'vy=' + p.vy); assert.strictEqual(p.ultimo, 0);
});
ok('el mazo no cruza a la mitad del rival y se limita a la mesa', () => {
  const s = limpio(); F.objetivo(s, 0, -50, 0); paso(s, 1);
  assert(s.mallets[0].y >= 400 + 30 && s.mallets[0].x >= 30 - 1e-6);
  F.objetivo(s, 1, 900, 900); paso(s, 1); assert(s.mallets[1].y <= 400 - 30 && s.mallets[1].x <= 370 + 1e-6);
});
ok('velocidad del disco acotada', () => {
  const s = limpio(); const p = disco(s, 200, 400, 0, 9000); paso(s, 0.01);
  assert(Math.hypot(p.vx, p.vy) <= s.C.vMaxDisco + 1);
});
ok('el disco no atraviesa el mazo a alta velocidad', () => {
  const s = limpio(); const m = s.mallets[0]; m.x = m.tx = 200; m.y = m.ty = 700;
  const p = disco(s, 200, 300, 0, 1900); paso(s, 0.5);
  assert(p.vy < 0 || p.y < 700, 'atraveso: y=' + p.y);
});
ok('obstaculo circular rebota', () => {
  const s = limpio({ obst: [{ tipo: 'c', x: 200, y: 400, r: 30 }] }); const p = disco(s, 200, 300, 0, 700); paso(s, 0.15);
  assert(p.vy < 0 && s.ev.some((e) => e.t === 'obst'));
});
ok('obstaculo rectangular rebota por la cara', () => {
  const s = limpio({ obst: [{ tipo: 'r', x: 200, y: 400, w: 100, h: 20 }] }); const p = disco(s, 180, 300, 0, 700); paso(s, 0.15);
  assert(p.vy < 0);
});
ok('obstaculo movil cambia de posicion', () => {
  const s = limpio({ obst: [{ tipo: 'r', x: 200, y: 400, w: 60, h: 14, ax: 80, per: 2 }] }); paso(s, 0.5);
  assert(Math.abs(s.obst[0].x - 200) > 30);
});
ok('power-up grande agranda el mazo y caduca', () => {
  const s = limpio({ items: true }); s.items.push({ tipo: 'grande', x: 200, y: 500, r: 20, vida: 10 });
  const p = disco(s, 200, 560, 0, -400); p.ultimo = 0; paso(s, 0.4);
  assert(s.mallets[0].grande > 0); paso(s, 0.1); assert(s.mallets[0].r > 40); paso(s, 8.5); assert.strictEqual(s.mallets[0].r, 30);
});
ok('power-up multi crea discos extra que caducan', () => {
  const s = limpio({ items: true }); s.items.push({ tipo: 'multi', x: 200, y: 500, r: 20, vida: 10 });
  const p = disco(s, 200, 560, 0, -400); p.ultimo = 1; paso(s, 0.2);
  assert(s.pucks.length >= 3); paso(s, 13); assert(s.pucks.filter((x) => x.extra).length === 0);
});
ok('power-up lento frena al rival', () => {
  const s = limpio(); s.items.push({ tipo: 'lento', x: 200, y: 500, r: 20, vida: 10 });
  const p = disco(s, 200, 560, 0, -400); p.ultimo = 0; paso(s, 0.3); assert(s.mallets[1].lento > 0);
});
ok('instantanea es serializable y compacta', () => {
  const s = F.crear({ items: true }); F.saque(s, 0); const i = F.instantanea(s);
  assert(JSON.stringify(i).length < 600); assert.strictEqual(i.p.length, 1);
});
ok('semilla determinista', () => {
  const a = F.crear({ semilla: 5 }), b = F.crear({ semilla: 5 }); F.saque(a, 0); F.saque(b, 0);
  assert.strictEqual(a.pucks[0].x, b.pucks[0].x);
});
ok('prediccion de rebote en pared', () => {
  const x = B.prediccion(300, 400, 400, -400, 100, true, 20);
  assert(x > 20 && x < 380); assert.strictEqual(B.prediccion(300, 400, 0, 0, 100, true, 20), null);
});
function partida(nA, nB, seg, semilla) {
  const s = F.crear({ semilla }); let r = F.rng(semilla + 7);
  const bots = [B.crear(nA, 0, r), B.crear(nB, 1, r)];
  s.espera = 0.2; let est = 0;
  for (let t = 0; t < seg; t += s.C.paso) {
    B.decidir(bots[0], s, s.C.paso); B.decidir(bots[1], s, s.C.paso); F.paso(s, s.C.paso);
    s.ev.length = 0; if (s.marcador[0] >= 7 || s.marcador[1] >= 7) break;
    for (const p of s.pucks) if (!isFinite(p.x) || !isFinite(p.y)) throw new Error('NaN');
  }
  return s.marcador;
}
ok('bots completan partidas sin atascarse (hay goles)', () => {
  let goles = 0; for (let i = 0; i < 4; i++) { const m = partida(0, 0, 240, i + 1); goles += m[0] + m[1]; }
  assert(goles >= 10, 'goles=' + goles);
});
ok('experto gana a facil casi siempre (ambos lados)', () => {
  let a = 0, b = 0;
  for (let i = 0; i < 6; i++) { const m = partida(3, 0, 300, 20 + i); if (m[0] > m[1]) a++; }
  for (let i = 0; i < 6; i++) { const m = partida(0, 3, 300, 40 + i); if (m[1] > m[0]) b++; }
  assert(a >= 5 && b >= 5, `a=${a} b=${b}`);
});
console.log(n + ' pruebas OK');
