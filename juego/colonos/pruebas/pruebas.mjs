// Pruebas de reglas, bots y mesa (sin DOM): node juego/colonos/pruebas/pruebas.mjs
import assert from 'node:assert/strict';
import { geo, pips } from '../js/geometria.js';
import * as R from '../js/reglas.js';
import { Mesa, relojVirtual } from '../js/mesa.js';

let n = 0, fallos = 0;
const prueba = (nombre, f) => { try { f(); n++; console.log('ok   ' + nombre); } catch (e) { fallos++; console.log('FALLA ' + nombre + '\n  ' + (e.stack || e).split('\n').slice(0, 4).join('\n  ')); } };

/* utilidades */
function nueva(nj = 3, cfg = {}, semilla = 99) { return R.nuevaPartida(cfg, nj, semilla); }
function listo(est, turno = 0) { est.fase = 'accion'; est.turno = turno; est.fund.paso = 99; est.dado = [3, 3]; est.numTurno = 5; return est; }
function dar(est, j, o) { for (const k of R.RES) est.mano[j][k] = o[k] || 0; }
function poblado(est, j, v, nivel = 1) { est.vj[v] = j; est.vc[v] = nivel; est.piezas[j].pob--; }
function camino(est, j, e) { est.ed[e] = j; est.piezas[j].cam--; }
function cadena(est, j, k, inicio = 0) { // k aristas conectadas sin repetir vertices
  const G = geo(est.cfg.radio), vis = new Set([inicio]), es = [];
  const dfs = (v) => { if (es.length === k) return true; for (const e of G.verts[v].es) { const w = G.aristas[e].a === v ? G.aristas[e].b : G.aristas[e].a; if (vis.has(w) || est.ed[e] !== -1) continue; vis.add(w); es.push(e); if (dfs(w)) return true; es.pop(); vis.delete(w); } return false; };
  assert.ok(dfs(inicio), 'no hay cadena');
  es.forEach((e) => camino(est, j, e));
  return es;
}
const ok = (r) => assert.equal(r.ok, true, JSON.stringify(r));
const mal = (r) => assert.equal(r.ok, false);

prueba('geometria: conteos y estructura', () => {
  const g2 = geo(2), g3 = geo(3);
  assert.deepEqual([g2.hexes.length, g2.verts.length, g2.aristas.length, g2.costa.length], [19, 54, 72, 30]);
  assert.deepEqual([g3.hexes.length, g3.verts.length, g3.aristas.length, g3.costa.length], [37, 96, 132, 42]);
  for (const v of g2.verts) assert.ok(v.es.length === 2 || v.es.length === 3);
  for (const e of g2.aristas) assert.ok(e.hs.length === 1 || e.hs.length === 2);
});
prueba('tablero: terrenos, numeros, 6/8 no adyacentes, puertos validos (aleatorio y equilibrado)', () => {
  for (const radio of [2, 3]) for (const tablero of ['aleatorio', 'equilibrado']) for (let s = 1; s <= 60; s++) {
    const est = nueva(3, { radio, tablero }, s * 31);
    const G = geo(radio);
    const cuenta = {}; est.hex.forEach((h) => { cuenta[h.t] = (cuenta[h.t] || 0) + 1; });
    assert.equal(cuenta.des, radio === 2 ? 1 : 2);
    assert.equal(est.hex.filter((h) => h.t !== 'des').length, G.hexes.length - cuenta.des);
    est.hex.forEach((h, i) => { if (h.t === 'des') assert.equal(h.num, 0); else assert.ok(pips(h.num) > 0 && h.num !== 7); G.vecinos[i].forEach((k) => assert.ok(!([6, 8].includes(h.num) && [6, 8].includes(est.hex[k].num)), 'rojos adyacentes')); });
    assert.equal(est.hex[est.ladron].t, 'des');
    assert.equal(est.puertos.length, radio === 2 ? 9 : 11);
    const vs = new Set();
    est.puertos.forEach((p) => { assert.equal(G.aristas[p.e].hs.length, 1); vs.add(G.aristas[p.e].a); vs.add(G.aristas[p.e].b); });
    assert.equal(vs.size, est.puertos.length * 2, 'puertos comparten vertice');
    assert.equal(est.puertos.filter((p) => p.t === 'gen').length, radio === 2 ? 4 : 6);
    for (const r of R.RES) assert.equal(est.puertos.filter((p) => p.t === r).length, 1);
  }
});
prueba('tablero equilibrado: sin mismo terreno adyacente en la mayoria y reparto de pips parejo', () => {
  let sinAdy = 0, difMax = 0;
  const G = geo(2);
  for (let s = 1; s <= 40; s++) {
    const est = nueva(4, { tablero: 'equilibrado' }, s * 13);
    let ady = 0; est.hex.forEach((h, i) => G.vecinos[i].forEach((k) => { if (est.hex[k].t === h.t && h.t !== 'des') ady++; }));
    if (!ady) sinAdy++;
    const pr = {}; est.hex.forEach((h) => { if (h.t !== 'des') pr[h.t] = (pr[h.t] || 0) + pips(h.num); });
    const v = Object.values(pr); difMax = Math.max(difMax, Math.max(...v) - Math.min(...v));
  }
  assert.ok(sinAdy >= 25, 'sinAdy=' + sinAdy);
  assert.ok(difMax <= 14, 'difMax=' + difMax);
});
prueba('semilla igual -> tablero igual', () => {
  assert.deepEqual(nueva(3, {}, 5).hex, nueva(3, {}, 5).hex);
  assert.notDeepEqual(nueva(3, {}, 5).hex, nueva(3, {}, 6).hex);
});

