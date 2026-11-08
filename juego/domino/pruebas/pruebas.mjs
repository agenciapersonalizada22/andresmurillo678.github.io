// Pruebas en Node:  node juego/domino/pruebas/pruebas.mjs [rapido]
import * as R from '../js/reglas.js';
import { Mesa, relojVirtual, N_CHAT } from '../js/mesa.js';
import { decidir, nuevaMemoria, observar, memoriaDeLog } from '../js/bots.js';
import { disponer, L, W } from '../js/cadena.js';

let fallos = 0;
const ok = (c, msg) => { if (!c) { fallos++; console.log('FALLO', msg); } else console.log('ok  ', msg); };
const rapido = process.argv.includes('rapido');
let sem = 12345;
const az = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296; };

/* ---------- fichas y reparto ---------- */
for (const [max, n, mano] of [[6, 28, 7], [9, 55, 10], [12, 91, 12]]) {
  ok(R.tabla(max).length === n, `doble ${max}: ${n} fichas`);
  for (const modo of ['parejas', 'todos', 'duelo']) {
    const est = R.nuevaPartida({ variante: max, modo, n: 3 }, 4, 77);
    const todas = [...est.manos.flat(), ...est.pozo];
    ok(new Set(todas).size === n && todas.length === n, `doble ${max} ${modo}: reparto sin repetidas (${est.n} jugadores)`);
    ok(est.manos.every((m) => m.length === mano), `doble ${max} ${modo}: ${mano} fichas por jugador`);
  }
}

/* ---------- utilidades ---------- */
const idDe = (max, a, b) => R.tabla(max).findIndex((p) => p[0] === Math.min(a, b) && p[1] === Math.max(a, b));
function armar(manos, cfg = {}, opts = {}) {
  const c = { variante: 6, modo: manos.length === 4 ? 'parejas' : manos.length === 2 ? 'duelo' : 'todos', n: manos.length, ...cfg };
  const est = R.nuevaPartida(c, manos.length, opts.semilla || 9);
  est.manos = manos.map((m) => m.map(([a, b]) => idDe(6, a, b)).sort((x, y) => x - y));
  const usadas = new Set(est.manos.flat());
  est.pozo = (opts.pozo || []).map(([a, b]) => idDe(6, a, b)); est.pozo.forEach((i) => usadas.add(i));
  est.cadena = []; est.centro = null; est.turno = opts.turno || 0; est.sale = est.turno; est.obligada = null; est.pases = 0; est.fin = null; est.ev = []; est.log = [];
  return est;
}
const jug = (est, j, a, b, lado) => R.aplicar(est, j, { t: 'jugar', id: idDe(est.max, a, b), lado: lado || 'd' });

/* ---------- jugadas, extremos y orientacion ---------- */
{
  const est = armar([[[6, 6], [6, 3], [2, 2]], [[3, 5], [1, 1]], [[4, 0]], [[0, 0]]]);
  ok(R.legales(est, 0).length === 3 && R.legales(est, 0).every((m) => m.lado === 'd'), 'primera ficha: cualquiera, un solo lado');
  ok(jug(est, 0, 6, 6).ok, 'sale con el doble 6');
  ok(!jug(est, 1, 3, 5).ok && jug(est, 1, 3, 5).err, 'no es su turno: se rechaza');
  est.turno = 1;
  ok(R.aplicar(est, 1, { t: 'pasar' }).ok, 'quien no tiene ficha pasa sin problema');
}
{
  const est = armar([[[6, 6], [6, 3], [2, 2]], [[3, 5], [1, 1]], [[4, 0]], [[0, 0]]]);
  jug(est, 0, 6, 6);
  ok(R.extremos(est).izq === 6 && R.extremos(est).der === 6, 'extremos tras el primer doble');
  est.turno = 0; jug(est, 0, 6, 3, 'd');
  const e = R.extremos(est);
  ok(e.izq === 6 && e.der === 3, 'extremos 6 y 3 tras colocar 6-3 a la derecha');
  ok(est.cadena[1].a === 6 && est.cadena[1].b === 3, 'orientacion de la ficha: a coincide con el extremo');
  est.turno = 1;
  ok(R.legales(est, 1).some((m) => m.id === idDe(6, 3, 5) && m.lado === 'd') && !R.legales(est, 1).some((m) => m.id === idDe(6, 3, 5) && m.lado === 'i'), '3-5 solo encaja en el 3');
  ok(jug(est, 1, 3, 5, 'd').ok && R.extremos(est).der === 5, 'colocar 3-5 deja el 5');
  const est2 = armar([[[6, 6], [6, 3], [2, 2]], [[6, 2], [1, 1]], [[4, 0]], [[0, 0]]]);
  jug(est2, 0, 6, 6); est2.turno = 1;
  ok(jug(est2, 1, 6, 2, 'i').ok && R.extremos(est2).izq === 2, 'colocar a la izquierda: el extremo izquierdo pasa a 2');
  ok(est2.cadena[0].a === 2 && est2.cadena[0].b === 6, 'orientacion izquierda correcta');
}

