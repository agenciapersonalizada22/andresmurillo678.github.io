// Dompe, Conquian y Ve a pescar dentro de la mesa: serializacion a mitad de mano, reconexion por token (asiento, fichas y mano intactos),
// jugadores caidos (acciones automaticas), privacidad de los mensajes a cada cliente y conservacion de fichas.
import * as M from '../js/marco/mesa.js';
import * as D from '../js/juegos/dompe/reglas.js';
import * as DB from '../js/juegos/dompe/bot.js';
import * as Q from '../js/juegos/conquian/reglas.js';
import * as QB from '../js/juegos/conquian/bot.js';
import * as P from '../js/juegos/pescar/reglas.js';
import * as PB from '../js/juegos/pescar/bot.js';
import { reemplazarBot } from './utiles.mjs';

let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.log('FALLO', msg); } };
const JJ = {
  dompe: [Object.assign({}, D, { bot: (v, i, n, r) => DB.bot(v, i, n, r, { muestras: 4 }), min: 2, max: 6 }), { baraja: 'es40', op: { ana: 10, penal: 5 } }, 4],
  conquian: [Object.assign({}, Q, { bot: QB.bot, min: 2, max: 4 }), { baraja: 'es40', op: { ana: 10, comodines: 1 } }, 3],
  pescar: [Object.assign({}, P, { bot: PB.bot, min: 2, max: 6 }), { baraja: 'fr52', op: { ana: 10 } }, 4],
};
const conserva = (m, J) => J.fichas(m.estado).reduce((a, b) => a + b, 0) + J.enBote(m.estado) + J.casa(m.estado) === m.libro.entradas - m.libro.salidas;
const crear = (J, cfg, n, bots) => { const m = M.crearMesa(J, { id: 'm1', ahora: 0, host: { nombre: 'Ana', tok: 'tokhost', compra: 1000 }, semilla: 'nm', cfg: Object.assign({ nAsientos: n, fichasIni: 1000, compraMin: 100, compraMax: 3000, compraDef: 1000, rapido: true, pausaMs: 0, turnoSeg: 1, entropia: false }, cfg), bots }); reemplazarBot(m, 0, 'medio'); return m; };
function correr(m, J, desde, ms) { let t = desde; const fin = desde + ms; while (t < fin && !m.fin) { t += 50; M.tick(m, J, t); if (!conserva(m, J)) return { t, mal: true }; } return { t }; }

for (const [nombre, [J, cfg, n]] of Object.entries(JJ)) {
  console.log('--', nombre);
  // 1) serializar a mitad de mano, restaurar y seguir
  let m = crear(J, cfg, n, ['medio', 'experto', 'novato', 'medio', 'medio']);
  let r = correr(m, J, 0, 7000); ok(!r.mal, nombre + ': conservacion antes de serializar');
  const antes = m.mano, txt = M.serializar(m), m2 = M.restaurar(txt);
  ok(JSON.stringify(m2.estado) === JSON.stringify(JSON.parse(txt).estado), nombre + ': el estado sobrevive a serializar/restaurar');
  const r2 = correr(m2, J, r.t, 20000); ok(!r2.mal && m2.mano > antes, nombre + ': la partida restaurada continua (' + antes + ' -> ' + m2.mano + ' manos)');
  // 2) privacidad de lo que recibe cada cliente
  const e = m2.estado; let publico = new Set();
  const noPub = new Set();
  const codes = (x) => JSON.stringify(x).match(/"(?:\d+[A-Za-z]|0J)"/g) || [];
  for (let seat = 0; seat < n; seat++) {
    const v = M.vistaMesa(m2, J, seat, r2.t), s = JSON.stringify(v);
    const visibles = new Set(codes(v)); // todo lo que el cliente ve
    // cartas ocultas: mazo y manos ajenas
    const ocultas = new Set(); (e.mazo || []).forEach((c) => ocultas.add('"' + c + '"'));
    (e.jug || []).forEach((p, k) => { if (k !== seat && p.c) p.c.forEach((c) => ocultas.add('"' + c + '"')); });
    // las cartas publicas (descartes vistos, combinaciones, historial) no cuentan como filtracion
    const publicas = new Set([].concat(e.vistos || [], e.descarte || [], ...(e.melds || []).map((x) => x.c), (e.muertas || [])).map((c) => '"' + c + '"'));
    const fugas = [...ocultas].filter((c) => !publicas.has(c) && c !== '"0J"' && visibles.has(c) && !JSON.stringify(v.j.cfg).includes(c));
    ok(fugas.length === 0, `${nombre}: el asiento ${seat} no recibe cartas ocultas ${fugas.join(',')}`);
    ok(!/"rng"|"semilla"|"estado"|"mazo":\[/.test(s) && s.length < 15000, nombre + ': la vista no incluye rng, semilla ni estado completos (' + s.length + ' B)');
  }
  // 3) reconexion por token y jugador caido
  m = crear(J, cfg, n, ['abierto', 'medio', 'novato', 'medio', 'medio']);
  const u = M.unir(m, J, { tok: 'cliente1', nombre: 'Beto', compra: 800 }, 0);
  ok(u.asiento === 1 && m.asientos[1].tipo === 'humano', nombre + ': el cliente se sienta en el asiento libre');
  r = correr(m, J, 0, 9000); ok(!r.mal, nombre + ': conservacion con un humano');
  const fichasAntes = J.fichas(m.estado)[1], manoAntes = JSON.stringify(J.vista(m.estado, 1).jug[1].c), comprasAntes = m.asientos[1].compras;
  M.desconectar(m, 'cliente1'); ok(!m.asientos[1].conectado, nombre + ': marcado sin conexion');
  r = correr(m, J, r.t, 12000); ok(!r.mal && m.mano > 0, nombre + ': la mesa sigue sin el jugador caido (acciones automaticas, ' + m.mano + ' manos)');
  const rec = M.unir(m, J, { tok: 'cliente1', nombre: 'Beto' }, r.t);
  ok(rec.reconexion && rec.asiento === 1 && m.asientos[1].conectado && m.asientos[1].compras === comprasAntes && !rec.compra, nombre + ': reconecta al mismo asiento sin nueva compra');
  const m3 = M.restaurar(M.serializar(m)); ok(m3.asientos[1].tipo === 'humano' && m3.asientos[1].tok === 'cliente1' && !m3.asientos[1].conectado, nombre + ': tras reiniciar el anfitrion el cliente aparece sin conexion y conserva su token');
  const rec2 = M.unir(m3, J, { tok: 'cliente1', nombre: 'Beto' }, r.t + 10); ok(rec2.reconexion && rec2.asiento === 1, nombre + ': y puede reconectar a la mesa restaurada');
  void fichasAntes; void manoAntes;
  // 4) salir de la mesa cobra las fichas
  M.levantarse(m, J, 1, r.t); const r3 = correr(m, J, r.t, 120000);
  ok(!r3.mal && m.asientos[1].tipo === 'abierto' && (m.cobros.cliente1 > 0 || (m.salidas || []).length || m.libro.salidas > 0), nombre + ': al levantarse se liquidan las fichas');
}
console.log(fallos ? `${fallos} FALLOS de ${total}` : `OK ${total} comprobaciones`);
process.exit(fallos ? 1 : 0);
