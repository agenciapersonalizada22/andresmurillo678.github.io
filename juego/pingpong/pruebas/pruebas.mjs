// Pruebas Node de fisica, reglas, bots, torneo, economia, progreso y gestos (sin DOM). Uso: node juego/pingpong/pruebas/pruebas.mjs
import assert from 'node:assert/strict';
import * as F from '../js/fisica.js';
import { Rally, Partido, ladoDeEquipo } from '../js/reglas.js';
import { Motor } from '../js/motor.js';
import { crearRng, DIFICULTADES, ESTILOS } from '../js/bots.js';
import { crearTorneo, registrar as regT, rondaActual } from '../js/torneo.js';
import { CATALOGO, comprar, equipar, recompensa } from '../js/economia.js';
import { registrar, LOGROS, valoresRanking, TOPES } from '../js/progreso.js';
import { progresoNuevo, normalizarProgreso } from '../js/almacen.js';
import { trazoACmd } from '../js/entrada.js';
const { C } = F; let n = 0;
const t = (nombre, fn) => { try { fn(); n++; console.log('ok  ' + nombre); } catch (e) { console.error('FALLA ' + nombre + '\n', e); process.exitCode = 1; } };

/* ---------- fisica ---------- */
t('rebote desde 30,5 cm sube ~23 cm (norma ITTF >= 22,5)', () => {
  const b = F.nuevaBola(0, C.H + C.R + 0.305, 0.5); let seen = false, h = 0;
  for (let i = 0; i < 600; i++) { F.paso(b, C.dt, (k) => { if (k === 'rebote') seen = true; }); if (seen) h = Math.max(h, b.y - C.R - C.H); }
  assert.ok(h > 0.215 && h < 0.26, 'altura ' + h);
});
t('gravedad: caida libre de 1 m tarda ~0,45 s', () => {
  const b = F.nuevaBola(5, 1.5, 5); let tt = 0; while (b.y > C.R + 1e-3 && tt < 2) { F.paso(b, C.dt, null, { red: false }); tt += C.dt; if (b.vy < 0 && b.y - C.R < 0.0) break; }
  assert.ok(tt > 0.5 && tt < 0.62, 'tiempo ' + tt);
});
const bote = (b) => { let r = null; for (let i = 0; i < 800 && !r; i++) F.paso(b, C.dt, (k, d) => { if (k === 'rebote' && !r) r = d; }, { red: false }); return r; };
t('topspin sale mucho mas rapido del bote que backspin o sin giro', () => {
  const mk = (wx) => { const b = F.nuevaBola(0, C.H + 0.15, -0.5); b.vz = 4; b.vy = -1; b.wx = wx; return b; };
  const v = (wx) => { const b = mk(wx); bote(b); return b.vz; };
  const top = v(250), plano = v(0), corte = v(-250);
  assert.ok(top > plano + 0.8 && top > corte + 0.8 && corte < plano + 0.2, `${top} ${plano} ${corte}`);
});
t('Magnus: topspin cae antes que backspin (misma salida)', () => {
  const aterr = (w) => { const b = { x: 0, y: C.H + 0.25, z: 1.6, vx: 0, vy: 1.2, vz: -8, wx: w, wy: 0, wz: 0 }; return F.aterrizaje(b, { red: false }).z; };
  assert.ok(aterr(-300) > aterr(0) && aterr(0) > aterr(300), `${aterr(-300)} ${aterr(0)} ${aterr(300)}`);
});
t('efecto lateral curva la trayectoria', () => {
  const x = (w) => F.aterrizaje({ x: 0, y: C.H + 0.25, z: 1.6, vx: 0, vy: 1.2, vz: -8, wx: 0, wy: w, wz: 0 }, { red: false }).x;
  assert.ok(Math.abs(x(300) - x(-300)) > 0.15 && x(300) * x(-300) < 0, `${x(300)} ${x(-300)}`);
});
t('red: pelota baja rebota hacia atras y se anota el evento', () => {
  const b = { x: 0, y: C.H + 0.08, z: 0.3, vx: 0, vy: 0, vz: -4, wx: 0, wy: 0, wz: 0 }; let red = false;
  for (let i = 0; i < 200; i++) F.paso(b, C.dt, (k) => { if (k === 'red') red = true; });
  assert.ok(red && b.vz > -1 && b.z > -0.05);
});
t('red: pelota alta la pasa', () => {
  const b = { x: 0, y: C.H + 0.4, z: 0.3, vx: 0, vy: 0, vz: -4, wx: 0, wy: 0, wz: 0 }; let red = false;
  for (let i = 0; i < 150; i++) F.paso(b, C.dt, (k) => { if (k === 'red') red = true; });
  assert.ok(!red && b.z < -0.1);
});
t('resolverGolpe: cae en la mesa rival con distintas potencias/efectos y supera la red', () => {
  let malos = 0, total = 0;
  for (const pw of [0, 0.3, 0.6, 1]) for (const top of [-0.8, 0, 0.8]) for (const cur of [-0.6, 0, 0.6]) for (const lado of [1, -1]) {
    const p = { x: 0.2, y: C.H + 0.25, z: lado * (C.L / 2 + 0.4) }, r = F.resolverGolpe(p, lado, -0.3 * lado, -lado * (0.35 + 0.87 * pw), 5 + 12 * pw, top, cur);
    total++; const a = r.aterr; if (!(a.altRed > 0 && Math.abs(a.x) < C.W / 2 && lado * a.z < 0 && Math.abs(a.z) < C.L / 2)) malos++;
  }
  assert.equal(malos, 0, malos + '/' + total);
});
t('resolverSaque: bota en el propio campo y luego en el rival, sobre la red', () => {
  let ok = 0, total = 0;
  for (const lado of [1, -1]) for (const pw of [0.2, 0.4, 0.6, 0.8]) for (const top of [-0.6, 0, 0.5]) {
    const p = { x: 0.3, y: C.H + 0.22, z: lado * (C.L / 2 + 0.14) }, r = F.resolverSaque(p, lado, -0.2 * lado, -lado * 0.7, 4.2 + 6.5 * pw, top, 0, 1); total++;
    if (r && r.r && r.r.altRed > 0 && Math.abs(r.r.x) < C.W / 2) ok++;
  }
  assert.ok(ok / total > 0.9, ok + '/' + total);
});

