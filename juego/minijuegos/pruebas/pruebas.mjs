// Pruebas en Node:  node juego/minijuegos/pruebas/pruebas.mjs [rapido]
import { JUEGOS } from '../js/juegos/index.js';
import { simular } from '../js/simular.js';
import * as T from '../js/torneo.js';
import { repartir } from '../js/zonas.js';
import { azar, puestos } from '../js/util.js';

let fallos = 0;
const ok = (c, msg) => { if (!c) { fallos++; console.log('FALLO', msg); } else if (!process.argv.includes('callado')) console.log('ok  ', msg); };
const rapido = process.argv.includes('rapido');
const part = (i, bot, nivel) => ({ slot: i, bot, nivel: bot ? nivel : null, nombre: 'J' + i, color: '#' + (i * 3 + 1).toString(16).repeat(6).slice(0, 6), avatar: 'x', forma: 'circulo' });

/* ---------- torneo ---------- */
ok(T.puntosRonda([1, 2]).join() === '3,0', 'puntos de ronda 2 jugadores');
ok(T.puntosRonda([1, 2, 3, 4]).join() === '4,2,1,0', 'puntos de ronda 4 jugadores');
ok(T.puntosRonda([1, 1, 3, 4]).join() === '3,3,1,0', 'empate comparte puntos');
{
  const parts = [part(0, false), part(1, true, 1)];
  const t = T.crear('mejorde', parts, { N: 3, catalogo: ['a', 'b', 'c', 'd'] });
  ok(t.juegos.length === 3 && T.objetivoVictorias(3) === 2, 'mejor de 3 tiene 3 juegos y objetivo 2');
  T.registrar(t, [1, 2]); ok(!t.fin, 'una victoria no cierra el mejor de 3');
  T.registrar(t, [1, 2]); ok(t.fin && t.campeones.join() === '0', 'dos victorias cierran y coronan');
  const t2 = T.crear('mejorde', parts, { N: 3, catalogo: ['a', 'b', 'c', 'd'] });
  T.registrar(t2, [1, 2]); T.registrar(t2, [2, 1]); ok(!t2.fin, '1-1 no cierra');
  T.registrar(t2, [2, 1]); ok(t2.fin && t2.campeones.join() === '1', 'tercera ronda decide');
  const t3 = T.crear('torneo', parts, { catalogo: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'] });
  ok(t3.juegos.length === 10 && new Set(t3.juegos).size === 10, 'torneo: 10 juegos distintos');
  for (let i = 0; i < 10; i++) T.registrar(t3, i % 3 === 0 ? [2, 1] : [1, 2]);
  ok(t3.fin && t3.campeones.join() === '0' && t3.pts[0] === 18 && t3.pts[1] === 12, 'torneo suma 3 puntos por ronda y corona al lider');
  const r = T.crear('rapido', parts, { catalogo: ['a', 'b'] }); T.registrar(r, [2, 1]); ok(r.fin && r.campeones.join() === '1', 'juego rapido: una ronda');
}
{
  const gana = []; let llamadas = 0;
  const pl = await T.porDuelos(3, async (a, b) => { llamadas++; return a < b ? [1, 0] : [0, 1]; });
  ok(llamadas === 3 && pl.join() === '1,2,3', 'duelos 3 jugadores: todos contra todos');
  const p4 = await T.porDuelos(4, async (a, b) => (a < b ? [1, 0] : [0, 1]));
  ok(p4[0] === 1 && p4[2] === 2 && p4[1] === 3 && p4[3] === 3, 'duelos 4 jugadores: semifinales y final');
  void gana;
}
/* ---------- zonas ---------- */
for (const n of [1, 2, 3, 4]) for (const [W, H] of [[390, 780], [1280, 720]]) {
  const z = repartir(n, W, H, 'auto'); const area = z.reduce((a, q) => a + q.w * q.h, 0);
  ok(z.length === n && Math.abs(area - W * H) < 1, `zonas n=${n} ${W}x${H} cubren la pantalla`);
}
ok(repartir(2, 390, 780)[1].rot === Math.PI && repartir(2, 1280, 720)[1].rot === 0, 'zonas: enfrentados en vertical, lado a lado en horizontal');

/* ---------- reglas de juegos de mesa ---------- */
{
  const tres = await import('../js/juegos/tres.js'), cuatro = await import('../js/juegos/cuatro.js'), cajas = await import('../js/juegos/cajas.js'), ppt = await import('../js/juegos/ppt.js'), dardos = await import('../js/juegos/dardos.js');
  const r = azar(3);
  ok(tres.ganadorTres([0, 0, 0, -1, 1, 1, -1, -1, -1]) === 0 && tres.ganadorTres([0, 1, 0, 1, 1, 0, 0, 0, 1]) === -1, 'tres en raya: deteccion de lineas');
  let t = [0, 0, -1, 1, 1, -1, -1, -1, -1]; ok(tres.jugadaTres(t, 0, 2, r) === 2, 'tres en raya: el bot dificil gana si puede');
  t = [0, 0, -1, -1, 1, -1, -1, -1, -1]; ok(tres.jugadaTres(t, 1, 2, r) === 2, 'tres en raya: el bot dificil bloquea');
  let empates = 0; for (let k = 0; k < 20; k++) { const tab = Array(9).fill(-1); let m = 0; while (tres.ganadorTres(tab) < 0 && !tres.llenoTres(tab)) { tab[tres.jugadaTres(tab, m, 2, r)] = m; m = 1 - m; } if (tres.ganadorTres(tab) < 0) empates++; }
  ok(empates === 20, 'tres en raya: dificil contra dificil siempre empata');
  const t4 = cuatro.nuevoTablero(); for (let k = 0; k < 4; k++) cuatro.soltar(t4, k, 0); ok(cuatro.ganadorCuatro(t4) === 0, '4 en raya: horizontal');
  const v = cuatro.nuevoTablero(); for (let k = 0; k < 4; k++) cuatro.soltar(v, 2, 1); ok(cuatro.ganadorCuatro(v) === 1, '4 en raya: vertical');
  const dg = cuatro.nuevoTablero(); [[0, 0], [1, 1], [1, 0], [2, 1], [2, 1], [2, 0], [3, 1], [3, 1], [3, 1], [3, 0]].forEach(([c, j]) => cuatro.soltar(dg, c, j)); ok(cuatro.ganadorCuatro(dg) === 0, '4 en raya: diagonal');
  const gr = cuatro.nuevoTablero(); for (let k = 0; k < 6; k++) cuatro.soltar(gr, 0, k % 2); ok(cuatro.soltar(gr, 0, 0) === -1, '4 en raya: columna llena');
  const b = cuatro.nuevoTablero(); [0, 1, 0, 1, 0].forEach((c, k) => cuatro.soltar(b, c, k % 2 === 0 ? 0 : 1)); ok(cuatro.jugadaCuatro(b, 0, 2, r) === 0, '4 en raya: el bot dificil remata la columna');
  const b2 = cuatro.nuevoTablero(); [0, 1, 2].forEach((c) => cuatro.soltar(b2, c, 1)); ok(cuatro.jugadaCuatro(b2, 0, 2, r) === 3 || cuatro.jugadaCuatro(b2, 0, 2, r) === 3, '4 en raya: el bot dificil bloquea 3 en linea');
  const tb = cajas.crearTablero(4); ok(tb.E.length === 24 && tb.cajas.length === 9, 'cajas: 24 aristas y 9 cajas en 4x4 puntos');
  const c0 = tb.cajas[0]; let tot = 0; c0.e.forEach((e) => { tot += cajas.jugarArista(tb, e, 1); }); ok(tot === 1 && c0.dueno === 1, 'cajas: cerrar una caja la otorga');
  ok(cajas.jugarArista(tb, c0.e[0], 0) === -1, 'cajas: arista repetida no vale');
  const tb2 = cajas.crearTablero(4); tb2.cajas[4].e.slice(0, 3).forEach((e) => cajas.jugarArista(tb2, e, 0)); ok(tb2.cajas[4].e.includes(cajas.jugadaCajas(tb2, 1, r)), 'cajas: el bot cierra la caja de 3 lados');
  ok(ppt.gana(1, 0) && ppt.gana(2, 1) && ppt.gana(0, 2) && !ppt.gana(0, 1), 'piedra papel tijera: reglas');
  ok(ppt.liquidar([1, 0], [3, 1]).join() === '3,-3', 'ppt: el ganador cobra su apuesta al perdedor');
  ok(ppt.liquidar([0, 0, 1], [1, 1, 2]).join() === '-2,-2,4', 'ppt: tres jugadores');
  ok(dardos.puntosDiana(0.05) === 50 && dardos.puntosDiana(0.5) === 5 && dardos.puntosDiana(1.2) === 0, 'dardos: puntuacion por aros');
}

/* ---------- juegos: bots contra bots hasta el final ---------- */
const dims = [[390, 700], [1280, 720]];
for (const j of JUEGOS) {
  ok(j.id && j.nombre && j.icono && j.instr.length >= 2 && ['tap', 'stick', 'ab', 'lr', 'puntero'].includes(j.ctrl), `${j.id}: meta valida`);
  for (let n = Math.max(2, j.min); n <= j.max; n++) for (const nivel of [0, 1, 2]) {
    if (rapido && nivel === 1) continue;
    const parts = Array.from({ length: n }, (_, i) => part(i, true, nivel));
    const [W, H] = dims[(n + nivel) % 2];
    let r; try { r = simular(j, parts, { W, H, semilla: 1000 + n * 7 + nivel }); } catch (e) { ok(false, `${j.id} n=${n} nivel=${nivel}: excepcion ${e.stack}`); continue; }
    ok(r.fin && r.pts.length === n && r.pts.every((p) => Number.isFinite(p)), `${j.id} n=${n} nivel=${nivel}: termina en ${r.t.toFixed(0)} s con puntajes finitos [${r.pts.map((p) => Math.round(p * 10) / 10)}]`);
  }
  // humanos con entrada aleatoria
  const parts = Array.from({ length: Math.max(2, j.min) }, (_, i) => part(i, i > 0, 1)), rnd = azar(5);
  let r; try {
    r = simular(j, parts, { W: 390, H: 700, humano: (ent) => ent.forEach((e, i) => { if (parts[i].bot) return; e.dx = rnd() < 0.5 ? -1 : 1; e.dy = rnd() < 0.5 ? -1 : 1; e.wx = e.dx; e.wy = e.dy; e.a = rnd() < 0.3; e.aP = rnd() < 0.2; e.bP = rnd() < 0.1; e.izqP = rnd() < 0.1; e.derP = rnd() < 0.1; e.arrP = rnd() < 0.1; e.abaP = rnd() < 0.1; }) });
  } catch (e) { ok(false, `${j.id} humano aleatorio: excepcion ${e.stack}`); continue; }
  ok(r.fin, `${j.id}: termina con un humano aleatorio (${r.t.toFixed(0)} s)`);
}
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