/* ---------- pase y robo ---------- */
{
  const est = armar([[[6, 6], [2, 3]], [[1, 1], [4, 5]], [[0, 0]], [[3, 3]]]);
  jug(est, 0, 6, 6); // turno 1 sin 6
  ok(R.legales(est, 1).length === 0 && R.vista(est, 1).puedePasar, 'sin ficha: puede pasar');
  ok(R.aplicar(est, 1, { t: 'pasar' }).ok && est.turno === 2 && est.pases === 1, 'pasar avanza el turno y cuenta pases');
  const ev = est.ev[est.ev.length - 1];
  ok(ev.t === 'pase' && ev.izq === 6 && ev.der === 6, 'el pase publica los extremos (los bots deducen que no tiene 6)');
  const m = armar([[[6, 6], [2, 3]], [[1, 1], [4, 5]], [[6, 0]], [[3, 3]]]);
  jug(m, 0, 6, 6); m.turno = 2;
  ok(!R.aplicar(m, 2, { t: 'pasar' }).ok, 'no se puede pasar con jugada');
}
{
  const est = armar([[[6, 6], [2, 3]], [[1, 1], [4, 5]]], { modo: 'duelo' }, { pozo: [[6, 0], [0, 1], [0, 2], [0, 3], [0, 4]] });
  jug(est, 0, 6, 6);
  ok(R.vista(est, 1).puedeRobar && !R.vista(est, 1).puedePasar, 'duelo: sin jugada debe robar (pozo grande)');
  ok(!R.aplicar(est, 1, { t: 'pasar' }).ok, 'duelo: no puede pasar teniendo pozo');
  ok(R.aplicar(est, 1, { t: 'robar' }).ok && est.turno === 1 && est.manos[1].length === 3, 'robar mantiene el turno');
  // pozo: 5 -> 4 tras robar; sigue > 2
  ok(R.aplicar(est, 1, { t: 'robar' }).ok, 'puede seguir robando');
  while (est.pozo.length > R.POZO_MIN && R.legales(est, 1).length === 0) R.aplicar(est, 1, { t: 'robar' });
  ok(est.pozo.length >= R.POZO_MIN, 'las ultimas 2 fichas del pozo no se roban');
  const sinRobo = armar([[[6, 6], [2, 3]], [[1, 1], [4, 5]], [[0, 0]], [[3, 3]]], {}, { pozo: [[0, 1], [0, 2], [0, 3]] });
  jug(sinRobo, 0, 6, 6);
  ok(!R.aplicar(sinRobo, 1, { t: 'robar' }).ok, 'fuera de duelo no se roba');
}

