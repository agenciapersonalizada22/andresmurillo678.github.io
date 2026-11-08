// Pruebas en Node:  node juego/bolos/pruebas/pruebas.mjs
import * as S from '../js/puntuacion.js';
import * as F from '../js/fisica.js';
import { decidir } from '../js/bots.js';
import { DESAFIOS, rondasDiarias, LIGAS, BOLAS, PISTAS, LOGROS, semilla, rng } from '../js/catalogo.js';

let fallos = 0;
const ok = (c, msg) => { if (!c) { fallos++; console.log('FALLO', msg); } else console.log('ok  ', msg); };
const total = (t) => S.calcular(t).total;

/* ---------- puntuacion oficial ---------- */
ok(total(Array(12).fill(10)) === 300, 'partida perfecta = 300');
ok(S.contarStrikes(Array(12).fill(10)) === 12, '12 strikes en la partida perfecta');
ok(total(Array(20).fill(0)) === 0, 'partida de canales = 0');
ok(total(Array(21).fill(5)) === 150, 'todo spares de 5 = 150');
ok(total([9, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9]) === 190, 'spares de 9/1 = 190');
ok(total(Array.from({ length: 20 }, (_, i) => (i % 2 ? 0 : 9))) === 90, '9 y fallo (9-) = 90');
ok(total([10, 7, 3, 9, 0, 10, 0, 8, 8, 2, 0, 6, 10, 10, 10, 8, 1]) === 167, 'ejemplo clasico = 167');
ok(total([10, 9, 1, 5, 5, 7, 2, 10, 10, 10, 9, 0, 8, 2, 9, 1, 10]) === 187, 'ejemplo con pavo = 187');
ok(total([3, 4]) === 7 && S.calcular([3, 4]).frames[0].acum === 7, 'frame abierto simple');
{
  const t = S.calcular([10]);
  ok(t.frames[0].acum === null && t.frames[0].marcas[0] === 'X', 'strike sin bonos: acum pendiente');
  ok(S.parcial([10, 10]) === 30 && S.parcial([10, 10, 10]) === 60, 'parcial con bonos pendientes');
}
{
  const t = S.calcular([...Array(18).fill(0), 10, 10, 10]);
  ok(t.total === 30 && t.completo && t.frames[9].marcas.join('') === 'XXX', '10.o frame con tres strikes');
}
{
  const t = S.calcular([...Array(18).fill(0), 5, 5, 7]);
  ok(t.total === 17 && t.frames[9].marcas.join('') === '5/7', '10.o frame spare + bola extra');
}
{
  const t = S.calcular([...Array(18).fill(0), 10, 3, 7]);
  ok(t.total === 20 && t.frames[9].marcas.join('') === 'X3/', '10.o frame: strike y luego spare');
}
ok(S.calcular([...Array(18).fill(0), 3, 4]).completo, '10.o frame abierto termina con dos bolas');
ok(!S.calcular([...Array(18).fill(0), 10, 3]).completo, '10.o con strike necesita tercera bola');

/* ---------- siguiente tiro / racks ---------- */
ok(S.siguiente([]).rack && S.siguiente([]).frame === 1, 'inicio: rack nuevo en frame 1');
ok(!S.siguiente([4]).rack && S.siguiente([4]).tiro === 2, 'tras 4 pinos continua el frame');
ok(S.siguiente([10]).frame === 2 && S.siguiente([10]).rack, 'tras strike, frame 2 con rack nuevo');
ok(S.siguiente([4, 5]).frame === 2, 'tras frame abierto, frame 2');
{
  const base = Array(18).fill(0);
  ok(S.siguiente([...base, 10]).rack && S.siguiente([...base, 10]).tiro === 2, '10.o: tras strike, rack nuevo');
  ok(!S.siguiente([...base, 10, 4]).rack && S.siguiente([...base, 10, 4]).tiro === 3, '10.o: strike+4 continua con 6 pinos');
  ok(S.siguiente([...base, 10, 10]).rack, '10.o: dos strikes -> rack nuevo');
  ok(S.siguiente([...base, 6, 4]).rack && !S.siguiente([...base, 6, 4]).terminado, '10.o: spare -> rack nuevo');
  ok(S.siguiente([...base, 6, 3]).terminado, '10.o: abierto -> terminado');
  ok(S.siguiente([...base, 10, 10, 10]).terminado, '10.o: 3 bolas -> terminado');
}
ok(S.rachaStrikes([10, 10, 10, 5, 4, 10, 10]) === 3, 'racha maxima de strikes');
ok(S.contarSpares([5, 5, 3, 4, 10, 9, 1]) === 2, 'conteo de spares');

/* ---------- turnos con varios jugadores ---------- */
{
  const t = [[10], [3]];
  ok(S.siguienteTurno(t, 0) === 1, 'tras strike pasa al siguiente jugador');
  ok(S.siguienteTurno(t, 1) === 1, 'tras 1.a bola el mismo jugador sigue');
  const u = [[3, 4], [10]];
  ok(S.siguienteTurno(u, 0) === 1, 'tras 2.a bola pasa al siguiente');
  const f = [[...Array(18).fill(0), 10, 10, 10], [...Array(18).fill(0), 1, 2]];
  ok(S.siguienteTurno(f, 0) === -1 || S.siguienteTurno(f, 0) === 1, 'jugador terminado no repite');
  ok(S.siguienteTurno([[...Array(18).fill(0), 3, 4], [...Array(18).fill(0), 3, 4]], 1) === -1, 'sin jugadores pendientes = fin de partida');
}

