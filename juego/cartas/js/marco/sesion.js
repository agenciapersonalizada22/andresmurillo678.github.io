// Sesion de mesa: bucle del anfitrion (autoritativo), protocolo por Red (WebRTC) y cliente.
// Mensajes cliente->anfitrion: hola, sentar, acc, chat, rec, sal.  anfitrion->cliente: oferta, bienvenida, v (vista propia), err, rec, cobro, expulsado, fin.
import * as M from './mesa.js';
import * as A from './almacen.js';
import { Cartera } from './cartera.js';
import { motorDe } from '../juegos/registro.js';
import { semilla8 } from './mesa.js';

const R = () => window.Red;
export const Sesion = {
  rol: 'ninguno', m: null, J: null, vm: null, yo: -1, tok: '', mesaId: '', pausada: false, conectado: false, oferta: null, perdida: false,
  alVista: null, alEvento: null, alSolicitud: null, alCerrado: null, alOferta: null, alFin: null,
};
let mapa = {}, bucle = 0, ultimoRev = -1, guardarT = 0, suscrito = false, pendSolic = {};
const ahora = () => Date.now();
const perfil = () => { const r = R(), p = r ? r.perfil.obtener() : { nombre: 'Jugador', color: '#3df5ff' }; return { nombre: p.nombre, color: p.color, avatar: A.ajustes.obtener().mesa.avatar || '' }; };

export function tokenNuevo() { return semilla8(); }
const seatDe = (tok) => { const a = Sesion.m.asientos.find((x) => x.tok === tok && x.tipo === 'humano'); return a ? a.i : -1; };
const enviar = (redId, tipo, d) => { const r = R(); if (r && r.conectado) r.enviar(tipo, d, { a: redId }); };
export const remotosConectados = () => Object.keys(mapa).length;
export const remotos = () => Object.keys(mapa).map((id) => ({ id: +id, tok: mapa[id].tok, asiento: seatDe(mapa[id].tok) }));