/* ---------- cierre, tranque, capicua, puntos ---------- */
{
  // domino: parejas, gana la pareja 0/2; puntos = suma de todas las fichas restantes
  const est = armar([[[6, 6]], [[1, 1], [2, 4]], [[0, 3]], [[5, 5]]], { meta: 100, capicua: 25 });
  jug(est, 0, 6, 6);
  ok(est.fin && est.fin.tipo === 'domino' && est.fin.unidad === 0, 'se queda sin fichas: domino para su pareja');
  ok(est.fin.pts === 2 + 6 + 3 + 10 && est.puntos[0] === 21 && est.puntos[1] === 0, 'puntos: suma de todas las fichas restantes (21)');
  const e2 = armar([[[6, 6]], [[1, 1], [2, 4]], [[0, 3]], [[5, 5]]], { puntuacion: 'rivales' });
  jug(e2, 0, 6, 6);
  ok(e2.fin.pts === 2 + 6 + 10, 'puntuacion "solo rivales": no cuenta la ficha del companero');
}
{
  // capicua: ficha 4-2 cierra y cabe en ambos extremos (4 y 2)
  const est = armar([[[4, 2]], [[1, 1]], [[0, 0]], [[3, 3]]], { capicua: 25 });
  est.cadena = [{ id: idDe(6, 4, 1), a: 4, b: 1 }, { id: idDe(6, 1, 2), a: 1, b: 2 }]; est.centro = est.cadena[0].id; est.turno = 0;
  jug(est, 0, 4, 2, 'd');
  ok(est.fin.capicua && est.fin.bonus === 25, 'capicua: la ficha cabia en ambos extremos (+25)');
  ok(est.fin.pts === 2 + 0 + 6 + 25, 'capicua suma el bono a los puntos de la mano');
  const e3 = armar([[[4, 2]], [[1, 1]], [[0, 0]], [[3, 3]]], { capicua: 0 });
  e3.cadena = [{ id: idDe(6, 4, 1), a: 4, b: 1 }, { id: idDe(6, 1, 2), a: 1, b: 2 }]; e3.centro = e3.cadena[0].id; e3.turno = 0;
  jug(e3, 0, 4, 2, 'd');
  ok(e3.fin.bonus === 0, 'capicua desactivada: sin bono');
  const e4 = armar([[[4, 2]], [[1, 1]], [[0, 0]], [[3, 3]]], { capicua: 25 });
  e4.cadena = [{ id: idDe(6, 4, 1), a: 4, b: 1 }, { id: idDe(6, 1, 5), a: 1, b: 5 }]; e4.centro = e4.cadena[0].id; e4.turno = 0;
  jug(e4, 0, 4, 2, 'i');
  ok(e4.fin.tipo === 'domino' && !e4.fin.capicua, 'sin capicua si solo encajaba en un extremo');
}
{
  // tranque: 4 pases seguidos; gana la pareja de menor suma
  const est = armar([[[0, 1], [3, 4]], [[1, 2], [5, 6]], [[0, 0], [2, 2]], [[4, 4], [3, 3]]], { puntuacion: 'todas' });
  est.cadena = [{ id: idDe(6, 5, 5), a: 5, b: 5 }]; est.centro = est.cadena[0].id; est.turno = 0;
  for (let k = 0; k < 4; k++) { est.manos[est.turno] = est.manos[est.turno].filter((id) => !R.par(6, id).includes(5)); R.aplicar(est, est.turno, { t: 'pasar' }); }
  ok(est.fin && est.fin.tipo === 'tranque', 'tranque: todos pasan seguidos');
  // sumas: pareja0 = (1+7)+(0+4)=12 ; pareja1 = (3+11)+(14... ) mayor
  ok(est.fin.sumas[0] < est.fin.sumas[1] && est.fin.unidad === 0, 'gana la pareja con menor suma');
  ok(est.fin.pts === est.fin.sumas[0] + est.fin.sumas[1] && est.puntos[0] === est.fin.pts, 'el tranque se lleva todos los puntos');
  const emp = armar([[[0, 1]], [[1, 0]], [[0, 0], [1, 1]], [[0, 1]]]);
  emp.manos = [[idDe(6, 0, 1)], [idDe(6, 0, 1)], [idDe(6, 0, 0)], [idDe(6, 0, 0)]];
  emp.cadena = [{ id: idDe(6, 5, 5), a: 5, b: 5 }]; emp.centro = emp.cadena[0].id; emp.turno = 0;
  for (let k = 0; k < 4; k++) R.aplicar(emp, emp.turno, { t: 'pasar' });
  ok(emp.fin.tipo === 'empate' && emp.puntos[0] === 0 && emp.puntos[1] === 0, 'tranque empatado: nadie anota');
  ok(emp.sale !== 0, 'tras un empate sale el siguiente jugador');
}
{
  // todos contra todos (3 jugadores) y meta
  const est = armar([[[6, 6]], [[5, 5], [4, 4]], [[3, 3]]], { meta: 20 });
  jug(est, 0, 6, 6);
  ok(est.fin.tipo === 'domino' && est.puntos[0] === 24 && est.puntos.length === 3, 'todos contra todos: puntos individuales');
  ok(est.fin.partida && est.fin.campeon === 0, 'alcanzar la meta termina la partida');
  ok(!R.siguienteMano(est), 'tras la partida no hay mano siguiente');
}
{
  // quien sale: primera mano el doble mas alto; despues el ganador
  const est = R.nuevaPartida({ variante: 6, modo: 'parejas' }, 4, 4242);
  const dob = est.manos.map((m, s) => [s, m.filter((id) => R.esDoble(6, id)).map((id) => R.par(6, id)[0])]);
  const mejor = dob.reduce((a, b) => (Math.max(-1, ...b[1]) > Math.max(-1, ...a[1]) ? b : a));
  ok(est.sale === mejor[0] && R.par(6, est.obligada)[0] === Math.max(...mejor[1]), 'sale quien tiene el doble mas alto');
  ok(R.legales(est, est.sale).length === 1, 'la salida de la primera mano esta forzada');
  const e2 = armar([[[6, 6]], [[1, 1]], [[0, 0]], [[3, 3]]], { meta: 500 }, { turno: 2 });
  e2.manos = [[idDe(6, 5, 5), idDe(6, 4, 4)], [idDe(6, 1, 1)], [idDe(6, 0, 0)], [idDe(6, 3, 3)]];
  e2.turno = 2; jug(e2, 2, 0, 0); // gana el asiento 2
  ok(e2.fin && e2.sale === 2, 'sale el ganador de la mano');
  ok(R.siguienteMano(e2) && e2.turno === 2 && e2.cadena.length === 0 && e2.obligada == null, 'siguiente mano: sale el ganador con salida libre');
  ok(R.sumaTotal(e2) === 28, 'reparto de la nueva mano completo');
}

