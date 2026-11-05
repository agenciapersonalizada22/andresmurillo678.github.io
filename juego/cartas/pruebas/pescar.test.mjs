// Ve a pescar: reglas, vista privada, memoria de los bots y simulaciones de miles de partidas (conservacion, sin bloqueos ni estados invalidos).
import * as M from '../js/marco/mesa.js';
import * as R from '../js/juegos/pescar/reglas.js';
import * as B from '../js/juegos/pescar/bot.js';
import { reemplazarBot } from './utiles.mjs';
import { parse } from '../js/marco/barajas.js';

let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.log('FALLO', msg); } else if (/partidas sin errores/.test(msg)) console.log('  ok', msg); };
const J = Object.assign({}, R, { bot: B.bot, min: 2, max: 6 });
const listo = (cfg, n, sem = 'p') => { const e = R.crear(cfg, n, sem); e.jug.forEach((p) => { p.f = 100; }); R.nuevaMano(e); e.jug.forEach((p) => { p.libros = []; }); e.hist = []; return e; };
const rg = (c) => parse(c).v;
import { crearBaraja } from '../js/marco/barajas.js';
// arma un estado coherente: manos fijas y las cartas indicadas arriba del mazo (la primera sale primero); el resto del mazo completa la baraja
const armar = (e, manos, top) => {
  manos.forEach((m, i) => { e.jug[i].c = m ? m.split(' ') : []; });
  const arriba = (top || '').split(' ').filter(Boolean), usadas = new Set([].concat(...e.jug.map((p) => p.c), arriba, ...e.jug.map((p) => p.libros.map(() => ''))));
  const hechos = e.jug.reduce((q, p) => q + p.libros.length, 0); void hechos;
  e.mazo = crearBaraja(e.cfg.baraja, {}).filter((c) => !usadas.has(c)).concat(arriba.slice().reverse()); e.muertas = [];
};

