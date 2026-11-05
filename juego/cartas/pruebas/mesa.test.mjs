// Pruebas del marco de mesas: conservacion de fichas, entradas/salidas, reconexion, torneo, serializacion y privacidad de los mensajes.
import * as M from '../js/marco/mesa.js';
import * as Poker from '../js/juegos/poker/reglas.js';
import * as PokerBot from '../js/juegos/poker/bot.js';
import * as BJ from '../js/juegos/veintiuno/reglas.js';
import * as BJBot from '../js/juegos/veintiuno/bot.js';
import { reemplazarBot } from './utiles.mjs';

const P = Object.assign({}, Poker, { bot: (v, i, n, r) => PokerBot.bot(v, i, n, r, { muestras: 8 }), min: 2, max: 6 });
const V = Object.assign({}, BJ, { bot: BJBot.bot, min: 1, max: 7 });
let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.log('FALLO', msg); } };
const seccion = (t) => console.log('--', t);
const conserva = (m, J) => J.fichas(m.estado).reduce((a, b) => a + b, 0) + J.enBote(m.estado) + J.casa(m.estado) === m.libro.entradas - m.libro.salidas;

function correr(m, J, ms, paso, control) {
  let ahora = control.ahora || 0, malas = 0, ticks = 0;
  const fin = ahora + ms;
  while (ahora < fin && !m.fin) {
    ahora += paso; ticks++;
    M.tick(m, J, ahora);
    if (!conserva(m, J)) { malas++; if (malas < 3) console.log('  descuadre en mano', m.mano, 'fase', m.estado.fase); }
    if (control.cada) control.cada(m, J, ahora, ticks);
  }
  control.ahora = ahora; return { malas, ticks, ahora };
}
const nuevo = (J, cfg, ops = {}) => {
  const m = M.crearMesa(J, Object.assign({ id: 'm1', ahora: 0, host: { nombre: 'Ana', tok: 'tokhost', compra: 1000 }, cfg: Object.assign({ nAsientos: 5, fichasIni: 1000, compraMin: 200, compraMax: 3000, compraDef: 1000, pausaMs: 600, turnoSeg: 5, rapido: true, entropia: false, op: {} }, cfg) }, ops));
  reemplazarBot(m, 0, 'medio');
  return m;
};

seccion('poker 6 asientos con bots: conservacion durante miles de manos');
for (const [nom, cfgs] of [['nl 6', { nAsientos: 6, op: { sb: 5, bb: 10, ante: 1, rake: { pct: 2, cap: 10 }, escala: { tipo: 'manos', cada: 40 } } }], ['pot-limit 4', { nAsientos: 4, op: { sb: 5, bb: 10, limite: 'pl' } }], ['espanola 40, 5', { nAsientos: 5, baraja: 'es40', op: { sb: 5, bb: 10 } }]]) {
  const m = nuevo(P, Object.assign({ baraja: 'fr52' }, cfgs)); const c = {};
  const t0 = Date.now(); const r = correr(m, P, 24_000_000, 500, c);
  ok(r.malas === 0 && m.mano >= 2000, `${nom}: ${m.mano} manos, conservacion OK en ${r.ticks} ticks (${Date.now() - t0} ms)`);
  ok(m.historial.length > 0 && m.asientos.every((a) => a.compras >= 1000), nom + ': historial y compras registrados');
}

seccion('blackjack con bots');
{ const m = nuevo(V, { nAsientos: 5, baraja: 'fr52', op: { mazos: 6, minApuesta: 10, maxApuesta: 200 } }); const r = correr(m, V, 20_000_000, 500, {});
  ok(r.malas === 0 && m.mano > 1500, 'blackjack 5 jugadores: ' + m.mano + ' manos, conservacion OK'); }

seccion('torneo');
{ const m = nuevo(P, { nAsientos: 5, torneo: true, fichasIni: 500, compraDef: 100, baraja: 'fr52', op: { sb: 10, bb: 20, escala: { tipo: 'manos', cada: 5 } } });
  const r = correr(m, P, 6_000_000, 500, {});
  ok(m.fin && m.premio && m.premio.monto === 500 && r.malas === 0, 'torneo termina con un ganador que cobra el bote de entradas (' + m.mano + ' manos, ganador ' + (m.premio && m.premio.nombre) + ')');
  ok(P.fichas(m.estado).filter((x) => x > 0).length === 1, 'torneo: solo queda un jugador con fichas'); }