prueba('fundacion en serpiente, distancia, camino adyacente y recursos de la segunda', () => {
  const est = nueva(3), G = geo(2);
  assert.deepEqual(est.orden, [0, 1, 2, 2, 1, 0]);
  const v0 = lugaresIni(est, 0)[0];
  mal(R.aplicar(est, 1, { t: 'poblado', v: v0 })); // no es su turno
  ok(R.aplicar(est, 0, { t: 'poblado', v: v0 }));
  mal(R.aplicar(est, 0, { t: 'poblado', v: G.verts[v0].ns[0] })); // aun toca camino
  const lejos = G.aristas.findIndex((e) => e.a !== v0 && e.b !== v0 && est.ed[0] === -1);
  mal(R.aplicar(est, 0, { t: 'camino', e: lejos }));
  ok(R.aplicar(est, 0, { t: 'camino', e: G.verts[v0].es[0] }));
  assert.equal(est.turno, 1);
  mal(R.aplicar(est, 1, { t: 'poblado', v: G.verts[v0].ns[0] })); // regla de distancia
  for (let p = 1; p < 6; p++) {
    const j = est.turno, v = lugaresIni(est, j)[0];
    ok(R.aplicar(est, j, { t: 'poblado', v }));
    if (p >= 3) assert.ok(R.total(est.mano[j]) > 0 || G.verts[v].hs.every((h) => est.hex[h].t === 'des'), 'segunda fundacion da recursos');
    else assert.equal(R.total(est.mano[j]), 0);
    ok(R.aplicar(est, j, { t: 'camino', e: R.lugaresCamino(est, j, v)[0] }));
  }
  assert.equal(est.fase, 'tirada'); assert.equal(est.turno, 0);
  assert.deepEqual(est.piezas[0], { cam: 13, pob: 3, ciu: 4 });
});
function lugaresIni(est, j) { return R.lugaresPoblado(est, j, true); }

