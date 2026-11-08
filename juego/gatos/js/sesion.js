// Sesion: une Mesa (arbitro del anfitrion) con Red/Lobby. Anfitrion = Mesa local; cliente = solo recibe vistas filtradas.
// Reconexion: cada asiento humano tiene un token que el cliente guarda en uno_asiento; el anfitrion guarda la mesa en gatos_mesa_host.
import { Mesa, relojReal } from './mesa.js';
import { limpiarCfg } from './reglas.js';
import { CLAVES, leer, escribir, borrar } from './almacen.js';

const NOMBRES_BOT = ['Michi', 'Garfi', 'Pelusa', 'Tigre', 'Nube', 'Sombra', 'Canela', 'Mochi'];
const COLORES_BOT = ['#ff6b4a', '#6dff6d', '#ffa43d', '#9a8cff', '#ff4fd8', '#3df5ff'];
const PLAZA_EQ = [0, 2, 1, 3];
const plaza = (setup, k) => (limpiarCfg(setup).equipos ? PLAZA_EQ[k] : k);
const ORDENES = new Set(['jugar', 'combo', 'robar', 'nope', 'dar', 'reinsertar', 'chat', 'siguiente']);
const entero = (x) => Number.isInteger(x);

function nuevoToken() {
  const a = new Uint8Array(12);
  try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < 12; i++) a[i] = Math.floor(Math.random() * 256); }
  return Array.from(a, (b) => b.toString(36).padStart(2, '0')).join('');
}
export function sanear(c) {
  if (!c || typeof c !== 'object' || !ORDENES.has(c.t)) return null;
  const o = { t: c.t };
  if (c.t === 'jugar') { if (!entero(c.carta)) return null; o.carta = c.carta; if (entero(c.obj)) o.obj = c.obj; }
  else if (c.t === 'combo') {
    if (!Array.isArray(c.cartas) || c.cartas.length > 5 || !c.cartas.every(entero)) return null;
    o.cartas = c.cartas.slice(); if (entero(c.obj)) o.obj = c.obj; if (entero(c.pedir)) o.pedir = c.pedir;
  } else if (c.t === 'dar') { if (!entero(c.carta)) return null; o.carta = c.carta; }
  else if (c.t === 'reinsertar') { if (!entero(c.pos)) return null; o.pos = c.pos; }
  else if (c.t === 'chat') { if (!entero(c.k)) return null; o.k = c.k; }
  return o;
}

export const Sesion = {
  mesa: null, rol: 'ninguno', miAsiento: 0, multi: false, setup: null, ridDe: [], asientoDe: {}, pendiente: null,
  alPaquete: null, alEstado: null, alCerrarMesa: null, ultimoPaquete: null, token: '', guardarId: 0
};
const R = () => window.Red;

/* ---------- construccion de la mesa (anfitrion) ---------- */
function armarAsientos(setup, humanos) {
  const cfg = limpiarCfg(setup);
  const n = cfg.equipos ? 4 : Math.max(2, Math.min(5, Math.max(setup.n | 0, humanos.length)));
  const as = new Array(n).fill(null);
  humanos.forEach((p, k) => { as[plaza(setup, k)] = { nombre: p.nombre, color: p.color, tipo: 'humano', token: nuevoToken() }; });
  let kb = 0;
  for (let i = 0; i < n; i++) {
    if (as[i]) continue;
    as[i] = { nombre: NOMBRES_BOT[(kb + (setup.n | 0)) % NOMBRES_BOT.length], color: COLORES_BOT[kb % COLORES_BOT.length], tipo: 'bot', nivel: Math.max(0, Math.min(2, (setup.niveles || [])[kb] ?? 1)) };
    kb++;
  }
  return as;
}
function conectar(mesa, setup, multi, miAsiento) {
  Sesion.mesa = mesa; Sesion.setup = setup; Sesion.multi = multi; Sesion.miAsiento = miAsiento; Sesion.rol = 'anfitrion';
  mesa.salida = salida; mesa.alCambiar = guardarDiferido;
}
function salida(i, p) {
  if (i === Sesion.miAsiento) { Sesion.ultimoPaquete = p; Sesion.alPaquete && Sesion.alPaquete(p); return; }
  const rid = Sesion.ridDe[i];
  if (rid != null && R() && R().conectado) R().enviar('gatos_p', p, { a: rid });
}

Sesion.nuevaLocal = (setup) => {
  Sesion.cerrarMesa();
  const yo = R() ? R().perfil.obtener() : { nombre: 'Tú', color: '#3df5ff' };
  const mesa = new Mesa({ cfg: limpiarCfg(setup), asientos: armarAsientos(setup, [yo]), semilla: (Date.now() ^ (Math.random() * 1e9)) & 0x7fffffff, reloj: relojReal, id: nuevoToken() });
  conectar(mesa, setup, false, 0);
  mesa.iniciar();
  guardarYa();
};

