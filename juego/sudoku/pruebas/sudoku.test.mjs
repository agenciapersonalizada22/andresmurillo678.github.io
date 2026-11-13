// Pruebas de la logica de Sudoku (sin DOM): node juego/sudoku/pruebas/sudoku.test.mjs [rapido]
import { generar, analizarTexto, layoutIrregular, describirTexto } from '../js/generador.js';
import { modelo, VARIANTES, NIVELES, regionesCaja } from '../js/variantes.js';
import { resolver, esUnico } from '../js/solver.js';
import { clasificar, crearSt, siguientePaso, aplicar, resuelto } from '../js/tecnicas.js';
import { crearAzar } from '../js/azar.js';
import { retoDiario, desafiosSemana, semanaISO, fechaLocal, fmtTiempo } from '../js/formato.js';
import * as PA from '../js/partida.js';

const RAPIDO = process.argv[2] === 'rapido';
let ok = 0, fallos = 0;
const t = (c, m) => { if (c) ok++; else { fallos++; console.log('FALLA:', m); } };
const num = (s) => Uint8Array.from(s, Number);

/* ---- verificador independiente (sin propagacion): cuenta soluciones hasta 2 ---- */
function contarIndep(M, dados, lim = 2) {
  const v = Uint8Array.from(dados), N = M.N, n = M.n;
  const cand = (i) => { let m = M.todo; for (const j of M.pares[i]) if (v[j]) m &= ~(1 << (v[j] - 1)); return m; };
  const cajaOk = (J) => {
    let s = 0, r = 0, usados = 0; for (const i of J.celdas) { if (v[i]) { s += v[i]; usados |= 1 << v[i]; } else r++; }
    if (!r) return s === J.suma;
    const libres = []; for (let d = 1; d <= n; d++) if (!(usados & (1 << d))) libres.push(d);
    if (libres.length < r) return false;
    let mn = 0, mx = 0; for (let q = 0; q < r; q++) { mn += libres[q]; mx += libres[libres.length - 1 - q]; }
    return s + mn <= J.suma && J.suma <= s + mx;
  };
  let nodos = 0;
  for (let i = 0; i < N; i++) if (v[i]) { const d = v[i]; v[i] = 0; if (!(cand(i) & (1 << (d - 1)))) return 0; v[i] = d; }
  let c = 0;
  const rec = () => {
    if (++nodos > 2e5) { c = -99; return; }
    let b = -1, bm = 0, bk = 99;
    for (let i = 0; i < N; i++) if (!v[i]) { const m = cand(i); let k = 0; for (let x = m; x; x &= x - 1) k++; if (k < bk) { bk = k; b = i; bm = m; if (k === 0) return; } }
    if (b < 0) { c++; return; }
    for (let d = 1; d <= n && c < lim && c >= 0; d++) if (bm & (1 << (d - 1))) {
      v[b] = d;
      const J = M.jaulaDe[b] >= 0 ? M.jaulas[M.jaulaDe[b]] : null;
      if (!J || cajaOk(J)) rec();
      v[b] = 0;
    }
  };
  rec();
  return c < 0 ? -1 : c; // -1 = inconcluso (demasiados nodos)
}
function validaSolucion(M, sol) {
  for (const g of M.grupos) { const s = new Set(); for (const i of g) { if (s.has(sol[i])) return false; s.add(sol[i]); } }
  for (const u of M.unidades) { const s = new Set(u.celdas.map((i) => sol[i])); if (s.size !== M.n) return false; }
  for (const J of M.jaulas) if (J.celdas.reduce((a, i) => a + sol[i], 0) !== J.suma) return false;
  return true;
}
const conexa = (M, id) => {
  const n = M.n, cel = []; for (let i = 0; i < M.N; i++) if (M.reg[i] === id) cel.push(i);
  const vis = new Set([cel[0]]), cola = [cel[0]];
  while (cola.length) {
    const i = cola.pop(), r = Math.floor(i / n), c = i % n;
    for (const j of [r > 0 ? i - n : -1, r < n - 1 ? i + n : -1, c > 0 ? i - 1 : -1, c < n - 1 ? i + 1 : -1]) if (j >= 0 && M.reg[j] === id && !vis.has(j)) { vis.add(j); cola.push(j); }
  }
  return vis.size === cel.length;
};