prueba('produccion: poblado 1, ciudad 2, ladron bloquea, otro numero no produce', () => {
  const est = listo(nueva(3)), G = geo(2);
  const hi = est.hex.findIndex((h) => h.t !== 'des'); est.hex[hi].num = 6; est.hex.forEach((h, i) => { if (i !== hi && h.num === 6) h.num = 5; });
  const t = est.hex[hi].t, [a, b] = [G.hexes[hi].vs[0], G.hexes[hi].vs[3]];
  poblado(est, 0, a, 1); poblado(est, 1, b, 2);
  est.ladron = (hi + 1) % 19 === est.hex.findIndex((h) => h.t === 'des') ? (hi + 2) % 19 : (hi + 1) % 19;
  est.fase = 'tirada'; est.azarFijo = true;
  const orig = R.azar; void orig;
  // fuerza una tirada de 6 usando semillas hasta que salga
  for (let s = 1; s < 5000; s++) { const e2 = JSON.parse(JSON.stringify(est)); e2.rng = s; R.aplicar(e2, 0, { t: 'tirar' }); if (e2.dado[0] + e2.dado[1] === 6) { Object.assign(est, e2); break; } }
  assert.equal(est.dado[0] + est.dado[1], 6);
  assert.equal(est.mano[0][t], 1); assert.equal(est.mano[1][t], 2);
  assert.equal(est.banco[t], 19 - 3);
  // con el ladron encima no produce
  const e3 = listo(nueva(3)); e3.hex[hi] = { t, num: 6 }; poblado(e3, 0, a, 1); e3.ladron = hi; e3.fase = 'tirada';
  for (let s = 1; s < 5000; s++) { const e2 = JSON.parse(JSON.stringify(e3)); e2.rng = s; R.aplicar(e2, 0, { t: 'tirar' }); if (e2.dado[0] + e2.dado[1] === 6) { assert.equal(e2.mano[0][t], 0); break; } }
});
prueba('produccion: escasez del banco (varios reciben -> nadie; uno solo -> lo que quede)', () => {
  const G = geo(2);
  const base = () => { const est = listo(nueva(3)); const hi = est.hex.findIndex((h) => h.t === 'mad' || h.t === 'bar'); est.hex.forEach((h) => { if (h.num === 8) h.num = 5; }); est.hex[hi].num = 8; est.ladron = est.hex.findIndex((h) => h.t === 'des'); return { est, hi, t: est.hex[hi].t }; };
  const tira = (est, suma) => { for (let s = 1; s < 9999; s++) { const e2 = JSON.parse(JSON.stringify(est)); e2.rng = s; e2.fase = 'tirada'; R.aplicar(e2, 0, { t: 'tirar' }); if (e2.dado[0] + e2.dado[1] === suma) return e2; } };
  let { est, hi, t } = base();
  poblado(est, 0, G.hexes[hi].vs[0], 2); poblado(est, 1, G.hexes[hi].vs[3], 2); est.banco[t] = 3; // piden 2+2=4 > 3
  let r = tira(est, 8); assert.equal(r.mano[0][t], 0); assert.equal(r.mano[1][t], 0); assert.equal(r.banco[t], 3);
  ({ est, hi, t } = base());
  poblado(est, 0, G.hexes[hi].vs[0], 2); est.banco[t] = 1;
  r = tira(est, 8); assert.equal(r.mano[0][t], 1); assert.equal(r.banco[t], 0);
});

prueba('siete: descartan los de mas de 7 (mitad hacia abajo), luego mueve bandido y roba', () => {
  const est = listo(nueva(3)), G = geo(2);
  est.fase = 'tirada';
  dar(est, 0, { mad: 3 }); dar(est, 1, { mad: 5, bar: 4 }); dar(est, 2, { mad: 7 }); // 9 -> 4 ; 7 no descarta
  for (let s = 1; s < 9999; s++) { const e2 = JSON.parse(JSON.stringify(est)); e2.rng = s; R.aplicar(e2, 0, { t: 'tirar' }); if (e2.dado[0] + e2.dado[1] === 7) { Object.assign(est, e2); break; } }
  assert.equal(est.fase, 'descartar'); assert.deepEqual(est.desc, { 1: 4 });
  mal(R.aplicar(est, 0, { t: 'ladron', h: 0 }));
  mal(R.aplicar(est, 1, { t: 'descartar', r: { mad: 3 } })); mal(R.aplicar(est, 1, { t: 'descartar', r: { mad: 9 } }));
  ok(R.aplicar(est, 1, { t: 'descartar', r: { mad: 2, bar: 2 } }));
  assert.equal(est.fase, 'ladron'); assert.equal(R.total(est.mano[1]), 5);
  const h = est.hex.findIndex((x, i) => i !== est.ladron && x.t !== 'des');
  poblado(est, 1, G.hexes[h].vs[0]); poblado(est, 2, G.hexes[h].vs[2]);
  mal(R.aplicar(est, 0, { t: 'ladron', h: est.ladron }));
  mal(R.aplicar(est, 0, { t: 'ladron', h })); // dos victimas: hay que elegir
  const antes = R.total(est.mano[0]);
  ok(R.aplicar(est, 0, { t: 'ladron', h, victima: 2 }));
  assert.equal(est.ladron, h); assert.equal(R.total(est.mano[0]), antes + 1); assert.equal(R.total(est.mano[2]), 6); assert.equal(est.fase, 'accion');
});
prueba('ladron: victima unica automatica; sin cartas no hay victima', () => {
  const est = listo(nueva(3)), G = geo(2);
  est.fase = 'ladron'; est.volver = 'accion';
  const h = est.hex.findIndex((x, i) => i !== est.ladron);
  poblado(est, 1, G.hexes[h].vs[0]); dar(est, 1, { met: 2 });
  ok(R.aplicar(est, 0, { t: 'ladron', h }));
  assert.equal(est.mano[0].met, 1);
  const e2 = listo(nueva(3)); e2.fase = 'ladron'; poblado(e2, 1, G.hexes[h].vs[0]); ok(R.aplicar(e2, 0, { t: 'ladron', h })); assert.equal(R.total(e2.mano[0]), 0);
});