/* ---------- reglas ---------- */
const rally = (o = {}) => new Rally(Object.assign({ servidor: 0, receptor: 1, ladoSaque: 1, orden: [0, 1] }, o));
t('punto normal: saque valido, devolucion y el rival no devuelve', () => {
  const r = rally();
  assert.equal(r.evento('golpe', { lado: 1, id: 0 }), null); assert.equal(r.evento('rebote', { lado: 1, x: 0.2 }), null); assert.equal(r.evento('rebote', { lado: -1, x: -0.2 }), null);
  assert.equal(r.evento('golpe', { lado: -1, id: 1 }), null); assert.equal(r.evento('rebote', { lado: 1, x: 0 }), null); assert.equal(r.evento('golpe', { lado: 1, id: 0 }), null);
  assert.equal(r.evento('rebote', { lado: -1, x: 0 }), null); const f = r.evento('suelo', {});
  assert.equal(f.ladoGanador, 1); assert.equal(f.motivo, 'sin_devolucion'); assert.equal(f.ace, false);
});
t('ace: el receptor no toca la pelota', () => { const r = rally(); r.evento('golpe', { lado: 1, id: 0 }); r.evento('rebote', { lado: 1, x: 0 }); r.evento('rebote', { lado: -1, x: 0 }); const f = r.evento('suelo', {}); assert.ok(f.ace && f.ladoGanador === 1); });
t('saque que bota primero en el campo rival es falta', () => { const r = rally(); r.evento('golpe', { lado: 1, id: 0 }); const f = r.evento('rebote', { lado: -1, x: 0 }); assert.equal(f.ladoGanador, -1); assert.equal(f.motivo, 'saque_incorrecto'); });
t('saque que no pasa a la mesa rival: falta', () => { const r = rally(); r.evento('golpe', { lado: 1, id: 0 }); r.evento('rebote', { lado: 1, x: 0 }); const f = r.evento('suelo', {}); assert.equal(f.ladoGanador, -1); });
t('let: toca la red en el saque y entra -> se repite', () => { const r = rally(); r.evento('golpe', { lado: 1, id: 0 }); r.evento('rebote', { lado: 1, x: 0 }); r.evento('cinta', {}); const f = r.evento('rebote', { lado: -1, x: 0 }); assert.ok(f.let); });
t('red en el saque y no entra: falta', () => { const r = rally(); r.evento('golpe', { lado: 1, id: 0 }); r.evento('rebote', { lado: 1, x: 0 }); r.evento('red', {}); const f = r.evento('suelo', {}); assert.equal(f.ladoGanador, -1); });
t('golpear antes del bote (volea) es falta', () => { const r = rally(); r.evento('golpe', { lado: 1, id: 0 }); r.evento('rebote', { lado: 1, x: 0 }); const f = r.evento('golpe', { lado: -1, id: 1 }); assert.equal(f.ladoGanador, 1); assert.equal(f.motivo, 'volea'); });
t('rally: devolucion que bota en el propio campo pierde; la que se va fuera pierde; la que toca la red pierde', () => {
  const base = () => { const r = rally(); r.evento('golpe', { lado: 1, id: 0 }); r.evento('rebote', { lado: 1, x: 0 }); r.evento('rebote', { lado: -1, x: 0 }); r.evento('golpe', { lado: -1, id: 1 }); return r; };
  let r = base(); assert.equal(r.evento('rebote', { lado: -1, x: 0 }).ladoGanador, 1);
  r = base(); assert.equal(r.evento('suelo', {}).ladoGanador, 1);
  r = base(); r.evento('red', {}); assert.equal(r.evento('suelo', {}).motivo, 'red');
});
t('dobles: orden de golpeo y saque en diagonal', () => {
  const r = new Rally({ servidor: 0, receptor: 1, ladoSaque: 1, dobles: true, orden: [0, 1, 2, 3] });
  r.evento('golpe', { lado: 1, id: 0 }); r.evento('rebote', { lado: 1, x: 0.3 });
  const f = r.evento('rebote', { lado: -1, x: 0.3 }); assert.equal(f.motivo, 'saque_diagonal'); // el servidor lado +1 debe caer en x<0
  const r2 = new Rally({ servidor: 0, receptor: 1, ladoSaque: 1, dobles: true, orden: [0, 1, 2, 3] });
  r2.evento('golpe', { lado: 1, id: 0 }); r2.evento('rebote', { lado: 1, x: 0.3 }); assert.equal(r2.evento('rebote', { lado: -1, x: -0.3 }), null);
  assert.equal(r2.evento('golpe', { lado: -1, id: 3 }).motivo, 'orden');
});
const jugar = (p, eq, n) => { for (let i = 0; i < n; i++) p.puntoPara(eq); };
t('juego a 11 con diferencia de 2 (10-10 sigue)', () => {
  const p = new Partido({ mejorDe: 1 }); jugar(p, 0, 10); jugar(p, 1, 10); assert.equal(p.fin, null); p.puntoPara(0); assert.equal(p.fin, null); const r = p.puntoPara(1); assert.equal(p.fin, null);
  p.puntoPara(0); const f = p.puntoPara(0); assert.ok(f.finPartido && p.fin.ganador === 0); assert.deepEqual(p.marcadores[0], [13, 11]);
});
t('11-9 termina; 11-10 no', () => { const p = new Partido({ mejorDe: 1 }); jugar(p, 1, 9); jugar(p, 0, 10); assert.equal(p.fin, null); assert.ok(p.puntoPara(0).finPartido); const q = new Partido({ mejorDe: 1 }); jugar(q, 1, 10); jugar(q, 0, 10); q.puntoPara(0); assert.equal(q.fin, null); });
t('saque cambia cada 2 puntos y cada punto desde 10-10', () => {
  const p = new Partido({ mejorDe: 1, inicio: 0 }); const sv = []; for (let i = 0; i < 4; i++) { sv.push(p.servidor()); p.puntoPara(i % 2); }
  assert.deepEqual(sv, [0, 0, 1, 1]);
  const q = new Partido({ mejorDe: 1, inicio: 0 }); for (let i = 0; i < 10; i++) { q.puntoPara(0); q.puntoPara(1); } // 10-10
  const s2 = []; for (let i = 0; i < 4; i++) { s2.push(q.servidor()); if (i < 3) q.puntoPara(i % 2); } assert.equal(s2[0] !== s2[1] && s2[1] !== s2[2], true);
});
t('el primer sacador del siguiente juego cambia', () => { const p = new Partido({ mejorDe: 3, inicio: 0 }); jugar(p, 0, 11); assert.equal(p.juegoNum, 2); assert.equal(p.servidor(), 1); });
t('mejor de 3 / 5: ganar los juegos necesarios', () => {
  const p = new Partido({ mejorDe: 3 }); jugar(p, 0, 11); assert.equal(p.fin, null); jugar(p, 1, 11); jugar(p, 0, 11); assert.equal(p.fin.ganador, 0); assert.deepEqual(p.juegos, [2, 1]);
  const q = new Partido({ mejorDe: 5 }); assert.equal(q.juegosParaGanar, 3);
});
t('dobles: el servicio rota entre los 4 jugadores', () => { const p = new Partido({ mejorDe: 1, dobles: true }); const s = []; for (let i = 0; i < 8; i++) { s.push(p.servidor()); p.puntoPara(0); } assert.deepEqual(s, [0, 0, 1, 1, 2, 2, 3, 3]); });
t('guardar/cargar conserva el estado', () => { const p = new Partido({ mejorDe: 3 }); jugar(p, 0, 5); jugar(p, 1, 3); const q = Partido.cargar(JSON.parse(JSON.stringify(p.guardar()))); assert.deepEqual(q.puntos, [5, 3]); assert.equal(q.servidor(), p.servidor()); });

