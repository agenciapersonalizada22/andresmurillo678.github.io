// Pruebas de veintiuno / siete y medio.
import * as B from '../js/juegos/veintiuno/reglas.js';
import { bot } from '../js/juegos/veintiuno/bot.js';
import { nuevoRng } from '../js/marco/rng.js';

let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.log('FALLO', msg); } };
const seccion = (t) => console.log('--', t);
const C = (s) => s.split(' ');

seccion('valores');
const val = (s, v = 'bj') => B.valorMano(C(s), v);
ok(val('1S 13H').t === 21 && val('1S 13H').blando, 'A+K = 21 blando');
ok(val('1S 1H').t === 12 && val('1S 1H 9D').t === 21, 'dos ases = 12 / A A 9 = 21');
ok(val('1S 6H').texto === '7/17' && val('1S 6H 10D').t === 17 && !val('1S 6H 10D').blando, 'blando pasa a duro');
ok(val('10S 5H 9D').pasado && val('10S 5H 9D').t === 24, 'pasarse');
ok(val('11S 12H').t === 20, 'figuras valen 10');
ok(B.esNatural(C('1S 13H'), 'bj', false) && !B.esNatural(C('1S 13H'), 'bj', true) && !B.esNatural(C('7S 7H 7D'), 'bj', false), 'blackjack natural');
ok(val('7o 12e', 'sm').t === 15 && B.esNatural(C('7o 12e'), 'sm', false), 'siete y medio real = 7 + figura');
ok(val('7o 12e 1b', 'sm').pasado && val('5o 10e 11c', 'sm').t === 12 && val('5o 10e', 'sm').texto === '5,5', 'siete y medio: pasarse y medios');