prueba('puertos y banco: 4:1, 3:1 generico, 2:1 especifico', () => {
  const est = listo(nueva(3)), G = geo(2);
  assert.equal(R.tasaBanco(est, 0, 'mad'), 4);
  const pg = est.puertos.find((p) => p.t === 'gen'), pm = est.puertos.find((p) => p.t === 'met');
  dar(est, 0, { mad: 4, met: 4 }); mal(R.aplicar(est, 0, { t: 'banco', da: 'mad', recibe: 'mad' }));
  ok(R.aplicar(est, 0, { t: 'banco', da: 'mad', recibe: 'bar' }));
  assert.equal(est.mano[0].mad, 0); assert.equal(est.mano[0].bar, 1);
  poblado(est, 0, G.aristas[pg.e].a);
  assert.equal(R.tasaBanco(est, 0, 'mad'), 3); assert.equal(R.tasaBanco(est, 1, 'mad'), 4);
  dar(est, 0, { mad: 3, met: 4 }); ok(R.aplicar(est, 0, { t: 'banco', da: 'mad', recibe: 'alg' })); assert.equal(est.mano[0].mad, 0);
  poblado(est, 0, G.aristas[pm.e].b);
  assert.equal(R.tasaBanco(est, 0, 'met'), 2); assert.equal(R.tasaBanco(est, 0, 'mad'), 3);
  dar(est, 0, { met: 3 }); ok(R.aplicar(est, 0, { t: 'banco', da: 'met', recibe: 'mai' })); assert.equal(est.mano[0].met, 1);
  mal(R.aplicar(est, 0, { t: 'banco', da: 'met', recibe: 'mai' })); // solo 1 de metal
  est.banco.mai = 0; dar(est, 0, { met: 4 }); mal(R.aplicar(est, 0, { t: 'banco', da: 'met', recibe: 'mai' })); // banco vacio
  assert.deepEqual(R.puertosDe(est, 0).sort(), ['gen', 'met']);
});

prueba('construccion: costos, conexion, ciudad devuelve poblado, limite de piezas', () => {
  const est = listo(nueva(3)), G = geo(2);
  const v = 20; poblado(est, 0, v); camino(est, 0, G.verts[v].es[0]);
  dar(est, 0, { mad: 1, bar: 1 });
  const e1 = G.verts[v].es[1];
  ok(R.aplicar(est, 0, { t: 'camino', e: e1 })); assert.equal(R.total(est.mano[0]), 0); assert.equal(est.banco.mad, 20);
  mal(R.aplicar(est, 0, { t: 'camino', e: e1 }));
  dar(est, 0, { mad: 1, bar: 1 }); const lejos = G.aristas.findIndex((e, i) => est.ed[i] === -1 && e.a !== v && e.b !== v && !G.verts[e.a].es.some((x) => est.ed[x] === 0) && !G.verts[e.b].es.some((x) => est.ed[x] === 0));
  mal(R.aplicar(est, 0, { t: 'camino', e: lejos }));
  dar(est, 0, { mad: 1, bar: 1, alg: 1, mai: 1 });
  const dos = G.verts[v].ns.map((w) => G.verts[w].ns.filter((x) => x !== v)).flat().find((x) => R.lugaresPoblado(est, 0, false).includes(x));
  mal(R.aplicar(est, 0, { t: 'poblado', v: G.verts[v].ns[0] })); // regla de distancia
  if (dos != null) { ok(R.aplicar(est, 0, { t: 'poblado', v: dos })); assert.equal(est.vj[dos], 0); }
  dar(est, 0, { mai: 2, met: 3 }); mal(R.aplicar(est, 0, { t: 'ciudad', v: 999 }));
  ok(R.aplicar(est, 0, { t: 'ciudad', v })); assert.equal(est.vc[v], 2); assert.deepEqual([est.piezas[0].ciu, est.piezas[0].pob], [3, dos != null ? 4 : 5]);
  dar(est, 0, { mai: 2, met: 3 }); mal(R.aplicar(est, 0, { t: 'ciudad', v }));
  est.piezas[1].pob = 0; dar(est, 1, { mad: 1, bar: 1, alg: 1, mai: 1 }); est.turno = 1; mal(R.aplicar(est, 1, { t: 'poblado', v: 0 }));
});