/* ---------- fisica ---------- */
const bola = { m: 6.2, hook: 0.65 }, L = F.layoutCompleto();
const tira = (x, ang, v, w, layout) => { const s = F.nuevaSim(layout || L, { x, ang, v, w }, bola); F.correr(s); return s; };
{
  const a = tira(0.04, 0, 8.5, 0), b = tira(0.04, 0, 8.5, 0);
  ok(F.mascara(a) === F.mascara(b) && JSON.stringify(a.pinos) === JSON.stringify(b.pinos), 'simulacion determinista (mismo resultado exacto)');
  ok(F.contar(F.mascara(tira(0.04, 0, 8.5, 0))) >= 8, 'bola al bolsillo derriba casi todos');
  ok(F.contar(F.mascara(tira(0.5, 0.01, 8.5, 0))) === 0 && tira(0.5, 0.01, 8.5, 0).bola.est !== 'rodando', 'bola fuera de la pista cae al canal sin derribar');
  const lenta = tira(0, 0, 5.5, 0), rapida = tira(0, 0, 11, 0);
  ok(lenta.fin && rapida.fin && lenta.t > rapida.t, 'la bola lenta tarda mas que la rapida');
  const curva = tira(-0.3, 0, 8.5, 1);
  ok(curva.bola.x > -0.3, 'el efecto positivo curva la bola hacia la derecha');
  const curvaIzq = tira(0.3, 0, 8.5, -1);
  ok(curvaIzq.bola.x < 0.3, 'el efecto negativo curva hacia la izquierda');
  const muchas = Array.from({ length: 60 }, (_, k) => F.contar(F.mascara(tira((k % 12 - 6) * 0.06, 0, 8 + (k % 5) * 0.5, 0))));
  ok(muchas.every((n) => n >= 0 && n <= 10), 'conteos validos (0..10)');
  ok(muchas.some((n) => n === 10) && muchas.some((n) => n < 5), 'hay strikes y malos tiros segun la punteria');
  const s2 = F.nuevaSim([{ i: 6, tipo: 'normal' }, { i: 9, tipo: 'normal' }], { x: 0.42, ang: -0.0227, v: 9, w: 0 }, bola);
  F.correr(s2);
  ok(F.contar(F.mascara(s2)) <= 2, 'con dos pinos solo se pueden derribar dos');
  const sup = F.supervivientes(tira(0.38, 0, 8.5, 0));
  ok(sup.every((p) => typeof p.x === 'number' && p.i >= 0 && p.i < 10), 'supervivientes con posicion');
  const pes = tira(0, 0, 8, 0, F.layoutCompleto(['pesado'])), nor = tira(0, 0, 8, 0);
  ok(pes.pinos[0].m > nor.pinos[0].m, 'el pino pesado tiene mas masa');
  const exp = F.nuevaSim(F.layoutCompleto([, , , , 'explosivo']), { x: 0.04, ang: 0, v: 9, w: 0 }, bola); F.correr(exp);
  ok(exp.eventos.some((e) => e.tipo === 'explosion') || F.contar(F.mascara(exp)) >= 8, 'pino explosivo se activa o el rack cae');
  ok(F.trayectoria({ x: 0, ang: 0, v: 9, w: 0 }, bola).length > 10, 'trayectoria de guia con puntos');
}

/* ---------- bots ---------- */
{
  const juego = (hab) => {
    const t = []; let layout = F.layoutCompleto();
    for (let g = 0; g < 30 && !S.siguiente(t).terminado; g++) {
      if (S.siguiente(t).rack) layout = F.layoutCompleto();
      const s = F.nuevaSim(layout, decidir(layout, hab, 'clasica'), bola); F.correr(s);
      t.push(F.contar(F.mascara(s))); layout = F.supervivientes(s);
    }
    return total(t);
  };
  const media = (h, n) => { let s = 0; for (let k = 0; k < n; k++) s += juego(h); return s / n; };
  const bajo = media(0.2, 8), alto = media(0.95, 8);
  console.log('     bot habilidad .2 ->', Math.round(bajo), ' habilidad .95 ->', Math.round(alto));
  ok(alto > bajo + 25, 'el bot experto supera claramente al novato');
  ok(bajo >= 60 && alto <= 300, 'puntajes de bots en rango plausible');
}

/* ---------- catalogo ---------- */
ok(new Set(LOGROS.map((l) => l.id)).size === LOGROS.length && LOGROS.every((l) => /^[a-z0-9_]{1,40}$/.test(l.id)), 'ids de logros unicos y validos');
ok(BOLAS[0].precio === 0 && PISTAS[0].precio === 0, 'bola y pista iniciales gratis');
ok(DESAFIOS.every((d) => d.pinos.length > 0 && d.pinos.every((p) => p.i >= 0 && p.i < 10)), 'desafios con pinos validos');
ok(LIGAS.length === 5 && LIGAS.every((l) => l.rivales.length === 3), '5 ligas con 3 rivales');
{
  const a = rondasDiarias('2026-01-01'), b = rondasDiarias('2026-01-01'), c = rondasDiarias('2026-01-02');
  ok(JSON.stringify(a) === JSON.stringify(b), 'reto diario igual para la misma fecha');
  ok(JSON.stringify(a) !== JSON.stringify(c) && a.length === 5, 'reto diario distinto otro dia (5 rondas)');
  ok(semilla('x') === semilla('x') && rng(3)() === rng(3)(), 'semilla y rng deterministas');
}
console.log(fallos ? '\n' + fallos + ' FALLOS' : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