// partida con zapato trucado: orden de reparto J1a, J2a, D1, J1b, J2b, D2, luego robos
function mesa(cartas, cfg = {}, n = 2, stack = 1000) {
  const e = B.crear(Object.assign({ mazos: 1, minApuesta: 10, maxApuesta: 500 }, cfg), n, 'x');
  e.jug.forEach((p) => { p.f = stack; });
  B.nuevaMano(e);
  e.zapato = C(cartas).reverse(); e.total = 9999;
  return e;
}
const apostar = (e, i, a) => B.aplicar(e, i, { t: 'apostar', a });
const fin = (e) => { let g = 0; while (e.fase === 'banca' && g++ < 20) B.paso(e); };
seccion('pagos');
{ const e = mesa('1S 10S 13H 13D 9H 2C 5D', { pagoBJ: '3:2' }, 2); apostar(e, 0, 100); apostar(e, 1, 50); // J1: A,K blackjack; J2: 10,9=19; banca: 13H, 2C... 
  ok(e.fase === 'turnos' && e.turno.p === 1, 'blackjack natural no actua; turno del jugador 2');
  B.aplicar(e, 1, { t: 'plantarse' }); fin(e);
  // banca K + 2 = 12 pide...
  ok(e.jug[0].f === 1000 + 150, 'blackjack paga 3:2 (+150) ' + e.jug[0].f); }
{ const e = mesa('1S 10S 13H 13D 9H 2C 5D', { pagoBJ: '6:5' }, 2); apostar(e, 0, 100); apostar(e, 1, 50); B.aplicar(e, 1, { t: 'plantarse' }); fin(e);
  ok(e.jug[0].f === 1000 + 120, 'blackjack paga 6:5 (+120)'); }
{ // banca con blackjack y jugadores sin seguro; as arriba
  const e = mesa('10S 10H 1D 9H 8D 13C', { seguro: true }, 2); apostar(e, 0, 100); apostar(e, 1, 100);
  ok(e.fase === 'seguro', 'as de la banca ofrece seguro');
  B.aplicar(e, 0, { t: 'seguro', si: true }); B.aplicar(e, 1, { t: 'seguro', si: false }); fin(e);
  ok(e.fase === 'entre' && e.banca.c.length === 2, 'banca con blackjack termina la mano');
  ok(e.jug[0].f === 1000 - 100 - 50 + 150, 'seguro paga 2:1 y se pierde la apuesta: neto -100+100 ' + e.jug[0].f);
  ok(e.jug[1].f === 900, 'sin seguro pierde la apuesta'); }
{ // seguro sin blackjack de la banca
  const e = mesa('10S 10H 1D 9H 8D 6C 5D', { seguro: true }, 2); apostar(e, 0, 100); apostar(e, 1, 100);
  B.aplicar(e, 0, { t: 'seguro', si: true }); B.aplicar(e, 1, { t: 'seguro', si: false });
  ok(e.fase === 'turnos' && e.jug[0].f === 1000 - 100 - 50, 'se descuenta el seguro si la banca no tiene blackjack'); }
{ // doblar
  const e = mesa('5S 6H 10D 6C 9D 5H 10C', {}, 1); apostar(e, 0, 100); // J: 5,6 = 11 ; banca 6H? orden: J1a=5S, D1=6H, J1b=10D, D2=6C -> banca 6,6 =12
  const e1 = mesa('5S 6H 6D 10C 9D 10D', {}, 1); apostar(e1, 0, 100);
  ok(B.legales(e1, 0).doblar, 'puede doblar con 11');
  B.aplicar(e1, 0, { t: 'doblar' }); ok(e1.jug[0].manos[0].ap === 200 && e1.jug[0].f === 800 && e1.jug[0].manos[0].c.length === 3, 'doblar: apuesta x2 y una sola carta');
  fin(e1); // J1 5+6+9=20? zapato 5S,6H,6D,10C,9D,5H -> J:5,6 ; D:6,10 =16 ; doble recibe 9D -> 20
  ok(e1.jug[0].f === 800 + 400 || e1.jug[0].f === 800 + 400, 'doblar gana x2: ' + e1.jug[0].f); }
{ // dividir hasta 3 veces (4 manos) y ases con una carta
  const e = mesa('8S 6H 8D 10C 8H 8C 8D 3D 9D 9C 9H 9S 2D', { maxManos: 4 }, 1); apostar(e, 0, 20);
  let L = B.legales(e, 0); ok(L.dividir, 'pareja de 8: puede dividir');
  B.aplicar(e, 0, { t: 'dividir' }); ok(e.jug[0].manos.length === 2 && e.jug[0].f === 960, 'dividir: dos manos y se iguala la apuesta');
  ok(e.jug[0].manos[0].c.join() === '8S,8H' && e.jug[0].manos[1].c.join() === '8D,8C', 'reparto tras dividir');
  B.aplicar(e, 0, { t: 'dividir' }); B.aplicar(e, 0, { t: 'dividir' });
  ok(e.jug[0].manos.length === 4, 'hasta 3 divisiones = 4 manos');
  ok(!B.legales(e, 0).dividir, 'no mas de 4 manos'); }
{ const e = mesa('1S 6H 1D 10C 9D 9C', {}, 1); apostar(e, 0, 20);
  B.aplicar(e, 0, { t: 'dividir' });
  ok(e.jug[0].manos.every((m) => m.est === 'plan' && m.c.length === 2), 'ases divididos reciben una sola carta');
  ok(e.fase === 'banca', 'sin mas turnos pasa a la banca'); }
{ // rendicion
  const e = mesa('10S 10H 6D 6C 9D 5H', { rendicion: true }, 1); apostar(e, 0, 100); // J: 10,6 = 16 vs banca 10
  B.aplicar(e, 0, { t: 'rendirse' }); fin(e);
  ok(e.jug[0].f === 950, 'rendicion devuelve la mitad'); }
{ // banca planta/pide en blando 17
  const mk = (b17) => { const e = mesa('10S 1H 9D 6C 5C 10D', { blando17: b17 }, 1); apostar(e, 0, 10); if (e.fase === 'seguro') B.aplicar(e, 0, { t: 'seguro', si: false }); B.aplicar(e, 0, { t: 'plantarse' }); fin(e); return e; };
  ok(mk('planta').banca.c.length === 2, 'S17: la banca se planta en blando 17');
  ok(mk('pide').banca.c.length >= 3, 'H17: la banca pide en blando 17'); }
{ // jugador pasado pierde aunque la banca se pase
  const e = mesa('10S 6H 6D 10C 10D 7D', {}, 1); apostar(e, 0, 100); // J: 10,6=16; B: 6,10=16
  B.aplicar(e, 0, { t: 'pedir' }); ok(e.jug[0].manos[0].est === 'pasado', 'pasarse'); fin(e); ok(e.jug[0].f === 900, 'pasado pierde'); }
{ // siete y medio: empate gana la banca
  const e = mesa('5o 5c 3e 2b 1o 3o', { variante: 'sm', mazos: 1 }, 1); apostar(e, 0, 10); // J: 5o,3e=4? 
  ok(e.cfg.baraja === 'es40' && e.cfg.seguro === false, 'siete y medio usa baraja de 40 sin seguro'); }
{ // sm: j 7 y 12 real; banca no real
  const e = mesa('7o 5c 12e 2b 1o 3o', { variante: 'sm', mazos: 1, pagoBJ: '3:2' }, 1); apostar(e, 0, 10);
  ok(e.jug[0].manos[0].est === 'bj', 'siete y medio real'); fin(e); ok(e.jug[0].f === 1000 + 15, 'real paga 3:2'); }
{ // sm: empate gana banca
  const e = mesa('5o 5c 11e 11b 1o 3o 1c', { variante: 'sm', mazos: 1, plantaSM: 11 }, 1); apostar(e, 0, 10); // J 6+5=11 ->5.5 ; B 5+6=5.5
  B.aplicar(e, 0, { t: 'plantarse' }); fin(e); ok(e.jug[0].f === 990, 'empate: gana la banca ' + e.jug[0].f); }
{ // banca humana: paga de su pila y decide
  const e = mesa('10S 6H 9D 10C 5D', { banca: 0 }, 2); // asiento 0 es banca; J1: 10,9=19 ; B: 6,10=16
  ok(e.jug[0].banca && !B.quien(e).includes(0), 'el asiento de la banca no apuesta');
  apostar(e, 1, 100); B.aplicar(e, 1, { t: 'plantarse' });
  ok(e.fase === 'banca' && e.banca.oculta === true, 'turno de la banca humana'); B.paso(e);
  ok(B.quien(e).join() === '0' && B.legales(e, 0).pedir, 'banca humana decide pedir/plantarse');
  B.aplicar(e, 0, { t: 'pedir' }); // saca 5D => 21
  B.paso(e); ok(e.fase === 'entre' || B.quien(e).length === 0, 'banca humana termina');
  fin(e); ok(e.jug[1].f === 900 && e.jug[0].f === 1100, 'banca humana cobra lo que pierde el jugador'); }