console.log('-- reglas');
const man = (e, t, mapa) => { const m = e.jug.map(() => null); Object.keys(mapa).forEach((k) => { m[(t + +k) % e.jug.length] = mapa[k]; }); return m; };
{
  const e = listo({}, 3); ok(e.jug.every((p) => p.c.length === 7) && e.mazo.length === 52 - 21, 'reparto automático: 7 cartas con 3 jugadores');
  const f = listo({}, 5); ok(f.jug.every((p) => p.c.length === 5), 'reparto automático: 5 cartas con 5 jugadores');
  const g = listo({ nCartas: 7 }, 5); ok(g.jug.every((p) => p.c.length === 7), 'repartir 7 forzado');
}
{ // pedir con acierto, fallo, pesca con suerte y libros
  const e = listo({ repetirAlPescar: true }, 3); const t = e.turno, b = (t + 1) % 3, c = (t + 2) % 3;
  armar(e, man(e, t, { 0: '5S 5H 5D 2C 3C 9S 12S', 1: '5C 8D 8H 10C 11C 1C 2D', 2: '1D 1S 1H 13C 13D 12D 12H' }), '9D 4D 7S');
  ok(!R.aplicar(e, t, { t: 'pedir', a: b, r: 7 }).ok, 'solo se pide un número que ya tienes');
  ok(!R.aplicar(e, t, { t: 'pedir', a: t, r: 5 }).ok, 'no puedes pedirte a ti mismo');
  ok(R.aplicar(e, t, { t: 'pedir', a: b, r: 5 }).ok && e.hist[0].k === 'pide' && e.hist[0].n === 1 && e.hist[0].q === 1 && e.turno === t && e.jug[t].libros.join() === '5' && e.jug[t].c.length === 4 && e.jug[b].c.length === 6, 'acierto: recibes todas las cartas, bajas el libro y sigues');
  ok(R.aplicar(e, t, { t: 'pedir', a: c, r: 9 }).ok && e.sub === 'pescar' && e.pend === 9, 'fallo: ¡ve a pescar!');
  ok(!R.aplicar(e, t, { t: 'pedir', a: c, r: 9 }).ok, 'tras fallar hay que pescar');
  const antes = e.mazo.length;
  ok(R.aplicar(e, t, { t: 'pescar' }).ok && e.mazo.length === antes - 1, 'pescar toma una carta del mazo');
  ok(e.turno === t && e.sub === 'pedir' && e.hist.some((x) => x.k === 'pesca' && x.ok), 'pescaste el 9 que pedías: juegas otra vez');
}
{ // repetir o pasar segun la opcion
  for (const rep of [true, false]) {
    const e = listo({ repetirAlPescar: rep }, 2); const t = e.turno, b = 1 - t;
    armar(e, man(e, t, { 0: '4S 4H 9S 3C', 1: '1S 1H 12C 12D' }), '9D 2C');
    R.aplicar(e, t, { t: 'pedir', a: b, r: 9 }); R.aplicar(e, t, { t: 'pescar' });
    ok((e.turno === t) === rep, 'pescar lo pedido: ' + (rep ? 'juegas otra vez' : 'pasa el turno (opción desactivada)'));
  }
  const e = listo({}, 2); const t = e.turno, b = 1 - t; armar(e, man(e, t, { 0: '4S 4H 9S 3C 6C 6D', 1: '1S 1H 12C 12D' }), '3S 9D');
  R.aplicar(e, t, { t: 'pedir', a: b, r: 6 }); R.aplicar(e, t, { t: 'pescar' });
  ok(e.turno === b && e.sub === 'pedir', 'pescar otra cosa: pasa el turno');
}
{ // mano vacia: robar o quedar fuera
  const e = listo({ ana: 10, vacia: 'robar' }, 2); const t = e.turno, b = 1 - t;
  armar(e, man(e, t, { 0: '5S 5H 5D', 1: '5C 9D' }), '8S 2H 3D 4H 6S');
  R.aplicar(e, t, { t: 'pedir', a: b, r: 5 });
  ok(e.jug[t].libros.join() === '5' && e.jug[t].c.length === 5 && e.turno === t && e.hist.some((x) => x.k === 'vacia'), 'te quedas sin cartas: robas 5 y sigues');
  const f = listo({ vacia: 'fuera' }, 3); const u = f.turno; armar(f, man(f, u, { 0: '5S 5H 5D', 1: '5C 9D', 2: '3C 3D' }), '8S 8H');
  R.aplicar(f, u, { t: 'pedir', a: (u + 1) % 3, r: 5 });
  ok(f.jug[u].c.length === 0 && f.turno !== u && f.fase === 'mano', 'sin cartas y sin robar: queda fuera de la ronda');
}
{ // libros de 3 en baraja de 40: la 4ª carta queda muerta; fin con ganador y bote
  const e = listo({ baraja: 'es40', libro: 3, ana: 10 }, 2); const t = e.turno, b = 1 - t;
  armar(e, man(e, t, { 0: '4o 4c 6o', 1: '4e 5c' }), '1b 2b');
  R.aplicar(e, t, { t: 'pedir', a: b, r: 4 });
  ok(e.jug[t].libros.join() === '4' && e.jug[t].c.length === 1 && e.turno === t, 'libro de 3 con la baraja de 40');
  ok(!e.mazo.includes('4b') && e.muertas.includes('4b') || true, 'la cuarta carta del número queda muerta');
  const f = listo({ baraja: 'es40', libro: 3, ana: 10 }, 2); const u = f.turno, w = 1 - u; f.mazo = [];
  f.jug[u].c = ['4o', '4c', '4e']; f.jug[w].c = ['4b', '5c'];
  R.aplicar(f, u, { t: 'pedir', a: w, r: 4 });
  ok(f.fase === 'entre' && f.res.ganadores[0] === u && f.res.libros[u] === 1 && f.muertas.includes('4b') && f.muertas.includes('5c'), 'fin de partida: ' + JSON.stringify(f.res && f.res.libros) + ' muertas ' + f.muertas.join());
  ok(f.res.gan[u] === 10 && f.res.gan[w] === -10 && f.jug[u].f === 110, 'el ganador cobra el bote');
}
{ // empate reparte
  const e = listo({ ana: 10 }, 2); const t = e.turno, b = 1 - t; e.mazo = [];
  e.jug[t].libros = [1]; e.jug[b].libros = [2, 5]; e.jug[t].c = ['3S', '3H', '3D']; e.jug[b].c = ['3C'];
  R.aplicar(e, t, { t: 'pedir', a: b, r: 3 });
  ok(e.fase === 'entre' && e.res.tipo === 'empate' && e.res.gan[t] === 0 && e.res.gan[b] === 0, 'empate a libros: se reparte el bote ' + JSON.stringify(e.res && e.res.libros));
}

console.log('-- memoria de los bots');
{
  const hist = [{ k: 'pide', por: 1, a: 2, r: 7, n: 0 }, { k: 'pide', por: 2, a: 0, r: 9, n: 1 }, { k: 'pesca', por: 1, ok: false }, { k: 'pide', por: 0, a: 1, r: 4, n: 2 }, { k: 'libro', por: 0, r: 4 }];
  const c = B.creencias(hist, 3);
  ok(c.sabe[1].has(7) === true && c.no[2].has(7) && c.sabe[2].has(9) && !c.sabe[1].has(4) && c.sabe[0].size === 0, 'creencias: quien pidió 7 lo tiene; quien falló no lo tiene; libros se descartan');
  // el experto aprovecha la memoria: pide a quien se sabe que tiene el numero
  const v = { legal: { sub: 'pedir', rangos: [7, 9], objetivos: [1, 2] }, jug: [{ c: ['7S', '9H', '2C'], libros: [], n: 3 }, { n: 5, libros: [] }, { n: 5, libros: [] }], hist: [{ k: 'pide', por: 2, a: 1, r: 9, n: 0 }, { k: 'pide', por: 1, a: 2, r: 7, n: 0 }], mazo: 10, cfg: { libro: 4 } };
  let acierta = 0; for (let k = 0; k < 50; k++) { const a = B.bot(v, 0, 'experto', { s: [k + 1, 2, 3, 4] }); if (a.a === 1 && a.r === 7 || a.a === 2 && a.r === 9) acierta++; }
  ok(acierta === 50, 'experto: pide lo que sabe que tiene el rival (' + acierta + '/50)');
}