// ---------------- anfitrion ----------------
export function iniciarAnfitrion(m, J) {
  detener();
  Sesion.rol = 'anfitrion'; Sesion.m = m; Sesion.J = J; Sesion.mesaId = m.id; Sesion.yo = 0; Sesion.tok = m.asientos[0].tok; mapa = {}; pendSolic = {};
  const r = R(); if (r) { try { r.crearSala({ max: 4 }); } catch (e) {} }
  suscribir(); ultimoRev = -1;
  A.mesas.nota(m.id, { rol: 'anfitrion', juego: m.juego, t: ahora(), mano: m.mano, nombre: nombreMesa(m) });
  A.escribir(A.CLAVES.ultima, m.id);
  guardarYa(); difundir(); bucle = setInterval(paso, 100);
}
export function restaurarAnfitrion(id) {
  const txt = A.mesas.leerEstado(id); if (!txt) return false;
  const m = M.restaurar(txt), J = motorDe(m.juego); if (!J) return false;
  iniciarAnfitrion(m, J); return true;
}
export const nombreMesa = (m) => (motorDe(m.juego) ? motorDe(m.juego).nombre : m.juego);
function paso() {
  const m = Sesion.m; if (!m) return;
  const t = ahora();
  if (!Sesion.pausada || remotosConectados()) {
    try { M.tick(m, Sesion.J, t); } catch (e) { console.error(e); }
  }
  if (m.salidas && m.salidas.length) entregarSalidas();
  if (m.rev !== ultimoRev) { ultimoRev = m.rev; difundir(); programarGuardado(); if (m.fin) finalizar(); }
}
function entregarSalidas() {
  const m = Sesion.m, lista = m.salidas; m.salidas = [];
  lista.forEach((s) => {
    const id = Object.keys(mapa).find((k) => mapa[k].tok === s.tok);
    if (id != null) { delete m.cobros[s.tok]; enviar(+id, 'cobro', { n: s.cobro }); }
  });
  if (m.cobroHost) { Cartera.acreditar(m.cobroHost, 'Cobro de mesa'); m.cobroHost = 0; if (Sesion.alEvento) Sesion.alEvento({ tipo: 'cobroHost' }); }
}
export function difundir() {
  const m = Sesion.m; if (!m) return;
  const t = ahora();
  Sesion.vm = M.vistaMesa(m, Sesion.J, 0, t);
  if (Sesion.alVista) Sesion.alVista(Sesion.vm);
  Object.keys(mapa).forEach((id) => {
    const a = seatDe(mapa[id].tok), v = M.vistaMesa(m, Sesion.J, a, t);
    const s = JSON.stringify(v);
    if (s.length > 15000) { v.chat = v.chat.slice(-6); v.historial = v.historial.slice(-3); }
    enviar(+id, 'v', v);
  });
}
function programarGuardado() { if (!guardarT) guardarT = setTimeout(guardarYa, 150); }
export function guardarYa() {
  clearTimeout(guardarT); guardarT = 0;
  const m = Sesion.m; if (!m || Sesion.rol !== 'anfitrion') return;
  if (m.fin) { A.mesas.olvidar(m.id); return; }
  A.mesas.guardarEstado(m.id, M.serializar(m));
  const f = Sesion.J.fichas(m.estado)[0];
  A.mesas.nota(m.id, { t: ahora(), mano: m.mano, fichas: f, juego: m.juego, nombre: nombreMesa(m), rol: 'anfitrion' });
}
function suscribir() {
  const r = R(); if (!r || suscrito) return; suscrito = true;
  r.on('mensaje', (tipo, d, de) => { try { alMensaje(tipo, d || {}, de); } catch (e) { console.error(e); } });
  r.on('jugadorSalio', (id) => {
    if (Sesion.rol === 'anfitrion' && mapa[id]) { M.desconectar(Sesion.m, mapa[id].tok); delete mapa[id]; delete pendSolic[id]; if (Sesion.alEvento) Sesion.alEvento({ tipo: 'salio', id }); }
  });
  r.on('conectado', () => { if (Sesion.rol === 'cliente' || Sesion.rol === 'ninguno') alConectarCliente(); });
  r.on('cerrado', (motivo) => {
    if (Sesion.rol === 'cliente') { Sesion.conectado = false; Sesion.perdida = true; if (Sesion.alCerrado) Sesion.alCerrado(motivo); }
  });
}
function alMensaje(tipo, d, de) {
  if (Sesion.rol === 'anfitrion') return mensajeAnfitrion(tipo, d, de);
  if (Sesion.rol === 'cliente') return mensajeCliente(tipo, d);
}
function mensajeAnfitrion(tipo, d, de) {
  const m = Sesion.m, J = Sesion.J, t = ahora();
  if (tipo === 'hola') {
    const tok = String(d.tok || '').slice(0, 24);
    if (!tok) return;
    mapa[de] = { tok, nombre: d.nombre };
    const conocido = m.asientos.some((a) => a.tok === tok) || m.espectadores.some((s) => s.tok === tok);
    if (m.expulsados.includes(tok)) { enviar(de, 'bienvenida', { error: 'Fuiste expulsado de esta mesa' }); return; }
    if (conocido) {
      const r = M.unir(m, J, { tok, nombre: d.nombre, color: d.color, avatar: d.avatar, espectador: !m.asientos.some((a) => a.tok === tok) }, t);
      enviar(de, 'bienvenida', { asiento: r.asiento, mesaId: m.id, cobro: r.cobro || 0, reconexion: true, juego: m.juego });
      if (r.cobro) enviar(de, 'cobro', { n: r.cobro });
      difundir(); return;
    }
    M.unir(m, J, { tok, nombre: d.nombre, color: d.color, espectador: true }, t);
    enviar(de, 'oferta', { mesaId: m.id, juego: m.juego, nombre: nombreMesa(m), anfitrion: m.asientos[0].nombre, libres: m.asientos.filter((a) => a.tipo === 'abierto').length,
      min: m.cfg.compraMin, max: m.cfg.compraMax, def: m.cfg.compraDef, torneo: m.cfg.torneo, tope: m.cfg.tope, privada: m.cfg.privada });
    difundir(); return;
  }
  const info = mapa[de]; if (!info) return;
  const i = seatDe(info.tok);
  if (tipo === 'sentar') {
    const dec = (ok) => {
      if (!mapa[de]) return;
      if (!ok) { enviar(de, 'bienvenida', { error: 'El anfitrión rechazó tu entrada', asiento: -1, devolver: d.compra || 0 }); return; }
      const r = M.unir(m, J, { tok: info.tok, nombre: d.nombre || info.nombre, color: d.color, avatar: d.avatar, compra: d.compra, espectador: !!d.espectador }, ahora());
      if (r.error) { enviar(de, 'bienvenida', { error: r.error, devolver: d.compra || 0 }); return; }
      enviar(de, 'bienvenida', { asiento: r.asiento, mesaId: m.id, compra: r.compra || 0, devolver: r.asiento < 0 ? (d.compra || 0) : Math.max(0, (d.compra || 0) - (r.compra || 0)), juego: m.juego });
      difundir();
    };
    if (m.cfg.privada && !d.espectador && Sesion.alSolicitud) Sesion.alSolicitud({ nombre: d.nombre || info.nombre, compra: d.compra }, dec); else dec(true);
    return;
  }
  if (tipo === 'acc') { if (i < 0) return; const r = M.accion(m, J, i, d.a, t); if (!r.ok) enviar(de, 'err', { error: r.error }); else paso(); return; }
  if (tipo === 'chat') { M.chat(m, i, d.x, t); return; }
  if (tipo === 'rec') { const r = M.recomprar(m, J, i, d.monto, Infinity, t); enviar(de, 'rec', r); return; }
  if (tipo === 'sal') { if (i >= 0) M.levantarse(m, J, i, t); return; }
}
// acciones locales del anfitrion
export function expulsar(i) {
  const m = Sesion.m, a = m.asientos[i]; if (!a) return;
  const id = Object.keys(mapa).find((k) => mapa[k].tok === a.tok);
  M.expulsar(m, Sesion.J, i, ahora()); if (id != null) enviar(+id, 'expulsado', {});
  paso();
}
export async function invitar() {
  const r = R(); if (!r) throw new Error('Sin red');
  const inv = await r.invitar();
  return { enlace: inv.enlace + (inv.enlace.indexOf('?') >= 0 ? '&' : '?') + 'm=' + Sesion.mesaId, id: inv.id, codigo: inv.codigo };
}
export function terminarSesion() {
  const m = Sesion.m; if (!m) return null;
  if (!m.fin) M.terminar(m, Sesion.J, ahora());
  return liquidarFin();
}
function liquidarFin() {
  const m = Sesion.m, cobros = m.cobrosFin || {};
  if (m.liquidado) return { cobro: cobros[0] || 0, premio: m.premio, cobros };
  m.liquidado = true;
  Object.keys(mapa).forEach((id) => { const a = seatDe(mapa[id].tok); enviar(+id, 'fin', { cobro: a >= 0 ? cobros[a] || 0 : 0, premio: m.premio }); });
  const mio = cobros[0] || 0;
  if (mio > 0) Cartera.acreditar(mio, m.cfg.torneo ? 'Premio de torneo' : 'Cierre de mesa');
  return { cobro: mio, premio: m.premio, cobros };
}
function finalizar() { const r = liquidarFin(); if (Sesion.alFin) Sesion.alFin(r); }
export function liquidarGuardada(id) {
  const txt = A.mesas.leerEstado(id); if (!txt) { A.mesas.olvidar(id); return 0; }
  const m = M.restaurar(txt), J = motorDe(m.juego);
  const c = J ? (M.terminar(m, J, ahora())[0] || 0) : 0;
  if (c > 0) Cartera.acreditar(c, 'Cobro de mesa guardada');
  A.mesas.olvidar(id); return c;
}

