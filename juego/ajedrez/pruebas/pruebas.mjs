// Pruebas en Node:  node juego/ajedrez/pruebas/pruebas.mjs [rapido]
// perft (reglas, incluye Chess960), motor, y verificación de todos los rompecabezas.
import { Posicion, FEN_INICIAL, fen960 } from '../js/reglas.js';
import { Motor, MATE } from '../js/motor.js';
import { PUZZLES } from '../js/datos/puzzles.js';
import { LECCIONES } from '../js/lecciones.js';
import { parsearPGN, juegoAUci } from '../js/pgn.js';
let fallos = 0;
const ok = (c, msg) => { if (!c) { fallos++; console.log('FALLO', msg); } else console.log('ok  ', msg); };
const rapido = process.argv.includes('rapido');

const PERFT = [
  ['inicial', FEN_INICIAL, [20, 400, 8902, 197281]],
  ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['posicion 3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['posicion 4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['posicion 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
  ['chess960 #1', 'bqnb1rkr/pp3ppp/3ppn2/2p5/5P2/P2P4/NPP1P1PP/BQ1BNRKR w HFhf - 2 9', [21, 528, 12189, 326672]],
  ['chess960 #3', 'b1q1rrkb/pppppppp/3nn3/8/P7/1PPP4/4PPPP/BQNNRKRB w GE - 1 9', [20, 479, 10471, 273318]],
  ['chess960 #518 = clásico', fen960(518), [20, 400, 8902, 197281]],
];
for (const [n, f, esp] of PERFT) {
  const p = Posicion.desdeFen(f);
  const r = esp.map((_, i) => p.perft(i + 1));
  ok(r.every((x, i) => x === esp[i]), `perft ${n} ${r.join(',')}`);
}
ok(new Set(Array.from({ length: 960 }, (_, i) => fen960(i))).size === 960, 'fen960 genera 960 posiciones distintas');
for (let i = 0; i < 960; i += 61) { const p = Posicion.desdeFen(fen960(i)); ok(p.tieneLegales(), `fen960(${i}) cargable`); if (!p.perft(2)) ok(false, 'perft2 ' + i); }

const motor = new Motor(18);
let r = motor.buscar(Posicion.desdeFen('6k1/5ppp/8/8/8/8/5PPP/R3K3 w - - 0 1'), { prof: 4, tiempo: 500 });
ok(r.uci === 'a1a8' && r.puntuacion > MATE - 10, 'motor encuentra el mate del pasillo');
r = motor.buscar(Posicion.desdeFen('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'), { prof: 3, tiempo: 500 });
ok(r.uci === 'h5f7', 'motor ve Dxf7#');

let n = 0, malos = 0;
const lista = rapido ? PUZZLES.filter((_, i) => i % 5 === 0) : PUZZLES;
for (const [fen, sol, tipo, rating, alt] of lista) {
  const p = Posicion.desdeFen(fen), s = sol.split(' ');
  let bien = true;
  for (const u of s) { const m = p.uciAMov(u); if (!m) { bien = false; break; } p.hacer(m); }
  if (bien && tipo !== 'x') bien = p.enJaque() && !p.tieneLegales() && s.length === 2 * +tipo[1] - 1;
  if (bien && tipo === 'x') { const L = motor.analizar(Posicion.desdeFen(fen), { prof: 8, tiempo: 400, multi: 1 }); bien = L[0].uci === s[0] || (alt || '').split(' ').includes(L[0].uci); }
  if (bien && tipo === 'm1') for (const a of (alt || '').split(' ').filter(Boolean)) { const q = Posicion.desdeFen(fen); q.hacer(q.uciAMov(a)); if (!(q.enJaque() && !q.tieneLegales())) bien = false; }
  n++; if (!bien) { malos++; console.log('  puzzle malo', fen, sol); }
  void rating;
}
ok(malos === 0, `${n} rompecabezas verificados (mates jugados hasta el jaque mate; tácticas confirmadas por el motor)`);
ok(PUZZLES.length >= 300, `hay ${PUZZLES.length} rompecabezas`);
for (const l of LECCIONES) { try { Posicion.desdeFen(l.fen); ok(true, 'leccion ' + l.id); } catch (e) { ok(false, 'leccion ' + l.id); } }
const g = parsearPGN('[Event "t"]\n\n1. e4 e5 2. Nf3 {nota} Nc6 3. Bb5 a6 1-0');
const j = juegoAUci(g[0]);
ok(!j.error && j.ucis.length === 6 && g[0].notas[3] === 'nota', 'PGN: lectura de jugadas y comentarios');
console.log(fallos ? `${fallos} fallos` : 'TODO CORRECTO');
process.exit(fallos ? 1 : 0);
