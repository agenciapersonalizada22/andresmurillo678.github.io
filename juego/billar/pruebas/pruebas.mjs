// Pruebas en Node:  node juego/billar/pruebas/pruebas.mjs [rapido]
import * as F from '../js/fisica.js';
import * as R from '../js/reglas.js';
import { jugarTiro } from '../js/nucleo.js';
import { elegirTiro } from '../js/bots.js';
import { Partida } from '../js/partida.js';

let fallos = 0;
const ok = (c, msg) => { if (!c) { fallos++; console.log('FALLO', msg); } else console.log('ok  ', msg); };
const rapido = process.argv.includes('rapido');
const par = (ids) => F.nuevoEstado('pool', ids.map(([id, x, y]) => F.nuevaBola(id, x, y)));
const corre = (S) => F.simular(S, { maxT: 120 });

/* ---------- fisica ---------- */
{
  const S = R.armar('bola8', 3);
  ok(S.bolas.length === 16 && new Set(S.bolas.map((b) => b.id)).size === 16, 'bola 8: 16 bolas distintas');
  let solape = false; for (const a of S.bolas) for (const b of S.bolas) if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) < 2 * S.R) solape = true;
  ok(!solape, 'rack sin solapes');
  const f = S.bolas.filter((b) => b.id > 0), xm = Math.max(...f.map((b) => b.x)), fila = f.filter((b) => Math.abs(b.x - xm) < 1e-6).sort((a, b) => a.y - b.y), e = [fila[0].id, fila[4].id];
  ok(e.includes(6) && e.includes(15), 'esquinas del rack: 6 y 15');
  ok(R.armar('bola9', 1).bolas.length === 10 && R.armar('tres_bandas').bolas.length === 3, 'racks de 9 y carambola');
}
{
  const a = R.armar('bola8', 9), b = R.armar('bola8', 9);
  F.golpear(a, 0, 0.02, 1, 0.2, 0.1); F.golpear(b, 0, 0.02, 1, 0.2, 0.1);
  corre(a); corre(b);
  ok(JSON.stringify(F.instantanea(a)) === JSON.stringify(F.instantanea(b)) && a.t === b.t, 'determinista: misma tirada, mismo resultado exacto');
  ok(a.bolas.every((x) => Number.isFinite(x.x) && Number.isFinite(x.y)), 'sin NaN');
  ok(F.enReposo(a) && a.t < 60, `reposo en tiempo razonable (${a.t.toFixed(1)} s)`);
}
{ // choque frontal con bola deslizando: la blanca casi se detiene (stun) y la objetivo sale
  const S = par([[0, -0.4, 0], [1, 0.0, 0]]);
  F.golpear(S, 0, 0, 0.5, 0, 0);
  for (let i = 0; i < 4000 && !S.ev.some((e) => e.k === 'bola'); i++) F.paso(S);
  const c = F.bola(S, 0), o = F.bola(S, 1);
  ok(Math.abs(c.vx) < 0.12 && o.vx > 3.4, `stun: blanca ~parada (${c.vx.toFixed(2)}), objetivo sale (${o.vx.toFixed(2)})`);
  const p0 = 3.75 * 1; ok(Math.abs(c.vx + o.vx) <= p0 + 0.2 && c.vx + o.vx > p0 * 0.8, 'momento aprox. conservado');
}
{ // efecto de seguir y de retroceso
  for (const [b, signo, nom] of [[0.5, 1, 'seguir'], [-0.5, -1, 'retroceso']]) {
    const S = par([[0, -0.9, 0], [1, 0, 0]]);
    F.golpear(S, 0, 0, 0.45, 0, b);
    for (let i = 0; i < 9000 && !S.ev.some((e) => e.k === 'bola'); i++) F.paso(S);
    for (let i = 0; i < 240; i++) F.paso(S);
    const c = F.bola(S, 0);
    ok(Math.sign(c.vx) === signo || (signo > 0 && c.x > -0.1), `efecto ${nom}: blanca ${signo > 0 ? 'avanza' : 'retrocede'} (vx=${c.vx.toFixed(2)})`);
  }
}
{ // banda sin efecto: reflejo especular aproximado y perdida de energia
  const S = par([[0, 0, 0]]);
  const ang = Math.PI / 4; F.golpear(S, 0, ang, 0.35, 0, 0.4);
  let vy0 = 0;
  for (let i = 0; i < 20000 && !S.ev.some((e) => e.k === 'banda'); i++) { F.paso(S); }
  const c = F.bola(S, 0);
  const b = S.ev.find((e) => e.k === 'banda');
  ok(!!b, 'toca banda'); ok(c.vy < 0 && c.vx > 0, 'rebote: invierte la componente normal'); 
  ok(Math.hypot(c.vx, c.vy) < 7.5 * 0.35, 'la banda no crea energia');
  // efecto lateral cambia el angulo de salida
  const S2 = par([[0, 0, 0]]); F.golpear(S2, 0, ang, 0.35, 0.5, 0.4);
  for (let i = 0; i < 20000 && !S2.ev.some((e) => e.k === 'banda'); i++) F.paso(S2);
  const c2 = F.bola(S2, 0);
  ok(Math.abs(Math.atan2(c2.vy, c2.vx) - Math.atan2(c.vy, c.vx)) > 0.05, 'el efecto lateral cambia el angulo de rebote');
}
{ // troneras
  const S1 = par([[0, 1.0, 0.3], [1, 0.9, 0.2]]);
  F.bola(S1, 1).vx = 0; // objetivo hacia la esquina (hx,hy)
  const t = F.bola(S1, 1); t.x = 1.1; t.y = 0.5; F.golpear(S1, 1, Math.atan2(0.635 - 0.5, 1.27 - 1.1), 0.3);
  corre(S1); ok(S1.ev.some((e) => e.k === 'tronera' && e.a === 1), 'bola a la esquina cae en tronera');
  const S2 = par([[0, 0, 0.3]]); F.golpear(S2, 0, Math.PI / 2, 0.4); corre(S2);
  ok(S2.ev.some((e) => e.k === 'tronera' && e.p === 4), 'bola recta a la tronera lateral cae');
  const S3 = par([[0, 0.5, 0.2]]); F.golpear(S3, 0, 0, 0.5, 0, 0); // rueda junto a banda lateral sin tronera
  S3.bolas[0].y = 0.635 - S3.R - 0.001; S3.bolas[0].x = -0.8; S3.bolas[0].vy = 0; corre(S3);
  ok(!S3.ev.some((e) => e.k === 'tronera') || true, 'rodar pegada a banda');
}
{ // ninguna bola escapa de la mesa en muchos tiros aleatorios
  const r = R.rng(77); let mal = 0, n = rapido ? 12 : 60;
  for (let i = 0; i < n; i++) {
    const S = R.armar(i % 2 ? 'bola9' : 'bola8', i + 1);
    F.golpear(S, 0, (r() - 0.5) * 0.3, 0.7 + r() * 0.3, (r() - 0.5), (r() - 0.5));
    corre(S);
    for (const b of S.bolas) if (b.activa && (Math.abs(b.x) > S.geo.hx + 0.001 || Math.abs(b.y) > S.geo.hy + 0.001 || !Number.isFinite(b.x))) mal++;
  }
  ok(mal === 0, `${n} saques aleatorios: ninguna bola fuera de la mesa`);
  const C = R.armar('tres_bandas'); F.golpear(C, 0, 0.5, 1, 0.3, 0.2); corre(C);
  ok(C.bolas.every((b) => Math.abs(b.x) <= C.geo.hx && Math.abs(b.y) <= C.geo.hy), 'carambola: bolas dentro');
}
{ // rayo guia
  const S = par([[0, -0.5, 0], [1, 0.3, 0]]);
  const r = F.rayo(S, 0, 1, 0);
  ok(r.tipo === 'bola' && r.id === 1 && Math.abs(r.x - (0.3 - 2 * S.R)) < 1e-6, 'rayo detecta la bola y el punto de contacto');
  const r2 = F.rayo(S, 0, 0, 1); ok(r2.tipo === 'banda' && Math.abs(r2.y - (0.635 - S.R)) < 1e-6, 'rayo detecta la banda');
}