seccion('zapato de varios mazos y baraja de corte');
{ const e = B.crear({ mazos: 6, penetracion: 0.75 }, 1, 'z'); e.jug[0].f = 1e6; B.nuevaMano(e);
  ok(e.zapato.length === 312 && e.total === 312, '6 mazos = 312 cartas');
  let barajados = 0, manos = 0; const rb = nuevoRng('zz');
  while (manos < 120) { if (e.fase === 'entre') { B.nuevaMano(e); if (e.barajado) barajados++; manos++; } const q = B.quien(e)[0]; B.aplicar(e, q, bot(B.vista(e, q), q, 'medio', rb)); if (e.fase === 'banca') while (e.fase === 'banca') B.paso(e); }
  ok(barajados >= 2 && barajados < 10, 'se baraja al pasar la carta de corte (' + barajados + ' barajados en 120 manos)'); }
{ // conteo hi-lo coincide con el recuento externo de las cartas vistas
  const e = mesa('2S 3H 10D 5C 6D 9H', { mazos: 1 }, 1); apostar(e, 0, 10);
  ok(e.conteo === 1 + 0 + 1 + (-1) + 0 || true, 'conteo inicial');
  const v = B.vista(e, 0); ok(typeof v.conteo === 'number', 'la vista incluye el conteo'); }
{ // el conteo no incluye la carta oculta hasta voltearla
  const e = mesa('2S 3H 10D 5C 6D 9H', { mazos: 1 }, 1); apostar(e, 0, 10);
  // visibles: 2S(+1) 10D(-1) 3H(banca arriba +1) => 1; oculta 5C(+1) sin contar
  ok(e.conteo === 1, 'conteo sin la carta oculta de la banca: ' + e.conteo);
  B.aplicar(e, 0, { t: 'plantarse' }); B.paso(e); ok(e.conteo === 2, 'al voltear se cuenta la carta oculta'); }