/* ---- solver ---- */
const M9 = modelo({ v: 'clasico' });
const FACIL = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const SOL_FACIL = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
t(resolver(M9, num(FACIL), 2).length === 1 && resolver(M9, num(FACIL), 1)[0].join('') === SOL_FACIL, 'solver resuelve el puzzle clasico');
t(resolver(M9, new Uint8Array(81), 2).length === 2, 'tablero vacio tiene multiples soluciones');
t(resolver(M9, num('11' + '0'.repeat(79)), 2).length === 0, 'puzzle con repetidos no tiene solucion');
t(!esUnico(M9, num(FACIL.slice(0, 40) + '0'.repeat(41))), 'puzzle con pocas pistas no es unico');
const DURO = '800000000003600000070090200050007000000045700000100030001000068008500010090000400';
t(esUnico(M9, num(DURO)), 'puzzle muy dificil conocido es unico');
t(contarIndep(M9, num(DURO)) === 1 && contarIndep(M9, new Uint8Array(81)) === 2, 'verificador independiente coincide');

/* ---- clasificador ---- */
const c0 = clasificar(M9, num(FACIL)); t(c0.ok && c0.nivel === 0, 'FACIL clasifica como nivel 0 (solo unicos)');
const c1 = clasificar(M9, num(DURO)); t(c1.ok && c1.nivel >= 4, 'puzzle dificil clasifica como experto o mas, nivel=' + c1.nivel);
t(c1.puntos > c0.puntos * 5, 'la puntuacion crece con la dificultad');
const tecnicas = {};
for (let k = 0; k < 30; k++) { const p = generar({ variante: 'clasico', nivel: 4, semilla: 'tec' + k }); const r = clasificar(M9, num(p.dados), { sol: num(p.sol) }); Object.keys(r.uso).forEach((u) => { tecnicas[u] = (tecnicas[u] || 0) + 1; }); }
['unico_desnudo', 'unico_oculto_region', 'bloqueo', 'par_desnudo', 'x_wing'].forEach((u) => t(tecnicas[u] > 0, 'aparece la tecnica ' + u));
const prueba = ['swordfish', 'xy_wing', 'par_oculto', 'trio_desnudo'].filter((u) => tecnicas[u]); console.log('  tecnicas vistas en Experto:', Object.keys(tecnicas).join(', '));
// pasos explicados: cada paso es valido respecto a la solucion
{
  const st = crearSt(M9, num(DURO)), sol = resolver(M9, num(DURO), 1)[0]; let bien = true, n = 0;
  while (!resuelto(st) && n++ < 500) {
    const p = siguientePaso(st); if (!p) { bien = false; break; }
    if (!p.texto || !p.pista1) bien = false;
    (p.col || []).forEach((x) => { if (sol[x.i] !== x.d) bien = false; });
    (p.eli || []).forEach((x) => { if (x.m & (1 << (sol[x.i] - 1))) bien = false; });
    aplicar(st, p);
  }
  t(bien && resuelto(st), 'todos los pasos logicos son correctos y explicados (' + n + ' pasos)');
}

/* ---- generadores: unicidad y niveles ---- */
const N_CLASICO = RAPIDO ? 20 : 200, N_OTRAS = RAPIDO ? 4 : 15;
const tiempos = {};
let aprox = 0, total = 0, acierto = 0;
for (let nv = 0; nv < 6; nv++) {
  const ts = []; let unic = 0, indep = 0, ni = 0, ex = 0;
  for (let k = 0; k < N_CLASICO; k++) {
    const t0 = performance.now(); const p = generar({ variante: 'clasico', nivel: nv, semilla: 'u' + nv + '_' + k }); ts.push(performance.now() - t0);
    const M = modelo(p), d = num(p.dados);
    if (esUnico(M, d) && resolver(M, d, 1)[0].join('') === p.sol) unic++;
    if (k < (RAPIDO ? 4 : 25)) { ni++; if (contarIndep(M, d) === 1) indep++; }
    if (p.nivel === nv) ex++; if (p.aproximado) aprox++;
    total++; if (p.nivel === nv) acierto++;
  }
  ts.sort((a, b) => a - b); tiempos[nv] = { med: ts[ts.length >> 1], p95: ts[Math.floor(ts.length * 0.95)], max: ts[ts.length - 1] };
  t(unic === N_CLASICO, `${NIVELES[nv].nombre}: ${unic}/${N_CLASICO} puzzles con solucion unica`);
  t(indep === ni, `${NIVELES[nv].nombre}: verificador independiente confirma unicidad (${indep}/${ni})`);
  t(ex >= N_CLASICO * 0.85, `${NIVELES[nv].nombre}: ${ex}/${N_CLASICO} clasificados exactamente en su nivel`);
}
console.log('  tiempos de generacion clasico (ms) mediana/p95/max:', Object.entries(tiempos).map(([k, v]) => `${NIVELES[k].nombre} ${v.med.toFixed(0)}/${v.p95.toFixed(0)}/${v.max.toFixed(0)}`).join(' | '));
t(tiempos[0].p95 < 200 && tiempos[1].p95 < 300 && tiempos[2].p95 < 800, 'principiante-medio generan en < 1 s (escritorio, peor caso p95)');
t(Object.values(tiempos).every((x) => x.med < 500), 'mediana de generacion < 500 ms en todos los niveles');