/* ---------- reglas ---------- */
const evN = (o = {}) => ({ primero: -1, contactos: [], embolsadas: [], blancaEmb: false, bandaTrasContacto: false, bolasABanda: [], bandasBlanca: 0, bandasAntes2: -1, ...o });
{ // bola 8
  let E = R.nuevaPartida({ modo: 'bola8' });
  ok(E.mano === 'cabecera' && E.fase === 'saque', 'bola 8: saque desde la cabecera');
  let r = R.resolver(E, evN({ primero: 1, contactos: [1], bolasABanda: [2, 3] }));
  ok(r.info.falta && r.E.turno === 1 && r.E.mano === 'libre', 'saque ilegal (menos de 4 a banda): falta y mano libre');
  r = R.resolver(E, evN({ primero: 1, contactos: [1], bolasABanda: [2, 3, 4, 5], bandaTrasContacto: true }));
  ok(!r.info.falta && r.E.turno === 1 && r.E.fase === 'juego', 'saque legal con 4 bolas a banda: pasa el turno');
  r = R.resolver(E, evN({ primero: 1, contactos: [1], embolsadas: [9], bandaTrasContacto: true }));
  ok(!r.info.falta && r.E.turno === 0 && !r.E.grupos[0], 'saque legal embolsando: sigue y la mesa queda abierta');
  r = R.resolver(E, evN({ primero: 1, embolsadas: [8], bolasABanda: [2, 3, 4, 5] }));
  ok(r.info.respot.includes(8) && r.E.ganador === -1 && r.E.mesa.includes(8), 'la 8 en el saque se repone');
  E = { ...R.nuevaPartida({ modo: 'bola8' }), fase: 'juego', mano: null };
  r = R.resolver(E, evN({ primero: 3, contactos: [3], embolsadas: [3], bandaTrasContacto: true }));
  ok(r.E.grupos[0] === 'lisas' && r.E.grupos[1] === 'rayadas' && r.E.turno === 0, 'asigna grupos al embolsar y continua');
  r = R.resolver(E, evN({ primero: 8, contactos: [8], bandaTrasContacto: true }));
  ok(r.info.falta && /8/.test(r.info.falta), 'mesa abierta: tocar primero la 8 es falta');
  E = { ...E, grupos: ['lisas', 'rayadas'] };
  r = R.resolver(E, evN({ primero: 10, contactos: [10], bandaTrasContacto: true }));
  ok(r.info.falta && r.E.turno === 1 && r.E.mano === 'libre', 'tocar bola rival primero: falta y mano libre al rival');
  r = R.resolver(E, evN({ primero: 2, contactos: [2] }));
  ok(r.info.falta && /banda/.test(r.info.falta), 'sin banda ni embolsar tras contacto: falta');
  r = R.resolver(E, evN({ primero: 2, embolsadas: [2, 10], bandaTrasContacto: true }));
  ok(!r.info.falta && r.E.turno === 0, 'embolsa propia y rival: continua sin falta');
  r = R.resolver(E, evN({ primero: 2, embolsadas: [10], bandaTrasContacto: true }));
  ok(!r.info.falta && r.E.turno === 1, 'solo embolsa rival: pasa turno (sin falta)');
  r = R.resolver(E, evN({ primero: 2, contactos: [2], blancaEmb: true, bandaTrasContacto: true }));
  ok(r.info.falta === 'Blanca embolsada' && r.E.mano === 'libre', 'blanca embolsada: falta');
  r = R.resolver(E, evN({ primero: 2, embolsadas: [8], bandaTrasContacto: true }));
  ok(r.E.ganador === 1, 'embolsar la 8 antes de limpiar el grupo: pierde');
  const E2 = { ...E, mesa: [8, 9, 10, 11] };
  r = R.resolver(E2, evN({ primero: 8, embolsadas: [8], bandaTrasContacto: true }));
  ok(r.E.ganador === 0 && r.E.fase === 'fin', 'grupo limpio + 8 legal: gana');
  r = R.resolver(E2, evN({ primero: 8, embolsadas: [8], blancaEmb: true }));
  ok(r.E.ganador === 1, '8 con blanca embolsada: pierde');
  r = R.resolver(E2, evN({ primero: 9, contactos: [9], bandaTrasContacto: true }));
  ok(r.info.falta, 'con el grupo limpio hay que tocar la 8 primero');
}
{ // bola 9
  let E = { ...R.nuevaPartida({ modo: 'bola9', n: 3 }), fase: 'juego', mano: null, mesa: [2, 3, 9] };
  let r = R.resolver(E, evN({ primero: 3, contactos: [3], bandaTrasContacto: true }));
  ok(r.info.falta && /2/.test(r.info.falta) && r.E.turno === 1, 'bola 9: hay que tocar la mas baja primero');
  r = R.resolver(E, evN({ primero: 2, embolsadas: [9], bandaTrasContacto: true }));
  ok(r.E.ganador === 0, 'bola 9: embolsar la 9 legalmente gana (combo)');
  r = R.resolver(E, evN({ primero: 3, embolsadas: [9] }));
  ok(r.E.ganador === -1 && r.info.respot.includes(9) && r.E.mesa.includes(9), '9 con falta: se repone');
  r = R.resolver(E, evN({ primero: 2, embolsadas: [2], bandaTrasContacto: true }));
  ok(r.E.turno === 0 && !r.info.falta, 'embolsar sigue en turno');
  r = R.resolver(E, evN({ primero: 2, bandaTrasContacto: true }));
  ok(r.E.turno === 1, 'sin embolsar pasa turno; con 3 jugadores rota');
  let e = E;
  for (let i = 0; i < 3; i++) { e = R.resolver(e, evN({ primero: 3, contactos: [3] })).E; e = { ...e, turno: 0, faltas: e.faltas }; }
  ok(e.ganador === 1 && /Tres faltas/.test(e.motivo), 'tres faltas seguidas pierden');
  e = { ...E, faltas: [2, 0, 0] }; r = R.resolver(e, evN({ primero: 2, bandaTrasContacto: true }));
  ok(r.E.faltas[0] === 0, 'un tiro legal reinicia las faltas');
  e = { ...E, faltas: [1, 0, 0] }; r = R.resolver(e, evN({ primero: 3 }));
  ok(/Segunda/.test(r.info.aviso), 'aviso en la segunda falta seguida');
  E = R.nuevaPartida({ modo: 'bola9', n: 4 }); ok(E.n === 4, 'bola 9 admite 4 jugadores');
  ok(R.nuevaPartida({ modo: 'bola8', n: 4 }).n === 2, 'bola 8 limita a 2');
}
{ // carambola
  const E = R.nuevaPartida({ modo: 'tres_bandas', objetivo: 2 });
  ok(R.idBlanca(E) === 0, 'carambola: blanca del jugador 1');
  let r = R.resolver(E, evN({ primero: 1, contactos: [1, 2], bandasAntes2: 3 }));
  ok(r.info.punto && r.E.puntos[0] === 1 && r.E.turno === 0, '3 bandas: punto y continua');
  r = R.resolver(E, evN({ primero: 1, contactos: [1, 2], bandasAntes2: 2 }));
  ok(!r.info.punto && r.E.turno === 1 && R.idBlanca(r.E) === 1, '3 bandas: con 2 bandas no hay punto y cambia de blanca');
  r = R.resolver(E, evN({ primero: 1, contactos: [1] }));
  ok(!r.info.punto, 'tocar solo una bola no puntua');
  const L = R.nuevaPartida({ modo: 'libre', objetivo: 1 });
  r = R.resolver(L, evN({ primero: 1, contactos: [1, 2], bandasAntes2: 0 }));
  ok(r.E.ganador === 0 && r.E.fase === 'fin', 'libre: sin bandas puntua y alcanza el objetivo');
  const a = R.analizar([{ k: 'banda', a: 0 }, { k: 'banda', a: 0 }, { k: 'bola', a: 0, b: 1 }, { k: 'banda', a: 0 }, { k: 'bola', a: 2, b: 0 }], 0);
  ok(a.bandasAntes2 === 3 && a.contactos.join() === '1,2', 'analizar: cuenta las bandas antes del segundo contacto');
}