// ---------------- cliente ----------------
let mesaPrevista = '';
export function previstaDesdeUrl() {
  const mm = /[?&]m=([A-Za-z0-9_-]+)/.exec(location.search); mesaPrevista = mm ? mm[1] : '';
  return mesaPrevista;
}
function alConectarCliente() {
  const r = R(); if (!r || r.esAnfitrion) return;
  Sesion.rol = 'cliente'; Sesion.conectado = true; Sesion.perdida = false; Sesion.vm = null;
  const g = mesaPrevista ? A.mesas.asiento(mesaPrevista) : null;
  Sesion.tok = (g && g.tok) || tokenNuevo();
  const p = perfil();
  r.enviar('hola', { tok: Sesion.tok, nombre: p.nombre, color: p.color, avatar: p.avatar });
  if (Sesion.alEvento) Sesion.alEvento({ tipo: 'conectado' });
}
function mensajeCliente(tipo, d) {
  if (tipo === 'v') { Sesion.vm = d; Sesion.yo = d.yo; if (Sesion.alVista) Sesion.alVista(d); return; }
  if (tipo === 'oferta') { Sesion.oferta = d; Sesion.mesaId = d.mesaId; if (Sesion.alOferta) Sesion.alOferta(d); return; }
  if (tipo === 'bienvenida') {
    if (d.devolver) Cartera.acreditar(d.devolver, 'Entrada devuelta');
    if (d.mesaId) Sesion.mesaId = d.mesaId;
    if (!d.error && d.mesaId) {
      A.mesas.guardarAsiento(d.mesaId, { tok: Sesion.tok, asiento: d.asiento, juego: d.juego, t: ahora() });
      A.mesas.nota(d.mesaId, { rol: 'cliente', juego: d.juego, t: ahora(), tok: Sesion.tok, nombre: (Sesion.oferta && Sesion.oferta.nombre) || d.juego, anfitrion: Sesion.oferta && Sesion.oferta.anfitrion });
    }
    if (d.cobro) Cartera.acreditar(d.cobro, 'Cobro de mesa');
    if (Sesion.alEvento) Sesion.alEvento({ tipo: 'bienvenida', d }); return;
  }
  if (tipo === 'cobro') { Cartera.acreditar(d.n, 'Cobro de mesa'); if (Sesion.alEvento) Sesion.alEvento({ tipo: 'cobro', n: d.n }); return; }
  if (tipo === 'rec') { if (!d.ok && Sesion.pendRec) Cartera.acreditar(Sesion.pendRec, 'Recompra rechazada'); Sesion.pendRec = 0; if (Sesion.alEvento) Sesion.alEvento({ tipo: 'rec', d }); return; }
  if (tipo === 'err') { if (Sesion.alEvento) Sesion.alEvento({ tipo: 'err', error: d.error }); return; }
  if (tipo === 'expulsado') { if (Sesion.alEvento) Sesion.alEvento({ tipo: 'expulsado' }); return; }
  if (tipo === 'fin') { if (d.cobro) Cartera.acreditar(d.cobro, d.premio ? 'Premio de torneo' : 'Cierre de mesa'); A.mesas.olvidar(Sesion.mesaId); if (Sesion.alEvento) Sesion.alEvento({ tipo: 'fin', d }); }
}
// ---------------- acciones comunes ----------------
export function accion(a) {
  if (Sesion.rol === 'anfitrion') { const r = M.accion(Sesion.m, Sesion.J, 0, a, ahora()); if (r.ok) paso(); return r; }
  const r = R(); if (r && r.conectado) r.enviar('acc', { a }); return { ok: true };
}
export function chat(texto) {
  if (Sesion.rol === 'anfitrion') { M.chat(Sesion.m, 0, texto, ahora()); paso(); return; }
  const r = R(); if (r && r.conectado) r.enviar('chat', { x: texto });
}
export function sentar(compra, espectador) {
  const r = R(); if (!r || !r.conectado) return false;
  if (compra > 0) { if (!Cartera.debitar(compra, 'Entrada a mesa')) return false; }
  const p = perfil(); r.enviar('sentar', { compra, espectador: !!espectador, nombre: p.nombre, color: p.color, avatar: p.avatar }); return true;
}
export function recomprar(monto) {
  if (Sesion.rol === 'anfitrion') {
    const res = M.recomprar(Sesion.m, Sesion.J, 0, monto, Cartera.saldo(), ahora());
    if (res.ok) { Cartera.debitar(res.monto, 'Recompra'); paso(); }
    return res;
  }
  if (!Cartera.debitar(monto, 'Recompra')) return { ok: false, error: 'Saldo insuficiente' };
  Sesion.pendRec = monto; R().enviar('rec', { monto }); return { ok: true, esperando: true };
}
export function levantarse() {
  if (Sesion.rol === 'anfitrion') { M.levantarse(Sesion.m, Sesion.J, 0, ahora()); paso(); return; }
  const r = R(); if (r && r.conectado) r.enviar('sal', {});
}
export function pausar(v) { Sesion.pausada = v == null ? !Sesion.pausada : !!v; return Sesion.pausada; }
export function detener() {
  clearInterval(bucle); bucle = 0; clearTimeout(guardarT); guardarT = 0;
  if (Sesion.rol === 'anfitrion') guardarYa();
  const r = R(); if (r && r.estado !== 'inactivo') { try { r.salir(); } catch (e) {} }
  Object.assign(Sesion, { rol: 'ninguno', m: null, J: null, vm: null, yo: -1, conectado: false, oferta: null, perdida: false }); mapa = {};
}
export function salirCliente() { const r = R(); if (r && r.estado !== 'inactivo') { try { r.salir(); } catch (e) {} } Object.assign(Sesion, { rol: 'ninguno', vm: null, conectado: false, oferta: null, perdida: false }); }
export function iniciarSuscripcion() { suscribir(); }
window.addEventListener('pagehide', () => { if (Sesion.rol === 'anfitrion') guardarYa(); const r = R(); if (r && r.estado !== 'inactivo') { try { r.salir(); } catch (e) {} } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && Sesion.rol === 'anfitrion') guardarYa(); });