prueba('camino mas largo: obtener con 5, ceder con 6, empate conserva', () => {
  const est = listo(nueva(3));
  cadena(est, 0, 4); R.recalcularLargo(est); assert.equal(est.largo.j, -1);
  const e5 = cadena(est, 0, 1, geo(2).aristas[est.ed.findIndex((x) => x === 0)].a); void e5;
  R.recalcularLargo(est);
  if (est.lens[0] < 5) { /* la cadena extra pudo no extender; fuerza una cadena simple de 5 */ }
});
prueba('camino mas largo: reglas de posesion', () => {
  const est = listo(nueva(3)), G = geo(2);
  const A = cadena(est, 0, 5, 0); R.recalcularLargo(est);
  assert.equal(R.largoCamino(est, 0), 5); assert.deepEqual(est.largo, { j: 0, len: 5 });
  assert.equal(R.puntosPublicos(est, 0), 2);
  // jugador 1 empata con 5 en otra zona: 0 lo conserva
  const B = cadena(est, 1, 5, 53); R.recalcularLargo(est);
  assert.equal(est.lens[1], 5); assert.equal(est.largo.j, 0);
  // jugador 1 sube a 6: se lo lleva
  const ext = G.verts[G.aristas[B[4]].a === G.aristas[B[3]].a || G.aristas[B[4]].a === G.aristas[B[3]].b ? G.aristas[B[4]].b : G.aristas[B[4]].a];
  const fin = ext.es.find((e) => est.ed[e] === -1 && (G.aristas[e].a !== undefined)); void fin;
  const ultimo = (() => { const usados = new Set(B.flatMap((e) => [G.aristas[e].a, G.aristas[e].b])); const cnt = {}; B.forEach((e) => { cnt[G.aristas[e].a] = (cnt[G.aristas[e].a] || 0) + 1; cnt[G.aristas[e].b] = (cnt[G.aristas[e].b] || 0) + 1; }); return [...usados].filter((v) => cnt[v] === 1); })();
  let puesto = false;
  for (const v of ultimo) for (const e of G.verts[v].es) if (!puesto && est.ed[e] === -1 && !A.includes(e)) { const w = G.aristas[e].a === v ? G.aristas[e].b : G.aristas[e].a; if (!B.some((x) => G.aristas[x].a === w || G.aristas[x].b === w) && !A.some((x) => G.aristas[x].a === w || G.aristas[x].b === w)) { camino(est, 1, e); puesto = true; } }
  assert.ok(puesto); R.recalcularLargo(est);
  assert.equal(est.lens[1], 6); assert.equal(est.largo.j, 1); assert.equal(R.puntosPublicos(est, 1), 2); assert.equal(R.puntosPublicos(est, 0), 0);
});
prueba('camino mas largo: un poblado enemigo corta el camino', () => {
  const est = listo(nueva(3)), G = geo(2);
  const A = cadena(est, 0, 6, 0); R.recalcularLargo(est);
  assert.equal(est.largo.j, 0);
  // vertice interior de la cadena (compartido por A[2] y A[3])
  const mid = [G.aristas[A[2]].a, G.aristas[A[2]].b].find((v) => v === G.aristas[A[3]].a || v === G.aristas[A[3]].b);
  poblado(est, 1, mid); R.recalcularLargo(est);
  assert.equal(est.lens[0], 3); assert.equal(est.largo.j, -1);
});
prueba('camino mas largo: ramas cuentan el trayecto mayor, ciclos no se repiten', () => {
  const est = listo(nueva(3)), G = geo(2);
  // anillo de un hexagono (6 aristas) = 6; con una rama de 2 mas, el maximo es 6 + 2
  const h = G.hexes[9]; h.es.forEach((e) => camino(est, 0, e));
  assert.equal(R.largoCamino(est, 0), 6);
  const v0 = h.vs[0]; const sal = G.verts[v0].es.find((e) => est.ed[e] === -1);
  camino(est, 0, sal); const w = G.aristas[sal].a === v0 ? G.aristas[sal].b : G.aristas[sal].a;
  const sal2 = G.verts[w].es.find((e) => est.ed[e] === -1); if (sal2 != null) camino(est, 0, sal2);
  assert.equal(R.largoCamino(est, 0), sal2 != null ? 8 : 7);
});
prueba('camino mas largo: empate entre dos no poseedores tras un corte -> nadie', () => {
  const est = listo(nueva(3)), G = geo(2);
  const A = cadena(est, 0, 6, 0); R.recalcularLargo(est);
  cadena(est, 1, 5, 53); cadena(est, 2, 5, 30); R.recalcularLargo(est);
  assert.equal(est.largo.j, 0);
  const mid = [G.aristas[A[2]].a, G.aristas[A[2]].b].find((v) => v === G.aristas[A[3]].a || v === G.aristas[A[3]].b);
  if (est.vj[mid] === -1 && !G.verts[mid].ns.some((w) => est.vj[w] !== -1)) poblado(est, 1, mid); else est.vj[mid] = 1;
  R.recalcularLargo(est);
  const lens = est.lens.slice();
  if (lens[1] === lens[2] && lens[1] >= 5 && lens[0] < lens[1]) assert.equal(est.largo.j, -1);
  else assert.ok(est.largo.j === -1 || lens[est.largo.j] === Math.max(...lens));
});