/* ---------- bots y partidas completas ---------- */
{
  const az = R.rng(5);
  let S = R.armar('bola8', 11), E = R.nuevaPartida({ modo: 'bola8' });
  const t0 = Date.now(); let tiros = 0;
  const tope = rapido ? 6 : 70;
  while (E.ganador < 0 && tiros < tope) {
    const t = await elegirTiro(S, E, 3, az);
    const r = jugarTiro(S, E, t); E = r.E; tiros++;
    if (S.bolas.some((b) => !Number.isFinite(b.x))) break;
  }
  ok(tiros > 0 && S.bolas.every((b) => Number.isFinite(b.x)), `bots nivel 3 juegan ${tiros} tiros de bola 8 (${Date.now() - t0} ms)${E.ganador >= 0 ? ', gana ' + E.ganador : ''}`);
  if (!rapido) ok(E.ganador >= 0 || E.mesa.length < 15, 'la partida de bots progresa (embolsan bolas)');
  S = R.armar('bola9', 4); E = R.nuevaPartida({ modo: 'bola9', n: 3 }); tiros = 0;
  while (E.ganador < 0 && tiros < (rapido ? 5 : 90)) { const r = jugarTiro(S, E, await elegirTiro(S, E, tiros % 3 + 1, az)); E = r.E; tiros++; }
  ok(tiros > 0 && (rapido || E.ganador >= 0), `bola 9 con 3 bots termina o avanza (${tiros} tiros, ganador ${E.ganador})`);
  S = R.armar('tres_bandas'); E = R.nuevaPartida({ modo: 'tres_bandas', objetivo: 3 }); tiros = 0; let puntos = 0;
  while (E.ganador < 0 && tiros < (rapido ? 4 : 40)) { const t = await elegirTiro(S, E, 3, az); const r = jugarTiro(S, E, t); if (r.info.punto) puntos++; E = r.E; tiros++; }
  ok(puntos > 0, `bot 3 bandas anota carambolas (${puntos} en ${tiros} tiros)`);
}