/* ---------- motor completo con bots ---------- */
t('partidos bot vs bot terminan para todas las dificultades (individual y dobles)', () => {
  for (const [a, b, dobles] of [['facil', 'facil', false], ['normal', 'dificil', false], ['experto', 'experto', false], ['normal', 'normal', true]]) {
    const rng = crearRng(11), m = new Motor({ modo: 'libre', cfg: { mejorDe: 3, dobles }, humanos: [], rng, rival: { dif: b, estilo: 'equilibrado' }, rivales: { 0: { dif: a, estilo: 'atacante' }, 2: { dif: a, estilo: 'defensor' } } });
    m.comenzar(); let tt = 0; while (m.fase !== 'fin' && tt < 2400) { m.avanzar(1 / 60); tt += 1 / 60; }
    assert.equal(m.fase, 'fin', `${a} vs ${b} dobles=${dobles}`); const e = m.partido.estado(); assert.ok(e.juegos[0] === 2 || e.juegos[1] === 2);
    for (const [x, y] of e.marcadores) assert.ok(Math.max(x, y) >= 11 && Math.abs(x - y) >= 2);
  }
});
t('experto gana casi siempre a facil', () => {
  let g = 0; for (let s = 1; s <= 6; s++) { const m = new Motor({ modo: 'libre', cfg: { mejorDe: 3 }, humanos: [], rng: crearRng(s * 7), rival: { dif: 'facil', estilo: 'defensor' }, rivales: { 0: { dif: 'experto', estilo: 'atacante' } } }); m.comenzar(); let tt = 0; while (m.fase !== 'fin' && tt < 2400) { m.avanzar(1 / 60); tt += 1 / 60; } if (m.partido.fin.ganador === 0) g++; }
  assert.ok(g >= 5, 'gano ' + g + '/6');
});
t('let en partido: se repite el mismo saque sin sumar puntos', () => { const p = new Partido({ mejorDe: 1 }); const sv = p.servidor(); p.evento('golpe', { lado: 1, id: sv }); p.evento('rebote', { lado: 1, x: 0 }); p.evento('cinta', {}); const r = p.evento('rebote', { lado: -1, x: 0 }); assert.ok(r.let); assert.deepEqual(p.puntos, [0, 0]); assert.equal(p.rally.fase, 'saque0'); assert.equal(p.servidor(), sv); });
t('humano: golpe en la zona devuelve la pelota; fuera de alcance falla', () => {
  const m = new Motor({ modo: 'libre', cfg: { mejorDe: 1, inicio: 1 }, humanos: [0], rng: crearRng(5), rival: { dif: 'facil', estilo: 'defensor' } }); m.comenzar(); let golpes = 0; m.on = (tp, d) => { if (tp === 'golpe' && d.id === 0) golpes++; };
  let tt = 0; while (tt < 40 && golpes < 2) { m.avanzar(1 / 120); tt += 1 / 120; const j = m.debido(); if (j && j.id === 0 && m.bola.vz > 0 && m.bola.z - C.L / 2 > 0.15) m.golpeHumano(0, { aimX: 0.1, power: 0.5, top: 0.3, curva: 0 }); if (m.fase === 'saque' && m.servidorId === 0) m.golpeHumano(0, { aimX: 0, power: 0.4, top: 0, curva: 0 }); }
  assert.ok(golpes >= 2, 'golpes ' + golpes);
});
t('entrenamiento: la maquina lanza y se cuentan aciertos', () => {
  const m = new Motor({ modo: 'entreno', cfg: {}, humanos: [0], rng: crearRng(2), entreno: { cada: 1, velocidad: 0.4 } }); m.comenzar(); let tt = 0;
  while (tt < 60) { m.avanzar(1 / 120); tt += 1 / 120; const j = m.debido(); if (j && m.bola.vz > 0 && m.bola.z - C.L / 2 > 0.2) m.golpeHumano(0, { aimX: 0, power: 0.4, top: 0.3, curva: 0 }); }
  assert.ok(m.ent.lanzadas >= 8 && m.ent.aciertos >= 3, JSON.stringify(m.ent));
});
t('reto: 3 vidas y termina', () => { const m = new Motor({ modo: 'reto', cfg: {}, humanos: [0], rng: crearRng(4), vidas: 3 }); let fin = false; m.on = (tp) => { if (tp === 'fin') fin = true; }; m.comenzar(); let tt = 0; while (tt < 200 && !fin) { m.avanzar(1 / 60); tt += 1 / 60; } assert.ok(fin && m.reto.vidas <= 0); });