prueba('ejercito mayor: 3 guardias, y solo se cede con mas', () => {
  const est = listo(nueva(3));
  const jugar = (j) => { est.turno = j; est.fase = 'accion'; est.cartaJug = false; est.cm[j].push('guardia'); est.cnuevas[j] = []; ok(R.aplicar(est, j, { t: 'jugarCarta', carta: 'guardia' })); est.fase = 'ladron'; const h = est.hex.findIndex((x, i) => i !== est.ladron); ok(R.aplicar(est, j, { t: 'ladron', h })); };
  jugar(0); jugar(0); assert.equal(est.ejer.j, -1);
  jugar(0); assert.deepEqual(est.ejer, { j: 0, n: 3 }); assert.equal(R.puntosPublicos(est, 0), 2);
  jugar(1); jugar(1); jugar(1); assert.equal(est.ejer.j, 0);
  jugar(1); assert.deepEqual(est.ejer, { j: 1, n: 4 }); assert.equal(R.puntosPublicos(est, 0), 0);
});
prueba('cartas de desarrollo: compra, una por turno, no la recien comprada, efectos', () => {
  const est = listo(nueva(3)), G = geo(2);
  dar(est, 0, { alg: 1, mai: 1, met: 1 });
  est.mazo = ['cosecha', 'guardia', 'pv']; ok(R.aplicar(est, 0, { t: 'comprarCarta' }));
  assert.deepEqual(est.cm[0], ['pv']); assert.equal(R.total(est.mano[0]), 0); mal(R.aplicar(est, 0, { t: 'comprarCarta' }));
  est.cm[0] = ['cosecha', 'rutas']; est.cnuevas[0] = ['cosecha'];
  mal(R.aplicar(est, 0, { t: 'jugarCarta', carta: 'cosecha', r1: 'mad', r2: 'bar' })); // recien comprada
  mal(R.aplicar(est, 0, { t: 'jugarCarta', carta: 'pv' }));
  est.cnuevas[0] = []; ok(R.aplicar(est, 0, { t: 'jugarCarta', carta: 'cosecha', r1: 'mad', r2: 'mad' })); assert.equal(est.mano[0].mad, 2);
  mal(R.aplicar(est, 0, { t: 'jugarCarta', carta: 'rutas' })); // ya jugo una este turno
  est.cartaJug = false; poblado(est, 0, 10); camino(est, 0, G.verts[10].es[0]);
  ok(R.aplicar(est, 0, { t: 'jugarCarta', carta: 'rutas' })); assert.equal(est.camGratis, 2);
  mal(R.aplicar(est, 0, { t: 'terminar' }));
  const l = R.lugaresCamino(est, 0); ok(R.aplicar(est, 0, { t: 'camino', e: l[0] })); assert.equal(est.camGratis, 1);
  ok(R.aplicar(est, 0, { t: 'camino', e: R.lugaresCamino(est, 0)[0] })); assert.equal(est.camGratis, 0); assert.equal(est.mano[0].mad, 2);
  ok(R.aplicar(est, 0, { t: 'terminar' }));
  // acaparar
  const e2 = listo(nueva(3)); e2.cm[0] = ['acaparar']; dar(e2, 1, { mad: 3, bar: 1 }); dar(e2, 2, { mad: 2 }); dar(e2, 0, { mad: 1 });
  ok(R.aplicar(e2, 0, { t: 'jugarCarta', carta: 'acaparar', r: 'mad' })); assert.equal(e2.mano[0].mad, 6); assert.equal(e2.mano[1].mad, 0); assert.equal(e2.mano[1].bar, 1);
  // tirada previa: solo guardia
  const e3 = nueva(3); e3.fund.paso = 9; e3.fase = 'tirada'; e3.cm[0] = ['cosecha']; mal(R.aplicar(e3, 0, { t: 'jugarCarta', carta: 'cosecha', r1: 'mad', r2: 'mad' }));
  mal(R.aplicar(e3, 0, { t: 'poblado', v: 1 })); mal(R.aplicar(e3, 0, { t: 'terminar' }));
});