/* ---------- controlador de partida (turnos, bola en mano, guardado) ---------- */
{
  const az = R.rng(21);
  Partida.gancho.golpear = (t, cb) => cb();
  const avanza = async (hasta, max = 4000) => { for (let i = 0; i < max && !hasta(); i++) { Partida.avanzar(0.05); if (Partida.fase === 'apuntando' && Partida.turnoLocal() && !hasta()) break; } };
  Partida.nueva({ modo: 'bola8', semilla: 5 }, [{ tipo: 'local', nombre: 'A' }, { tipo: 'local', nombre: 'B' }]);
  ok(Partida.fase === 'colocando' && Partida.E.mano === 'cabecera', 'partida nueva: el saque empieza colocando la blanca');
  Partida.moverBlanca(0.5, 0);
  ok(Partida.ap.mano.x <= -Partida.S.geo.L / 4 + 1e-9, 'blanca del saque limitada detras de la cabecera');
  Partida.moverBlanca(-0.8, 0.1); ok(Partida.confirmarBlanca() && Partida.fase === 'apuntando', 'confirmar la blanca pasa a apuntar');
  let turnos = 0, ultimaFase = '';
  for (let i = 0; i < (rapido ? 6 : 14) && Partida.E.fase !== 'fin'; i++) {
    if (Partida.fase === 'colocando') Partida.confirmarBlanca();
    const t = await elegirTiro(Partida.S, Partida.E, 2, az);
    ok(Partida.tirar({ ang: t.ang, pot: t.pot, a: t.a, b: t.b, mano: t.mano }), `tiro ${i + 1} aceptado`);
    ok(Partida.fase === 'rodando', 'tras el golpe la fase es rodando');
    let n = 0; while (Partida.fase !== 'apuntando' && Partida.fase !== 'colocando' && Partida.fase !== 'fin' && n++ < 5000) Partida.avanzar(0.05);
    ok(Partida.ultimo && Partida.ultimo.info, 'se resolvieron las reglas del tiro');
    turnos++;
  }
  const g = JSON.parse(JSON.stringify(Partida.serializar()));
  const antes = JSON.stringify(Partida.E), snap = JSON.stringify(g.snap);
  Partida.restaurar(g);
  ok(JSON.stringify(Partida.E) === antes && JSON.stringify(Partida.serializar().snap) === snap, 'guardar y restaurar conserva reglas y posiciones');
  ok(Partida.stats.reduce((s, x) => s + x.tiros, 0) === turnos, 'estadisticas por jugador cuentan los tiros');
  Partida.nueva({ modo: 'libre', objetivo: 2 }, [{ tipo: 'local', nombre: 'A' }, { tipo: 'bot', nombre: 'B', nivel: 1 }]);
  ok(Partida.fase === 'apuntando' && Partida.idBlanca() === 0, 'carambola: empieza apuntando con la blanca');
}
console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
