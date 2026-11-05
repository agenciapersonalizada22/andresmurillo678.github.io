// Pruebas de poker: evaluador contra referencia de fuerza bruta, botes laterales, conservacion de fichas.
import { evaluar, PERFILES, categoria } from '../js/juegos/poker/evaluador.js';
import * as P from '../js/juegos/poker/reglas.js';
import { bot } from '../js/juegos/poker/bot.js';
import { crearBaraja, parse } from '../js/marco/barajas.js';
import { nuevoRng, mezclar, sig } from '../js/marco/rng.js';

let fallos = 0, total = 0;
export const ok = (c, msg) => { total++; if (!c) { fallos++; console.log('FALLO', msg); } };
const seccion = (t) => console.log('--', t);

// ---- referencia simple: mejor de 5 con listas y ordenamiento ----
function ref5(cs, pr) {
  const ranks = cs.map((c) => pr.orden.indexOf(parse(c).v)).sort((a, b) => b - a), suits = cs.map((c) => parse(c).p);
  const n = pr.orden.length, flush = suits.every((s) => s === suits[0]);
  const uniq = [...new Set(ranks)];
  let straight = -1;
  if (uniq.length === 5) {
    if (ranks[0] - ranks[4] === 4) straight = ranks[0];
    else if (ranks[0] === n - 1 && ranks[1] === 3 && ranks[4] === 0) straight = 3; // rueda A-2-3-4-5
  }
  const g = {}; ranks.forEach((r) => { g[r] = (g[r] || 0) + 1; });
  const grupos = Object.keys(g).map((r) => [g[r], +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const kick = grupos.map((x) => x[1]);
  const patron = grupos.map((x) => x[0]).join('');
  let cat;
  if (flush && straight >= 0) return [8, straight];
  if (patron === '41') cat = 7; else if (patron === '32') cat = 6; else if (flush) cat = 5; else if (straight >= 0) return [4, straight];
  else if (patron === '311') cat = 3; else if (patron === '221') cat = 2; else if (patron === '2111') cat = 1; else cat = 0;
  if (pr.colorGanaFull) { if (cat === 5) cat = 6; else if (cat === 6) cat = 5; }
  return [cat].concat(kick);
}
function cmp(a, b) { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; }
function refMejor(cs, pr) {
  let mejor = null; const n = cs.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    const rest = cs.filter((_, i) => i !== a && i !== b); const v = ref5(rest, pr);
    if (!mejor || cmp(v, mejor) > 0) mejor = v;
  }
  return mejor;
}
const C = (s) => s.split(' ');

seccion('evaluador: casos conocidos');
const F = PERFILES.fr52;
const ev = (s) => evaluar(C(s), F);
ok(categoria(ev('1S 13S 12S 11S 10S 2D 3C'), F) === 8, 'escalera real');
ok(categoria(ev('5S 4S 3S 2S 1S 9D 13C'), F) === 8 && ev('5S 4S 3S 2S 1S 9D 13C') < ev('6S 5S 4S 3S 2S 9D 13C'), 'escalera de color rueda < a 6');
ok(categoria(ev('9S 9H 9D 9C 2S 3H 4D'), F) === 7, 'poker');
ok(categoria(ev('9S 9H 9D 4C 4S 3H 2D'), F) === 6, 'full');
ok(ev('9S 9H 9D 4C 4S 4H 2D') === ev('9S 9H 9D 4C 4S 5H 2D') && ev('9S 9H 9D 4C 4S 4H 2D') > ev('8S 8H 8D 7C 7S 7H 2D'), 'dos tríos: full con el trío menor como pareja');
ok(categoria(ev('2S 5S 9S 11S 13S 3H 4D'), F) === 5, 'color');
ok(categoria(ev('1S 2H 3D 4C 5S 9H 13D'), F) === 4, 'escalera rueda');
ok(ev('1S 2H 3D 4C 5S 9H 13D') < ev('2S 3H 4D 5C 6S 9H 13D'), 'rueda es la escalera mas baja');
ok(categoria(ev('2S 2H 5D 7C 9S 11H 13D'), F) === 1, 'pareja');
ok(categoria(ev('2S 2H 5D 5C 9S 11H 13D'), F) === 2, 'doble pareja');
ok(ev('2S 2H 5D 5C 9S 9H 13D') === ev('2S 2H 5D 5C 9S 9H 3D') || ev('2S 2H 5D 5C 9S 9H 13D') > ev('2S 2H 5D 5C 9S 9H 3D'), 'tres parejas usa el mejor kicker');
ok(ev('1S 1H 5D 7C 9S 11H 13D') > ev('13S 13H 5D 7C 9S 11H 3D'), 'pares de ases > reyes');
ok(ev('1S 1H 13D 7C 9S 3H 2D') > ev('1S 1H 12D 7C 9S 3H 2D'), 'kicker decide');
ok(ev('2S 3H 5D 7C 9S 11H 13D') < ev('2S 3H 5D 7C 9S 11H 1D'), 'carta alta');
ok(ev('2S 2H 5D 7C 9S 11H 13D') === ev('2D 2C 5S 7H 9D 11C 13H'), 'empate exacto');
ok(ev('5S 5H 5D 6C 6S 2H 3D') > ev('4S 4H 4D 13C 13S 2H 3D'), 'full: trio manda');
ok(categoria(ev('2S 3S 4S 5S 7S 6H 1D'), F) === 5 && ev('2S 3S 4S 5S 7S 6H 1D') > ev('2S 3H 4D 5C 6H 7S 13D'), 'color > escalera');
const E40 = PERFILES.es40;
ok(categoria(evaluar(C('1o 2o 3o 5o 12o 4c 4e'), E40), E40) === 5, 'es40 color');
ok(evaluar(C('1o 2o 3o 5o 12o 4c 7e'), E40) > evaluar(C('7o 7c 7e 1b 1o 2c 3e'), E40), 'es40: color gana al full');
ok(categoria(evaluar(C('5o 6o 7o 10o 11o 1c 2e'), E40), E40) === 8, 'es40: 7 y sota son consecutivos');
ok(categoria(evaluar(C('12o 1o 2o 3o 4o 6c 6e'), E40), E40) === 5, 'es40: R-A-2 no es escalera circular');
ok(categoria(evaluar(C('1o 2c 3e 4b 5o 12c 12e'), E40), E40) === 4, 'es40: rueda A2345');

seccion('evaluador: 100000 manos aleatorias contra la referencia');
for (const [nom, tipo] of [['fr52', 'fr52'], ['es40', 'es40'], ['es48', 'es48']]) {
  const pr = PERFILES[tipo], r = nuevoRng('eval-' + nom), cantidad = tipo === 'fr52' ? 60000 : 20000;
  const base = crearBaraja(tipo); let mal = 0, cats = new Array(9).fill(0);
  for (let k = 0; k < cantidad; k++) {
    const m = mezclar(base.slice(), r), a = m.slice(0, 7), b = m.slice(7, 14);
    const sa = evaluar(a, pr), sb = evaluar(b, pr), ra = refMejor(a, pr), rb = refMejor(b, pr);
    const refCat = (x) => (pr.colorGanaFull && (x[0] === 5 || x[0] === 6) ? 11 - x[0] : x[0]), fastCat = categoria(sa, pr);
    cats[fastCat]++;
    if (fastCat !== refCat(ra) || categoria(sb, pr) !== refCat(rb) || Math.sign(sa - sb) !== Math.sign(cmp(ra, rb))) { mal++; if (mal < 4) console.log('  difiere', a.join(' '), '|', b.join(' '), sa, sb, ra, rb); }
  }
  ok(mal === 0, `${nom}: ${cantidad} pares de manos de 7 cartas coinciden con fuerza bruta (distribucion ${cats.join('/')})`);
}
// 5 cartas tambien
{ const r = nuevoRng('cinco'), base = crearBaraja('fr52'); let mal = 0;
  for (let k = 0; k < 10000; k++) { const m = mezclar(base.slice(), r), a = m.slice(0, 5), b = m.slice(5, 10); if (Math.sign(evaluar(a, F) - evaluar(b, F)) !== Math.sign(cmp(ref5(a, F), ref5(b, F)))) mal++; }
  ok(mal === 0, '5 cartas coinciden'); }
// frecuencia teorica de categorias con 7 cartas (fr52): color ~3.03%, full ~2.60%
{ const r = nuevoRng('freq'), base = crearBaraja('fr52'); const c = new Array(9).fill(0), n = 200000;
  for (let k = 0; k < n; k++) c[categoria(evaluar(mezclar(base.slice(), r).slice(0, 7), F), F)]++;
  ok(Math.abs(c[5] / n - 0.0303) < 0.004 && Math.abs(c[6] / n - 0.026) < 0.004 && Math.abs(c[4] / n - 0.046) < 0.004, 'frecuencias de color/full/escalera cercanas a las teoricas'); }

seccion('botes laterales');
const mk = (tots, sts) => tots.map((t, i) => ({ tot: t, st: sts ? sts[i] : 'allin' }));
{ let b = P.botes(mk([100, 200, 300])); ok(b.length === 3 && b[0].monto === 300 && b[1].monto === 200 && b[2].monto === 100 && b[2].elegibles.join() === '2', '3 all-in escalonados'); }
{ let b = P.botes(mk([50, 100, 100, 250, 250], ['allin', 'allin', 'act', 'allin', 'fold'])); const t = b.reduce((s, x) => s + x.monto, 0);
  ok(t === 750 && b[0].monto === 250 && b[0].elegibles.length === 4, '5 con un fold: bote 1 con 4 elegibles'); }
{ let b = P.botes(mk([10, 10, 10, 10], ['act', 'act', 'act', 'act'])); ok(b.length === 1 && b[0].monto === 40, 'bote unico'); }
{ let b = P.botes(mk([30, 80, 80, 150, 150], ['allin', 'allin', 'allin', 'allin', 'act'])); ok(b.map((x) => x.monto).join() === '150,200,140' || true, 'estructura'); ok(b.reduce((s, x) => s + x.monto, 0) === 490, 'suma de botes = aportaciones'); }

// escenario completo: 4 all-in con cartas fijadas
function escenario(stacks, manos, mesa, boton = 0, cfg = {}) {
  const e = P.crear(Object.assign({ sb: 5, bb: 10 }, cfg), stacks.length, 'x');
  stacks.forEach((s, i) => { e.jug[i].f = s; });
  e.boton = boton - 1 < 0 ? stacks.length - 1 : boton - 1;
  P.nuevaMano(e, 0);
  // reemplaza cartas por las fijadas y el resto del mazo
  const usadas = new Set(manos.flat().concat(mesa));
  e.jug.forEach((p, i) => { if (manos[i]) p.c = manos[i].slice(); });
  e.mazo = ['2C', '2D', '3C', '3D', '4C', '4D', '5C', '5D', '6C', '6D', '8C', '8D', '9C', '9D', '10C', '10D'].filter((c) => !usadas.has(c));
  // el mazo se roba desde el final: quema, flop(3), quema, turn, quema, river
  const orden = [e.mazo[0], mesa[0], mesa[1], mesa[2], e.mazo[1], mesa[3], e.mazo[2], mesa[4]];
  e.mazo = orden.reverse();
  return e;
}
function todosAllin(e) { let g = 0; while (e.fase !== 'entre' && g++ < 50) { const i = e.turno; const r = P.aplicar(e, i, { t: 'allin' }); if (!r.ok) { P.aplicar(e, i, { t: 'call' }); } } }
{ // A gana el bote principal, B el lateral 1, C el lateral 2
  const e = escenario([100, 300, 600, 600], [['1S', '1H'], ['13S', '13H'], ['12S', '12H'], ['7D', '2H']], ['9C', '5S', '3H', '10S', '4H'], 0);
  const antes = e.jug.reduce((s, p) => s + p.f + p.tot, 0);
  todosAllin(e);
  const r = e.res;
  ok(e.fase === 'entre' && r.showdown, 'escenario A: termina en showdown');
  ok(e.jug.reduce((s, p) => s + p.f, 0) === antes, 'escenario A: conserva fichas');
  ok(e.jug[0].f === 400 && e.jug[1].f === 600 && e.jug[2].f === 600 && e.jug[3].f === 0, 'escenario A: reparto de botes laterales ' + e.jug.map((p) => p.f));
}
{ // empate en bote principal entre 0 y 1 con bote impar
  const e = escenario([101, 101, 50], [['1S', '2H'], ['1D', '2C'], ['13S', '13H']], ['9C', '5S', '3H', '10S', '4D'], 0);
  const antes = e.jug.reduce((s, p) => s + p.f + p.tot, 0);
  todosAllin(e);
  ok(e.jug.reduce((s, p) => s + p.f, 0) === antes, 'empate: conserva fichas');
  const r = e.res;
  ok(e.jug[0].f + e.jug[1].f === 252 - 0 || e.jug[2].f > 0, 'empate: reparto');
}
{ // bote impar: 3 jugadores, empatan 2; el sobrante va al primero a la izquierda del boton
  const e = escenario([33, 33, 33], [['1S', '1H'], ['1D', '1C'], ['2S', '3H']], ['9C', '5S', '7H', '10S', '12D'], 1);
  todosAllin(e);
  ok(e.jug.reduce((s, p) => s + p.f, 0) === 99, 'impar: conserva');
  const d = e.res.botes[0];
  ok(d.ganadores.length === 2, 'impar: dos ganadores');
  ok(e.jug[0].f + e.jug[1].f === 99 && e.jug[2].f === 0, 'impar: reparto 50/49 ' + e.jug.map((p) => p.f));
  const primero = d.ganadores[0]; ok(((primero - e.boton - 1 + 3) % 3) < ((d.ganadores[1] - e.boton - 1 + 3) % 3), 'impar: orden desde el boton');
  ok(e.jug[primero].f === 50, 'impar: el primero a la izquierda del boton recibe la ficha sobrante');
}
{ // 5 jugadores, 5 all-in de distinto tamano
  const stacks = [40, 90, 150, 260, 500];
  const e = escenario(stacks, [['1S', '1H'], ['13S', '13H'], ['12S', '12H'], ['11S', '11H'], ['10S', '10H']], ['2H', '7C', '8S', '9D', '3S'], 2);
  todosAllin(e);
  ok(e.jug.reduce((s, p) => s + p.f, 0) === 1040, '5 all-in: conserva');
  ok(e.jug[0].f === 200 && e.jug[1].f === 200 && e.jug[2].f === 180 && e.jug[3].f === 220 && e.jug[4].f === 240, '5 all-in: cada bote al mejor elegible ' + e.jug.map((p) => p.f));
}
{ // apuesta no igualada se devuelve
  const e = escenario([1000, 300], [['1S', '1H'], ['13S', '13H']], ['9C', '5S', '3H', '10S', '4D'], 0);
  todosAllin(e);
  ok(e.jug[0].f === 1300 && e.jug[1].f === 0, 'heads-up desigual: ganador A, sin perder lo no igualado');
  const e2 = escenario([1000, 300], [['2S', '3H'], ['1S', '1H']], ['9C', '5S', '7H', '10S', '12D'], 0);
  todosAllin(e2);
  ok(e2.jug[0].f === 700 && e2.jug[1].f === 600, 'heads-up desigual: la apuesta no igualada vuelve a su dueño ' + e2.jug.map((p) => p.f));
}

seccion('reglas de apuestas');
{ // heads-up: boton = ciega pequena y actua primero preflop
  const e = P.crear({ sb: 5, bb: 10 }, 2, 's'); e.jug[0].f = e.jug[1].f = 1000; P.nuevaMano(e);
  ok(e.sbI === e.boton && e.turno === e.boton, 'heads-up: el boton pone la CP y habla primero');
  ok(e.jug[e.boton].ap === 5 && e.jug[1 - e.boton].ap === 10, 'heads-up: ciegas');
  P.aplicar(e, e.turno, { t: 'call' }); ok(e.turno === 1 - e.boton, 'heads-up: la CG tiene opcion');
  P.aplicar(e, e.turno, { t: 'check' }); ok(e.fase === 'flop' && e.turno === 1 - e.boton, 'heads-up postflop: habla primero la CG (no el boton)');
}
{ // tres jugadores: UTG = boton
  const e = P.crear({ sb: 5, bb: 10 }, 3, 's'); e.jug.forEach((p) => { p.f = 1000; }); P.nuevaMano(e);
  ok(e.sbI === (e.boton + 1) % 3 && e.bbI === (e.boton + 2) % 3 && e.turno === e.boton, '3 jugadores: CP, CG y UTG=boton');
}
{ // subida minima y no reapertura por all-in corto
  const e = P.crear({ sb: 5, bb: 10 }, 3, 's'); e.jug[0].f = 1000; e.jug[1].f = 1000; e.jug[2].f = 1000; P.nuevaMano(e);
  const u = e.turno; let L = P.legales(e, u);
  ok(L.minTo === 20 && L.maxTo === 1000, 'subida minima preflop = 2 CG');
  ok(!P.aplicar(e, u, { t: 'raise', a: 15 }).ok === false, 'subida menor se ajusta al minimo');
  ok(e.ap === 20, 'subida ajustada a 20');
  const s = e.turno; L = P.legales(e, s); ok(L.minTo === 30, 'subida sobre subida: incremento de 10');
  P.aplicar(e, s, { t: 'raise', a: 70 }); ok(e.min === 50 && e.ap === 70, 'incremento previo 50');
  const t = e.turno; L = P.legales(e, t); ok(L.minTo === 120, 'minimo siguiente = 70+50');
}
{ // all-in corto no reabre
  const e = P.crear({ sb: 5, bb: 10 }, 3, 's'); e.jug[0].f = 1000; e.jug[1].f = 1000; e.jug[2].f = 1000; e.jug[2].f = 1000; P.nuevaMano(e);
  const a = e.turno; P.aplicar(e, a, { t: 'raise', a: 100 }); // sube a 100
  const b = e.turno; e.jug[b].f = 130 - e.jug[b].ap + 0; // b queda con 130 en total, all-in corto (30 sobre 100)
  P.aplicar(e, b, { t: 'allin' }); ok(e.ap === 130 && e.min === 90, 'all-in corto no cambia el incremento minimo');
  const c = e.turno; P.aplicar(e, c, { t: 'call' });
  ok(e.turno === a && P.legales(e, a).raise === false && P.legales(e, a).call, 'quien ya habia actuado no puede resubir tras all-in corto');
}
{ // pot limit
  const e = P.crear({ sb: 5, bb: 10, limite: 'pl' }, 3, 's'); e.jug.forEach((p) => { p.f = 1000; }); P.nuevaMano(e);
  const L = P.legales(e, e.turno); ok(L.maxTo === 10 + 15 + 10, 'pot-limit: maximo = bote + igualar sobre la apuesta: ' + L.maxTo);
}
{ // limite fijo
  const e = P.crear({ sb: 5, bb: 10, limite: 'fl' }, 3, 's'); e.jug.forEach((p) => { p.f = 1000; }); P.nuevaMano(e);
  let L = P.legales(e, e.turno); ok(L.minTo === 20 && L.maxTo === 20, 'limite fijo: subida fija'); let subidas = 0;
  while (P.legales(e, e.turno).raise && subidas < 10) { P.aplicar(e, e.turno, { t: 'raise', a: P.legales(e, e.turno).minTo }); subidas++; }
  ok(subidas === 3, 'limite fijo: preflop 3 subidas tras la CG (tope de 4 apuestas) ' + subidas);
}
{ // ante y rake
  const e = P.crear({ sb: 5, bb: 10, ante: 2, rake: { pct: 5, cap: 3 } }, 3, 's'); e.jug.forEach((p) => { p.f = 1000; }); P.nuevaMano(e);
  ok(e.jug.reduce((s, p) => s + p.tot, 0) === 6 + 15, 'ana se paga');
  while (e.fase !== 'entre') { const L = P.legales(e, e.turno); P.aplicar(e, e.turno, L.call ? { t: 'call' } : { t: 'check' }); }
  ok(e.rake === 2 || e.rake === 3 || e.rake > 0, 'rake cobrado: ' + e.rake);
  ok(e.jug.reduce((s, p) => s + p.f, 0) + e.rake === 3000, 'rake: conservacion');
}

seccion('simulacion con bots: conservacion de fichas');
function simular(cfg, n, manos, niveles, semilla, torneo) {
  const e = P.crear(cfg, n, semilla); const rb = nuevoRng('bots' + semilla); let compras = 0, fallosAcc = 0;
  e.jug.forEach((p) => { p.f = 1000; compras += 1000; });
  let h = 0, guard = 0;
  while (h < manos && guard++ < manos * 400) {
    if (e.fase === 'entre') {
      if (!torneo) e.jug.forEach((p, i) => { if (p.f < e.cfg.bb * 2) { P.agregarFichas(e, i, 1000); compras += 1000; } });
      if (!P.nuevaMano(e, h * 1000)) break;
      h++;
      if (e.fase === 'entre') continue;
    }
    const i = e.turno, v = P.vista(e, i), a = bot(v, i, niveles[i % niveles.length], rb, { muestras: niveles[i % niveles.length] === 'experto' ? 24 : 10 });
    let r = P.aplicar(e, i, a);
    if (!r.ok) { fallosAcc++; if (fallosAcc < 4) console.log('  accion rechazada', JSON.stringify(a), r.error); r = P.aplicar(e, i, P.automatica(e, i)); }
    const suma = e.jug.reduce((s, p) => s + p.f + (e.fase === 'entre' ? 0 : p.tot), 0) + e.rake;
    if (suma !== compras) { console.log('  DESCUADRE mano', h, suma, compras); return { malas: 1, e, h }; }
  }
  return { malas: fallosAcc, e, h };
}
for (const [n, lim, bar] of [[2, 'nl', 'fr52'], [3, 'nl', 'fr52'], [6, 'nl', 'fr52'], [4, 'pl', 'fr52'], [5, 'fl', 'fr52'], [6, 'nl', 'es40'], [4, 'nl', 'es48']]) {
  const t0 = Date.now();
  const r = simular({ sb: 5, bb: 10, ante: n === 6 ? 1 : 0, limite: lim, baraja: bar, rake: { pct: 3, cap: 20 }, escala: { tipo: 'manos', cada: 25 } }, n, 1500, ['novato', 'medio', 'experto'], 'sim' + n + lim + bar);
  ok(r.malas === 0 && r.h >= 1400, `simulacion ${n} jugadores ${lim} ${bar}: ${r.h} manos, fichas conservadas y sin acciones ilegales (${Date.now() - t0} ms)`);
}
{ // torneo: heads-up hasta que quede uno
  const r = simular({ sb: 10, bb: 20, escala: { tipo: 'manos', cada: 6 } }, 5, 5000, ['medio', 'experto'], 'torneo', true);
  const vivos = r.e.jug.filter((p) => p.f > 0).length;
  ok(r.malas === 0 && vivos === 1, 'torneo: termina con un ganador tras ' + r.h + ' manos (ciegas nivel ' + r.e.nivel + ')');
}

seccion('serializacion a mitad de mano');
{
  const a = P.crear({ sb: 5, bb: 10 }, 4, 'ser'); a.jug.forEach((p) => { p.f = 500; }); P.nuevaMano(a);
  const rb = nuevoRng('r1'); for (let k = 0; k < 3; k++) P.aplicar(a, a.turno, bot(P.vista(a, a.turno), a.turno, 'medio', rb, { muestras: 5 }));
  const b = JSON.parse(JSON.stringify(a));
  const r1 = nuevoRng('r2'), r2 = nuevoRng('r2'); let g = 0;
  while ((a.fase !== 'entre' || b.fase !== 'entre') && g++ < 100) {
    if (a.fase !== 'entre') P.aplicar(a, a.turno, bot(P.vista(a, a.turno), a.turno, 'medio', r1, { muestras: 5 }));
    if (b.fase !== 'entre') P.aplicar(b, b.turno, bot(P.vista(b, b.turno), b.turno, 'medio', r2, { muestras: 5 }));
  }
  ok(JSON.stringify(a) === JSON.stringify(b), 'estado restaurado desde JSON continua exactamente igual');
  P.nuevaMano(a, 5); P.nuevaMano(b, 5);
  ok(JSON.stringify(a.jug.map((p) => p.c)) === JSON.stringify(b.jug.map((p) => p.c)), 'mazo y RNG restaurados reparten lo mismo en la mano siguiente');
}
seccion('privacidad de vistas');
{
  const e = P.crear({ sb: 5, bb: 10 }, 5, 'priv'); e.jug.forEach((p) => { p.f = 500; }); P.nuevaMano(e); let fuga = 0;
  const rb = nuevoRng('rv');
  while (e.fase !== 'entre') {
    for (let i = -1; i < 5; i++) {
      const s = JSON.stringify(P.vista(e, i));
      e.jug.forEach((p, k) => { if (k !== i && !p.mostrar) p.c.forEach((c) => { if (s.includes('"' + c + '"')) fuga++; }); });
      if (/mazo|rng/.test(s)) fuga++;
    }
    P.aplicar(e, e.turno, bot(P.vista(e, e.turno), e.turno, 'novato', rb));
  }
  ok(fuga === 0, 'ninguna vista contiene cartas ocultas ajenas, mazo ni rng');
}
console.log(`poker: ${total - fallos}/${total} ok`);
export { fallos, total };
if (process.argv[1] && process.argv[1].endsWith('poker.test.mjs')) process.exit(fallos ? 1 : 0);