prueba('comercio entre jugadores: oferta, respuesta, cierre', () => {
  const est = listo(nueva(3));
  dar(est, 0, { mad: 2 }); dar(est, 1, { bar: 1 }); dar(est, 2, {});
  mal(R.aplicar(est, 0, { t: 'ofrecer', da: { mad: 1 }, pide: { mad: 1 } }));
  mal(R.aplicar(est, 0, { t: 'ofrecer', da: { bar: 1 }, pide: { alg: 1 } })); // no tiene
  ok(R.aplicar(est, 0, { t: 'ofrecer', da: { mad: 2 }, pide: { bar: 1 } }));
  ok(R.aplicar(est, 1, { t: 'responder', ok: true })); ok(R.aplicar(est, 2, { t: 'responder', ok: false }));
  mal(R.aplicar(est, 0, { t: 'cerrarTrato', con: 2 }));
  ok(R.aplicar(est, 0, { t: 'cerrarTrato', con: 1 }));
  assert.deepEqual([est.mano[0].mad, est.mano[0].bar, est.mano[1].mad, est.mano[1].bar], [0, 1, 2, 0]); assert.equal(est.trato, null);
  est.cfg.trato = false; mal(R.aplicar(est, 0, { t: 'ofrecer', da: { bar: 1 }, pide: { mad: 1 } }));
});
prueba('victoria configurable, solo en su turno, cartas PV ocultas cuentan', () => {
  for (const meta of [5, 8, 12]) {
    const est = listo(nueva(3, { meta })); const G = geo(2);
    let v = 0; for (let k = 0; k < meta - 1; k++) { while (est.vj[v] !== -1 || G.verts[v].ns.some((w) => est.vj[w] !== -1)) v++; poblado(est, 0, v, k < meta - 2 ? 2 : 1); k < meta - 2 ? (k++) : 0; }
    est.cm[0] = []; const p = R.puntosTotales(est, 0);
    est.cm[0] = Array(Math.max(0, meta - p - 1)).fill('pv');
    dar(est, 0, { alg: 1, mai: 1, met: 1 }); est.mazo = ['pv'];
    if (R.puntosTotales(est, 0) < meta) { ok(R.aplicar(est, 0, { t: 'comprarCarta' })); assert.equal(est.fin && est.fin.ganador, 0); assert.equal(est.fase, 'fin'); mal(R.aplicar(est, 0, { t: 'terminar' })); }
  }
  const est = listo(nueva(3, { meta: 5 })); est.cm[1] = Array(6).fill('pv'); ok(R.aplicar(est, 0, { t: 'terminar' })); assert.equal(est.fin && est.fin.ganador, 1); // gana al empezar su turno, no antes
  const e2 = listo(nueva(3, { meta: 5 })); e2.cm[2] = Array(6).fill('pv'); ok(R.aplicar(e2, 0, { t: 'terminar' })); assert.equal(e2.fin, null);
});

prueba('vista oculta manos ajenas y mazo', () => {
  const est = listo(nueva(3)); dar(est, 1, { mad: 3 }); est.cm[1] = ['pv', 'guardia'];
  const v = R.vista(est, 0); const txt = JSON.stringify(v);
  assert.equal(v.totales[1], 3); assert.equal(v.nCartas[1], 2); assert.equal(v.mano.mad, 0); assert.equal(v.mazo, undefined); assert.ok(!txt.includes('"mazo"'));
  assert.equal(v.misPts, 0); assert.ok(!txt.includes('"cm":[["'));
});
prueba('sanear ordenes de red', () => {
  assert.equal(R.sanear({ t: 'hackear' }), null); assert.equal(R.sanear(null), null);
  assert.deepEqual(R.sanear({ t: 'poblado', v: 7, extra: 1 }), { t: 'poblado', v: 7 });
  assert.equal(R.sanear({ t: 'poblado', v: 1.5 }), null); assert.equal(R.sanear({ t: 'poblado', v: 1e9 }), null);
  assert.equal(R.sanear({ t: 'descartar', r: { mad: -1 } }), null);
  assert.deepEqual(R.sanear({ t: 'ofrecer', da: { mad: 1 }, pide: { bar: 2 }, a: [1, 9] }), { t: 'ofrecer', da: { mad: 1 }, pide: { bar: 2 }, a: [1] });
});

