// Pruebas de reglas, dados, mapa y bots de Conquista Mundial. Uso: node juego/conquista/pruebas/pruebas.mjs [rapido]
import assert from 'node:assert/strict';
import * as M from '../js/mapa.js';
import * as R from '../js/reglas.js';
import { decidir } from '../js/bots.js';

const rapido = process.argv.includes('rapido');
let n = 0;
const prueba = (nombre, f) => { try { f(); n++; console.log('ok  ', nombre); } catch (e) { console.error('FALLA', nombre, '\n', e); process.exitCode = 1; } };
const bots = (k, nivel = 1) => Array.from({ length: k }, (_, i) => ({ nombre: 'B' + i, color: '#fff', tipo: 'bot', nivel }));

/* ---------- mapa ---------- */
prueba('mapa: 48 territorios, 6 continentes, vecindad simetrica y conexa', () => {
  assert.equal(M.N, 48); assert.equal(M.CONTINENTES.length, 6);
  assert.equal(M.DE_CONT.reduce((s, c) => s + c.length, 0), 48);
  M.ADY.forEach((l, a) => { assert.ok(l.length >= 1, M.TERR[a].id); l.forEach((b) => { assert.ok(M.ADY[b].includes(a)); assert.notEqual(a, b); }); });
  const vis = new Set([0]), cola = [0];
  while (cola.length) { const x = cola.shift(); for (const y of M.ADY[x]) if (!vis.has(y)) { vis.add(y); cola.push(y); } }
  assert.equal(vis.size, 48);
  M.TERR.forEach((t) => { assert.ok(t.d.length > 20, t.id); assert.ok(t.lab[0] > 0 && t.lab[0] < M.W && t.lab[1] > 0 && t.lab[1] < M.H, t.id); });
  assert.ok(M.MARES.length >= 20);
});

/* ---------- dados ---------- */
const masa = (a, d) => { const m = {}; for (const [ba, bd, p] of R.distRonda(a, d)) m[ba + ',' + bd] = p; return m; };
prueba('dados: distribuciones exactas conocidas (1v1, 2v1, 3v1, 1v2, 2v2, 3v2)', () => {
  const cerca = (x, y) => assert.ok(Math.abs(x - y) < 1e-12, x + ' vs ' + y);
  let m = masa(1, 1); cerca(m['0,1'], 15 / 36); cerca(m['1,0'], 21 / 36);
  m = masa(2, 1); cerca(m['0,1'], 125 / 216); cerca(m['1,0'], 91 / 216);
  m = masa(3, 1); cerca(m['0,1'], 855 / 1296); cerca(m['1,0'], 441 / 1296);
  m = masa(1, 2); cerca(m['0,1'], 55 / 216); cerca(m['1,0'], 161 / 216);
  m = masa(2, 2); cerca(m['0,2'], 295 / 1296); cerca(m['1,1'], 420 / 1296); cerca(m['2,0'], 581 / 1296);
  m = masa(3, 2); cerca(m['0,2'], 2890 / 7776); cerca(m['1,1'], 2611 / 7776); cerca(m['2,0'], 2275 / 7776);
});
prueba('dados: el generador sembrado produce caras uniformes y reproducibles', () => {
  const e = { rng: 12345 }, c = [0, 0, 0, 0, 0, 0, 0], K = 120000;
  for (let i = 0; i < K; i++) c[R.dado(e)]++;
  for (let v = 1; v <= 6; v++) assert.ok(Math.abs(c[v] / K - 1 / 6) < 0.006, 'cara ' + v + ': ' + c[v] / K);
  const a = { rng: 7 }, b = { rng: 7 };
  for (let i = 0; i < 50; i++) assert.equal(R.dado(a), R.dado(b));
});
prueba('dados: ronda del motor (3 vs 2 y 2 vs 1) coincide con la teoria (Monte Carlo)', () => {
  for (const [a, d] of [[3, 2], [2, 1], [1, 2], [2, 2], [3, 1]]) {
    const est = R.crear({}, bots(2), 99), T = 40000, cuenta = {};
    const A = est.o.findIndex((x, i) => x === 0 && M.ADY[i].some((y) => est.o[y] === 1));
    const H = M.ADY[A].find((y) => est.o[y] === 1);
    for (let i = 0; i < T; i++) {
      est.fase = 'ataque'; est.turno = 0; est.pool = 0; est.conq = null; est.ganador = null; est.o[A] = 0; est.o[H] = 1; est.jug[1].vivo = true; est.fase = 'ataque'; est.e[A] = a + 1; est.e[H] = d;
      const r = R.orden(est, 0, { t: 'atacar', d: A, h: H, dados: a });
      const b = r.ev.find((e) => e.t === 'bat'); assert.equal(b.ad.length, a); assert.equal(b.dd.length, d);
      const k = b.pa + ',' + b.pd; cuenta[k] = (cuenta[k] || 0) + 1;
    }
    for (const [ba, bd, p] of R.distRonda(a, d)) assert.ok(Math.abs((cuenta[ba + ',' + bd] || 0) / T - p) < 0.012, `${a}v${d} ${ba},${bd}`);
  }
});
prueba('dados: probConquista es monotona y coherente', () => {
  assert.equal(R.probConquista(5, 0), 1); assert.equal(R.probConquista(0, 3), 0);
  assert.ok(R.probConquista(10, 3) > R.probConquista(5, 3));
  assert.ok(R.probConquista(5, 5) < R.probConquista(5, 3));
  assert.ok(R.probConquista(3, 1) > 0.9 && R.probConquista(1, 1) < 0.5);
  assert.ok(R.probConquista(10, 10) > 0.4 && R.probConquista(10, 10) < 0.8);
});