/* ---------- vista filtrada (privacidad) ---------- */
{
  const est = R.nuevaPartida({ variante: 9, modo: 'todos', n: 4 }, 4, 31);
  const v = R.vista(est, 1);
  const txt = JSON.stringify(v);
  const ajenas = est.manos.filter((_, s) => s !== 1).flat().filter((id) => !est.manos[1].includes(id));
  ok(v.mano.length === 10 && v.cuentas.length === 4 && v.cuentas[0] === 10, 'vista: tu mano y el conteo de las demas');
  ok(!('manos' in v) && !('pozo' in v && Array.isArray(v.pozo)) && v.fin === null, 'vista: sin manos ajenas ni pozo');
  ok(ajenas.every((id) => !new RegExp('\\[[^\\]]*\\b' + id + '\\b[^\\]]*\\]').test(JSON.stringify(v.mano)) ), 'vista: ninguna ficha ajena en tu mano');
  void txt;
}

/* ---------- memoria y deduccion ---------- */
{
  const mem = nuevaMemoria();
  observar(mem, { t: 'reparto', ronda: 1 });
  observar(mem, { t: 'jugar', j: 0, id: 5, izq: 3, der: 3 });
  observar(mem, { t: 'pase', j: 2, izq: 3, der: 4 });
  observar(mem, { t: 'robo', j: 1, izq: 0, der: 6 });
  ok(mem.jugadas.has(5) && mem.sin[2].has(3) && mem.sin[2].has(4) && !mem.sin[2].has(5), 'memoria: jugadas y numeros que le faltan a quien paso');
  ok(mem.sin[1].has(0) && mem.sin[1].has(6), 'robar publica que no tenia los extremos');
}
{
  // el Experto muestrea manos coherentes con los pases (sin numeros prohibidos) y con el conteo exacto
  const est = R.nuevaPartida({ variante: 6, modo: 'parejas' }, 4, 99);
  const mem = nuevaMemoria();
  mem.sin[(est.sale + 1) % 4] = new Set([2]);
  const v = R.vista(est, est.sale);
  // llamar a decidir con pocas muestras: debe devolver jugada legal
  let c = decidir(v, mem, 2, az, { muestras: 6, presupuesto: 50 });
  ok(c.t === 'jugar' && v.jugables.some((m) => m.id === c.id && m.lado === c.lado), 'Experto devuelve una jugada legal');
}