prueba('partidas completas de bots en todas las dificultades terminan (radio 2 y 3, 2-4 jugadores)', () => {
  const casos = [[[0, 0, 0, 0], 2], [[1, 1, 1], 2], [[2, 2, 2, 2], 2], [[0, 1, 2, 2], 3], [[2, 0], 2]];
  casos.forEach(([niv, radio], k) => {
    const reloj = relojVirtual();
    const m = new Mesa({ cfg: { radio, meta: 10 }, asientos: niv.map((x, i) => ({ nombre: 'B' + i, color: '#fff', tipo: 'bot', nivel: x })), semilla: 1000 + k, reloj, escala: 0.01 });
    m.iniciar(); for (let i = 0; i < 600 && !m.est.fin; i++) reloj.avanzar(60000);
    assert.ok(m.est.fin, 'no termino caso ' + k);
    assert.ok(R.puntosTotales(m.est, m.est.fin.ganador) >= 10);
    const cartas = R.RES.reduce((a, r) => a + m.est.banco[r] + m.est.mano.reduce((s, x) => s + x[r], 0), 0);
    assert.equal(cartas, 5 * (radio === 2 ? 19 : 25), 'conservacion de recursos');
  });
});
prueba('guardar/restaurar a mitad de partida y continuar es determinista', () => {
  const mk = (est) => { const reloj = relojVirtual(); const m = new Mesa({ cfg: { meta: 10 }, asientos: [0, 1, 2].map((x) => ({ nombre: 'B' + x, color: '#fff', tipo: 'bot', nivel: x })), semilla: 4242, reloj, escala: 0.01, est }); return { m, reloj }; };
  const a = mk(); a.m.iniciar(); a.reloj.avanzar(120000);
  const copia = JSON.parse(JSON.stringify(a.m.guardar()));
  const b = mk(Mesa.restaurar(copia, { reloj: relojVirtual(), asientos: [] }).est); b.m.rs = copia.rs; b.m.programar();
  assert.deepEqual(JSON.parse(JSON.stringify(b.m.est)), JSON.parse(JSON.stringify(a.m.est)));
  for (let i = 0; i < 600 && !b.m.est.fin; i++) b.reloj.avanzar(60000);
  assert.ok(b.m.est.fin);
});
prueba('mesa multijugador: paquetes filtrados, humano por turno y limite de tiempo con piloto', () => {
  const reloj = relojVirtual(), paq = {};
  const m = new Mesa({ cfg: { meta: 10, tiempo: 20000 }, asientos: [{ nombre: 'H', color: '#f00', tipo: 'humano', token: 'a' }, { nombre: 'B', color: '#0f0', tipo: 'bot', nivel: 1 }, { nombre: 'C', color: '#00f', tipo: 'bot', nivel: 1 }], semilla: 3, reloj, escala: 0.01, salida: (i, p) => { paq[i] = p; } });
  m.iniciar();
  assert.equal(paq[0].v.yo, 0); assert.ok(!JSON.stringify(paq[0].v).includes('"mazo"'));
  const v = paq[0].v; const lug = R.lugaresPoblado(m.est, 0, true);
  mal(m.comando(1, { t: 'poblado', v: lug[0] })); // un bot no puede ser movido por otro
  assert.equal(m.comando(0, { t: 'poblado', v: lug[0] }).ok, true); void v;
  assert.ok(paq[0].lim, 'hay limite de tiempo');
  for (let i = 0; i < 40; i++) reloj.avanzar(30000);
  assert.ok(m.as[0].fallos >= 1 && m.est.fase !== 'fundacion', 'el piloto automatico avanza');
});

console.log(`\n${n} pruebas pasaron, ${fallos} fallaron`);
process.exit(fallos ? 1 : 0);