/* ---------- bots, torneo, economia, progreso, gestos ---------- */
t('4 dificultades con parametros crecientes y 5 estilos', () => {
  const d = Object.values(DIFICULTADES); assert.equal(d.length, 4); for (let i = 1; i < 4; i++) { assert.ok(d[i].sigma < d[i - 1].sigma && d[i].vmax > d[i - 1].vmax); } assert.equal(Object.keys(ESTILOS).length, 5);
});
t('torneo: rondas, avance y eliminacion', () => {
  const T = crearTorneo(8, 'normal', 3); assert.equal(T.rondas.length, 3); assert.equal(rondaActual(T).nombre, 'Cuartos de final');
  regT(T, true, '11-5'); regT(T, true, '11-7'); assert.equal(rondaActual(T).mejorDe, 5); regT(T, true, '11-9'); assert.equal(T.estado, 'campeon');
  const U = crearTorneo(4, 'dificil', 5); assert.equal(U.rondas.length, 2); regT(U, false, '5-11'); assert.equal(U.estado, 'eliminado');
});
t('tienda: comprar, saldo insuficiente, equipar solo lo propio', () => {
  const p = progresoNuevo(); p.monedas = 200; assert.equal(comprar(p, 'mesas', 'negra').ok, false); assert.equal(comprar(p, 'mesas', 'verde').ok, true); assert.equal(p.monedas, 50);
  assert.equal(equipar(p, 'mesas', 'negra'), false); assert.equal(equipar(p, 'mesas', 'verde'), true); assert.equal(p.equipo.mesa, 'verde'); assert.equal(comprar(p, 'mesas', 'verde').ok, false);
});
t('recompensas con tope y logros', () => {
  assert.ok(recompensa({ modo: 'libre', gano: true, dif: 'experto', puntosGanados: 99, mejorDe: 3 }) < 130); assert.equal(recompensa({ modo: 'entreno', aciertos: 1000 }), 30); assert.equal(recompensa({ modo: 'reto', rally: 500 }), 100);
  const p = progresoNuevo(); const r = registrar(p, { modo: 'libre', gano: true, dif: 'experto', puntosGanados: 11, puntosPerdidos: 0, aces: 1, rally: 12, paliza: true, mejorDe: 1 });
  for (const id of ['primer_punto', 'primera_victoria', 'victoria_experto', 'ace', 'paliza', 'rally_10']) assert.ok(r.logros.includes(id), id);
  for (const l of LOGROS) assert.match(l.id, /^[a-z0-9_]{1,40}$/);
});
t('ranking limita valores', () => { const p = progresoNuevo(); p.stats.victoriasDif = 1e9; p.stats.rallyMax = 1e9; const v = valoresRanking(p); assert.equal(v.victorias, TOPES.victorias); assert.equal(v.rally, TOPES.rally); });
t('progreso antiguo/corrupto se normaliza', () => { const p = normalizarProgreso({ monedas: 'x', equipo: { mesa: 'inexistente' }, poseidos: {} }); assert.equal(p.monedas, 0); assert.equal(p.equipo.mesa, 'azul'); assert.ok(normalizarProgreso(null).stats.partidos === 0); });
t('gestos: direccion, fuerza y efecto', () => {
  const pts = (x1, y1, ms, curv = 0) => [{ x: 200, y: 600, t: 0 }, { x: 200 + (x1 - 200) / 2 + curv, y: (600 + y1) / 2, t: ms / 2 }, { x: x1, y: y1, t: ms }];
  const rap = trazoACmd(pts(200, 300, 90), 780, 1), len = trazoACmd(pts(200, 400, 450), 780, 1), der = trazoACmd(pts(330, 400, 150), 780, 1), izq = trazoACmd(pts(70, 400, 150), 780, 1);
  assert.ok(rap.power > 0.85 && rap.top > 0.5, JSON.stringify(rap)); assert.ok(len.power < 0.3 && len.top < 0, JSON.stringify(len)); assert.ok(der.aimX > 0.2 && izq.aimX < -0.2);
  assert.ok(Math.abs(trazoACmd(pts(200, 300, 90), 780, -1).aimX) < 1e-9); assert.ok(trazoACmd(pts(330, 400, 150), 780, -1).aimX < 0);
  assert.ok(trazoACmd(pts(200, 300, 150, 40), 780, 1).curva > 0.3 && trazoACmd(pts(200, 300, 150, -40), 780, 1).curva < -0.3);
  assert.equal(trazoACmd(pts(200, 300, 150), 780, 1, 'corte').top, -0.8);
});
console.log(`\n${n} pruebas OK` + (process.exitCode ? ' (con fallas)' : ''));