for (const V of VARIANTES.filter((x) => x.id !== 'clasico')) {
  let unic = 0, val = 0, n = 0, incon = 0; const ts = [];
  for (const nv of V.niveles) for (let k = 0; k < N_OTRAS; k++) {
    const t0 = performance.now(); const p = generar({ variante: V.id, nivel: nv, semilla: 'v' + k }); ts.push(performance.now() - t0);
    const M = modelo(p), d = num(p.dados), s = num(p.sol); n++;
    { const ci = contarIndep(M, d); let ok2 = esUnico(M, d); if (ci === -1) { incon++; ok2 = ok2 && resolver(M, d, 2, crearAzar(1)).length === 1 && resolver(M, d, 2, crearAzar(2)).length === 1; } else ok2 = ok2 && ci === 1; if (ok2) unic++; }
    if (validaSolucion(M, s) && p.dados.length === M.N) val++;
    if (V.id === 'irregular') { let g = true; for (let r = 0; r < 9; r++) if (!conexa(M, r)) g = false; t(g, 'regiones irregulares conexas'); t(new Set(M.reg).size === 9, '9 regiones'); }
    if (V.id === 'killer') { t(M.jaulas.reduce((a, J) => a + J.celdas.length, 0) === 81, 'jaulas cubren las 81 celdas'); t(M.jaulas.every((J) => J.celdas.length <= 4), 'jaulas de hasta 4 celdas'); }
  }
  ts.sort((a, b) => a - b);
  t(unic === n, `${V.nombre}: ${unic}/${n} unicos (independiente)`); t(val === n, `${V.nombre}: ${val}/${n} soluciones validas`);
  console.log(`  ${V.nombre}${incon ? ' (' + incon + ' sin veredicto del verificador por fuerza bruta: comprobados con dos busquedas de orden aleatorio)' : ''}: mediana ${ts[ts.length >> 1].toFixed(0)} ms, p95 ${ts[Math.floor(ts.length * .95)].toFixed(0)} ms, max ${ts[ts.length - 1].toFixed(0)} ms`);
}
{ const az = crearAzar(5); let c = 0; for (let k = 0; k < 20; k++) { const r = layoutIrregular(az); const m = modelo({ v: 'irregular', reg: r }); if (new Set(m.reg).size === 9 && [...Array(9).keys()].every((i) => r.filter((x) => x === i).length === 9)) c++; } t(c === 20, 'layouts irregulares: 9 regiones de 9 celdas'); }

/* ---- texto pegado ---- */
{
  const a = analizarTexto(FACIL); t(a.puzzle && a.unico && a.puzzle.sol === SOL_FACIL && a.puzzle.nivel === 0, 'analizarTexto resuelve y clasifica');
  t(analizarTexto('123').error, 'texto invalido se rechaza');
  t(analizarTexto('11' + '0'.repeat(79)).error, 'texto sin solucion se rechaza');
  t(describirTexto(FACIL.replace(/0/g, '.')).dados === FACIL, 'acepta puntos como vacios');
  t(analizarTexto('0'.repeat(81)).unico === false, 'tablero vacio: varias soluciones');
  t(describirTexto('1' + '0'.repeat(15)).v === 'cuatro', 'detecta 4x4');
}