seccion('entradas, salidas, recompra, expulsion y reconexion');
{ const m = nuevo(P, { nAsientos: 4, baraja: 'fr52', op: { sb: 5, bb: 10 } }, { bots: ['medio', 'abierto', 'abierto'] }); const c = { ahora: 0 };
  // el asiento 2 es un bot; 2 y 3 abiertos
  const a = M.unir(m, P, { tok: 'cli1', nombre: 'Beto', compra: 800 }, 0);
  ok(a.asiento === 2 && m.asientos[2].tipo === 'humano', 'cliente ocupa el primer asiento abierto');
  ok(M.stacks(m, P)[2] === 800, 'compra aplicada (entre manos)');
  const e1 = M.unir(m, P, { tok: 'esp1', nombre: 'Mirón', espectador: true }, 0);
  ok(e1.asiento === -1 && e1.espectador, 'espectador sin asiento');
  correr(m, P, 60_000, 500, c);
  const antes = P.fichas(m.estado)[2];
  M.desconectar(m, 'cli1'); ok(!m.asientos[2].conectado, 'cliente desconectado');
  correr(m, P, 40_000, 500, c); ok(conserva(m, P), 'con el cliente caido la mesa sigue (se retira solo)');
  const r = M.unir(m, P, { tok: 'cli1', nombre: 'Beto' }, c.ahora);
  ok(r.reconexion && r.asiento === 2 && m.asientos[2].conectado, 'reconexion con token recupera el asiento');
  const v = M.vistaMesa(m, P, 2, c.ahora); ok(v.yo === 2, 'vista para el asiento');
  // recompra
  const rc = M.recomprar(m, P, 2, 5000, 9999, c.ahora); ok(!rc.ok, 'recompra mayor al maximo rechazada');
  const rc2 = M.recomprar(m, P, 2, 300, 9999, c.ahora); ok(rc2.ok, 'recompra valida');
  correr(m, P, 20_000, 500, c); ok(m.asientos[2].compras >= 1100, 'recompra aplicada entre manos ' + m.asientos[2].compras);
  M.silenciar(m, 2); ok(!M.chat(m, 2, 'hola', c.ahora + 10_000), 'silenciado no puede chatear'); M.silenciar(m, 2, false); ok(M.chat(m, 2, 'hola <b>', c.ahora + 20_000) && m.chat.at(-1).texto === 'hola b', 'chat sanea html');
  // expulsion: el asiento queda abierto, cobra y no vuelve
  const fich = P.fichas(m.estado)[2];
  M.expulsar(m, P, 2, c.ahora); correr(m, P, 30_000, 500, c);
  ok(m.asientos[2].tipo === 'abierto' && (m.cobros.cli1 > 0 || fich === 0), 'expulsado: asiento libre y fichas liquidadas');
  ok(M.unir(m, P, { tok: 'cli1', nombre: 'Beto' }, c.ahora).error, 'expulsado no puede volver');
  ok(conserva(m, P), 'conservacion tras salidas');
  // levantarse voluntariamente
  const b = M.unir(m, P, { tok: 'cli2', nombre: 'Caro', compra: 500 }, c.ahora); M.levantarse(m, P, b.asiento, c.ahora); correr(m, P, 40_000, 500, c);
  ok(m.asientos[b.asiento].tipo === 'abierto' && m.salidas.some((s) => s.tok === 'cli2'), 'levantarse devuelve las fichas'); }

seccion('serializacion a mitad de mano y continuidad');
for (const [nom, J, cfg] of [['poker', P, { nAsientos: 4, baraja: 'fr52', op: { sb: 5, bb: 10 } }], ['blackjack', V, { nAsientos: 4, baraja: 'fr52', op: { mazos: 6 } }]]) {
  const a = nuevo(J, cfg), c = { ahora: 0 }; correr(a, J, 37_000, 250, c);
  const texto = M.serializar(a); a.dl = {}; a.t = null; const b = M.restaurar(texto);
  ok(b.estado.fase === a.estado.fase, nom + ': restaurado en la misma fase (' + a.estado.fase + ')');
  b.asientos.forEach((s, i) => { if (s.tipo === 'humano') s.conectado = a.asientos[i].conectado; });
  const ca = { ahora: c.ahora }, cb = { ahora: c.ahora };
  correr(a, J, 80_000, 250, ca); correr(b, J, 80_000, 250, cb);
  if (M.serializar(a) !== M.serializar(b)) { const A = JSON.parse(M.serializar(a)), B = JSON.parse(M.serializar(b)); for (const k of Object.keys(A)) if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) console.log('  difiere', k, JSON.stringify(A[k]).slice(0, 200), '|', JSON.stringify(B[k]).slice(0, 200)); }
  ok(M.serializar(a) === M.serializar(b), nom + ': la mesa restaurada evoluciona exactamente igual que la original');
  ok(conserva(b, J), nom + ': conservacion tras restaurar'); }

seccion('privacidad de los mensajes a clientes');
for (const [nom, J, cfg] of [['poker', P, { nAsientos: 5, baraja: 'fr52', op: { sb: 5, bb: 10 } }], ['blackjack', V, { nAsientos: 4, baraja: 'fr52', op: { mazos: 2 } }]]) {
  const m = nuevo(J, cfg), c = { ahora: 0 }; let fuga = 0, mensajes = 0, maxBytes = 0;
  correr(m, J, 600_000, 250, Object.assign(c, { cada: (mm, JJ, ahora) => {
    for (let i = -1; i < mm.asientos.length; i++) {
      const s = JSON.stringify(M.vistaMesa(mm, JJ, i, ahora)); mensajes++; maxBytes = Math.max(maxBytes, s.length);
      if (/"mazo"|"zapato"|"rng"|rngBots|semilla/.test(s)) fuga++;
      if (JJ === P) mm.estado.jug.forEach((p, k) => { if (k !== i && !p.mostrar) p.c.forEach((cc) => { if (s.includes('"' + cc + '"') && !mm.estado.com.includes(cc)) fuga++; }); });
      else if (mm.estado.banca.oculta && mm.estado.banca.c.length > 1 && !(mm.estado.cfg.banca === i)) {
        const k = mm.estado.banca.c[1], cuenta = (txt) => txt.split('"' + k + '"').length - 1;
        const esperadas = cuenta(JSON.stringify(mm.estado.jug.map((p) => p.manos.map((h) => h.c)))) + (mm.estado.banca.c[0] === k ? 1 : 0);
        if (cuenta(JSON.stringify(M.vistaMesa(mm, JJ, i, ahora).j)) > esperadas) fuga++; }
    } } }));
  ok(fuga === 0, `${nom}: ${mensajes} vistas revisadas, ninguna contiene cartas ocultas ajenas (maximo ${maxBytes} bytes)`);
  ok(maxBytes < 12000, nom + ': los mensajes caben en el limite de 16 KB'); }
console.log(`mesa: ${total - fallos}/${total} ok`);
export { fallos, total };
if (process.argv[1] && process.argv[1].endsWith('mesa.test.mjs')) process.exit(fallos ? 1 : 0);
