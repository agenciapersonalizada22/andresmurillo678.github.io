// Sesion de juego: anfitrion autoritativo (o partida local), clientes de red, bots, temporizador y guardado.
import { X } from './contexto.js';
import { crearPartida, aplicar, quienActua, terminarPartida } from './reglas.js';
import { decidir, aceptaTrato } from './bots.js';
import { leer, guardar, borrar, CLAVES } from './almacen.js';
import { aviso } from './dom.js';
import { sfx } from './sonido.js';
import * as Vista from './vista.js';
import { burbuja } from './hud.js';
import { mensajes } from './hojas.js';
import * as Logros from './logros.js';
import { REGLAS_BASE } from './datos.js';
import { usuario } from './nube.js';

const Red = window.Red, Lobby = window.Lobby;
const NOMBRES_BOT = ['Aurora', 'Bruno', 'Camila', 'Dante', 'Elena', 'Fabio'];
const COLORES = ['#3df5ff', '#ff4fd8', '#ffd23d', '#6dff6d', '#ff6b4a', '#9a8cff', '#ffa43d', '#ffffff'];
const rid = () => Array.from({ length: 16 }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 32)]).join('');

export const S = { meta: null, setup: null, afk: {}, tBot: 0, tTrato: 0, tLimite: 0, tick: 0, desc: {}, huerfano: false };

export function setupBase() {
  const p = Red ? Red.perfil.obtener() : { nombre: 'Tú', color: '#3df5ff' }, u = usuario();
  const s = Object.assign({ reglas: Object.assign({}, REGLAS_BASE), bots: [1, 2, 0], nombre: p.nombre, color: p.color }, leer(CLAVES.setup, {}) || {});
  if (u) { s.nombre = u.nombre; s.color = u.color || s.color; } // la cuenta manda sobre el nombre guardado en la partida
  return s;
}
export const hayGuardada = () => { const g = leer(CLAVES.partida, null); return !!(g && g.E && g.E.fase !== 'fin_partida'); };

/* ---------- creacion ---------- */
function colorLibre(usados, pref) {
  if (pref && !usados.includes(pref)) return pref;
  return COLORES.find((c) => !usados.includes(c)) || '#cccccc';
}
function armar(setup, humanos, bots) {
  const usados = [], asientos = [];
  humanos.forEach((hm) => { const c = colorLibre(usados, hm.color); usados.push(c); asientos.push({ nombre: hm.nombre, color: c, tipo: 'humano', redId: hm.redId, token: rid() }); });
  bots.slice(0, Math.max(0, 6 - asientos.length)).forEach((n, k) => { const c = colorLibre(usados, null); usados.push(c); asientos.push({ nombre: NOMBRES_BOT[k % 6], color: c, tipo: 'bot', nivel: n }); });
  const E = crearPartida(setup.reglas, asientos.map((a) => ({ nombre: a.nombre, color: a.color, tipo: a.tipo, nivel: a.nivel == null ? 1 : a.nivel })), (Date.now() ^ (Math.random() * 4294967296)) >>> 0);
  S.meta = { asientos: asientos.map((a) => ({ tipo: a.tipo, token: a.token || '', redId: a.redId == null ? null : a.redId, conectado: true })) };
  return E;
}
export function iniciarSolo(setup) {
  S.setup = setup; guardar(CLAVES.setup, setup);
  const E = armar(setup, [{ nombre: setup.nombre, color: setup.color, redId: 0 }], setup.bots);
  arrancar(E, 'solo', 0);
}
function arrancar(E, modo, yo) {
  X.modo = modo; X.yo = yo; X.pausado = false; X.vence = 0; X.t0 = 0; X.noLeidos = 0; mensajes.length = 0; S.afk = {}; S.desc = {};
  Logros.nuevaPartida();
  Vista.mostrarInicial(E);
  guardarPartida(); iniciarTick(); programar();
  if (X.alArrancar) X.alArrancar();
}

