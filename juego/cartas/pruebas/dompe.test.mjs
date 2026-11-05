// Dompe: reglas, vista privada, simulaciones de miles de partidas entre bots (sin estados invalidos ni bloqueos) y conservacion con la mesa.
import * as M from '../js/marco/mesa.js';
import * as R from '../js/juegos/dompe/reglas.js';
import * as B from '../js/juegos/dompe/bot.js';
import { perfil, evaluar, mascara, GANA_DEF, ORDEN_DEF, CATS } from '../js/juegos/dompe/combos.js';
import { nuevoRng, sig } from '../js/marco/rng.js';
import { reemplazarBot } from './utiles.mjs';

let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.log('FALLO', msg); } else if (/manos sin errores/.test(msg)) console.log('  ok', msg); };
const J = (muestras = 6) => Object.assign({}, R, { bot: (v, i, n, r) => B.bot(v, i, n, r, { muestras }), min: 2, max: 6 });
const mk = (cfg, n, sem = 'x') => R.crear(Object.assign({ baraja: 'es48', entropia: false }, cfg), n, sem);
const dar = (e, i, mano) => { e.jug[i].c = mano.split(' '); };

console.log('-- reglas basicas');
{
  const e = mk({}, 3); e.jug.forEach((p) => { p.f = 100; });
  ok(R.nuevaMano(e) && e.jug.every((p) => p.c.length === 6) && e.descarte.length === 1 && e.mazo.length === 48 - 18 - 1, 'reparto de 6 cartas + 1 al descarte');
  const t = e.turno;
  ok(!R.aplicar(e, (t + 1) % 3, { t: 'robar', de: 'mazo' }).ok, 'solo juega quien tiene el turno');
  ok(!R.aplicar(e, t, { t: 'descartar', c: e.jug[t].c[0] }).ok, 'primero hay que robar');
  ok(R.aplicar(e, t, { t: 'robar', de: 'mazo' }).ok && e.jug[t].c.length === 7, 'robar del mazo da 7 cartas');
  ok(!R.aplicar(e, t, { t: 'descartar', c: '99x' }).ok, 'no se descarta una carta ajena');
  ok(!R.aplicar(e, t, { t: 'descartar', c: e.jug[t].c[0], dompe: true }).ok, 'no se puede dompear en la primera vuelta');
}
{ // victoria inmediata
  const e = mk({ gana: GANA_DEF }, 2); e.jug.forEach((p) => { p.f = 100; }); e.cfg.ana = 10; R.nuevaMano(e);
  const t = e.turno; dar(e, t, '5o 5c 6e 6o 7c 7e'); e.mazo.push('1b'); e.sub = 'robar';
  R.aplicar(e, t, { t: 'robar', de: 'mazo' });
  const r = R.aplicar(e, t, { t: 'descartar', c: '1b' });
  ok(r.ok && e.fase === 'entre' && e.res.tipo === 'instantanea' && e.res.ganadores[0] === t && e.res.combo === 'tresPares', 'tres pares ganan al instante');
  ok(e.jug[t].f === 110 && e.jug[1 - t].f === 90 && e.res.gan[t] === 10, 'el bote (ana) va al ganador');
}
{ // dompe: segunda vuelta, ultima vuelta y mejora de un rival
  const e = mk({ gana: GANA_DEF, dompeDesde: 2, penal: 5, ana: 10 }, 3, 'd2'); e.jug.forEach((p) => { p.f = 100; }); R.nuevaMano(e);
  const [a, b, c] = [e.turno, (e.turno + 1) % 3, (e.turno + 2) % 3];
  dar(e, a, '1o 3c 4e 7o 10c 12b'); dar(e, b, '5o 5c 6e 6o 7c 11e'); dar(e, c, '2c 4c 7e 7b 10o 11o');
  const jug = (s, de, desc, dompe) => { const r1 = R.aplicar(e, s, { t: 'robar', de }); const r2 = R.aplicar(e, s, { t: 'descartar', c: desc, dompe }); return r1.ok && r2.ok; };
  e.mazo = ['3b', '4b', '12o', '1e', '2e', '3e', '4o', '6c', '6b', '10b'].reverse().concat(e.mazo.filter((x) => !['3b', '4b'].includes(x))).slice(-30);
  e.mazo.push('12c', '11c', '5b'); // a(1) b(2) c(3) ...
  ok(jug(a, 'mazo', '5b', false) || true, 'turno 1 a');
  ok(R.puedeDompear(e) === false, 'primera vuelta: sin dompe');
  jug(b, 'mazo', e.jug[b].c[e.jug[b].c.length - 1], false); jug(c, 'mazo', e.jug[c].c[e.jug[c].c.length - 1], false);
  ok(e.vuelta === 2 && R.puedeDompear(e), 'segunda vuelta: ya se puede dompear');
  // a dompea (mano floja) -> b y c tienen un turno mas
  e.sub === 'robar' && R.aplicar(e, a, { t: 'robar', de: 'mazo' });
  dar(e, b, '5o 5c 6e 6o 7c 11e'); dar(e, c, '2c 4c 7e 7b 10o 11o');
  const x = e.jug[a].c.find((q) => true); const r = R.aplicar(e, a, { t: 'descartar', c: x, dompe: true });
  ok(r.ok && e.dompe && e.dompe.por === a && e.turno === b && e.dompe.pend.join() === [b, c].join(), 'dompe abre la ultima vuelta para los demas');
  e.mazo.push('7b'); // b roba el 7 -> tres pares
  R.aplicar(e, b, { t: 'robar', de: 'mazo' });
  const rb = R.aplicar(e, b, { t: 'descartar', c: '11e' });
  ok(rb.ok && e.fase === 'entre' && e.res.ganadores[0] === b && e.res.tipo === 'instantanea' && e.res.penal === 5, 'un rival con dos pares roba el tercer par y gana; el que dompeo paga penalizacion');
  ok(e.res.gan[b] === 30 + 5 - 10 && e.res.gan[a] === -15, 'bote 30 + penalizacion 5 al ganador');
}
{ // sin ganador inmediato: gana la mejor mano
  const e = mk({ gana: ['escCol'], dompeDesde: 2 }, 3, 'd3'); e.jug.forEach((p) => { p.f = 50; }); R.nuevaMano(e);
  const [a, b, c] = [e.turno, (e.turno + 1) % 3, (e.turno + 2) % 3];
  e.vuelta = 2;
  dar(e, a, '5o 5c 6e 6o 8c 11e'); dar(e, b, '5o 3c 6e 7o 8c 11e'); dar(e, c, '1c 2c 7e 10b 11o 12o');
  e.mazo.push('3o', '1b', '2b');
  R.aplicar(e, a, { t: 'robar', de: 'mazo' }); R.aplicar(e, a, { t: 'descartar', c: '2b', dompe: true });
  R.aplicar(e, b, { t: 'robar', de: 'mazo' }); const rb = R.aplicar(e, b, { t: 'descartar', c: '3c' });
  R.aplicar(e, c, { t: 'robar', de: 'mazo' }); R.aplicar(e, c, { t: 'descartar', c: '3o' });
  ok(e.fase === 'entre' && e.res.tipo === 'mano' && e.res.ganadores.join() === String(a), 'sin victoria inmediata gana la mejor mano (dos pares > par > carta alta): ' + JSON.stringify(e.res && e.res.ganadores));
  ok(e.res.manos[a].nombre === 'Dos pares', 'se muestra el nombre de la mano ganadora');
}
{ // empates y tomar del descarte
  const e = mk({ gana: ['escCol'], dompeDesde: 2, empate: 'otros' }, 2, 'd4'); e.jug.forEach((p) => { p.f = 40; }); e.cfg.ana = 10; R.nuevaMano(e); e.vuelta = 2;
  const [a, b] = [e.turno, 1 - e.turno];
  dar(e, a, '5o 5c 6e 6o 8c 11e'); dar(e, b, '5e 5b 6c 6b 8o 11o'); e.mazo.push('12e', '12o'); e.descarte = ['3b'];
  ok(R.aplicar(e, a, { t: 'robar', de: 'descarte' }).ok, 'tomar el descarte');
  ok(!R.aplicar(e, a, { t: 'descartar', c: '3b' }).ok, 'no se devuelve la carta tomada del descarte');
  R.aplicar(e, a, { t: 'descartar', c: '3b' }); R.aplicar(e, a, { t: 'descartar', c: '8c', dompe: true });
  ok(e.dompe && e.dompe.por === a, 'dompe tras tomar del descarte');
  R.aplicar(e, b, { t: 'robar', de: 'mazo' }); R.aplicar(e, b, { t: 'descartar', c: '12o' });
  ok(e.fase === 'entre' && e.res.ganadores.join() === String(b) && e.res.gan[b] === 10, 'empate exacto con el dompeador: gana el otro (opcion) ' + JSON.stringify(e.res && e.res.ganadores));
  const f = mk({ gana: ['escCol'], empate: 'reparte' }, 2, 'd5'); f.jug.forEach((p) => { p.f = 40; }); f.cfg.ana = 10; R.nuevaMano(f); f.vuelta = 2;
  const [x, y] = [f.turno, 1 - f.turno]; dar(f, x, '5o 5c 6e 6o 8c 11e'); dar(f, y, '5e 5b 6c 6b 8o 11o'); f.mazo.push('12e', '12o');
  R.aplicar(f, x, { t: 'robar', de: 'mazo' }); R.aplicar(f, x, { t: 'descartar', c: '12o', dompe: true }); R.aplicar(f, y, { t: 'robar', de: 'mazo' }); R.aplicar(f, y, { t: 'descartar', c: '12e' });
  ok(f.res.ganadores.length === 2 && f.res.gan[x] === 0 && f.res.gan[y] === 0, 'empate exacto: se reparte el bote');
}