function enviarIni(i) {
  const rid = Sesion.ridDe[i], a = Sesion.mesa.as[i];
  if (rid == null) return;
  R().enviar('gatos_ini', { asiento: i, token: a.token, mesa: Sesion.mesa.id }, { a: rid });
}
function enlazar(i, rid) {
  Sesion.ridDe[i] = rid; Sesion.asientoDe[rid] = i;
  Sesion.mesa.ponerAusente(i, false);
  enviarIni(i); Sesion.mesa.reenviar(i);
}

/* Lobby.alIniciar en TODOS los equipos */
Sesion.alIniciar = (config, jugadores) => {
  const Red = R();
  if (Red.esAnfitrion) {
    if (Sesion.mesa && Sesion.multi && config && config.reanudar) return;
    if (Sesion.pendiente) return reanudarAnfitrion(jugadores);
    const setup = Sesion.setupMulti || Sesion.setup || { modo: 'clasico', n: 4, niveles: [] };
    Sesion.cerrarMesa();
    const humanos = jugadores.map((j) => ({ nombre: j.nombre, color: j.color }));
    const mesa = new Mesa({ cfg: limpiarCfg(setup), asientos: armarAsientos(setup, humanos), semilla: (Date.now() ^ (Math.random() * 1e9)) & 0x7fffffff, reloj: relojReal, id: nuevoToken() });
    conectar(mesa, setup, jugadores.length > 1, plaza(setup, 0));
    Sesion.ridDe = []; Sesion.asientoDe = {};
    jugadores.forEach((j, k) => { const i = plaza(setup, k); if (k !== 0) { Sesion.ridDe[i] = j.id; Sesion.asientoDe[j.id] = i; } });
    mesa.iniciar();
    jugadores.forEach((j, k) => { if (k !== 0) enviarIni(plaza(setup, k)); });
    guardarYa();
  } else {
    Sesion.rol = 'cliente';
    const g = leer(CLAVES.asiento, {});
    Red.enviar('gatos_hola', { token: g.token || '', nombre: Red.perfil.obtener().nombre });
    Sesion.alEstado && Sesion.alEstado('esperando');
  }
};

function reanudarAnfitrion(jugadores) {
  const p = Sesion.pendiente; Sesion.pendiente = null;
  const mesa = p.mesa;
  conectar(mesa, p.setup, p.multi, p.miAsiento);
  Sesion.ridDe = []; Sesion.asientoDe = {};
  mesa.as.forEach((a, i) => { if (a.tipo === 'humano' && i !== Sesion.miAsiento) a.ausente = true; });
  mesa.as[Sesion.miAsiento].ausente = false;
  mesa.pausar(false); mesa.tras(); // reprograma y emite
  Sesion.alEstado && Sesion.alEstado('reanudada');
  void jugadores;
}

/* ---------- mensajes de red ---------- */
let suscrito = false;
Sesion.suscribir = () => {
  if (suscrito || !R()) return; suscrito = true;
  const Red = R();
  Red.on('mensaje', (tipo, d, de) => {
    if (Red.esAnfitrion) {
      if (!Sesion.mesa) return;
      if (tipo === 'gatos_cmd') { const i = Sesion.asientoDe[de]; const c = sanear(d); if (i != null && c) Sesion.mesa.comando(i, c); }
      else if (tipo === 'gatos_hola') hola(de, d || {});
    } else {
      if (tipo === 'gatos_ini' && d) {
        Sesion.miAsiento = d.asiento | 0; Sesion.token = d.token || '';
        escribir(CLAVES.asiento, { token: d.token, mesa: d.mesa, asiento: d.asiento, nombre: Red.perfil.obtener().nombre, ts: Date.now() });
      } else if (tipo === 'gatos_p' && d && d.v) { Sesion.ultimoPaquete = d; Sesion.alPaquete && Sesion.alPaquete(d); }
      else if (tipo === 'gatos_no') Sesion.alEstado && Sesion.alEstado('sinasiento');
    }
  });
  Red.on('jugadorSalio', (id) => {
    if (!Red.esAnfitrion || !Sesion.mesa) return;
    const i = Sesion.asientoDe[id];
    if (i == null) return;
    delete Sesion.asientoDe[id]; Sesion.ridDe[i] = null;
    Sesion.mesa.ponerAusente(i, true);
    Sesion.alEstado && Sesion.alEstado('ausente', i);
  });
  Red.on('jugadorUnido', () => { if (Red.esAnfitrion && Sesion.mesa && Sesion.multi && !(Sesion.mesa.est.fin && Sesion.mesa.est.fin.partida)) setTimeout(() => R().conectado && R().iniciar({ reanudar: true }), 300); });
  Red.on('cerrado', (motivo) => { if (!Red.esAnfitrion || motivo !== 'salir') Sesion.alEstado && Sesion.alEstado('cerrado', motivo); });
};

function hola(rid, d) {
  const mesa = Sesion.mesa, Red = R();
  let i = -1;
  if (d.token) i = mesa.as.findIndex((a, k) => a.tipo === 'humano' && a.token === d.token && k !== Sesion.miAsiento);
  if (i < 0 && Sesion.asientoDe[rid] != null) i = Sesion.asientoDe[rid];
  if (i < 0) { // asiento humano vacante con el mismo nombre (otro dispositivo)
    const nom = Red.jugadores[rid] && Red.jugadores[rid].nombre;
    i = mesa.as.findIndex((a, k) => a.tipo === 'humano' && k !== Sesion.miAsiento && Sesion.ridDe[k] == null && a.ausente && a.nombre === nom);
  }
  if (i < 0) { Red.enviar('gatos_no', {}, { a: rid }); return; }
  if (Sesion.ridDe[i] != null && Sesion.ridDe[i] !== rid) delete Sesion.asientoDe[Sesion.ridDe[i]];
  enlazar(i, rid);
}