/* ---- semilla diaria determinista ---- */
{
  const r = retoDiario('2026-03-14'), a = generar(r), b = generar(retoDiario('2026-03-14')), c = generar(retoDiario('2026-03-15'));
  t(a.dados === b.dados && a.sol === b.sol, 'mismo dia -> mismo puzzle');
  t(a.dados !== c.dados, 'otro dia -> otro puzzle');
  t(retoDiario('2026-03-14').nivel >= 1 && retoDiario('2026-03-15').nivel >= 1, 'nivel del diario definido');
  const w = desafiosSemana('2026-W11'), w2 = desafiosSemana('2026-W11');
  t(JSON.stringify(w) === JSON.stringify(w2) && w.length === 3, 'desafios semanales deterministas');
  const x = generar(w[1]), y = generar(w2[1]); t(x.dados === y.dados, 'desafio semanal reproducible');
  t(semanaISO('2026-01-01') === '2026-W01' && semanaISO('2026-12-31') === '2026-W53' && semanaISO('2024-12-30') === '2025-W01', 'semana ISO correcta');
  t(fmtTiempo(65) === '1:05' && fmtTiempo(3725) === '1:02:05', 'formato de tiempo');
}

/* ---- partida / validadores ---- */
{
  const p = generar({ variante: 'clasico', nivel: 1, semilla: 'part' });
  const g = PA.nuevaPartida(p, { vidas: 3 });
  const vacia = [...g.v].findIndex((x) => x === 0), buena = g.sol[vacia], mala = buena % 9 + 1;
  t(PA.poner(g, vacia, mala).error === true && g.errores === 1 && g.vidas === 2, 'valor incorrecto resta una vida');
  t(PA.conflictos(g).size >= 0, 'conflictos calculables');
  PA.deshacer(g); t(g.v[vacia] === 0, 'deshacer'); PA.rehacer(g); t(g.v[vacia] === mala, 'rehacer');
  PA.borrar(g, vacia); PA.poner(g, vacia, buena); t(PA.incorrectas(g).length === 0, 'valor correcto no es incorrecto');
  let dado = [...g.dados].findIndex((x) => x); t(PA.poner(g, dado, 1).cambio === false, 'no se modifican las pistas');
  PA.alternarNota(g, [...g.v].findIndex((x) => x === 0), 3); t(g.notas.some((m) => m === 4), 'nota a lapiz');
  PA.autonotas(g); const j = [...g.v].findIndex((x) => x === 0); t((g.notas[j] & PA.bit(g.sol[j])) !== 0, 'autonotas incluye la solucion');
  for (let k = 0; k < 30; k++) PA.alternarNota(g, j, 1 + (k % 9));
  t(g.hist.length > 30, 'historial ilimitado (' + g.hist.length + ')');
  for (let i = 0; i < g.N; i++) if (g.v[i] === 0) PA.poner(g, i, g.sol[i]);
  t(PA.completo(g) && PA.resuelta(g) && PA.conflictos(g).size === 0, 'tablero completo resuelto sin conflictos');
  const s = PA.restaurar(JSON.parse(JSON.stringify(PA.serializar(g)))); t(s && s.v.join('') === g.v.join('') && s.hist.length > 0 && s.vidas === g.vidas, 'serializar/restaurar');
  // killer: conflicto de suma
  const pk = generar({ variante: 'killer', nivel: 1, semilla: 'kk' }), gk = PA.nuevaPartida(pk), J = gk.M.jaulas.find((q) => q.celdas.length >= 2);
  PA.poner(gk, J.celdas[0], 9); PA.poner(gk, J.celdas[1], 9);
  t(PA.conflictos(gk).has(J.celdas[0]), 'killer: se detectan duplicados/suma excedida');
}

/* ---- trabajador (mensajeria) ---- */
{
  const out = []; globalThis.self = { postMessage: (m) => out.push(m) };
  await import('../js/trabajador.js');
  self.onmessage({ data: { id: 1, op: 'generar', args: { variante: 'cuatro', nivel: 0, semilla: 'w' } } });
  self.onmessage({ data: { id: 2, op: 'analizar', args: FACIL } });
  t(out.length === 2 && out[0].ok && out[0].r.n === 4 && out[1].r.puzzle.sol === SOL_FACIL, 'el trabajador responde generar/analizar');
}

console.log(`\n${ok} correctas, ${fallos} fallidas`);
if (fallos) process.exit(1);