/* ---------- guardado ---------- */
export function guardarPartida() {
  if (X.modo === 'cliente' || !X.E) return;
  if (X.E.fase === 'fin_partida') { borrar(CLAVES.partida); return; }
  guardar(CLAVES.partida, { E: X.E, meta: S.meta, modo: X.modo, yo: X.yo, setup: S.setup });
}
export function continuar() {
  const g = leer(CLAVES.partida, null); if (!g || !g.E) return false;
  S.meta = g.meta; S.setup = g.setup || setupBase();
  S.meta.asientos.forEach((a) => { if (a.tipo === 'humano' && g.modo === 'anfitrion' && a.redId !== 0) { a.redId = null; a.conectado = false; } });
  arrancar(g.E, g.modo, g.yo);
  if (g.modo === 'anfitrion') { X.pausado = true; S.huerfano = true; }
  return true;
}
export function abandonar(borrarGuardada) {
  clearTimeout(S.tBot); clearTimeout(S.tTrato); clearTimeout(S.tLimite); clearInterval(S.tick); S.tick = 0;
  if (borrarGuardada) borrar(CLAVES.partida);
  if (Red && Red.estado !== 'inactivo') Red.salir();
  X.E = null; X.vence = 0; X.enRed = false; X.modo = 'solo';
}
export function pausar(p) {
  X.pausado = p;
  if (p) { clearTimeout(S.tBot); clearTimeout(S.tTrato); clearTimeout(S.tLimite); X.tablero.pausar(false); } else programar();
}

/* ---------- ejecucion de acciones (anfitrion) ---------- */
export function accion(acc) {
  if (!X.E || X.yo < 0) return false;
  if (X.modo === 'cliente') {
    if (!Red.conectado) { aviso('Sin conexión con el anfitrión', '#ff6b6b'); return false; }
    return Red.enviar('accion', { a: acc });
  }
  return ejecutar(X.yo, acc);
}
function ejecutar(j, acc, redId, auto) {
  const E = X.E;
  if (!E || X.pausado) return false;
  let r;
  try { r = aplicar(E, j, acc); } catch (e) { console.error(e); r = { ok: false, error: 'Acción no válida' }; }
  if (!r.ok) {
    if (redId != null) Red.enviar('rechazo', { error: r.error }, { a: redId }); else { aviso(r.error, '#ff6b6b'); sfx.error(); }
    return false;
  }
  if (E.jug[j].tipo === 'humano' && !auto) S.afk[j] = false;
  publicar(r.ev, true);
  return true;
}
function offs() { return S.meta.asientos.map((a, i) => (a.tipo === 'humano' && !a.conectado ? i : -1)).filter((i) => i >= 0); }
function marcarOff() { X.E.jug.forEach((p, i) => { p.sinConexion = !!(S.meta.asientos[i].tipo === 'humano' && !S.meta.asientos[i].conectado); }); }
function publicar(ev, reiniciaTimer) {
  const E = X.E;
  if (reiniciaTimer) X.vence = 0;
  marcarOff();
  guardarPartida();
  difundir(ev);
  Vista.recibir(E, ev);
  programar();
}
function difundir(ev, a) {
  if (X.modo !== 'anfitrion' || !Red || !Red.conectado) return;
  const E = X.E, snap = Object.assign({}, E, { log: E.log.slice(-22) });
  const msg = { e: snap, ev: ev.filter((v) => v.t !== 'log' || true), vence: X.vence ? Math.max(0, X.vence - Date.now()) : 0, off: offs() };
  if (!Red.enviar('estado', msg, a != null ? { a } : undefined)) { msg.ev = []; msg.e.log = msg.e.log.slice(-8); Red.enviar('estado', msg, a != null ? { a } : undefined); }
}

/* ---------- bots, autopiloto y temporizador ---------- */
function autopiloto(j) {
  const p = X.E.jug[j], a = S.meta.asientos[j];
  if (p.tipo === 'bot') return true;
  if (S.afk[j]) return true;
  return !a.conectado && Date.now() - (S.desc[j] || 0) > 6000;
}
function programar() {
  clearTimeout(S.tBot); clearTimeout(S.tTrato); clearTimeout(S.tLimite);
  const E = X.E;
  if (!E || X.modo === 'cliente' || X.pausado || E.fase === 'fin_partida') { if (E && E.fase === 'fin_partida') X.vence = 0; return; }
  if (E.trato && autopiloto(E.trato.a)) S.tTrato = setTimeout(() => respondeAuto(E.trato.id), 1300);
  const j = quienActua(E);
  if (autopiloto(j)) { S.tBot = setTimeout(() => pasoAuto(), 650 + Math.random() * 350); X.vence = 0; return; }
  const seg = E.cfg.temporizador;
  if (seg > 0) {
    if (!X.vence) X.vence = Date.now() + seg * 1000;
    S.tLimite = setTimeout(() => { if (X.vence && Date.now() >= X.vence - 50) { S.afk[j] = true; aviso(E.jug[j].nombre + ' se quedó sin tiempo', '#ffd23d'); X.vence = 0; pasoAuto(); } else programar(); }, Math.max(100, X.vence - Date.now()));
  }
}
function pasoAuto() {
  const E = X.E; if (!E || X.pausado || E.fase === 'fin_partida') return;
  if (Vista.animando()) { S.tBot = setTimeout(pasoAuto, 180); return; }
  const j = quienActua(E);
  if (!autopiloto(j)) { programar(); return; }
  const prev = E.jug[j].nivel; if (E.jug[j].tipo === 'humano') E.jug[j].nivel = 1;
  let acc = decidir(E, j);
  E.jug[j].nivel = prev;
  if (!acc) acc = E.fase === 'fin' ? { t: 'terminar' } : null;
  if (acc && ejecutar(j, acc, undefined, true)) { reaccionBot(j, acc); return; }
  if (acc && acc.t !== 'terminar' && E.fase === 'fin') ejecutar(j, { t: 'terminar' }, undefined, true);
  else programar();
}
function respondeAuto(id) {
  const E = X.E; if (!E || !E.trato || E.trato.id !== id || X.pausado) return;
  if (Vista.animando()) { S.tTrato = setTimeout(() => respondeAuto(id), 200); return; }
  ejecutar(E.trato.a, { t: 'tratoResponder', ok: !!aceptaTrato(E, E.trato.a) }, undefined, true);
}
function reaccionBot(j, acc) {
  if (X.E.jug[j].tipo !== 'bot' || Math.random() > 0.06) return;
  const emo = { construir: '😎', comprar: '🙂', quiebra: '😭', pujar: '🤔' }[acc.t];
  if (emo) enviarBurbuja(j, emo);
}