Sesion.enviar = (cmd) => {
  if (Sesion.rol === 'anfitrion' && Sesion.mesa) return Sesion.mesa.comando(Sesion.miAsiento, cmd);
  if (Sesion.rol === 'cliente') return R().enviar('gatos_cmd', cmd);
  return { ok: false };
};

/* ---------- guardado y restauracion del anfitrion ---------- */
function guardarDiferido() {
  if (Sesion.guardarId) return;
  Sesion.guardarId = setTimeout(guardarYa, 500);
}
export function guardarYa() {
  clearTimeout(Sesion.guardarId); Sesion.guardarId = 0;
  const m = Sesion.mesa;
  if (!m || Sesion.rol !== 'anfitrion') return;
  if (m.est.fin && m.est.fin.partida) { borrar(CLAVES.mesa); return; }
  escribir(CLAVES.mesa, { v: 1, ts: Date.now(), multi: Sesion.multi, miAsiento: Sesion.miAsiento, setup: Sesion.setup, mesa: m.guardar() });
}
Sesion.guardarYa = guardarYa;
Sesion.hayGuardada = () => {
  const g = leer(CLAVES.mesa);
  if (!g || g.v !== 1 || !g.mesa || !g.mesa.est || (g.mesa.est.fin && g.mesa.est.fin.partida)) return null;
  return { ts: g.ts, multi: !!g.multi, n: g.mesa.est.n, ronda: g.mesa.est.ronda, modo: g.mesa.est.cfg.modo, humanos: g.mesa.as.filter((a) => a.tipo === 'humano').length };
};
// Devuelve true si es una mesa local y arranca; si es multijugador queda "pendiente" hasta que el anfitrion abra la sala y pulse Iniciar.
Sesion.restaurar = () => {
  const g = leer(CLAVES.mesa);
  if (!g || g.v !== 1) return null;
  const mesa = Mesa.restaurar(g.mesa, { reloj: relojReal, salida });
  if (!mesa) return null;
  Sesion.cerrarMesa();
  if (!g.multi) {
    mesa.as[g.miAsiento].ausente = false;
    conectar(mesa, g.setup, false, g.miAsiento);
    mesa.pausar(false); mesa.tras();
    return 'local';
  }
  Sesion.pendiente = { mesa, setup: g.setup, multi: true, miAsiento: g.miAsiento };
  return 'multi';
};
// Convierte los asientos humanos remotos en bots (seguir sin ellos).
Sesion.sinHumanosRemotos = () => {
  const p = Sesion.pendiente;
  if (!p) return;
  p.mesa.as.forEach((a, i) => { if (a.tipo === 'humano' && i !== p.miAsiento) { a.tipo = 'bot'; a.nivel = 1; a.ausente = false; } });
  p.multi = false;
  const m = p.mesa; Sesion.pendiente = null;
  conectar(m, p.setup, false, p.miAsiento); m.pausar(false); m.tras();
};

Sesion.revancha = () => {
  const m = Sesion.mesa;
  if (Sesion.rol !== 'anfitrion' || !m) return false;
  const as = m.as.map((a) => ({ nombre: a.nombre, color: a.color, tipo: a.tipo, nivel: a.nivel, token: a.token, ausente: a.ausente }));
  m.destruir();
  const nueva = new Mesa({ cfg: m.est.cfg, asientos: as, semilla: (Date.now() ^ (Math.random() * 1e9)) & 0x7fffffff, reloj: relojReal, id: nuevoToken() });
  nueva.as.forEach((a) => { a.fallos = 0; });
  conectar(nueva, Sesion.setup, Sesion.multi, Sesion.miAsiento);
  nueva.iniciar();
  as.forEach((a, i) => { if (a.tipo === 'humano' && Sesion.ridDe[i] != null) enviarIni(i); });
  guardarYa();
  return true;
};
Sesion.pausar = (b) => { if (Sesion.rol === 'anfitrion' && Sesion.mesa && !Sesion.multi) Sesion.mesa.pausar(b); };

Sesion.cerrarMesa = () => {
  if (Sesion.mesa) Sesion.mesa.destruir();
  Sesion.mesa = null; Sesion.rol = 'ninguno'; Sesion.ridDe = []; Sesion.asientoDe = {}; Sesion.ultimoPaquete = null; Sesion.multi = false;
};
Sesion.abandonar = () => {
  if (Sesion.rol === 'anfitrion') borrar(CLAVES.mesa);
  if (Sesion.rol === 'cliente') { borrar(CLAVES.asiento); try { R().salir(); } catch (e) { /* ya cerrada */ } }
  Sesion.cerrarMesa(); Sesion.pendiente = null;
};