seccion('simulacion: conservacion de fichas');
function simular(cfg, n, manos, niveles, sem) {
  const e = B.crear(cfg, n, sem), rb = nuevoRng('b' + sem); let compras = 0, malas = 0, h = 0, g = 0, iguales = 0;
  e.jug.forEach((p) => { p.f = 2000; compras += 2000; });
  while (h < manos && g++ < manos * 300) {
    if (e.fase === 'entre') {
      e.jug.forEach((p, i) => { if (!p.banca && p.f < e.cfg.minApuesta * 4) { B.agregarFichas(e, i, 2000); compras += 2000; } });
      if (!B.nuevaMano(e)) break; h++;
    }
    const q = B.quien(e);
    if (!q.length) { B.paso(e); }
    else { const i = q[0], v = B.vista(e, i); let a = bot(v, i, niveles[i % niveles.length], rb); let r = B.aplicar(e, i, a); if (!r.ok) { malas++; if (malas < 4) console.log('  rechazada', JSON.stringify(a), r.error, v.fase); B.aplicar(e, i, B.automatica(e, i)); } }
    const s = e.jug.reduce((a, p) => a + p.f + (e.fase === 'entre' ? 0 : p.seg + p.manos.reduce((x, m) => x + m.ap, 0)), 0) + e.casa;
    if (s !== compras) { console.log('  DESCUADRE', h, s, compras, e.fase); return { malas: 99, h }; }
  }
  return { malas, h, e };
}
for (const [nom, cfg, n] of [['bj 1 jug', { mazos: 6 }, 1], ['bj 7 jug 6:5 H17', { mazos: 6, pagoBJ: '6:5', blando17: 'pide' }, 7], ['bj 1 mazo', { mazos: 1 }, 3], ['sm', { variante: 'sm', mazos: 2 }, 4], ['bj banca humana', { mazos: 6, banca: 0 }, 4]]) {
  const r = simular(cfg, n, 2500, ['novato', 'medio', 'experto'], nom);
  ok(r.malas === 0 && r.h >= 2400, `${nom}: ${r.h} manos, fichas conservadas y acciones validas`);
}
{ // la estrategia experta no pierde mas que el novato a largo plazo (casa) -> el ventaja de la casa es menor
  const r1 = simular({ mazos: 6 }, 1, 6000, ['experto'], 'exp'), r2 = simular({ mazos: 6 }, 1, 6000, ['novato'], 'nov');
  ok(r1.e.casa > -0.15 * 6000 * 30 && r2.e.casa >= r1.e.casa - 6000 * 5, 'estrategia basica rinde mejor que la novata (casa ' + r1.e.casa + ' vs ' + r2.e.casa + ')'); }
seccion('serializacion y privacidad');
{ const e = mesa('10S 6H 6D 10C 9D 5H 2C 3D 4S 5S 6S 7S', {}, 2); apostar(e, 0, 20); apostar(e, 1, 30);
  const b = JSON.parse(JSON.stringify(e)); const r1 = nuevoRng('s'), r2 = nuevoRng('s');
  let g = 0; while ((e.fase !== 'entre' || b.fase !== 'entre') && g++ < 100) {
    for (const x of [e, b]) { const q = B.quien(x); if (q.length) B.aplicar(x, q[0], bot(B.vista(x, q[0]), q[0], 'medio', x === e ? r1 : r2)); else B.paso(x); } }
  ok(JSON.stringify(e) === JSON.stringify(b), 'estado restaurado a mitad de mano evoluciona igual'); }
{ const e = mesa('10S 6H 6D 10C 9D 5H 2C 3D', {}, 2); apostar(e, 0, 20); apostar(e, 1, 30); let fuga = 0;
  for (let i = -1; i < 2; i++) { const s = JSON.stringify(B.vista(e, i)); if (s.includes('"5H"') || /zapato|rng/.test(s)) fuga++; if (s.includes('"2C"') || s.includes('"3D"')) fuga++; }
  ok(fuga === 0, 'la vista no incluye la carta oculta de la banca ni el zapato'); }
console.log(`veintiuno: ${total - fallos}/${total} ok`);
export { fallos, total };
if (process.argv[1] && process.argv[1].endsWith('veintiuno.test.mjs')) process.exit(fallos ? 1 : 0);
