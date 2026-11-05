// Conquian: reglas del motor, vista privada y simulaciones de miles de partidas entre bots (sin estados invalidos ni bloqueos) con conservacion de fichas.
import * as M from '../js/marco/mesa.js';
import * as R from '../js/juegos/conquian/reglas.js';
import * as B from '../js/juegos/conquian/bot.js';
import { reemplazarBot } from './utiles.mjs';

let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.log('FALLO', msg); } else if (/partidas sin errores/.test(msg)) console.log('  ok', msg); };
const J = Object.assign({}, R, { bot: B.bot, min: 2, max: 4 });
const mk = (cfg, n, sem = 'x') => R.crear(cfg, n, sem);
const dar = (e, i, m) => { e.jug[i].c = m.split(' '); };
const listo = (e, n) => { e.jug.forEach((p) => { p.f = 100; }); R.nuevaMano(e); return e; };

console.log('-- reglas');
{
  const e = listo(mk({ ana: 10 }, 3), 3);
  ok(e.jug[e.dealer].c.length === 10 && e.jug.filter((_, i) => i !== e.dealer).every((p) => p.c.length === 9) && e.mazo.length === 40 - 28 && e.descarte.length === 0, 'reparto: 9 cartas y 10 al repartidor, mazo de 12');
  ok(e.turno === e.dealer && e.sub === 'jugar' && e.primer, 'el repartidor empieza sin robar');
  ok(!R.aplicar(e, (e.turno + 1) % 3, { t: 'robar' }).ok, 'solo juega quien tiene el turno');
  ok(e.jug.every((p) => p.ap === 10 && p.f === 90) && R.enBote({ ...e }) === 30, 'ana al bote');
}
{ // bajar, agregar, descartar y ganar sin descarte
  const e = listo(mk({}, 2), 2); const a = e.turno, b = 1 - a;
  dar(e, a, '7o 7c 7e 1b 2b 3b 4o 5o 6o 12b');
  ok(!R.aplicar(e, a, { t: 'bajar', cartas: ['7o', '7c', '1b'] }).ok, 'combinación inválida rechazada');
  ok(R.aplicar(e, a, { t: 'bajar', cartas: ['7o', '7c', '7e'] }).ok && e.melds.length === 1 && e.jug[a].c.length === 7, 'bajar un trío');
  ok(R.aplicar(e, a, { t: 'bajar', cartas: ['1b', '2b', '3b'] }).ok && R.aplicar(e, a, { t: 'bajar', cartas: ['4o', '5o', '6o'] }).ok, 'bajar escaleras');
  ok(R.aplicar(e, a, { t: 'descartar', c: '12b' }).ok && e.fase === 'entre' && e.res.tipo === 'descarte' && e.res.ganadores[0] === a, 'ganar descartando la última carta (variante clásica)');
}
{ // variante: no se gana descartando
  const e = listo(mk({ ganarDescarte: false }, 2), 2); const a = e.turno;
  dar(e, a, '7o 7c 7e 1b 2b 3b 4o 5o 6o 12b');
  ['7o 7c 7e', '1b 2b 3b', '4o 5o 6o'].forEach((s) => R.aplicar(e, a, { t: 'bajar', cartas: s.split(' ') }));
  ok(!R.aplicar(e, a, { t: 'descartar', c: '12b' }).ok && R.aplicar(e, a, { t: 'pasar' }).ok && e.turno !== a && e.fase === 'mano', 'sin ganar con descarte: se pasa el turno conservando la carta');
  const b = e.turno; e.mazo.push('4c'); R.aplicar(e, b, { t: 'robar' }); R.aplicar(e, b, { t: 'descartar', c: '4c' });
  e.mazo.push('11b'); R.aplicar(e, a, { t: 'robar' });
  ok(R.aplicar(e, a, { t: 'agregar', m: 2, cartas: ['11b'] }).ok === false, 'no cabe en esa combinación');
  e.mazo.push('4b'); e.jug[a].c = ['4b', '12b']; e.turno = a; e.sub = 'jugar';
  ok(R.aplicar(e, a, { t: 'agregar', m: 2, cartas: ['4b'] }).ok, 'añadir a combinación propia'); // 1b2b3b4b
  ok(R.aplicar(e, a, { t: 'descartar', c: '12b' }).ok === false, 'con una carta no se gana descartando');
}
{ // tomar del descarte: solo si se usa de inmediato
  const e = listo(mk({}, 2), 2); const a = e.turno, b = 1 - a;
  dar(e, a, '9o 9c 1b 2b 4o 5o 6e 12b 11b 10b'); R.aplicar(e, a, { t: 'descartar', c: '7o' }) /* no esta en mano */;
  e.jug[a].c = ['9o', '9c', '1b', '2b', '4o', '5o', '6e', '12b', '11b', '8o'.replace('8o', '10b')]; R.aplicar(e, a, { t: 'descartar', c: '6e' });
  dar(e, b, '9e 4c 6o 6c 3e 2o 1o 7b 7e 5b');
  ok(R.aplicar(e, b, { t: 'tomar', cartas: [] }).ok === false, 'el descarte no se toma si no se usa');
  ok(R.aplicar(e, b, { t: 'tomar', cartas: ['6o', '6c'] }).ok && e.melds.length === 1 && e.descarte.length === 0 && e.sub === 'jugar', 'tomar el descarte para un trío'); // 6e 6o 6c
  const m = e.melds[0].id; e.jug[a].c = ['9o', '9c']; e.turno = a; e.sub = 'robar'; e.descarte = ['6b'];
  ok(R.aplicar(e, a, { t: 'tomar', cartas: [], m }).ok && e.melds[0].c.length === 4, 'tomar el descarte para añadir a una combinación de otro jugador');
  const f = listo(mk({ agregar: 'propias' }, 2), 2); const x = f.turno; f.melds = [{ id: 1, due: 1 - x, c: ['6o', '6c', '6e'] }]; f.turno = x; f.sub = 'jugar'; dar(f, x, '6b 1o 2o 3o 9c 9e 9b 10e 11e 12b');
  ok(!R.aplicar(f, x, { t: 'agregar', m: 1, cartas: ['6b'] }).ok, 'solo propias: no se añade a combinaciones ajenas');
  const g = listo(mk({ agregar: 'no' }, 2), 2); g.melds = [{ id: 1, due: g.turno, c: ['6o', '6c', '6e'] }]; dar(g, g.turno, '6b 1o 2o 3o 9c 9e 9b 10e 11e 12b');
  ok(!R.aplicar(g, g.turno, { t: 'agregar', m: 1, cartas: ['6b'] }).ok, 'agregar desactivado');
}
{ // puntos, por carta y tablas
  const e = listo(mk({ puntos: true, porCarta: 5, ana: 10, meta: 20 }, 3), 3); const a = e.turno;
  dar(e, a, '7o 7c 7e 1b 2b 3b 4o 5o 6o 12b'); dar(e, (a + 1) % 3, '12o 11o 10o'); dar(e, (a + 2) % 3, '1c 2c');
  ['7o 7c 7e', '1b 2b 3b', '4o 5o 6o'].forEach((s) => R.aplicar(e, a, { t: 'bajar', cartas: s.split(' ') }));
  R.aplicar(e, a, { t: 'descartar', c: '12b' });
  ok(e.res.puntos === 30 + 3 && e.jug[a].pts === 0 && e.res.campeon === a, 'puntos por cartas restantes (10+10+10 + 1+2) y meta alcanzada reinicia el marcador');
  ok(e.res.gan.join() === [45, -25, -20].join(), 'bote 30 + 5 por carta restante (3 y 2) menos la ana: ' + e.res.gan.join());
  const suma = e.res.gan.reduce((s, x) => s + x, 0); ok(suma === 0, 'las ganancias suman cero');
  const t = listo(mk({ maxTurnos: 3 }, 2), 2); let k = 0; while (t.fase === 'mano' && k++ < 20) { const i = t.turno; R.aplicar(t, i, R.automatica(t, i)); }
  ok(t.fase === 'entre' && t.res.tipo === 'tablas', 'límite de turnos: tablas y se devuelve la ana');
}

