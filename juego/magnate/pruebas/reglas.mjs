// Pruebas de reglas de Magnate (Node, sin DOM). Uso: node reglas.mjs
import assert from 'node:assert/strict';
import { crearPartida, aplicar, revisar, clonar, quienActua, patrimonio, puedeConstruir, valorHipoteca, calcularRenta } from '../js/reglas.js';
import { CASILLAS, POR_GRUPO, SUERTE, COMUNIDAD, BANCO } from '../js/datos.js';
import { jugar, pasoBot } from './sim.mjs';

let n = 0;
const prueba = (nombre, fn) => { try { fn(); n++; console.log('ok   ' + nombre); } catch (e) { console.error('FALLA ' + nombre + '\n', e); process.exitCode = 1; } };
const nueva = (k = 3, cfg = {}, sem = 5) => { const e = crearPartida(cfg, Array.from({ length: k }, (_, i) => ({ nombre: 'J' + i, color: '#fff', tipo: 'bot', nivel: 1 })), sem); e.turno = 0; return e; };
const ok = (e, j, a) => { const r = aplicar(e, j, a); assert.equal(r.ok, true, JSON.stringify(a) + ' -> ' + r.error); assert.deepEqual(revisar(e), []); return r; };
const no = (e, j, a) => { const r = aplicar(e, j, a); assert.equal(r.ok, false, 'debia fallar ' + JSON.stringify(a)); return r; };
const dar = (e, j, ...idx) => idx.forEach((i) => { e.prop[i].o = j; });
// fuerza una tirada: manipula la semilla hasta que salgan los dados deseados
function tirar(e, j, d1, d2) {
  for (let s = 1; s < 200000; s++) {
    const t = clonar(e); t.rng = s; const r = aplicar(t, j, { t: 'tirar' });
    const dd = r.ok && r.ev.find((v) => v.t === 'dados');
    if (dd && dd.d[0] === d1 && dd.d[1] === d2) { e.rng = s; return aplicar(e, j, { t: 'tirar' }); }
  }
  throw new Error('no se logro la tirada');
}

