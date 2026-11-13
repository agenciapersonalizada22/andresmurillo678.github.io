// Pruebas de logica pura (sin DOM): node juego/mente/pruebas/pruebas.mjs
import assert from 'node:assert/strict';
import { crearRng } from '../js/azar.js';
import * as Esc from '../js/logica/escalera.js';
import * as P from '../js/logica/puntaje.js';
import { elegir, pesosAreas } from '../js/logica/sesiondiaria.js';
import * as Mat from '../js/logica/matrices.js';
import * as Sec from '../js/logica/secuencias.js';
import * as Ana from '../js/logica/anagramas.js';
import * as Han from '../js/logica/hanoi.js';
import * as Rut from '../js/logica/rutas.js';
import * as Cal from '../js/logica/calculo.js';
let n = 0;
const t = (nombre, f) => { f(); n++; console.log('ok  ' + nombre); };

t('rng reproducible', () => { const a = crearRng(7), b = crearRng(7); for (let i = 0; i < 20; i++) assert.equal(a.f(), b.f()); assert.notEqual(crearRng(1).f(), crearRng(2).f()); });
t('escalera: sube tras 2 aciertos y baja tras 1 error', () => {
  const e = Esc.crear(5); Esc.registrar(e, true); assert.equal(e.nivel, 5); Esc.registrar(e, true); assert.equal(e.nivel, 6);
  Esc.registrar(e, false); assert.equal(e.nivel, 5); Esc.registrar(e, true); Esc.registrar(e, false); assert.equal(e.nivel, 4);
});
t('escalera: limites 1..20', () => { const e = Esc.crear(1); for (let i = 0; i < 5; i++) Esc.registrar(e, false); assert.equal(e.nivel, 1); for (let i = 0; i < 80; i++) Esc.registrar(e, true); assert.equal(e.nivel, 20); });
t('escalera 1-arriba', () => { const e = Esc.crear(3, { subir: 1 }); Esc.registrar(e, true); assert.equal(e.nivel, 4); });
t('escalera: giros y estimado', () => {
  const e = Esc.crear(5); const patron = [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0]; patron.forEach((x) => Esc.registrar(e, !!x));
  assert.ok(e.giros.length >= 3); const est = Esc.estimado(e); assert.ok(est >= 5 && est <= 7, 'est ' + est);
});
t('escalera converge cerca del nivel donde p(acierto)~0.71', () => {
  const rng = crearRng(3), e = Esc.crear(1), real = 10; // jugador: acierta con prob logistica alrededor del nivel 10
  for (let i = 0; i < 600; i++) Esc.registrar(e, rng.f() < 1 / (1 + Math.exp((e.nivel - real) / 1.8)));
  const est = Esc.estimado(e); assert.ok(est > 8 && est < 12.5, 'est ' + est);
});
t('escalera: jugador mejor termina mas arriba', () => {
  const sim = (real, sem) => { const rng = crearRng(sem), e = Esc.crear(3); for (let i = 0; i < 400; i++) Esc.registrar(e, rng.f() < 1 / (1 + Math.exp((e.nivel - real) / 1.5))); return Esc.estimado(e); };
  assert.ok(sim(15, 1) > sim(6, 1) + 4);
});
t('interpolar', () => { assert.equal(Esc.interpolar(1, 100, 200), 100); assert.equal(Esc.interpolar(20, 100, 200), 200); });

t('percentil: calibrando con pocos datos', () => assert.deepEqual(P.percentil(10, [1, 2, 3]), { pct: null, n: 3, calibrando: true }));
t('percentil: mejor, peor, empate', () => {
  const h = [10, 20, 30, 40, 50];
  assert.equal(P.percentil(60, h).pct, 100); assert.equal(P.percentil(0, h).pct, 0); assert.equal(P.percentil(30, h).pct, 50);
});
t('indice de area', () => { assert.equal(P.indiceArea([]), null); assert.equal(P.indiceArea([null]), null); assert.equal(P.indiceArea([10, 6]), 400); assert.equal(P.indiceArea([20, 20]), 1000); assert.equal(P.indiceArea([25]), 1000); });
t('medallas y puntos', () => { assert.equal(P.medalla(4.9), null); assert.equal(P.medalla(5), 'bronce'); assert.equal(P.medalla(9), 'plata'); assert.equal(P.medalla(14), 'oro'); assert.ok(P.puntosEnsayo(10, 5) > P.puntosEnsayo(2, 0)); assert.ok(P.puntosEnsayo(10, 50) === P.puntosEnsayo(10, 10)); });
t('suavizado EMA', () => { assert.equal(P.suavizar(null, 7), 7); assert.equal(P.suavizar(10, 5, 0.4), 8); });
t('racha diaria', () => {
  assert.equal(P.rachaActual(['2026-11-11', '2026-11-12', '2026-11-13'], '2026-11-13'), 3);
  assert.equal(P.rachaActual(['2026-11-11', '2026-11-12'], '2026-11-13'), 2, 'hoy aun no jugaste: sigue viva');
  assert.equal(P.rachaActual(['2026-11-09', '2026-11-10'], '2026-11-13'), 0);
  assert.equal(P.rachaActual(['2026-02-27', '2026-02-28', '2026-03-01'], '2026-03-01'), 3, 'cruza de mes');
  assert.equal(P.mejorRacha(['2026-01-01', '2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07']), 3);
});