console.log('-- vista privada');
{
  const e = listo(mk({ comodines: 1 }, 3), 3);
  for (let i = -1; i < 3; i++) {
    const v = R.vista(e, i), s = JSON.stringify(v);
    ok(!/"mazo":\[/.test(s) && !/"rng"/.test(s), 'sin mazo ni rng (asiento ' + i + ')');
    v.jug.forEach((p, k) => ok(k === i ? p.c.every((c) => c) : p.c.every((c) => c === null), `asiento ${i}: solo ve su mano (jugador ${k})`));
  }
}

console.log('-- simulaciones');
function sim(nombre, cfg, n, niveles, partidas, manos) {
  const t0 = Date.now(); let tot = 0, malo = null; const st = { conquian: 0, descarte: 0, tablas: 0 };
  for (let g = 0; g < partidas && !malo; g++) {
    const m = M.crearMesa(J, { id: 's', ahora: 0, host: { nombre: 'H', tok: 'h', compra: 1000 }, semilla: 'cq' + g, cfg: { nAsientos: n, fichasIni: 1000, compraMin: 100, compraMax: 3000, compraDef: 1000, rapido: true, pausaMs: 0, turnoSeg: 0, baraja: 'es40', entropia: false, op: cfg }, bots: niveles });
    reemplazarBot(m, 0, niveles[0]); let ahora = 0, tk = 0, ult = null;
    while (m.mano < manos && tk < 600000) {
      ahora += 50; tk++; M.tick(m, J, ahora); const e = m.estado;
      if (e.fase === 'mano') {
        const todas = [].concat(e.mazo, e.descarte, ...e.jug.filter((p) => p.activo).map((p) => p.c), ...e.melds.map((x) => x.c));
        const cuenta = {}; todas.forEach((c) => { cuenta[c] = (cuenta[c] || 0) + 1; });
        if (todas.length !== 40 + e.cfg.comodines || Object.keys(cuenta).some((c) => c !== '0J' && cuenta[c] > 1)) { malo = 'cartas ' + todas.length; break; }
      }
      const inv = J.fichas(e).reduce((a, b) => a + b, 0) + J.enBote(e) + J.casa(e);
      if (inv !== m.libro.entradas - m.libro.salidas) { malo = 'conservacion'; break; }
      if (e.fase === 'entre' && e.res && e.res !== ult) { st[e.res.tipo]++; ult = e.res; }
    }
    if (!malo && tk >= 600000) malo = 'bloqueo';
    tot += m.mano;
  }
  ok(!malo, `${nombre}: ${tot} partidas sin errores ni bloqueos ${malo || ''} ${JSON.stringify(st)} (${Date.now() - t0} ms)`);
}
sim('2 jugadores clasico', {}, 2, ['medio', 'experto'], 40, 25);
sim('3 jugadores mixtos', {}, 3, ['novato', 'medio', 'experto'], 30, 25);
sim('4 jugadores', {}, 4, ['medio', 'novato', 'experto', 'medio'], 20, 25);
sim('con comodines, sin puente', { comodines: 2, puente: false }, 3, ['medio', 'experto', 'novato'], 20, 25);
sim('as alto, sin ganar con descarte, solo propias', { asAlto: true, ganarDescarte: false, agregar: 'propias' }, 3, ['experto', 'experto', 'medio'], 20, 25);
sim('sin añadir, sin tomar descarte, ana y por carta', { agregar: 'no', tomarDescarte: false, ana: 10, porCarta: 3, meta: 100 }, 3, ['medio', 'medio', 'novato'], 20, 25);
console.log(fallos ? `${fallos} FALLOS de ${total}` : `OK ${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