/* ---------- reloj de partida ---------- */
function iniciarTick() {
  clearInterval(S.tick); let n = 0;
  S.tick = setInterval(() => {
    if (!X.E || X.pausado || X.modo === 'cliente' || X.E.fase === 'fin_partida') return;
    if (document.hidden && X.modo === 'solo') return;
    X.E.tiempoMs += 1000; if (++n % 15 === 0) guardarPartida();
  }, 1000);
}

/* ---------- chat ---------- */
function enviarBurbuja(j, txt) { burbuja(j, txt); mensajes.push({ nombre: X.E.jug[j].nombre, color: X.E.jug[j].color, texto: txt }); }
X.enviarChat = (txt) => {
  if (X.enRed && Red && Red.conectado) Red.chat(txt); else if (X.E && X.yo >= 0) enviarBurbuja(X.yo, txt);
};

/* ---------- red ---------- */
export function opcionesLobby() {
  return { juego: 'Magnate', maxJugadores: 4, modos: [{ id: 'clasico', nombre: 'Partida completa' }],
    alIniciar: (config, jugadores) => alIniciarLobby(jugadores), alCerrar: () => { X.lobbyAbierto = false; } };
}
function alIniciarLobby(jugadores) {
  X.enRed = true;
  if (Red.esAnfitrion) {
    if (S.huerfano && X.E) { // reanudar la partida guardada con la sala nueva
      S.huerfano = false; X.modo = 'anfitrion'; pausar(false); aviso('Partida reanudada. Los demás se reconectan con su enlace.', '#6dff6d'); return;
    }
    if (X.E && X.E.fase !== 'fin_partida' && X.modo === 'anfitrion') return;
    const setup = S.setup || setupBase();
    const hs = jugadores.map((j) => ({ nombre: j.nombre, color: j.color, redId: j.id }));
    const E = armar(setup, hs, setup.bots);
    S.setup = setup;
    arrancar(E, 'anfitrion', 0);
    S.meta.asientos.forEach((a, i) => { if (a.tipo === 'humano' && a.redId !== 0) Red.enviar('asiento', { asiento: i, token: a.token, pid: E.id }, { a: a.redId }); });
    difundir([]);
  } else { X.modo = 'cliente'; X.pendiente = true; aviso('Esperando al anfitrión…'); }
}
export function abrirSalaAnfitrion() {
  Lobby.abrir(opcionesLobby()); X.lobbyAbierto = true;
  if (!Red.conectado) { /* el Lobby crea la sala */ }
}
function reclamar(redId, d) {
  const E = X.E; if (!E || E.fase === 'fin_partida') return;
  let i = -1;
  if (d && d.token) i = S.meta.asientos.findIndex((a, k) => a.tipo === 'humano' && a.token === d.token && d.pid === E.id && k !== X.yo);
  if (i < 0 && d && d.nombre) { const k = E.jug.findIndex((p, n) => p.tipo === 'humano' && !S.meta.asientos[n].conectado && p.nombre === d.nombre && n !== X.yo); i = k; }
  if (i < 0) { Red.enviar('asiento', { asiento: -1, pid: E.id }, { a: redId }); difundir([], redId); return; }
  const a = S.meta.asientos[i]; a.redId = redId; a.conectado = true; delete S.desc[i]; S.afk[i] = false;
  Red.enviar('asiento', { asiento: i, token: a.token, pid: E.id }, { a: redId });
  aviso(E.jug[i].nombre + ' volvió a la partida', E.jug[i].color);
  marcarOff(); guardarPartida(); difundir([]); Vista.recibir(E, []); programar();
  if (X.lobbyAbierto && Lobby.abierto) Lobby.cerrar(true);
}
export function iniciarRed() {
  if (!Red) return;
  Red.on('mensaje', (tipo, d, de) => {
    if (Red.esAnfitrion) {
      if (!X.E) return;
      if (tipo === 'accion') {
        const i = S.meta.asientos.findIndex((a) => a.redId === de && a.tipo === 'humano');
        if (i < 0 || !d || !d.a || typeof d.a.t !== 'string') return;
        ejecutar(i, d.a, de);
      } else if (tipo === 'reclamar') reclamar(de, d);
    } else if (tipo === 'asiento') {
      X.yo = d.asiento; X.enRed = true; X.modo = 'cliente';
      if (d.asiento >= 0) guardar(CLAVES.asiento, { pid: d.pid, token: d.token, asiento: d.asiento, t: Date.now() });
      else { borrar(CLAVES.asiento); aviso('Entras como espectador', '#ffd23d'); }
      if (X.E) Vista.mostrarInicial(X.E);
    } else if (tipo === 'estado') recibirEstado(d);
    else if (tipo === 'rechazo') { aviso(d.error, '#ff6b6b'); sfx.error(); }
  });
  Red.on('conectado', () => {
    const g = leer(CLAVES.asiento, null), p = Red.perfil.obtener();
    X.enRed = true; X.modo = 'cliente'; X.desconectado = false;
    Red.enviar('reclamar', { token: g ? g.token : '', pid: g ? g.pid : '', nombre: p.nombre });
  });
  Red.on('jugadorSalio', (id) => {
    if (!Red.esAnfitrion || !X.E) return;
    const i = S.meta.asientos.findIndex((a) => a.redId === id);
    if (i < 0) return;
    S.meta.asientos[i].conectado = false; S.desc[i] = Date.now(); marcarOff();
    aviso(X.E.jug[i].nombre + ' se desconectó: un piloto automático juega por él', '#ff6b6b');
    Vista.recibir(X.E, []); difundir([]); setTimeout(programar, 6200); programar();
  });
  Red.on('cerrado', (motivo) => {
    if (motivo === 'salir' || Red.esAnfitrion) return;
    X.desconectado = true; aviso('Conexión con el anfitrión perdida. Pide un enlace nuevo para reconectar.', '#ff6b6b', 6000);
    if (X.alDesconectar) X.alDesconectar();
  });
  Red.on('chat', (de, texto, j) => {
    if (!X.E) return;
    const idx = S.meta && Red.esAnfitrion ? S.meta.asientos.findIndex((a) => a.redId === de) : (de === Red.miId ? X.yo : -1);
    const pj = idx >= 0 && X.E.jug[idx] ? X.E.jug[idx] : null;
    mensajes.push({ nombre: pj ? pj.nombre : (j ? j.nombre : 'Jugador'), color: pj ? pj.color : (j ? j.color : '#fff'), texto });
    if (pj) burbuja(pj.id, texto.slice(0, 40));
    X.noLeidos = (X.noLeidos || 0) + 1; if (X.alChat) X.alChat();
  });
}
function recibirEstado(d) {
  if (!d || !d.e) return;
  const E = d.e; X.vence = d.vence ? Date.now() + d.vence : 0; X.t0 = Date.now();
  (d.off || []).length; E.jug.forEach((p, i) => { p.sinConexion = (d.off || []).includes(i); });
  if (!X.E || X.E.id !== E.id) {
    X.modo = 'cliente'; X.enRed = true; Logros.nuevaPartida(); X.E = E;
    const g = leer(CLAVES.asiento, null); if (X.yo < 0 && g && g.pid === E.id) X.yo = g.asiento;
    Vista.mostrarInicial(E); if (X.alArrancar) X.alArrancar(); if (Lobby && Lobby.abierto) Lobby.cerrar(true);
    return;
  }
  if (Lobby && Lobby.abierto && X.yo >= 0) Lobby.cerrar(true);
  Vista.recibir(E, d.ev || []);
}
export function terminarPorTiempo() { if (X.modo !== 'cliente' && X.E) { const ev = terminarPartida(X.E, 'tiempo'); publicar(ev, true); } }
X.accion = accion;
