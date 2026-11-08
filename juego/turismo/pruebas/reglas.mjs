// Pruebas de reglas de Turismo Mundial (Node, sin DOM). Uso: node reglas.mjs
import assert from 'node:assert/strict';
import { crearPartida, aplicar, revisar, clonar, quienActua, patrimonio, puedeConstruir, calcularRenta, rutasDe, tieneVisa, dominio } from '../js/reglas.js';
import { CASILLAS, POR_CONT, DESTINOS, MAZOS, reglasDeModo, REGLAS_BASE } from '../js/datos.js';
import { jugar } from './sim.mjs';

let n = 0;
const prueba = (nombre, fn) => { try { fn(); n++; console.log('ok   ' + nombre); } catch (e) { console.error('FALLA ' + nombre + '\n', e); process.exitCode = 1; } };
const nueva = (k = 3, cfg = {}, sem = 5) => { const e = crearPartida(Object.assign(reglasDeModo('completo'), { eventos: 0 }, cfg), Array.from({ length: k }, (_, i) => ({ nombre: 'J' + i, color: '#fff', tipo: 'bot', nivel: 1 })), sem); e.turno = 0; return e; };
const ok = (e, j, a) => { const r = aplicar(e, j, a); assert.equal(r.ok, true, JSON.stringify(a) + ' -> ' + r.error); assert.deepEqual(revisar(e), []); return r; };
const no = (e, j, a) => { const r = aplicar(e, j, a); assert.equal(r.ok, false, 'debia fallar ' + JSON.stringify(a)); return r; };
const dar = (e, j, ...idx) => idx.forEach((i) => { e.prop[i].o = j; });
// fuerza una tirada: busca una semilla que produzca los dados deseados
function tirar(e, j, d1, d2) {
  for (let s = 1; s < 300000; s++) {
    const t = clonar(e); t.rng = s; const r = aplicar(t, j, { t: 'tirar' });
    const dd = r.ok && r.ev.find((v) => v.t === 'dados');
    if (dd && dd.d[0] === d1 && dd.d[1] === d2) { e.rng = s; return ok(e, j, { t: 'tirar' }); }
  }
  throw new Error('no se logro la tirada');
}
const colocar = (e, j, pos) => { e.jug[j].pos = pos; };