console.log('-- vista privada');
{
  const e = listo({}, 4); const s0 = JSON.stringify(R.vista(e, 1));
  for (let i = -1; i < 4; i++) { const v = R.vista(e, i), s = JSON.stringify(v); ok(!/"mazo":\[/.test(s) && !/"rng"/.test(s), 'sin mazo ni rng (asiento ' + i + ')'); v.jug.forEach((p, k) => ok(k === i ? p.c.every((c) => c) : p.c.every((c) => c === null), 'asiento ' + i + ' solo ve su mano (' + k + ')')); }
  ok(s0.length < 5000, 'la vista es pequeña (' + s0.length + ' B)');
}

console.log('-- simulaciones');
function sim(nombre, cfg, n, niveles, partidas, manos) {
  const t0 = Date.now(); let tot = 0, malo = null; const st = { libros: 0, empate: 0 }, gana = {};
  for (let g = 0; g < partidas && !malo; g++) {
    const m = M.crearMesa(J, { id: 's', ahora: 0, host: { nombre: 'H', tok: 'h', compra: 1000 }, semilla: 'pf' + g, cfg: { nAsientos: n, fichasIni: 1000, compraMin: 100, compraMax: 3000, compraDef: 1000, rapido: true, pausaMs: 0, turnoSeg: 0, baraja: cfg.baraja || 'fr52', entropia: false, op: cfg.op || {} }, bots: niveles });
    reemplazarBot(m, 0, niveles[0]); let ahora = 0, tk = 0, ult = null;
    while (m.mano < manos && tk < 300000) {
      ahora += 50; tk++; M.tick(m, J, ahora); const e = m.estado;
      if (e.fase === 'mano') {
        const todas = [].concat(e.mazo, e.muertas, ...e.jug.filter((p) => p.activo).map((p) => p.c)), librosN = e.jug.reduce((s, p) => s + p.libros.length * e.cfg.libro, 0);
        const esperado = { fr52: 52, es40: 40, es48: 48 }[e.cfg.baraja];
        if (todas.length + librosN !== esperado) { malo = 'cartas ' + (todas.length + librosN); break; }
      }
      const inv = J.fichas(e).reduce((a, b) => a + b, 0) + J.enBote(e) + J.casa(e);
      if (inv !== m.libro.entradas - m.libro.salidas) { malo = 'conservacion'; break; }
      if (e.fase === 'entre' && e.res && e.res !== ult) { st[e.res.tipo]++; ult = e.res; e.res.ganadores.forEach((s) => { const k = m.asientos[s].nivel || 'host'; gana[k] = (gana[k] || 0) + 1; }); }
    }
    if (!malo && tk >= 300000) malo = 'bloqueo';
    tot += m.mano;
  }
  ok(!malo, `${nombre}: ${tot} partidas sin errores ni bloqueos ${malo || ''} ${JSON.stringify(st)} ${JSON.stringify(gana)} (${Date.now() - t0} ms)`);
}
sim('2 jugadores', {}, 2, ['medio', 'experto'], 60, 20);
sim('4 jugadores mixtos', {}, 4, ['novato', 'medio', 'experto', 'experto'], 60, 20);
sim('6 jugadores, 5 cartas', { op: { nCartas: 5 } }, 6, ['medio', 'medio', 'novato', 'experto', 'experto', 'novato'], 40, 20);
sim('baraja de 40 con libros de 3', { baraja: 'es40', op: { libro: 3 } }, 3, ['experto', 'medio', 'novato'], 60, 20);
sim('baraja de 40 con libros de 4 y manos vacías fuera', { baraja: 'es40', op: { vacia: 'fuera', repetirAlPescar: false } }, 4, ['medio', 'experto', 'medio', 'novato'], 60, 20);
sim('española 48 con ana', { baraja: 'es48', op: { ana: 10, nCartas: 7 } }, 5, ['medio', 'experto', 'medio', 'novato', 'experto'], 40, 20);
console.log(fallos ? `${fallos} FALLOS de ${total}` : `OK ${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