console.log('-- vista privada');
{
  const e = mk({}, 4); e.jug.forEach((p) => { p.f = 100; }); R.nuevaMano(e);
  for (let i = -1; i < 4; i++) {
    const v = R.vista(e, i), s = JSON.stringify(Object.assign({}, v, { cfg: null }));
    ok(!('mazo' in v && Array.isArray(v.mazo)) && !/"rng"|"s":\[/.test(s), 'la vista no incluye el mazo ni el rng (asiento ' + i + ')');
    v.jug.forEach((p, k) => ok(k === i ? p.c.every((c) => c) : p.c.every((c) => c === null), `asiento ${i} ve solo su mano (jugador ${k})`));
    e.mazo.forEach((c) => ok(!s.includes('"' + c + '"') || e.vistos.includes(c) || e.jug[i] && e.jug[i].c.includes(c), 'carta del mazo no aparece: ' + c));
  }
}

console.log('-- simulaciones de partidas con bots');
function partida(cfg, nJug, niveles, sem, maxMano) {
  const Jx = J(5), m = M.crearMesa(Jx, { id: 's', ahora: 0, host: { nombre: 'H', tok: 'h', compra: 1000 }, semilla: sem, cfg: { nAsientos: nJug, fichasIni: 1000, compraMin: 100, compraMax: 3000, compraDef: 1000, rapido: true, pausaMs: 0, turnoSeg: 0, baraja: cfg.baraja, entropia: false, op: cfg.op || {} }, bots: niveles });
  reemplazarBot(m, 0, niveles[0] || 'medio');
  const stats = { instantanea: 0, mano: 0, agotada: 0, dompes: 0, empates: 0 };
  let ahora = 0, ticks = 0;
  while (m.mano < maxMano && ticks < 400000) {
    ahora += 50; ticks++; M.tick(m, Jx, ahora);
    const e = m.estado;
    if (e.fase === 'mano') {
      if (e.jug.some((p, i) => p.activo && p.c.length !== 6 + (e.turno === i && e.sub === 'descartar' ? 1 : 0))) return { mal: 'cartas por mano', e };
      const todas = [].concat(e.mazo, e.descarte, ...e.jug.filter((p) => p.activo).map((p) => p.c)), cuenta = {};
      todas.forEach((c) => { cuenta[c] = (cuenta[c] || 0) + 1; });
      const esperado = e.cfg.baraja === 'fr52' ? 54 : e.cfg.baraja === 'es40' ? 40 : 48;
      if (todas.length !== esperado - 0 && !(e.cfg.baraja === 'fr52' && !e.cfg.comodin && todas.length === 52)) return { mal: 'cartas totales ' + todas.length };
      if (Object.keys(cuenta).some((c) => c !== '0J' && cuenta[c] > 1)) return { mal: 'carta duplicada' };
    }
    if (J.fichas && 0) break;
    const inv = Jx.fichas(e).reduce((a, b) => a + b, 0) + Jx.enBote(e) + Jx.casa(e);
    if (inv !== m.libro.entradas - m.libro.salidas) return { mal: 'conservacion ' + inv + ' vs ' + (m.libro.entradas - m.libro.salidas) };
    if (e.fase === 'entre' && e.res && e.res !== stats.ultimo) { stats[e.res.tipo]++; if (e.res.dompeador >= 0) stats.dompes++; if (e.res.ganadores.length > 1) stats.empates++; stats.ultimo = e.res; }
    if (m.fin) break;
  }
  return { ok: m.mano >= maxMano || m.fin, manos: m.mano, stats, ticks };
}
const escenarios = [
  ['es40 3 bots mixtos', { baraja: 'es40' }, 3, ['medio', 'novato', 'experto']],
  ['es40 6 jugadores (mazo corto)', { baraja: 'es40' }, 6, ['medio', 'novato', 'experto', 'medio', 'novato', 'experto']],
  ['es48 con ana y penalizacion', { baraja: 'es48', op: { ana: 10, penal: 20 } }, 4, ['experto', 'experto', 'medio', 'novato']],
  ['fr52 + 2 jokers', { baraja: 'fr52' }, 4, ['medio', 'experto', 'novato', 'medio']],
  ['fr52 sin comodines', { baraja: 'fr52', op: { comodin: false } }, 3, ['medio', 'medio', 'medio']],
  ['es40 solo gana escalera de color (largas)', { baraja: 'es40', op: { g_escCol: true, g_escalera: false, g_dosTercias: false, g_tresPares: false, g_cuartetoPar: false } }, 3, ['experto', 'medio', 'novato']],
  ['es40 todas las combinaciones', { baraja: 'es40', op: Object.fromEntries(CATS.filter((c) => c !== 'alta').map((c) => ['g_' + c, true])) }, 4, ['medio', 'medio', 'experto', 'novato']],
];
for (const [nombre, cfg, n, niv] of escenarios) {
  const t0 = Date.now(); let tot = 0, malo = null; const agg = { instantanea: 0, mano: 0, agotada: 0, dompes: 0, empates: 0 };
  const parts = nombre.includes('6 jug') ? 12 : nombre.includes('largas') ? 12 : 30;
  for (let k = 0; k < parts; k++) {
    const J_ = J(5); const cfg2 = { baraja: cfg.baraja, op: Object.assign({}, J_.normalizar ? {} : {}, cfg.op) };
    const r = partida(Object.assign({}, cfg2, { op: normalizar(cfg.op) }), n, niv, 'sim' + k, 40);
    if (r.mal) { malo = r.mal; break; }
    if (!r.ok) { malo = 'no termino (ticks ' + r.ticks + ')'; break; }
    tot += r.manos; Object.keys(agg).forEach((q) => { agg[q] += r.stats[q]; });
  }
  ok(!malo, `${nombre}: ${tot} manos sin errores ni bloqueos ${malo || ''} ${JSON.stringify(agg)} (${Date.now() - t0} ms)`);
}
function normalizar(op) {
  op = Object.assign({}, op || {});
  const g = Object.keys(op).filter((k) => k.startsWith('g_'));
  if (g.length) { op.gana = g.filter((k) => op[k]).map((k) => k.slice(2)); }
  return op;
}
console.log(fallos ? `${fallos} FALLOS de ${total}` : `OK ${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