const AREAS = ['memoria', 'atencion', 'velocidad', 'flexibilidad', 'logica'].map((id) => ({ id }));
const GPA = Object.fromEntries(AREAS.map((a, i) => [a.id, [a.id + '1', a.id + '2', a.id + '3', a.id + '4']]));
const estado = (idx, ult = {}) => ({ areas: Object.fromEntries(AREAS.map((a) => [a.id, { idx: idx[a.id] ?? null, ultimoDia: ult[a.id] ?? null }])), juegos: {} });
t('sesion diaria: 5 juegos distintos, determinista por semilla', () => {
  const a = elegir({ areas: AREAS, juegosPorArea: GPA, estado: estado({}), hoyNum: 100, semilla: 'x' }), b = elegir({ areas: AREAS, juegosPorArea: GPA, estado: estado({}), hoyNum: 100, semilla: 'x' });
  assert.equal(a.juegos.length, 5); assert.equal(new Set(a.juegos).size, 5); assert.deepEqual(a.juegos, b.juegos);
});
t('sesion diaria: sin datos reparte 1 por area', () => {
  const r = elegir({ areas: AREAS, juegosPorArea: GPA, estado: estado({}), hoyNum: 100, semilla: 's' });
  assert.equal(new Set(r.areas).size, 5);
});
t('sesion diaria: el area debil recibe mas cupos (max 2) y se mantiene diversidad', () => {
  const idx = { memoria: 700, atencion: 700, velocidad: 700, flexibilidad: 700, logica: 150 }, ult = Object.fromEntries(AREAS.map((a) => [a.id, 100]));
  const r = elegir({ areas: AREAS, juegosPorArea: GPA, estado: estado(idx, ult), hoyNum: 100, semilla: 'd' });
  assert.equal(r.cupos.logica, 2); assert.ok(Math.max(...Object.values(r.cupos)) <= 2); assert.ok(new Set(r.areas).size >= 4);
});
t('sesion diaria: pesos: debilidad y frescura', () => {
  const p = pesosAreas(AREAS, estado({ memoria: 800, atencion: 200 }, { memoria: 100, atencion: 90 }), 100), m = p.find((x) => x.id === 'memoria'), a = p.find((x) => x.id === 'atencion'), v = p.find((x) => x.id === 'velocidad');
  assert.ok(a.debil > m.debil); assert.ok(a.fresco > m.fresco); assert.equal(v.debil, 1); assert.equal(v.fresco, 1);
});
t('sesion diaria: no hay dos juegos del mismo area seguidos (cuando es posible)', () => {
  for (let s = 0; s < 30; s++) { const r = elegir({ areas: AREAS, juegosPorArea: GPA, estado: estado({ memoria: 100, atencion: 900, velocidad: 900, flexibilidad: 900, logica: 900 }, { memoria: 99 }), hoyNum: 100, semilla: 's' + s }); for (let i = 1; i < r.areas.length; i++) if (r.areas.length >= 4) assert.notEqual(r.areas[i], r.areas[i - 1], r.areas.join()); }
});
t('sesion diaria: prefiere los juegos menos recientes', () => {
  const est = estado({}); est.juegos = { memoria1: { ultima: 5 }, memoria2: { ultima: 1 }, memoria3: { ultima: 9 }, memoria4: { ultima: 3 } };
  const r = elegir({ areas: [{ id: 'memoria' }], juegosPorArea: { memoria: GPA.memoria }, estado: { areas: { memoria: { idx: null, ultimoDia: null } }, juegos: est.juegos }, hoyNum: 1, semilla: 'q', n: 2 });
  assert.deepEqual(r.juegos.sort(), ['memoria2', 'memoria4']);
});