/* ---------- reglas ---------- */
prueba('reparto inicial: todos los territorios, ejercitos totales por numero de jugadores', () => {
  for (let k = 2; k <= 6; k++) {
    const est = R.crear({}, bots(k), 1000 + k);
    assert.ok(est.o.every((x) => x >= 0 && x < k));
    for (let j = 0; j < k; j++) assert.equal(R.totalEjercitos(est, j) + est.reserva[j], R.EJERCITOS_INICIALES[k]);
    assert.equal(est.fase, 'colocar');
  }
});
prueba('refuerzos: base por territorios y bono de continente', () => {
  const est = R.crear({}, bots(2), 5);
  est.o.fill(1); for (const t of M.DE_CONT[M.CONT_IDX.oc]) est.o[t] = 0; est.o[0] = 0; est.o[1] = 0; est.o[2] = 0;
  assert.equal(R.refuerzoBase(est, 0), Math.max(3, Math.floor(8 / 3)) + M.CONTINENTES[M.CONT_IDX.oc].bono);
  est.o.fill(0); assert.equal(R.refuerzoBase(est, 0), 16 + M.CONTINENTES.reduce((s, c) => s + c.bono, 0));
});
prueba('colocacion inicial por turnos hasta empezar y rechazo de ordenes ilegales', () => {
  const est = R.crear({ modo: 'dominacion' }, bots(3), 21);
  assert.equal(R.orden(est, (est.turno + 1) % 3, { t: 'colocar', a: 0, n: 1 }).ok, false);
  let guardia = 500;
  while (est.fase === 'colocar' && guardia--) {
    const j = est.turno, mia = est.o.findIndex((x) => x === j);
    assert.equal(R.orden(est, j, { t: 'colocar', a: est.o.findIndex((x) => x !== j), n: 1 }).ok, false);
    assert.equal(R.orden(est, j, { t: 'colocar', a: mia, n: est.pool + 1 }).ok, false);
    assert.ok(R.orden(est, j, { t: 'colocar', a: mia, n: 1 }).ok);
  }
  assert.equal(est.fase, 'refuerzo'); assert.equal(est.turno, est.inicial);
  for (let j = 0; j < 3; j++) assert.equal(est.reserva[j], 0);
});
prueba('modo rapido: despliegue automatico y victoria por 60 %', () => {
  const est = R.crear({ modo: 'rapido' }, bots(4), 8);
  assert.equal(est.fase, 'refuerzo');
  for (let j = 0; j < 4; j++) assert.equal(R.totalEjercitos(est, j), R.EJERCITOS_INICIALES[4]);
  assert.equal(R.META_RAPIDO, 29); assert.equal(R.metaRapido(2), 40); assert.equal(R.metaRapido(4), 29);
});
prueba('ataque: reglas de vecindad, minimo de ejercitos y propiedad', () => {
  const est = R.crear({ modo: 'rapido' }, bots(2), 3);
  est.fase = 'ataque'; est.pool = 0; const j = est.turno;
  const d = est.o.findIndex((x, i) => x === j && M.ADY[i].some((y) => est.o[y] !== j)), h = M.ADY[d].find((y) => est.o[y] !== j);
  est.e[d] = 1; assert.equal(R.orden(est, j, { t: 'atacar', d, h }).ok, false);
  est.e[d] = 5; const lejos = est.o.findIndex((x, i) => x !== j && !M.ADY[d].includes(i));
  assert.equal(R.orden(est, j, { t: 'atacar', d, h: lejos }).ok, false);
  assert.equal(R.orden(est, j, { t: 'atacar', d: h, h: d }).ok, false);
  const r = R.orden(est, j, { t: 'atacar', d, h }); assert.ok(r.ok);
});
prueba('conquista: movimiento obligatorio, eliminacion y robo de cartas', () => {
  const est = R.crear({ modo: 'dominacion' }, bots(3), 17);
  est.fase = 'ataque'; est.pool = 0; const j = est.turno, v = (j + 1) % 3;
  est.o.fill(j); const h = 5, d = M.ADY[h][0]; est.o[h] = v; est.e.fill(1); est.e[d] = 30; est.e[h] = 1;
  est.jug[v].cartas = [3, 4]; est.jug[(j + 2) % 3].vivo = false; est.jug[(j + 2) % 3].cartas = [];
  for (let i = 0; i < 12 && !est.conq && est.fase === 'ataque'; i++) R.orden(est, j, { t: 'atacar', d, h });
  if (est.conq) { assert.equal(R.orden(est, j, { t: 'atacar', d, h: M.ADY[d][1] }).ok, false); assert.ok(R.orden(est, j, { t: 'mover', n: 99 }).ok); }
  assert.equal(est.o[h], j); assert.ok(est.e[h] >= 1);
  assert.equal(est.jug[v].vivo, false); assert.deepEqual(est.jug[j].cartas.sort(), [3, 4]);
  assert.equal(est.fase, 'fin'); assert.equal(est.ganador.j, j);
});
prueba('ejercitos nunca bajan de 1 y se conservan al fortificar', () => {
  const est = R.crear({ modo: 'rapido' }, bots(3), 4);
  est.fase = 'ataque'; est.pool = 0; const j = est.turno;
  const mias = R.territoriosDe(est, j), a = mias.find((t) => R.alcanzables(est, j, t).length), b = R.alcanzables(est, j, a)[0];
  est.e[a] = 6; const s = est.e[a] + est.e[b];
  assert.equal(R.orden(est, j, { t: 'fortificar', d: a, h: b, n: 6 }).ok, false);
  assert.ok(R.orden(est, j, { t: 'fortificar', d: a, h: b, n: 5 }).ok);
  assert.equal(est.e[a] + est.e[b], s); assert.equal(est.e[a], 1); assert.notEqual(est.turno, j);
});
prueba('fortificar exige camino propio (no atraviesa enemigos)', () => {
  const est = R.crear({ modo: 'rapido' }, bots(2), 4);
  est.o.fill(1); est.o[M.IDX.ibe] = 0; est.o[M.IDX.ala] = 0;
  est.fase = 'fortificar'; est.turno = 0; est.pool = 0; est.e[M.IDX.ibe] = 5;
  assert.equal(R.rutaPropia(est, 0, M.IDX.ibe, M.IDX.ala), false);
  assert.equal(R.orden(est, 0, { t: 'fortificar', d: M.IDX.ibe, h: M.IDX.ala, n: 2 }).ok, false);
  est.o[M.IDX.mag] = 0; assert.equal(R.rutaPropia(est, 0, M.IDX.ibe, M.IDX.mag), true);
});
prueba('cartas: conjuntos validos, comodines, valores de canje y carta por conquista', () => {
  assert.ok(R.esConjunto([0, 3, 6])); assert.ok(R.esConjunto([0, 1, 2])); assert.ok(!R.esConjunto([0, 1, 3]));
  assert.ok(R.esConjunto([100, 0, 1])); assert.ok(!R.esConjunto([100, 101, 0])); assert.ok(!R.esConjunto([0, 0, 3]));
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(R.valorCanje), [4, 6, 8, 10, 12, 15, 20, 25]);
  const est = R.crear({ modo: 'rapido' }, bots(2), 6); const j = est.turno;
  est.jug[j].cartas = [0, 1, 2, 3, 5]; est.o[0] = j; est.pool = 0;
  assert.equal(R.orden(est, j, { t: 'colocar', a: est.o.findIndex((x) => x === j), n: 1 }).ok, false);
  const e0 = est.e[0], r = R.orden(est, j, { t: 'canjear', cartas: [0, 1, 2] });
  assert.ok(r.ok); assert.equal(est.pool, 4); assert.equal(est.e[0], e0 + 2); assert.equal(est.jug[j].cartas.length, 2);
  assert.equal(R.orden(est, j, { t: 'canjear', cartas: [3, 5, 9] }).ok, false);
  assert.equal(R.orden(est, j, { t: 'atacarFase' }).ok, false);
});
prueba('turno: la carta se roba solo si se conquisto y el mazo se rebaraja', () => {
  const est = R.crear({ modo: 'rapido' }, bots(2), 6); const j = est.turno;
  est.fase = 'ataque'; est.pool = 0; est.ganoCarta = false;
  R.orden(est, j, { t: 'terminar' }); assert.equal(est.jug[j].cartas.length, 0);
  const k = est.turno; est.fase = 'ataque'; est.pool = 0; est.ganoCarta = true; est.mazo = []; est.descarte = [1, 2, 3];
  R.orden(est, k, { t: 'terminar' }); assert.equal(est.jug[k].cartas.length, 1); assert.equal(est.mazo.length + est.descarte.length, 2);
});
prueba('objetivos secretos: cumplimiento, sustituto y privacidad', () => {
  const est = R.crear({ modo: 'misiones' }, bots(3), 9);
  assert.ok(est.jug.every((p) => p.obj));
  const v = R.vista(est, 0);
  assert.ok(v.jug[0].obj && v.jug[1].obj === undefined && v.jug[1].cartas === undefined && v.jug[2].cartas === undefined);
  assert.equal(v.mazoN, est.mazo.length); assert.equal(v.rng, undefined); assert.equal(JSON.stringify(v).includes('token'), false);
  est.jug[0].obj = { t: 'cont', c: [M.CONT_IDX.oc, M.CONT_IDX.sa], mas: false };
  assert.equal(R.cumpleObjetivo(est, 0), false);
  for (const t of [...M.DE_CONT[M.CONT_IDX.oc], ...M.DE_CONT[M.CONT_IDX.sa]]) est.o[t] = 0;
  assert.equal(R.cumpleObjetivo(est, 0), true);
  est.jug[1].obj = { t: 'elim', j: 2 }; est.jug[2].vivo = false; est.jug[2].elimPor = 0;
  assert.equal(R.objetivoActivo(est, 1).t, 'terr'); assert.equal(R.objetivoActivo(est, 0).t, 'cont');
  est.jug[0].obj = { t: 'elim', j: 2 }; assert.equal(R.cumpleObjetivo(est, 0), true);
  est.jug[0].obj = { t: 'terr2', n: 3, min: 2 }; est.o.fill(1); [0, 1, 2].forEach((t) => { est.o[t] = 0; est.e[t] = 2; }); assert.equal(R.cumpleObjetivo(est, 0), true);
});
prueba('equipos: no se ataca a aliados y gana el equipo', () => {
  const est = R.crear({ modo: 'equipos' }, bots(4), 12);
  assert.deepEqual(est.jug.map((p) => p.equipo), [0, 1, 0, 1]);
  est.fase = 'ataque'; est.pool = 0; const j = est.turno;
  est.o.fill(j); const h = 7, d = M.ADY[h][0], aliado = (j + 2) % 4; est.o[h] = aliado; est.e[d] = 5;
  assert.equal(R.orden(est, j, { t: 'atacar', d, h }).ok, false);
  est.jug[(j + 1) % 4].vivo = false; est.jug[(j + 3) % 4].vivo = false; est.o[h] = j;
  const rr = R.orden(est, j, { t: 'terminar' }); assert.ok(rr.ok); assert.equal(est.fase, 'fin'); assert.equal(est.ganador.equipo, est.jug[j].equipo);
});
prueba('serializacion: JSON ida y vuelta conserva el estado y la secuencia aleatoria', () => {
  const a = R.crear({ modo: 'misiones' }, bots(4), 77); for (let i = 0; i < 40; i++) { const c = decidir(a, a.turno, 1, () => 0.5); R.orden(a, a.turno, c); }
  const b = JSON.parse(JSON.stringify(a));
  for (let i = 0; i < 60 && a.fase !== 'fin'; i++) {
    const c = decidir(a, a.turno, 2, () => 0.5), c2 = decidir(b, b.turno, 2, () => 0.5);
    assert.deepEqual(c, c2); R.orden(a, a.turno, c); R.orden(b, b.turno, c2);
  }
  assert.deepEqual(a, b);
});

