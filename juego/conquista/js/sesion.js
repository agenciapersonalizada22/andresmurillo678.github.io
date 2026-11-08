// Sesion: une Partida (arbitro del anfitrion) con Red/Lobby. Anfitrion = Partida local; cliente = solo recibe vistas filtradas.
// Reconexion: cada asiento humano tiene un token que el cliente guarda en conquista_asiento; el anfitrion guarda la partida en conquista_partida_host.
import { Partida, relojReal } from './partida.js';
import { CLAVES, leer, escribir, borrar } from './almacen.js';

export const PALETA = ['#e5484d', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];
export const PALETA_DALTO = ['#d55e00', '#0072b2', '#009e73', '#f0e442', '#cc79a7', '#56b4e9'];
const NOMBRES_BOT = ['Atila', 'Boudica', 'Ciro', 'Dido', 'Esparta', 'Fenix', 'Gengis', 'Hanibal'];
const ORDENES = new Set(['colocar', 'canjear', 'atacarFase', 'atacar', 'blitz', 'mover', 'finAtaque', 'fortificar', 'terminar']);
const entero = (x) => Number.isInteger(x);

function nuevoToken() {
  const a = new Uint8Array(12);
  try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < 12; i++) a[i] = Math.floor(Math.random() * 256); }
  return Array.from(a, (b) => b.toString(36).padStart(2, '0')).join('');
}
export function sanear(c) {
  if (!c || typeof c !== 'object' || !ORDENES.has(c.t)) return null;
  const o = { t: c.t };
  for (const k of ['a', 'n', 'd', 'h', 'dados', 'max']) if (c[k] !== undefined) { if (!entero(c[k])) return null; o[k] = c[k]; }
  if (c.t === 'canjear') { if (!Array.isArray(c.cartas) || c.cartas.length !== 3 || !c.cartas.every(entero)) return null; o.cartas = c.cartas.slice(); }
  return o;
}
const dist = (a, b) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
export function armarAsientos(setup, humanos) {
  const n = Math.max(2, Math.min(6, Math.max(setup.n | 0, humanos.length)));
  const usados = [], nombres = new Set();
  const unico = (nom) => { let r = nom || 'Jugador', k = 2; while (nombres.has(r)) r = (nom || 'Jugador') + ' ' + k++; nombres.add(r); return r; };
  const color = (pref) => {
    if (pref && /^#[0-9a-f]{6}$/i.test(pref) && usados.every((u) => dist(u, pref) > 100)) { usados.push(pref); return pref; }
    const c = PALETA.find((p) => usados.every((u) => dist(u, p) > 60)) || PALETA[usados.length % 6]; usados.push(c); return c;
  };
  const as = humanos.map((p) => ({ nombre: unico(p.nombre), color: color(p.color), tipo: 'humano', token: nuevoToken() }));
  for (let i = as.length; i < n; i++) {
    const k = i - humanos.length;
    as.push({ nombre: unico(NOMBRES_BOT[(k + (setup.n | 0)) % NOMBRES_BOT.length]), color: color(null), tipo: 'bot', nivel: Math.max(0, Math.min(2, (setup.niveles || [])[k] ?? 1)) });
  }
  return as;
}

export const Sesion = {
  partida: null, rol: 'ninguno', miAsiento: 0, multi: false, setup: null, ridDe: [], asientoDe: {}, pendiente: null,
  alPaquete: null, alEstado: null, ultimoPaquete: null, token: '', guardarId: 0, velocidad: 'normal'
};
const R = () => window.Red;

function conectar(p, setup, multi, miAsiento) {
  Sesion.partida = p; Sesion.setup = setup; Sesion.multi = multi; Sesion.miAsiento = miAsiento; Sesion.rol = 'anfitrion';
  p.salida = salida; p.alCambiar = guardarDiferido;
}
function salida(i, p) {
  if (i === Sesion.miAsiento) { Sesion.ultimoPaquete = p; Sesion.alPaquete && Sesion.alPaquete(p); return; }
  const rid = Sesion.ridDe[i];
  if (rid != null && R() && R().conectado) R().enviar('cq_p', p, { a: rid });
}
const crearPartida = (setup, asientos) => {
  const cfg = { ...(setup.cfg || {}) };
  return Partida.nueva(cfg, asientos, { velocidad: Sesion.velocidad, reloj: relojReal });
};

Sesion.nuevaLocal = (setup) => {
  Sesion.cerrarPartida();
  const yo = R() ? R().perfil.obtener() : { nombre: 'Tú', color: '#3b82f6' };
  const p = crearPartida(setup, armarAsientos(setup, [yo]));
  conectar(p, setup, false, 0);
  p.iniciar(); guardarYa();
};
function enviarIni(i) {
  const rid = Sesion.ridDe[i], a = Sesion.partida.est.jug[i];
  if (rid == null) return;
  R().enviar('cq_ini', { asiento: i, token: a.token, id: Sesion.partida.est.id }, { a: rid });
}
function enlazar(i, rid) {
  Sesion.ridDe[i] = rid; Sesion.asientoDe[rid] = i;
  Sesion.partida.ponerAusente(i, false);
  enviarIni(i); Sesion.partida.reenviar(i);
}

/* Lobby.alIniciar en TODOS los equipos */
Sesion.alIniciar = (config, jugadores) => {
  const Red = R();
  if (Red.esAnfitrion) {
    if (Sesion.partida && Sesion.multi && config && config.reanudar) return;
    if (Sesion.pendiente) return reanudarAnfitrion();
    const setup = Sesion.setupMulti || Sesion.setup || { n: 4, niveles: [], cfg: {} };
    Sesion.cerrarPartida();
    const p = crearPartida(setup, armarAsientos(setup, jugadores.map((j) => ({ nombre: j.nombre, color: j.color }))));
    conectar(p, setup, jugadores.length > 1, 0);
    Sesion.ridDe = []; Sesion.asientoDe = {};
    jugadores.forEach((j, i) => { Sesion.ridDe[i] = i === 0 ? null : j.id; if (i !== 0) Sesion.asientoDe[j.id] = i; });
    jugadores.forEach((j, i) => { if (i !== 0) enviarIni(i); });
    p.iniciar(); guardarYa();
  } else {
    Sesion.rol = 'cliente';
    const g = leer(CLAVES.asiento, {});
    Red.enviar('cq_hola', { token: g.token || '', nombre: Red.perfil.obtener().nombre });
    Sesion.alEstado && Sesion.alEstado('esperando');
  }
};
function reanudarAnfitrion() {
  const p = Sesion.pendiente; Sesion.pendiente = null;
  conectar(p.partida, p.setup, p.multi, p.miAsiento);
  Sesion.ridDe = []; Sesion.asientoDe = {};
  p.partida.est.jug.forEach((a, i) => { if (a.tipo === 'humano' && i !== Sesion.miAsiento) a.ausente = true; });
  p.partida.est.jug[Sesion.miAsiento].ausente = false;
  p.partida.pausar(false); p.partida.emitir([{ t: 'inicio' }]); p.partida.tras();
  Sesion.alEstado && Sesion.alEstado('reanudada');
}

/* ---------- mensajes de red ---------- */
let suscrito = false;
Sesion.suscribir = () => {
  if (suscrito || !R()) return; suscrito = true;
  const Red = R();
  Red.on('mensaje', (tipo, d, de) => {
    if (Red.esAnfitrion) {
      if (!Sesion.partida) return;
      if (tipo === 'cq_cmd') {
        const i = Sesion.asientoDe[de], c = sanear(d);
        if (i != null && c) { const r = Sesion.partida.comando(i, c); if (!r.ok) Red.enviar('cq_err', { m: r.error || 'Orden rechazada' }, { a: de }); }
      } else if (tipo === 'cq_hola') hola(de, d || {});
    } else if (tipo === 'cq_ini' && d) {
      Sesion.miAsiento = d.asiento | 0; Sesion.token = d.token || '';
      escribir(CLAVES.asiento, { token: d.token, id: d.id, asiento: d.asiento, nombre: Red.perfil.obtener().nombre, ts: Date.now() });
    } else if (tipo === 'cq_p' && d && d.v) { Sesion.ultimoPaquete = d; Sesion.alPaquete && Sesion.alPaquete(d); }
    else if (tipo === 'cq_no') Sesion.alEstado && Sesion.alEstado('sinasiento');
    else if (tipo === 'cq_err') Sesion.alEstado && Sesion.alEstado('error', d && d.m);
  });
  Red.on('jugadorSalio', (id) => {
    if (!Red.esAnfitrion || !Sesion.partida) return;
    const i = Sesion.asientoDe[id];
    if (i == null) return;
    delete Sesion.asientoDe[id]; Sesion.ridDe[i] = null;
    Sesion.partida.ponerAusente(i, true);
    Sesion.alEstado && Sesion.alEstado('ausente', i);
  });
  Red.on('jugadorUnido', () => { if (Red.esAnfitrion && Sesion.partida && Sesion.multi && Sesion.partida.est.fase !== 'fin') setTimeout(() => R().conectado && R().iniciar({ reanudar: true }), 300); });
  Red.on('cerrado', (motivo) => { if (!Red.esAnfitrion || motivo !== 'salir') Sesion.alEstado && Sesion.alEstado('cerrado', motivo); });
};
function hola(rid, d) {
  const p = Sesion.partida, Red = R(), jug = p.est.jug;
  let i = -1;
  if (d.token) i = jug.findIndex((a, k) => a.tipo === 'humano' && a.token === d.token && k !== Sesion.miAsiento);
  if (i < 0 && Sesion.asientoDe[rid] != null) i = Sesion.asientoDe[rid];
  if (i < 0) {
    const nom = Red.jugadores[rid] && Red.jugadores[rid].nombre;
    i = jug.findIndex((a, k) => a.tipo === 'humano' && k !== Sesion.miAsiento && Sesion.ridDe[k] == null && a.ausente && a.nombre === nom);
  }
  if (i < 0) { Red.enviar('cq_no', {}, { a: rid }); return; }
  if (Sesion.ridDe[i] != null && Sesion.ridDe[i] !== rid) delete Sesion.asientoDe[Sesion.ridDe[i]];
  enlazar(i, rid);
}
Sesion.enviar = (cmd) => {
  if (Sesion.rol === 'anfitrion' && Sesion.partida) return Sesion.partida.comando(Sesion.miAsiento, cmd);
  if (Sesion.rol === 'cliente') { R().enviar('cq_cmd', cmd); return { ok: true }; }
  return { ok: false };
};

/* ---------- guardado y restauracion del anfitrion ---------- */
function guardarDiferido() { if (!Sesion.guardarId) Sesion.guardarId = setTimeout(guardarYa, 500); }
export function guardarYa() {
  clearTimeout(Sesion.guardarId); Sesion.guardarId = 0;
  const p = Sesion.partida;
  if (!p || Sesion.rol !== 'anfitrion') return;
  if (p.est.fase === 'fin') { borrar(CLAVES.partida); return; }
  escribir(CLAVES.partida, { v: 1, ts: Date.now(), multi: Sesion.multi, miAsiento: Sesion.miAsiento, setup: Sesion.setup, est: p.guardar() });
}
Sesion.guardarYa = guardarYa;
Sesion.hayGuardada = () => {
  const g = leer(CLAVES.partida);
  if (!g || g.v !== 1 || !g.est || !g.est.o || g.est.fase === 'fin') return null;
  return { ts: g.ts, multi: !!g.multi, n: g.est.n, ronda: g.est.ronda, modo: g.est.cfg && g.est.cfg.modo, humanos: g.est.jug.filter((a) => a.tipo === 'humano').length };
};
Sesion.restaurar = () => {
  const g = leer(CLAVES.partida);
  if (!g || g.v !== 1) return null;
  const p = Partida.restaurar(g.est, { velocidad: Sesion.velocidad, reloj: relojReal });
  if (!p) return null;
  Sesion.cerrarPartida();
  p.est.conq = p.est.conq || null;
  if (!g.multi) {
    p.est.jug[g.miAsiento].ausente = false;
    conectar(p, g.setup, false, g.miAsiento);
    p.pausar(false); p.emitir([{ t: 'inicio' }]); p.tras();
    return 'local';
  }
  Sesion.pendiente = { partida: p, setup: g.setup, multi: true, miAsiento: g.miAsiento };
  return 'multi';
};
Sesion.sinHumanosRemotos = () => {
  const p = Sesion.pendiente;
  if (!p) return;
  p.partida.est.jug.forEach((a, i) => { if (a.tipo === 'humano' && i !== p.miAsiento) { a.tipo = 'bot'; a.nivel = 1; a.ausente = false; a.token = ''; } });
  Sesion.pendiente = null;
  conectar(p.partida, p.setup, false, p.miAsiento); p.partida.pausar(false); p.partida.emitir([{ t: 'inicio' }]); p.partida.tras();
};
Sesion.revancha = () => {
  const m = Sesion.partida;
  if (Sesion.rol !== 'anfitrion' || !m) return false;
  const as = m.est.jug.map((a) => ({ nombre: a.nombre, color: a.color, tipo: a.tipo, nivel: a.nivel, token: a.token }));
  const cfg = { ...m.est.cfg };
  m.destruir();
  const nueva = Partida.nueva(cfg, as, { velocidad: Sesion.velocidad, reloj: relojReal });
  nueva.est.jug.forEach((a, i) => { a.ausente = Sesion.partida.est.jug[i].ausente; });
  conectar(nueva, Sesion.setup, Sesion.multi, Sesion.miAsiento);
  as.forEach((a, i) => { if (a.tipo === 'humano' && Sesion.ridDe[i] != null) enviarIni(i); });
  nueva.iniciar(); guardarYa();
  return true;
};
Sesion.pausar = (b) => { if (Sesion.rol === 'anfitrion' && Sesion.partida && !Sesion.multi) Sesion.partida.pausar(b); };
Sesion.cerrarPartida = () => {
  if (Sesion.partida) Sesion.partida.destruir();
  Sesion.partida = null; Sesion.rol = 'ninguno'; Sesion.ridDe = []; Sesion.asientoDe = {}; Sesion.ultimoPaquete = null; Sesion.multi = false;
};
Sesion.abandonar = () => {
  if (Sesion.rol === 'anfitrion') borrar(CLAVES.partida);
  if (Sesion.rol === 'cliente') { borrar(CLAVES.asiento); try { R().salir(); } catch (e) { /* ya cerrada */ } }
  Sesion.cerrarPartida(); Sesion.pendiente = null;
};