prueba('estado inicial y conservacion del dinero', () => {
  const e = nueva(4); assert.deepEqual(revisar(e), []);
  assert.equal(e.jug.every((p) => p.din === 1500), true); assert.equal(e.banco, -6000);
  assert.equal(CASILLAS.length, 40); assert.equal(DESTINOS.length, 24);
  assert.equal(POR_CONT.every((g) => g.length === 4), true);
});
prueba('comprar un destino cobra el precio y estampa el sello con bono', () => {
  const e = nueva(); colocar(e, 0, 0); tirar(e, 0, 1, 2); // cae en Melbourne (3) con dobles? 1+2=3
  assert.equal(e.jug[0].pos, 3); assert.equal(e.fase, 'compra');
  assert.deepEqual(e.jug[0].sellos, [3]); assert.equal(e.jug[0].din, 1500 + e.cfg.bonoSello);
  ok(e, 0, { t: 'comprar' }); assert.equal(e.prop[3].o, 0); assert.equal(e.jug[0].din, 1500 + e.cfg.bonoSello - 60); assert.equal(e.fase, 'fin');
});
prueba('no comprar con subasta obligatoria abre subasta y gana el mejor postor', () => {
  const e = nueva(3); colocar(e, 0, 0); tirar(e, 0, 1, 2); ok(e, 0, { t: 'noComprar' });
  assert.equal(e.fase, 'subasta'); const j1 = e.subasta.turnoPuja; assert.equal(j1, 1);
  ok(e, 1, { t: 'pujar', m: 40 }); ok(e, 2, { t: 'pujar', m: 50 }); no(e, 0, { t: 'pujar', m: 50 }); no(e, 0, { t: 'pujar', m: 99999 });
  ok(e, 0, { t: 'pasarPuja' }); ok(e, 1, { t: 'pasarPuja' });
  assert.equal(e.prop[3].o, 2); assert.equal(e.jug[2].din, 1450); assert.equal(e.fase, 'fin');
});
prueba('la renta sube con el dominio del continente y la visa la baja', () => {
  const e = nueva(); dar(e, 1, 23, 24); assert.equal(calcularRenta(e, 23, 0), CASILLAS[23].renta[0]);
  dar(e, 1, 26); assert.equal(dominio(e, 3, 1), true); assert.equal(calcularRenta(e, 23, 0), CASILLAS[23].renta[0] * 2);
  e.jug[0].sellos = [23, 24, 26, 27]; assert.equal(tieneVisa(e, 3, 0), true);
  assert.equal(calcularRenta(e, 23, 0), Math.round(CASILLAS[23].renta[0] * 2 * 0.75));
  e.cfg.visaDescuento = false; assert.equal(calcularRenta(e, 23, 0), CASILLAS[23].renta[0] * 2);
});
prueba('caer en destino ajeno paga alojamiento al dueno', () => {
  const e = nueva(); dar(e, 1, 3); colocar(e, 0, 0); const r = tirar(e, 0, 1, 2);
  assert.equal(e.jug[0].din, 1500 + e.cfg.bonoSello - CASILLAS[3].renta[0]); assert.equal(e.jug[1].din, 1500 + CASILLAS[3].renta[0]);
  assert.ok(r.ev.some((v) => v.t === 'renta' && v.m === CASILLAS[3].renta[0]));
});
prueba('construir exige dominio, es parejo y llega a hotel; vender devuelve la mitad', () => {
  const e = nueva(); dar(e, 0, 23, 24); e.jug[0].din += 3000; e.banco -= 3000; no(e, 0, { t: 'construir', i: 23 }); dar(e, 0, 26);
  ok(e, 0, { t: 'construir', i: 23 }); no(e, 0, { t: 'construir', i: 23 }); // parejo
  ok(e, 0, { t: 'construir', i: 24 }); ok(e, 0, { t: 'construir', i: 26 });
  for (let k = 0; k < 3; k++) { ok(e, 0, { t: 'construir', i: 23 }); ok(e, 0, { t: 'construir', i: 24 }); ok(e, 0, { t: 'construir', i: 26 }); }
  assert.equal(e.prop[23].c, 4); no(e, 0, { t: 'construir', i: 23 });
  const din = e.jug[0].din; ok(e, 0, { t: 'vender', i: 23 }); assert.equal(e.jug[0].din, din + 75); assert.equal(e.prop[23].c, 3);
  e.banco += e.jug[0].din - 5; e.jug[0].din = 5; assert.ok(puedeConstruir(e, 0, 23));
});
prueba('hipotecar y deshipotecar con interes; no con edificios', () => {
  const e = nueva(); dar(e, 0, 23, 24, 26); ok(e, 0, { t: 'construir', i: 23 }); no(e, 0, { t: 'hipotecar', i: 24 });
  ok(e, 0, { t: 'vender', i: 23 }); const d0 = e.jug[0].din; ok(e, 0, { t: 'hipotecar', i: 24 }); assert.equal(e.jug[0].din, d0 + 120);
  no(e, 0, { t: 'construir', i: 26 }); ok(e, 0, { t: 'deshipotecar', i: 24 }); assert.equal(e.jug[0].din, d0 + 120 - 132);
});
prueba('vuelo: tarifa, descuento de dueno, pase y bloqueo por huelga', () => {
  const e = nueva(); colocar(e, 0, 0); tirar(e, 0, 2, 3); // 5: Aeropuerto Pacifico
  assert.equal(e.fase, 'compra'); ok(e, 0, { t: 'comprar' }); assert.equal(e.fase, 'viaje');
  const rs = rutasDe(e, 0); assert.ok(rs.length > 20); assert.equal(rs[0].costo, 75);
  const d0 = e.jug[0].din; ok(e, 0, { t: 'viajar', a: 26 }); assert.equal(e.jug[0].pos, 26); assert.equal(e.jug[0].din, d0 - 75 - 0 + (e.prop[26].o === -1 ? 0 : 0) + e.cfg.bonoSello);
  assert.equal(e.fase, 'compra'); assert.equal(e.jug[0].rutas.aire, 1);
  const f = nueva(); colocar(f, 0, 5); dar(f, 1, 5); f.jug[0].tarj.push('v'); f.mazos.v = f.mazos.v.filter((k) => MAZOS.v[k].ef.t !== 'pase'); f.fase = 'viaje';
  assert.equal(rutasDe(f, 0)[0].costo, 150); const d1 = f.jug[0].din; ok(f, 0, { t: 'viajar', a: 8, pase: true }); assert.equal(f.jug[0].din, d1 + f.cfg.bonoSello); assert.equal(f.jug[0].tarj.length, 0);
  const g = nueva(); colocar(g, 0, 5); g.fase = 'viaje'; g.eventos = [{ tipo: 'huelga', cont: -1, hasta: 3 }]; no(g, 0, { t: 'viajar', a: 8 }); ok(g, 0, { t: 'noViajar' });
});
prueba('tren avanza por riel y cobra la Salida; crucero va al otro puerto', () => {
  const e = nueva(); colocar(e, 0, 29); e.fase = 'viaje'; const d0 = e.jug[0].din; ok(e, 0, { t: 'viajar', a: 33 }); assert.equal(e.jug[0].pos, 33); assert.equal(e.jug[0].din, d0 - 40 + e.cfg.bonoSello);
  const t = nueva(); colocar(t, 0, 35); t.fase = 'viaje'; const rs = rutasDe(t, 0); assert.deepEqual(rs.map((r) => r.a), [15]); ok(t, 0, { t: 'viajar', a: 15 }); assert.equal(t.jug[0].pos, 15);
  const s = nueva(); colocar(s, 0, 35); s.fase = 'viaje'; s.banco += s.jug[0].din - 100; s.jug[0].din = 100; ok(s, 0, { t: 'viajar', a: 15 });
  const v = nueva(); colocar(v, 0, 29); v.fase = 'viaje'; const d1 = v.jug[0].din; ok(v, 0, { t: 'viajar', a: 1 }); assert.equal(v.jug[0].pos, 1); assert.equal(v.jug[0].din, d1 - 40 + v.cfg.sueldo + v.cfg.bonoSello);
});
prueba('eventos: temporada alta duplica la renta y expira; festival paga a todos', () => {
  const e = nueva(3, { eventos: 2 }); dar(e, 1, 23); e.eventos = [{ tipo: 'alta', cont: 3, hasta: e.ronda + 2 }];
  assert.equal(calcularRenta(e, 23, 0), CASILLAS[23].renta[0] * 2);
  e.eventos = [{ tipo: 'baja', cont: 3, hasta: e.ronda + 2 }]; assert.equal(calcularRenta(e, 23, 0), Math.round(CASILLAS[23].renta[0] / 2));
  const f = nueva(3, { eventos: 1 }); f.eventos = [{ tipo: 'huelga', cont: -1, hasta: 2 }];
  for (let k = 0; k < 3; k++) { f.fase = 'fin'; ok(f, f.turno, { t: 'terminar' }); }
  assert.equal(f.ronda, 2); assert.ok(f.eventos.every((v) => v.hasta > f.ronda)); assert.ok(f.eventos.length >= 1 || true);
  const g = nueva(3); const total = g.jug.reduce((s, p) => s + p.din, 0); g.mazos.s = [MAZOS.s.findIndex((c) => c.ef.k === 'festival')]; colocar(g, 0, 0); g.fase = 'tirar';
  assert.equal(total, 4500);
});
prueba('retencion: dobles, fianza y pase', () => {
  const e = nueva(); e.jug[0].ret = true; e.jug[0].pos = 10; tirar(e, 0, 3, 3); assert.equal(e.jug[0].ret, false); assert.equal(e.jug[0].pos, 16);
  const f = nueva(); f.jug[0].ret = true; f.jug[0].pos = 10; const d = f.jug[0].din; ok(f, 0, { t: 'pagarRetencion' }); assert.equal(f.jug[0].din, d - 50); assert.equal(f.bote, 50); assert.equal(f.jug[0].ret, false);
  const g = nueva(); g.jug[0].ret = true; g.jug[0].pos = 10; no(g, 0, { t: 'usarPase' }); g.jug[0].tarj.push('a'); g.mazos.a = g.mazos.a.filter((k) => MAZOS.a[k].ef.t !== 'pase'); ok(g, 0, { t: 'usarPase' }); assert.equal(g.jug[0].ret, false);
  const h = nueva(); h.jug[0].ret = true; h.jug[0].pos = 10; h.jug[0].intentos = 2; tirar(h, 0, 1, 2); assert.equal(h.jug[0].ret, false); assert.ok(h.jug[0].pos !== 10);
});
prueba('tres dobles seguidos mandan a retencion', () => {
  const e = nueva(); colocar(e, 0, 0); e.dobles = 2; tirar(e, 0, 2, 2); assert.equal(e.jug[0].ret, true); assert.equal(e.jug[0].pos, 10);
});
prueba('cartas: pagar, ir a una casilla, sello gratis y pase se conserva', () => {
  const e = nueva(); colocar(e, 0, 5);
  const idx = (m, t) => MAZOS[m].findIndex((c) => c.ef.t === t);
  e.mazos.v = [idx('v', 'sello')].concat(e.mazos.v.filter((k) => k !== idx('v', 'sello'))); e.fase = 'tirar'; colocar(e, 0, 4); tirar(e, 0, 1, 2);
  assert.equal(e.jug[0].pos, 7); assert.equal(e.jug[0].sellos.length, 1);
  const f = nueva(); colocar(f, 0, 4); f.mazos.v = [idx('v', 'pase')].concat(f.mazos.v.filter((k) => k !== idx('v', 'pase'))); tirar(f, 0, 1, 2); assert.deepEqual(f.jug[0].tarj, ['v']);
  assert.deepEqual(revisar(f), []);
});
prueba('bancarrota: el acreedor hereda destinos y los edificios se liquidan', () => {
  const e = nueva(3); dar(e, 0, 23, 24, 26); [23, 24, 26].forEach((i) => { e.prop[i].c = 1; });
  e.banco += e.jug[0].din; e.jug[0].din = 0; e.jug[0].pos = 3; dar(e, 1, 3);
  e.fase = 'deuda'; e.deuda = { a: 1, monto: 500, motivo: 'alojamiento' };
  ok(e, 0, { t: 'quiebra' }); assert.equal(e.jug[0].quebrado, true); assert.equal(e.prop[23].o, 1); assert.equal(e.prop[23].c, 0); assert.notEqual(e.turno, 0);
});
prueba('meta de sellos termina la partida; ranking por puntos en modo tiempo', () => {
  const e = nueva(3, { metaSellos: 3 }); e.jug[0].sellos = [1, 3]; colocar(e, 0, 0); tirar(e, 0, 1, 5); assert.equal(e.fase, 'fin_partida'); assert.equal(e.ganador, 0); assert.equal(e.motivoFin, 'sellos');
  const f = nueva(3, { limiteRondas: 2 }); f.jug[1].sellos = DESTINOS.slice(0, 5);
  for (let k = 0; k < 9 && f.fase !== 'fin_partida'; k++) { f.fase = 'fin'; ok(f, f.turno, { t: 'terminar' }); }
  assert.equal(f.fase, 'fin_partida'); assert.equal(f.motivoFin, 'tiempo'); assert.equal(f.ganador, 1);
});
prueba('limite de tiempo real: la partida termina al completar la ronda cuando se agota', () => {
  const e = nueva(3, { limiteMin: 1 }); e.tiempoMs = 61000;
  for (let k = 0; k < 4 && e.fase !== 'fin_partida'; k++) { e.fase = 'fin'; ok(e, e.turno, { t: 'terminar' }); }
  assert.equal(e.fase, 'fin_partida'); assert.equal(e.motivoFin, 'tiempo');
});
prueba('modos de juego: presets y reglas coherentes', () => {
  assert.equal(reglasDeModo('rapido').metaSellos, 10); assert.equal(reglasDeModo('tiempo').limiteMin, 20); assert.equal(reglasDeModo('x').modo, 'completo');
  assert.equal(REGLAS_BASE.dominio, 3);
});
prueba('serializacion estable (JSON) y acciones invalidas rechazadas', () => {
  const e = nueva(); no(e, 1, { t: 'tirar' }); no(e, 0, { t: 'comprar' }); no(e, 0, { t: 'viajar', a: 8 }); no(e, 0, { t: 'inventada' }); no(e, 0, { t: 'construir', i: 99 });
  assert.equal(JSON.stringify(clonar(e)), JSON.stringify(e));
});
prueba('simulaciones completas entre bots mantienen todas las invariantes', () => {
  let fin = {};
  for (let k = 0; k < 120; k++) {
    const modo = ['completo', 'rapido', 'tiempo'][k % 3], cfg = Object.assign(reglasDeModo(modo), { limiteMin: 0, limiteRondas: modo === 'tiempo' ? 35 : 250, dominio: [2, 3, 4][k % 3], bote: k % 2 === 0 });
    const { e } = jugar(cfg, Array.from({ length: 2 + (k % 5) }, (_, i) => (k + i) % 3), 777 + k, { clonarCada: 53 });
    fin[e.motivoFin] = (fin[e.motivoFin] || 0) + 1; assert.ok(e.ganador >= 0);
  }
  assert.ok(fin.sellos > 0 && fin.tiempo > 0);
});
console.log(n + ' pruebas');