/* ---------- simulacion de partidas completas con bots ---------- */
function simular(cfg, k, niveles, semilla) {
  const est = R.crear(cfg, niveles.map((nv) => ({ nombre: 'b', tipo: 'bot', nivel: nv })).slice(0, k), semilla);
  let pasos = 0;
  while (est.fase !== 'fin' && pasos++ < 80000) {
    const j = est.turno, c = decidir(est, j, est.jug[j].nivel, Math.random);
    let r = R.orden(est, j, c);
    if (!r.ok) throw new Error('orden de bot invalida ' + JSON.stringify(c) + ' ' + r.error + ' fase ' + est.fase);
    const tot = est.e.reduce((s, x) => s + x, 0) + est.pool + est.reserva.reduce((s, x) => s + Math.max(0, x), 0);
    assert.ok(est.e.every((x) => x >= 0) && est.o.every((x) => x >= 0 && x < est.n));
    if (est.conq === null && est.fase !== 'colocar') assert.ok(est.e.every((x) => x >= 1), 'territorio sin ejercitos');
    void tot;
  }
  return { est, pasos };
}
const SIMS = rapido ? 6 : 30;
prueba(`simulacion: ${SIMS} partidas por modo y numero de jugadores terminan sin ordenes ilegales`, () => {
  const modos = [['dominacion', 3], ['misiones', 4], ['rapido', 6], ['equipos', 4], ['dominacion', 2], ['misiones', 5], ['equipos', 6]];
  for (const [modo, k] of modos) for (let s = 0; s < Math.ceil(SIMS / 6); s++) {
    const { est, pasos } = simular({ modo, rondaMax: 90 }, k, [2, 1, 0, 2, 1, 0], 500 + s * 13 + k);
    assert.equal(est.fase, 'fin', `${modo}/${k} no termino (${pasos} pasos)`);
    assert.ok(est.ganador, modo);
  }
});
prueba('bots: Maestro y Estratega superan al Recluta', () => {
  const T = rapido ? 40 : 150, w = [0, 0, 0];
  for (let s = 0; s < T; s++) {
    const lv = [0, 1, 2].sort(() => Math.random() - 0.5);
    const { est } = simular({ modo: 'dominacion', rondaMax: 60 }, 3, lv, 4000 + s * 977);
    if (est.ganador && est.ganador.motivo !== 'limite') w[lv[est.ganador.j]]++;
  }
  console.log('     victorias Recluta/Estratega/Maestro:', w.join(' / '));
  assert.ok(w[1] + w[2] > w[0] * 1.5, 'la IA no supera al recluta: ' + w);
});

console.log(`\n${n} pruebas pasadas`);