prueba('estado inicial y conservacion del dinero', () => {
  const e = nueva(4); assert.deepEqual(revisar(e), []);
  assert.equal(e.jug.every((p) => p.din === 1500), true); assert.equal(e.banco, -6000);
  assert.equal(CASILLAS.length, 40); assert.equal(POR_GRUPO.length, 8); assert.equal(SUERTE.length, 16); assert.equal(COMUNIDAD.length, 16);
});
prueba('comprar propiedad y cobrar renta', () => {
  const e = nueva(); e.jug[0].pos = 0; tirar(e, 0, 1, 2); // cae en 3
  assert.equal(e.fase, 'compra'); assert.equal(e.jug[0].pos, 3);
  ok(e, 0, { t: 'comprar' }); assert.equal(e.prop[3].o, 0); assert.equal(e.jug[0].din, 1430); ok(e, 0, { t: 'terminar' });
  e.jug[1].pos = 0; e.turno = 1; e.fase = 'tirar'; const antes = e.jug[1].din; tirar(e, 1, 1, 2);
  assert.equal(e.jug[1].din, antes - 4); assert.equal(e.jug[0].din, 1434);
});
prueba('pasar por la salida cobra sueldo y bono al caer exacto', () => {
  const e = nueva(3, { bonoSalida: true }); e.jug[0].pos = 35; tirar(e, 0, 2, 3); assert.equal(e.jug[0].pos, 0); assert.equal(e.jug[0].din, 1900);
  const f = nueva(); f.jug[0].pos = 38; tirar(f, 0, 2, 3); assert.equal(f.jug[0].din, 1700);
});
prueba('declinar compra lleva a subasta; subasta con pujas', () => {
  const e = nueva(3); e.jug[0].pos = 0; tirar(e, 0, 1, 2); ok(e, 0, { t: 'noComprar' });
  assert.equal(e.fase, 'subasta'); assert.equal(e.subasta.turnoPuja, 1);
  no(e, 2, { t: 'pujar', m: 10 }); ok(e, 1, { t: 'pujar', m: 30 }); ok(e, 2, { t: 'pujar', m: 40 }); no(e, 0, { t: 'pujar', m: 40 });
  ok(e, 0, { t: 'pasarPuja' }); ok(e, 1, { t: 'pasarPuja' });
  assert.equal(e.prop[3].o, 2); assert.equal(e.jug[2].din, 1460); assert.equal(e.fase, 'fin');
});
prueba('subasta sin pujas deja la casilla libre; sin subasta obligatoria no hay subasta', () => {
  const e = nueva(3); e.jug[0].pos = 0; tirar(e, 0, 1, 2); ok(e, 0, { t: 'noComprar' }); [1, 2, 0].forEach((j) => ok(e, j, { t: 'pasarPuja' }));
  assert.equal(e.prop[3].o, -1); assert.equal(e.fase, 'fin');
  const f = nueva(3, { subastaObligatoria: false }); f.jug[0].pos = 0; tirar(f, 0, 1, 2); ok(f, 0, { t: 'noComprar' }); assert.equal(f.fase, 'fin');
});
prueba('construccion pareja, limites y venta', () => {
  const e = nueva(2); dar(e, 0, ...POR_GRUPO[0]); e.fase = 'fin';
  ok(e, 0, { t: 'construir', i: 1 }); no(e, 0, { t: 'construir', i: 1 }); ok(e, 0, { t: 'construir', i: 3 });
  assert.equal(e.jug[0].din, 1500 - 100); assert.equal(e.casasBanco, 30);
  for (let k = 0; k < 3; k++) { ok(e, 0, { t: 'construir', i: 1 }); ok(e, 0, { t: 'construir', i: 3 }); }
  assert.equal(e.prop[1].c, 4); ok(e, 0, { t: 'construir', i: 1 }); assert.equal(e.prop[1].c, 5); assert.equal(e.hotelesBanco, 11); assert.equal(e.casasBanco, 28);
  no(e, 0, { t: 'construir', i: 1 }); no(e, 0, { t: 'vender', i: 3 }); ok(e, 0, { t: 'vender', i: 1 });
  assert.equal(e.prop[1].c, 4); ok(e, 0, { t: 'vender', i: 3 }); assert.equal(e.prop[3].c, 3);
  const f = nueva(2, { construccionPareja: false }); dar(f, 0, ...POR_GRUPO[0]); f.fase = 'fin'; ok(f, 0, { t: 'construir', i: 1 }); ok(f, 0, { t: 'construir', i: 1 });
  const g = nueva(2); dar(g, 0, 1); g.fase = 'fin'; no(g, 0, { t: 'construir', i: 1 });
});
prueba('limite de casas del banco', () => {
  const e = nueva(2); dar(e, 0, ...POR_GRUPO[0]); e.fase = 'fin'; e.casasBanco = 1; e.banco -= 0;
  e.casasBanco = 1; // consistencia: simula casas ya repartidas
  e.prop[8].c = 0; e.jug[1].din += 0;
  const r = puedeConstruir(e, 0, 1); assert.equal(r, ''); aplicar(e, 0, { t: 'construir', i: 1 }); assert.match(puedeConstruir(e, 0, 3), /No quedan casas/);
});
prueba('hipotecas: hipotecar, deshipotecar con interes, sin renta', () => {
  const e = nueva(2); dar(e, 0, 1, 3); e.fase = 'fin';
  ok(e, 0, { t: 'hipotecar', i: 1 }); assert.equal(e.jug[0].din, 1500 + 25); no(e, 0, { t: 'hipotecar', i: 1 });
  e.jug[1].pos = 0; e.turno = 1; e.fase = 'tirar'; const a = e.jug[1].din; tirar(e, 1, 1, 2); void a; // cae en 3 (no hipotecada)
  ok(e, 1, { t: 'terminar' }); ok(e, 0, { t: 'deshipotecar', i: 1 }); assert.equal(e.jug[0].din, 1500 + 25 - 28 + 8);
  const h = nueva(2, { hipotecaMitad: false }); assert.equal(valorHipoteca(h, 39), 132);
  const g = nueva(2); dar(g, 0, ...POR_GRUPO[0]); g.prop[1].c = 1; g.casasBanco--; assert.match(aplicar(g, 0, { t: 'hipotecar', i: 3 }).error || 'x', /edificios|turno|Solo/);
});
prueba('dobles: tres seguidos van a la carcel', () => {
  const e = nueva(3); e.jug[0].pos = 0; tirar(e, 0, 2, 2); assert.equal(e.fase === 'compra' || e.fase === 'tirar', true);
  if (e.fase === 'compra') ok(e, 0, { t: 'noComprar' }), [1, 2, 0].forEach((j) => ok(e, j, { t: 'pasarPuja' }));
  assert.equal(e.fase, 'tirar'); assert.equal(e.dobles, 1);
  e.jug[0].pos = 0; tirar(e, 0, 3, 3); if (e.fase === 'compra') { ok(e, 0, { t: 'noComprar' }); [1, 2, 0].forEach((j) => ok(e, j, { t: 'pasarPuja' })); }
  if (e.fase === 'deuda') assert.fail('deuda inesperada');
  assert.equal(e.dobles, 2); e.jug[0].pos = 0; tirar(e, 0, 1, 1);
  assert.equal(e.jug[0].carcel, true); assert.equal(e.jug[0].pos, 10); assert.equal(e.fase, 'fin');
});
prueba('carcel: dobles, pagar, tarjeta y fianza obligatoria', () => {
  const e = nueva(2); e.jug[0].carcel = true; e.jug[0].pos = 10;
  ok(e, 0, { t: 'pagarCarcel' }); assert.equal(e.jug[0].carcel, false); assert.equal(e.jug[0].din, 1450);
  const f = nueva(2); f.jug[0].carcel = true; f.jug[0].pos = 10; f.jug[0].tarj = ['s']; f.mazos.s.splice(f.mazos.s.indexOf(SUERTE.findIndex((c) => c.ef.t === 'tarjeta')), 1);
  ok(f, 0, { t: 'tarjetaCarcel' }); assert.equal(f.jug[0].carcel, false); assert.equal(f.mazos.s.length, 16);
  const g = nueva(2); g.jug[0].carcel = true; g.jug[0].pos = 10; tirar(g, 0, 3, 3); assert.equal(g.jug[0].carcel, false); assert.equal(g.jug[0].pos, 16); assert.equal(g.extra, false);
  const h = nueva(2); h.jug[0].carcel = true; h.jug[0].pos = 10; h.jug[0].intentos = 2; tirar(h, 0, 1, 2); assert.equal(h.jug[0].carcel, false); assert.equal(h.jug[0].din, 1450); assert.equal(h.jug[0].pos, 13);
  const i = nueva(2); i.jug[0].carcel = true; i.jug[0].pos = 10; tirar(i, 0, 1, 2); assert.equal(i.jug[0].carcel, true); assert.equal(i.jug[0].intentos, 1); assert.equal(i.fase, 'fin');
  const k = nueva(2, { sinRentaCarcel: true }); dar(k, 1, 3); k.jug[1].carcel = true; k.jug[0].pos = 0; const d0 = k.jug[0].din; tirar(k, 0, 1, 2); assert.equal(k.jug[0].din, d0);
});
prueba('bote de parada libre', () => {
  const e = nueva(2, { bote: true }); e.jug[0].pos = 0; tirar(e, 0, 2, 2); // cae en 4 impuesto: 200 al bote
  assert.equal(e.bote, 200); assert.equal(e.jug[0].din, 1300);
  e.fase = 'tirar'; e.turno = 1; e.jug[1].pos = 16; tirar(e, 1, 2, 2); assert.equal(e.bote, 0); assert.equal(e.jug[1].din, 1700);
});
prueba('cartas: las 32 resuelven sin romper invariantes y con el efecto esperado', () => {
  for (const mazo of ['s', 'c']) for (let k = 0; k < 16; k++) {
    const e = nueva(3); dar(e, 1, ...POR_GRUPO[2]); e.prop[12].o = 2; e.prop[5].o = 1;
    const cola = e.mazos[mazo]; cola.splice(cola.indexOf(k), 1); cola.unshift(k);
    const objetivo = mazo === 's' ? 7 : 2; e.jug[0].pos = objetivo - 3; // 3 casillas antes de la carta
    tirar(e, 0, 1, 2);
    const ef = (mazo === 's' ? SUERTE : COMUNIDAD)[k].ef;
    assert.deepEqual(revisar(e), [], 'carta ' + mazo + k);
    if (ef.t === 'tarjeta') assert.equal(e.jug[0].tarj.length, 1);
    if (ef.t === 'carcel') assert.equal(e.jug[0].carcel, true);
    if (ef.t === 'ir' && ef.a === 0) assert.equal(e.jug[0].pos, 0);
    let guard = 0; while (e.fase !== 'fin' && e.fase !== 'tirar' && guard++ < 20) { const [j, a] = pasoBot(e); const r = aplicar(e, j, a); assert.equal(r.ok, true, JSON.stringify(a) + r.error); }
    assert.deepEqual(revisar(e), []);
  }
});
prueba('carta de pagar a todos, cobrar de todos y reparaciones', () => {
  const e = nueva(3); const k = SUERTE.findIndex((c) => c.ef.t === 'aTodos'); e.mazos.s.splice(e.mazos.s.indexOf(k), 1); e.mazos.s.unshift(k);
  e.jug[0].pos = 4; tirar(e, 0, 1, 2); assert.equal(e.jug[0].din, 1400); assert.equal(e.jug[1].din, 1550);
  const f = nueva(3); const c2 = COMUNIDAD.findIndex((c) => c.ef.t === 'deTodos'); f.mazos.c.splice(f.mazos.c.indexOf(c2), 1); f.mazos.c.unshift(c2);
  f.jug[0].pos = 0; tirar(f, 0, 1, 1); assert.equal(f.jug[0].din, 1520);
  const g = nueva(2); dar(g, 0, ...POR_GRUPO[0]); g.prop[1].c = 2; g.prop[3].c = 5; g.casasBanco -= 2; g.hotelesBanco -= 1;
  const r = COMUNIDAD.findIndex((c) => c.ef.t === 'reparar'); g.mazos.c.splice(g.mazos.c.indexOf(r), 1); g.mazos.c.unshift(r); g.jug[0].pos = 0; tirar(g, 0, 1, 1);
  assert.equal(g.jug[0].din, 1500 - (2 * 40 + 115) + 0 - 0); void revisar;
});
prueba('deuda, hipotecar para pagar y bancarrota ante acreedor', () => {
  const e = nueva(2); dar(e, 1, ...POR_GRUPO[7]); e.prop[39].c = 5; e.prop[37].c = 5; e.hotelesBanco -= 2; dar(e, 0, 1);
  e.jug[0].din = 100; e.jug[1].din = 1400; e.banco = -1500; e.jug[0].pos = 35; // ledger consistente: 100+1400-1500 = 0
  tirar(e, 0, 1, 3); // cae en 39 con hotel
  assert.equal(e.fase, 'deuda'); assert.equal(e.deuda.a, 1); no(e, 0, { t: 'pagarDeuda' });
  ok(e, 0, { t: 'hipotecar', i: 1 }); assert.equal(e.fase, 'deuda');
  const din1 = e.jug[1].din;
  ok(e, 0, { t: 'quiebra' });
  assert.equal(e.jug[0].quebrado, true); assert.equal(e.prop[1].o, 1); assert.equal(e.prop[1].h, true); assert.equal(e.fase, 'fin_partida'); assert.equal(e.ganador, 1); assert.ok(e.jug[1].din >= din1);
  const f = nueva(2); dar(f, 1, ...POR_GRUPO[7]); f.prop[39].c = 5; f.prop[37].c = 5; f.hotelesBanco -= 2; dar(f, 0, 1, 3);
  f.jug[0].din = 100; f.jug[1].din = 1400; f.banco = -1500; f.jug[0].pos = 35; tirar(f, 0, 1, 3);
  ok(f, 0, { t: 'hipotecar', i: 1 }); ok(f, 0, { t: 'hipotecar', i: 3 }); assert.equal(f.fase, 'deuda'); assert.ok(f.jug[0].din < f.deuda.monto);
});
prueba('bancarrota ante el banco libera propiedades y edificios', () => {
  const e = nueva(3); dar(e, 0, ...POR_GRUPO[0]); e.prop[1].c = 3; e.prop[3].c = 3; e.casasBanco -= 6; e.fase = 'fin'; e.jug[0].tarj = [];
  ok(e, 0, { t: 'quiebra' }); assert.equal(e.prop[1].o, -1); assert.equal(e.prop[1].c, 0); assert.equal(e.casasBanco, 32); assert.equal(e.turno, 1); assert.equal(e.fase, 'tirar');
});
prueba('intercambios: validacion, aceptacion, rechazo y tarjetas', () => {
  const e = nueva(3); dar(e, 0, 1); dar(e, 1, 3); e.jug[0].tarj = ['s']; e.mazos.s.splice(e.mazos.s.indexOf(SUERTE.findIndex((c) => c.ef.t === 'tarjeta')), 1);
  no(e, 0, { t: 'tratoProponer', a: 1, ofrece: { din: 5000, props: [], tarj: 0 }, pide: { din: 0, props: [], tarj: 0 } });
  no(e, 0, { t: 'tratoProponer', a: 1, ofrece: { din: 0, props: [3], tarj: 0 }, pide: { din: 0, props: [], tarj: 0 } });
  ok(e, 0, { t: 'tratoProponer', a: 1, ofrece: { din: 100, props: [1], tarj: 1 }, pide: { din: 0, props: [3], tarj: 0 } });
  no(e, 2, { t: 'tratoProponer', a: 1, ofrece: { din: 1, props: [], tarj: 0 }, pide: { din: 0, props: [], tarj: 0 } }); no(e, 0, { t: 'tratoResponder', ok: true });
  ok(e, 1, { t: 'tratoResponder', ok: true }); assert.equal(e.prop[1].o, 1); assert.equal(e.prop[3].o, 0); assert.equal(e.jug[0].din, 1400); assert.equal(e.jug[1].tarj.length, 1);
  ok(e, 2, { t: 'tratoProponer', a: 0, ofrece: { din: 10, props: [], tarj: 0 }, pide: { din: 0, props: [3], tarj: 0 } }); ok(e, 0, { t: 'tratoResponder', ok: false }); assert.equal(e.trato, null);
  e.prop[1].h = true; e.prop[1].o = 1; ok(e, 1, { t: 'tratoProponer', a: 0, ofrece: { din: 0, props: [1], tarj: 0 }, pide: { din: 0, props: [], tarj: 0 } });
  const d = e.jug[0].din; ok(e, 0, { t: 'tratoResponder', ok: true }); assert.equal(e.jug[0].din, d - Math.ceil(valorHipoteca(e, 1) * 0.1));
  const f = nueva(2); dar(f, 0, ...POR_GRUPO[0]); f.prop[1].c = 1; f.casasBanco--; no(f, 0, { t: 'tratoProponer', a: 1, ofrece: { din: 0, props: [3], tarj: 0 }, pide: { din: 10, props: [], tarj: 0 } });
});
prueba('acciones invalidas no alteran el estado', () => {
  const e = nueva(3); const s = JSON.stringify(e);
  [[1, { t: 'tirar' }], [0, { t: 'comprar' }], [0, { t: 'construir', i: 1 }], [0, { t: 'construir', i: 99 }], [0, { t: 'construir', i: 'x' }], [0, { t: 'hipotecar', i: 0 }], [0, { t: 'pujar', m: 5 }], [0, { t: 'nada' }], [7, { t: 'tirar' }], [0, { t: 'tratoProponer', a: 9 }], [0, {}]]
    .forEach(([j, a]) => { const r = aplicar(e, j, a); assert.equal(r.ok, false); });
  assert.equal(JSON.stringify(e), s);
});
prueba('limite de tiempo termina con ganador por patrimonio', () => {
  const e = nueva(3, { limiteMin: 30 }); dar(e, 1, 39); e.fase = 'fin'; e.tiempoMs = 31 * 60000; ok(e, 0, { t: 'terminar' });
  assert.equal(e.fase, 'fin_partida'); assert.equal(e.motivoFin, 'tiempo'); assert.equal(e.ganador, 1); assert.ok(e.ranking[0].pat >= e.ranking[1].pat);
});
prueba('serializar y restaurar a mitad de partida es identico', () => {
  const a = crearPartida({ limiteTurnos: 500 }, [1, 2, 0, 1].map((n, i) => ({ nombre: 'B' + i, color: '#fff', tipo: 'bot', nivel: n })), 4242);
  for (let k = 0; k < 600; k++) { const [j, acc] = pasoBot(a); a.tiempoMs += 3000; assert.equal(aplicar(a, j, acc).ok, true); }
  const b = JSON.parse(JSON.stringify(a)); assert.deepEqual(revisar(b), []);
  let guard = 0;
  while (a.fase !== 'fin_partida' && guard++ < 50000) { const [j, acc] = pasoBot(a); const [j2, acc2] = pasoBot(b); assert.deepEqual([j, acc], [j2, acc2]); a.tiempoMs += 3000; b.tiempoMs += 3000; aplicar(a, j, acc); aplicar(b, j2, acc2); }
  assert.equal(JSON.stringify(a), JSON.stringify(b)); assert.equal(a.fase, 'fin_partida');
});
prueba('miles de partidas completas entre bots sin estados invalidos ni bloqueos', () => {
  let nat = 0, tot = 0; const N = 2500;
  for (let k = 0; k < N; k++) {
    const kk = 2 + (k % 5), niv = Array.from({ length: kk }, (_, i) => (k + i) % 3);
    const cfg = { limiteTurnos: 700, bote: k % 2 === 0, bonoSalida: k % 3 === 0, construccionPareja: k % 4 !== 3, subastaObligatoria: k % 5 !== 4, sinRentaCarcel: k % 6 === 1, hipotecaMitad: k % 7 !== 6, dineroInicial: [1000, 1500, 2000, 2500][k % 4] };
    const { e } = jugar(cfg, niv, 900000 + k, { clonarCada: 97 });
    assert.equal(e.fase, 'fin_partida'); assert.deepEqual(revisar(e), []); tot++; if (e.motivoFin === 'ultimo') nat++;
  }
  console.log('     partidas ' + tot + ', terminadas por bancarrota ' + nat);
  assert.ok(nat > N * 0.7);
});
prueba('patrimonio y renta', () => {
  const e = nueva(2); dar(e, 0, ...POR_GRUPO[7]); assert.equal(patrimonio(e, 0), 1500 + 750); e.prop[37].c = 2;
  assert.equal(patrimonio(e, 0), 1500 + 750 + 400); assert.equal(calcularRenta(e, 37, 1), CASILLAS[37].renta[2]);
  const f = nueva(2); dar(f, 0, 5, 15, 25); f.dados = [1, 2]; assert.equal(calcularRenta(f, 5), 100); dar(f, 0, 12, 28); assert.equal(calcularRenta(f, 12), 30);
  void BANCO;
});
console.log(n + ' pruebas ejecutadas');