/* ---------- disposicion de la cadena: sin solapes ---------- */
function rect(f) {
  const c = Math.cos(f.ang), s = Math.sin(f.ang), hx = L / 2, hy = W / 2;
  return [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([x, y]) => [f.x + x * c - y * s, f.y + x * s + y * c]);
}
function separados(a, b) {
  for (const poly of [a, b]) for (let i = 0; i < 4; i++) {
    const p = poly[i], q = poly[(i + 1) % 4], nx = -(q[1] - p[1]), ny = q[0] - p[0], n = Math.hypot(nx, ny);
    let mn1 = 1e9, mx1 = -1e9, mn2 = 1e9, mx2 = -1e9;
    for (const [x, y] of a) { const d = (x * nx + y * ny) / n; mn1 = Math.min(mn1, d); mx1 = Math.max(mx1, d); }
    for (const [x, y] of b) { const d = (x * nx + y * ny) / n; mn2 = Math.min(mn2, d); mx2 = Math.max(mx2, d); }
    if (mx1 <= mn2 + 0.02 || mx2 <= mn1 + 0.02) return true;
  }
  return false;
}
{
  let malas = 0, total = 0, conexion = true;
  for (const max of [6, 9, 12]) for (const lim of [5, 6, 8, 9]) for (let rep = 0; rep < (rapido ? 8 : 40); rep++) {
    const est = R.nuevaPartida({ variante: max, modo: 'duelo', robo: true }, 2, 1000 + rep * 7 + max);
    est.obligada = null;
    // jugar al azar hasta que se cierre, probando la disposicion cada vez
    for (let g = 0; g < 400 && !est.fin; g++) {
      const lg = R.legales(est, est.turno);
      let r;
      if (lg.length) { const m = lg[Math.floor(az() * lg.length)]; r = R.aplicar(est, est.turno, { t: 'jugar', id: m.id, lado: m.lado }); }
      else r = R.aplicar(est, est.turno, R.puedeRobar(est, est.turno) ? { t: 'robar' } : { t: 'pasar' });
      if (!r.ok) break;
      if (g % 3 === 0 || est.fin) {
        const d = disponer(est.cadena, est.centro, lim), f = d.fichas;
        total++;
        let mala = false;
        const rs = f.map(rect);
        for (let i = 0; i < f.length && !mala; i++) for (let j = i + 1; j < f.length; j++) if (!separados(rs[i], rs[j])) { mala = true; break; }
        if (mala) malas++;
        // cada ficha toca a la anterior (distancia entre centros razonable)
        for (let i = 1; i < f.length; i++) { const dx = f[i].x - f[i - 1].x, dy = f[i].y - f[i - 1].y; if (Math.hypot(dx, dy) > 2.3 && f[i].brazo === f[i - 1].brazo) conexion = false; }
      }
    }
  }
  ok(malas === 0, `cadena: ninguna ficha se solapa (${total} disposiciones, doble 6/9/12, filas de 5 a 9)`);
  ok(conexion, 'cadena: fichas consecutivas del mismo brazo siempre contiguas');
}

/* ---------- partidas completas con la Mesa y bots ---------- */
function asientos(modo, nivel) {
  const n = modo === 'parejas' ? 4 : modo === 'duelo' ? 2 : 3;
  return Array.from({ length: n }, (_, i) => ({ nombre: 'B' + i, color: '#fff', tipo: 'bot', nivel: Array.isArray(nivel) ? nivel[i] : nivel }));
}
function jugarPartida(cfg, nivel, semilla, maxMs = 40 * 60 * 1000) {
  const reloj = relojVirtual(), as = asientos(cfg.modo, nivel);
  const mesa = new Mesa({ cfg, asientos: as, semilla, reloj, id: 'p' + semilla });
  let manos = 0, error = '';
  mesa.alFin = (m, e) => { manos++; };
  mesa.iniciar();
  let t = 0;
  while (!mesa.est.fin || !mesa.est.fin.partida) {
    reloj.avanzar(1000); t += 1000;
    const e = mesa.est;
    if (R.sumaTotal(e) !== R.tabla(e.max).length) { error = 'fichas ' + R.sumaTotal(e); break; }
    if (t > maxMs) { error = 'no termina'; break; }
  }
  return { mesa, manos, error, fin: mesa.est.fin };
}
{
  const modos = ['parejas', 'todos', 'duelo'], vars = rapido ? [6] : [6, 9, 12];
  let n = 0, bad = '';
  for (const modo of modos) for (const variante of vars) for (const nivel of [0, 1]) {
    const r = jugarPartida({ modo, variante, meta: 60, n: 3 }, nivel, 100 + n++);
    if (r.error || !r.fin || !r.fin.partida) bad += ` ${modo}/${variante}/n${nivel}:${r.error || 'sin fin'}`;
  }
  ok(!bad, 'partidas completas Novato/Medio en todos los modos y variantes' + bad);
}
{
  // Experto: partidas completas (mas lentas) y tiempo por jugada
  const t0 = Date.now();
  const r = jugarPartida({ modo: 'parejas', variante: rapido ? 6 : 9, meta: 50 }, 2, 777);
  const dt = Date.now() - t0;
  ok(!r.error && r.fin.partida, `partida con 4 Expertos termina (${r.manos} manos, ${dt} ms)`);
}
{
  // fuerza relativa: Experto > Medio > Novato (por parejas, asientos alternados para compensar la salida)
  const N = rapido ? 6 : 24;
  function duelo(nivA, nivB, cfg) {
    let a = 0;
    for (let i = 0; i < N; i++) {
      const niv = i % 2 ? [nivB, nivA, nivB, nivA] : [nivA, nivB, nivA, nivB];
      const r = jugarPartida({ modo: 'parejas', meta: 60, ...cfg }, niv, 5000 + i * 13);
      const ganaPar = r.fin.campeon; // unidad 0 = asientos 0,2
      if ((ganaPar === 0) === (i % 2 === 0)) a++;
    }
    return a / N;
  }
  const tMedio = duelo(1, 0, { variante: 6 });
  console.log(`      Medio vs Novato: ${(tMedio * 100).toFixed(0)}% de victorias del Medio (${N} partidas)`);
  ok(tMedio >= 0.5, 'el Medio no pierde contra el Novato (parejas, doble 6)');
  if (!rapido) {
    const tExp = duelo(2, 0, { variante: 6 });
    console.log(`      Experto vs Novato: ${(tExp * 100).toFixed(0)}% de victorias del Experto`);
    ok(tExp >= 0.58, 'el Experto gana claramente al Novato');
  }
}