t('matrices: coherentes, solucionables, opciones unicas', () => {
  for (let nivel = 1; nivel <= 20; nivel++) for (let s = 0; s < 40; s++) {
    const m = Mat.generar(crearRng(nivel * 100 + s), nivel);
    assert.ok(Mat.coherente(m), 'regla incoherente'); assert.equal(m.visibles.length, 8);
    assert.ok(Mat.esCorrecta(m, m.correcta)); assert.equal(m.opciones.filter((_, i) => Mat.esCorrecta(m, i)).length, 1, 'mas de una correcta');
    assert.equal(new Set(m.opciones.map((o) => Mat.ATRIBUTOS.map((k) => o[k]).join(''))).size, m.opciones.length);
  }
});
t('matrices: la respuesta se deduce de la fila 3 (latino) o de las reglas', () => {
  const m = Mat.generar(crearRng(5), 16);
  for (const k of Mat.ATRIBUTOS) if (m.reglas[k].tipo === 'latino') { const fila = [Mat.celda(m.reglas, 2, 0)[k], Mat.celda(m.reglas, 2, 1)[k]]; const falta = [0, 1, 2].find((v) => !fila.includes(v)); assert.equal(Mat.celda(m.reglas, 2, 2)[k], falta); }
});
t('secuencias: validas para todos los niveles', () => {
  for (let nivel = 1; nivel <= 20; nivel++) for (let s = 0; s < 60; s++) { const q = Sec.generar(crearRng(nivel * 77 + s), nivel); assert.ok(Sec.validar(q), q.tipo + ' ' + JSON.stringify(q)); assert.equal(q.opciones.length, 4); }
});
t('secuencias: terminos conocidos', () => { assert.equal(Sec.termino('aritmetica', { a: 2, d: 3 }, 4), 14); assert.equal(Sec.termino('geometrica', { a: 1, r: 2 }, 5), 32); assert.equal(Sec.termino('fibonacci', { a: 1, b: 1 }, 5), 8); assert.equal(Sec.termino('triangular', { a: 1, d: 1 }, 3), 7); });
t('anagramas: diccionario y validacion', () => {
  assert.ok(Ana.PALABRAS.length >= 150); assert.ok(Ana.PALABRAS.every((w) => /^[a-z]+$/.test(w)), 'sin tildes ni enie');
  assert.ok(Ana.validar(['s', 'a', 'c', 'a'], 'casa')); assert.ok(!Ana.validar(['s', 'a', 'c', 'a'], 'saca'), 'saca no esta en el diccionario'); assert.ok(!Ana.validar(['c', 'a', 's', 'a'], 'cas')); assert.ok(!Ana.validar(['c', 'a', 's', 'a'], 'cosa'));
});
t('anagramas: generador mezcla y tiene solucion', () => {
  for (let nivel = 1; nivel <= 20; nivel++) for (let s = 0; s < 30; s++) { const a = Ana.generar(crearRng(nivel * 11 + s), nivel); assert.notEqual(a.letras.join(''), a.palabra); assert.ok(Ana.validar(a.letras, a.palabra)); assert.ok(a.soluciones.includes(a.palabra)); assert.equal(a.letras.length, a.palabra.length); }
  assert.ok(Ana.largoPara(1) < Ana.largoPara(20));
});
t('hanoi: reglas y solucion optima', () => {
  let e = Han.inicial(3); assert.equal(Han.mover(e, 1, 0).ok, false); assert.equal(Han.mover(e, 0, 0).ok, false);
  e = Han.mover(e, 0, 1).estado; assert.equal(Han.mover(e, 0, 1).ok, false, 'grande sobre pequeno'); assert.equal(e.varillas[0].length, 2);
  for (let n = 1; n <= 7; n++) { let s = Han.inicial(n); const sol = Han.solucion(n); assert.equal(sol.length, Han.optimo(n)); for (const [a, b] of sol) { const r = Han.mover(s, a, b); assert.ok(r.ok); s = r.estado; } assert.ok(Han.resuelto(s)); assert.equal(s.movs, Han.optimo(n)); }
  assert.ok(Han.discosPara(1) < Han.discosPara(20));
});
t('rutas: generador resoluble y validador', () => {
  for (let nivel = 1; nivel <= 20; nivel += 1) for (let s = 0; s < 8; s++) {
    const p = Rut.generar(crearRng(nivel * 31 + s), nivel), sol = Rut.solucion(p);
    assert.ok(sol, 'sin solucion'); assert.equal(sol.length, p.optimo); const v = Rut.validarRuta(p, sol); assert.ok(v.valida && v.llego);
    if (p.paradas.length) assert.ok(!Rut.validarRuta(p, sol.slice(0, -1)).llego);
  }
  assert.equal(Rut.validarRuta({ w: 2, h: 2, muros: new Set(['1,0']), inicio: { x: 0, y: 0 }, meta: { x: 1, y: 1 }, paradas: [] }, [1]).valida, false, 'muro');
  assert.equal(Rut.validarRuta({ w: 2, h: 2, muros: new Set(), inicio: { x: 0, y: 0 }, meta: { x: 1, y: 1 }, paradas: [] }, [3]).valida, false, 'fuera');
});
t('calculo: resultados correctos y opciones validas', () => {
  for (let nivel = 1; nivel <= 20; nivel++) for (let s = 0; s < 80; s++) {
    const p = Cal.generar(crearRng(nivel * 13 + s), nivel);
    assert.equal(Cal.evaluar(p.texto), p.resp, p.texto); assert.equal(p.opciones[p.correcta], p.resp); assert.equal(new Set(p.opciones).size, 4); assert.ok(Number.isInteger(p.resp) && p.resp >= 0);
  }
});
console.log(`\n${n} pruebas pasaron`);