/* ---------- guardado y restauracion a mitad de partida ---------- */
{
  const reloj = relojVirtual(), as = asientos('parejas', 1);
  const mesa = new Mesa({ cfg: R.limpiarReglas({ modo: 'parejas', meta: 60 }), asientos: as, semilla: 5, reloj, id: 'g1' });
  mesa.iniciar(); reloj.avanzar(25000);
  const txt = JSON.stringify(mesa.guardar());
  const antes = { cadena: mesa.est.cadena.length, turno: mesa.est.turno, puntos: mesa.est.puntos.join() };
  const reloj2 = relojVirtual();
  const m2 = Mesa.restaurar(JSON.parse(txt), { reloj: reloj2 });
  ok(m2 && m2.est.cadena.length === antes.cadena && m2.est.turno === antes.turno && m2.est.puntos.join() === antes.puntos, 'restaurar conserva cadena, turno y puntos');
  const mem = memoriaDeLog(m2.est);
  ok(mem.jugadas.size === m2.est.log.filter((e) => e.t === 'jugar').length, 'la memoria de bots se reconstruye del log');
  m2.pausar(false); reloj2.avanzar(2 * 60 * 1000);
  ok(m2.est.fin ? true : m2.est.cadena.length >= antes.cadena, 'la partida restaurada sigue jugandose');
  let c = 0; while (!(m2.est.fin && m2.est.fin.partida) && c++ < 400) reloj2.avanzar(1000);
  ok(m2.est.fin && m2.est.fin.partida, 'la partida restaurada llega al final');
}
{
  // los humanos no reciben fichas ajenas en los paquetes
  const reloj = relojVirtual(), paquetes = [];
  const as = [{ nombre: 'H', color: '#fff', tipo: 'humano', token: 'x' }, ...asientos('duelo', 1).slice(1)];
  const mesa = new Mesa({ cfg: R.limpiarReglas({ modo: 'duelo' }), asientos: as, semilla: 3, reloj, salida: (i, p) => paquetes.push([i, p]) });
  mesa.iniciar(); reloj.avanzar(20000);
  const ajena = mesa.est.manos[1];
  const fuga = paquetes.some(([i, p]) => !p.v.fin && p.ev.some((e) => e.t === 'robo' && e.j === 1 && e.id !== undefined));
  ok(!fuga, 'los robos del rival no revelan la ficha');
  ok(paquetes.every(([i, p]) => !p.v.fin || p.v.fin.manos) && ajena.length >= 0, 'paquetes bien formados');
  // chat y comandos invalidos
  ok(!mesa.comando(0, { t: 'jugar', id: -4, lado: 'x' }).ok && !mesa.comando(9, { t: 'pasar' }).ok, 'comandos invalidos se rechazan');
  ok(mesa.comando(0, { t: 'chat', k: 2 }).ok && !mesa.comando(0, { t: 'chat', k: N_CHAT }).ok, 'chat acotado');
}

console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo en orden');
process.exit(fallos ? 1 : 0);
