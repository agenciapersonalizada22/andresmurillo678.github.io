// Mesa: controlador autoritativo de una sesion (lo ejecuta el anfitrion). Sin DOM ni red: todo recibe `ahora` (ms) para poder simularse en Node.
// La mesa es JSON puro (se guarda en localStorage y se restaura). El juego (J) es un modulo con la interfaz descrita en LEEME.md.
import { nuevoRng, semillaAleatoria, sig, ent } from './rng.js';
import { tablaSesion, agregarHistorial, validarCompra, limitesCompra } from './economia.js';

export const COLORES = ['#3df5ff', '#ff4fd8', '#ffd23d', '#6dff6d', '#ff6b4a', '#9a8cff', '#ffa43d', '#ffffff'];
export const AVATARES = ['🦊', '🐼', '🦁', '🐸', '🐙', '🦉', '🐯', '🐧', '🦄', '🐺', '🐲', '🤖'];
export const NOMBRES_BOT = ['Lucia', 'Mateo', 'Sofia', 'Dario', 'Ines', 'Bruno', 'Nora'];
export const CFG_BASE = { nAsientos: 4, privada: true, fichasIni: 1000, compraMin: 200, compraMax: 2000, compraDef: 1000, recompra: true, tope: 0, torneo: false, turnoSeg: 30, pausaMs: 2600, botNivel: 'medio', botsRecompran: true, op: {} };
const limpiar = (t, n) => String(t == null ? '' : t).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

export function cfgJuego(m, J) { return Object.assign({}, J.preset || {}, J.normalizar ? J.normalizar(m.cfg.op || {}) : m.cfg.op, { baraja: m.cfg.baraja, tope: m.cfg.tope, entropia: m.cfg.entropia !== false, banca: m.cfg.op && m.cfg.op.banca > 0 ? m.cfg.op.banca - 1 : -1 }); }

// opts: {id, cfg, semilla?, ahora, host:{nombre,color,avatar,tok,compra}, bots:[nivel|'abierto', ...] (asientos 1..n-1)}
export function crearMesa(J, opts) {
  const cfg = Object.assign({}, CFG_BASE, opts.cfg);
  cfg.nAsientos = Math.max(J.min || 1, Math.min(J.max || 6, cfg.nAsientos));
  const sem = opts.semilla || semillaAleatoria();
  const m = {
    v: 1, id: opts.id, juego: opts.juego || J.id, creada: opts.ahora, semilla: sem, cfg, asientos: [], espectadores: [], mano: 0, historial: [], chat: [], log: [], rev: 0,
    fin: false, premio: null, cobros: {}, expulsados: [], t: null, dl: {}, regMano: 0, libro: { entradas: 0, salidas: 0 }, rngBots: nuevoRng(sem + 'bots'), t0: opts.ahora,
  };
  m.estado = J.crear(cfgJuego(m, J), cfg.nAsientos, sem);
  const h = opts.host || {};
  for (let i = 0; i < cfg.nAsientos; i++) {
    const modo = i === 0 ? 'host' : (opts.bots && opts.bots[i - 1]) || cfg.botNivel;
    const a = { i, tipo: 'abierto', nombre: '', color: COLORES[i % COLORES.length], avatar: AVATARES[i % AVATARES.length], tok: '', nivel: '', conectado: false, silenciado: false, compras: 0, cobrado: 0, ganadas: 0, pend: 0, salir: false, ultimoChat: 0 };
    if (i === 0) {
      Object.assign(a, { tipo: 'humano', nombre: limpiar(h.nombre, 16) || 'Anfitrion', color: h.color || a.color, avatar: h.avatar || a.avatar, tok: h.tok || semilla8(), conectado: true, host: true });
      a.compras = cfg.torneo ? cfg.fichasIni : (h.compra || cfg.compraDef); mas(m, J, 0, a.compras);
    } else if (modo === 'abierto') { /* espera a un humano */ }
    else {
      Object.assign(a, { tipo: 'bot', nivel: modo, nombre: NOMBRES_BOT[(i - 1) % NOMBRES_BOT.length], conectado: true });
      a.compras = cfg.fichasIni; mas(m, J, i, a.compras);
    }
    m.asientos.push(a);
  }
  if (cfg.torneo) { cfg.compraMin = cfg.compraMax = cfg.compraDef; cfg.recompra = false; cfg.torneoPozo = cfg.compraDef * cfg.nAsientos; }
  return m;
}
export const semilla8 = () => semillaAleatoria().slice(0, 12);
const mas = (m, J, i, n) => { if (n > 0) { J.agregarFichas(m.estado, i, n); m.libro.entradas += n; } };
const menos = (m, J, i) => { const c = J.quitarFichas(m.estado, i); m.libro.salidas += c; return c; };
const asientoDe = (m, tok) => m.asientos.find((a) => a.tok && a.tok === tok);
export const humanos = (m) => m.asientos.filter((a) => a.tipo === 'humano');
export const stacks = (m, J) => J.fichas(m.estado).map((f, i) => f + (m.asientos[i].pend || 0));

// ---------------- entradas y salidas ----------------
// un cliente se conecta (o reconecta con su token). Devuelve {asiento, espectador, cobro?}
export function unir(m, J, d, ahora) {
  const tok = limpiar(d.tok, 24), nombre = limpiar(d.nombre, 16) || 'Jugador';
  if (m.expulsados.includes(tok)) return { error: 'Fuiste expulsado de esta mesa' };
  let a = asientoDe(m, tok);
  if (a) { a.conectado = true; if (!a.host) { a.nombre = nombre; a.color = d.color || a.color; a.avatar = d.avatar || a.avatar; } m.rev++; return { asiento: a.i, cobro: tomarCobro(m, tok), reconexion: true }; }
  const sp = m.espectadores.find((s) => s.tok === tok);
  if (sp) { sp.conectado = true; sp.nombre = nombre; }
  if (!d.espectador && !m.fin) {
    a = m.asientos.find((x) => x.tipo === 'abierto');
    if (a) {
      const lim = limitesCompra(m.cfg), compra = m.cfg.torneo ? m.cfg.fichasIni : Math.max(lim.min, Math.min(lim.max, Math.floor(+d.compra) || m.cfg.compraDef));
      const usado = m.asientos.some((x) => x.i !== a.i && x.tipo !== 'abierto' && x.color === d.color);
      Object.assign(a, { tipo: 'humano', nombre, color: d.color && !usado ? d.color : COLORES[a.i % COLORES.length], avatar: d.avatar || a.avatar, tok, conectado: true, silenciado: false, salir: false, ganadas: 0, cobrado: 0 });
      a.compras = 0; a.pend = compra;
      m.espectadores = m.espectadores.filter((s) => s.tok !== tok);
      aplicarPendientes(m, J, true); aviso(m, nombre + ' se sento en la mesa', ahora); m.rev++;
      return { asiento: a.i, compra };
    }
  }
  if (!sp) m.espectadores.push({ tok, nombre, color: d.color || '#ffffff', conectado: true });
  m.rev++;
  return { asiento: -1, espectador: true };
}
function tomarCobro(m, tok) { const c = m.cobros[tok] || 0; delete m.cobros[tok]; return c; }
export function desconectar(m, tok) {
  const a = asientoDe(m, tok); if (a && !a.host) { a.conectado = false; m.rev++; return a.i; }
  const sp = m.espectadores.find((s) => s.tok === tok); if (sp) sp.conectado = false;
  return -1;
}
// el jugador (o el anfitrion) pide levantarse: se le liquidan sus fichas al terminar la mano
export function levantarse(m, J, i, ahora) {
  const a = m.asientos[i]; if (!a || a.tipo !== 'humano') return false;
  a.salir = true; if (J.fase(m.estado) === 'entre') aplicarPendientes(m, J, false); m.rev++; return true;
}
export function expulsar(m, J, i, ahora) {
  const a = m.asientos[i]; if (!a || a.tipo !== 'humano' || a.host) return false;
  m.expulsados.push(a.tok); a.salir = true; a.conectado = false; aviso(m, a.nombre + ' fue expulsado', ahora);
  if (J.fase(m.estado) === 'entre') aplicarPendientes(m, J, false); m.rev++; return true;
}
export function silenciar(m, i, v) { const a = m.asientos[i]; if (!a || a.host) return false; a.silenciado = v == null ? !a.silenciado : !!v; m.rev++; return true; }
export function recomprar(m, J, i, monto, saldo, ahora) {
  const a = m.asientos[i]; if (!a || a.tipo !== 'humano') return { ok: false, error: 'No estas sentado' };
  if (!m.cfg.recompra || m.cfg.torneo) return { ok: false, error: 'La recompra no esta permitida' };
  const v = validarCompra(m.cfg, monto, saldo); if (!v.ok) return v;
  const actual = J.fichas(m.estado)[i] + a.pend;
  if (m.cfg.tope > 0 && actual + v.monto > m.cfg.tope) return { ok: false, error: 'Superarias el tope de la mesa (' + m.cfg.tope + ')' };
  a.pend += v.monto; if (J.fase(m.estado) === 'entre') aplicarPendientes(m, J, false);
  m.rev++; return { ok: true, monto: v.monto };
}
// convierte un asiento de bot en abierto (o al reves) entre manos; devuelve el cobro del humano si lo habia
export function abrirAsiento(m, J, i) {
  const a = m.asientos[i]; if (!a || a.host || a.tipo === 'humano') return false;
  if (J.fase(m.estado) !== 'entre') return false;
  menos(m, J, i);
  Object.assign(a, { tipo: 'abierto', nombre: '', tok: '', nivel: '', conectado: false, compras: 0, cobrado: 0, ganadas: 0, pend: 0 }); m.rev++; return true;
}
export function ponerBot(m, J, i, nivel) {
  const a = m.asientos[i]; if (!a || a.host || a.tipo === 'humano') return false;
  if (J.fase(m.estado) !== 'entre') return false;
  menos(m, J, i);
  Object.assign(a, { tipo: 'bot', nivel, nombre: NOMBRES_BOT[(i - 1) % NOMBRES_BOT.length], conectado: true, compras: m.cfg.fichasIni, cobrado: 0, pend: 0, tok: '' });
  mas(m, J, i, m.cfg.fichasIni); m.rev++; return true;
}
function aviso(m, texto, ahora) { m.log.push({ t: ahora, texto }); if (m.log.length > 12) m.log.shift(); }

// aplica altas, recompras y salidas pendientes. Solo cuando el juego esta entre manos (o el asiento no participa)
function aplicarPendientes(m, J, soloAltas) {
  if (J.fase(m.estado) !== 'entre') return;
  m.asientos.forEach((a) => {
    if (a.tipo === 'humano' && a.salir && !soloAltas) {
      const c = menos(m, J, a.i) + a.pend; a.pend = 0; a.cobrado += c;
      if (c > 0 && !a.host) m.cobros[a.tok] = (m.cobros[a.tok] || 0) + c;
      if (a.host) { m.cobroHost = (m.cobroHost || 0) + c; }
      a.salidaCobro = c; a.salir = false;
      if (!a.host) { m.salidas = (m.salidas || []).concat([{ tok: a.tok, cobro: c, nombre: a.nombre }]); Object.assign(a, { tipo: 'abierto', nombre: '', tok: '', conectado: false, compras: 0, cobrado: 0, ganadas: 0 }); }
    } else if (a.pend > 0 && a.tipo === 'humano') { mas(m, J, a.i, a.pend); a.compras += a.pend; a.pend = 0; }
  });
}
export function terminar(m, J, ahora) {
  // liquida: en cash devuelve las fichas de mesa; en torneo el ganador cobra el bote de entradas
  const cobros = {}, f = J.fichas(m.estado);
  if (m.cfg.torneo) {
    const pozo = m.cfg.torneoPozo || 0; let mejor = -1, mx = -1;
    f.forEach((x, i) => { if (x > mx) { mx = x; mejor = i; } });
    m.asientos.forEach((a) => { if (a.tipo === 'humano') cobros[a.i] = a.i === mejor ? pozo : 0; });
    m.premio = { asiento: mejor, monto: pozo, nombre: m.asientos[mejor] ? m.asientos[mejor].nombre : '' };
  } else m.asientos.forEach((a) => { if (a.tipo === 'humano') cobros[a.i] = f[a.i] + a.pend; });
  m.asientos.forEach((a) => { if (cobros[a.i] != null) a.cobrado += cobros[a.i]; });
  m.fin = true; m.rev++; m.t = null; m.cobrosFin = cobros;
  return cobros;
}

// ---------------- acciones y reloj ----------------
export function accion(m, J, i, a, ahora) {
  if (m.fin) return { ok: false, error: 'La sesion termino' };
  const q = J.quien(m.estado);
  if (!q.includes(i)) return { ok: false, error: 'No es tu turno' };
  const r = J.aplicar(m.estado, i, a);
  if (r.ok) { delete m.dl[i]; m.rev++; m.t = null; }
  return r;
}
function nuevoPlazo(m, a, ahora) {
  if (a.tipo === 'bot') return { en: ahora + (m.cfg.rapido ? 0 : 700 + ent(m.rngBots, 900)), k: 'bot' };
  if (!a.conectado) return { en: ahora + 1200, k: 'aus' };
  return { en: m.cfg.turnoSeg > 0 ? ahora + m.cfg.turnoSeg * 1000 : Infinity, k: 'hum' };
}
export function plazoRestante(m, ahora) {
  const o = {}; Object.keys(m.dl).forEach((i) => { const d = m.dl[i]; if (d.k === 'hum' && isFinite(d.en)) o[i] = Math.max(0, d.en - ahora); }); return o;
}
// avanza el reloj de la mesa. Devuelve true si cambio el estado (hay que difundir)
export function tick(m, J, ahora) {
  if (m.fin) return false;
  const e = m.estado;
  if (J.fase(e) === 'entre') {
    if (m.regMano !== m.mano) { registrarMano(m, J, ahora); m.regMano = m.mano; m.t = { tipo: 'entre', en: ahora + (m.cfg.pausaMs || 0) }; m.rev++; return true; }
    if (!m.t) m.t = { tipo: 'entre', en: ahora };
    if (ahora < m.t.en) return false;
    aplicarPendientes(m, J, false); botsRecompran(m, J);
    if (finTorneo(m, J)) { terminar(m, J, ahora); return true; }
    m.dl = {};
    if (J.nuevaMano(e, ahora)) { m.mano++; m.t = null; m.regMano = m.mano - 1; m.rev++; return true; }
    m.t = { tipo: 'entre', en: ahora + 1500 }; m.rev++;
    return false;
  }
  const q = J.quien(e);
  if (!q.length) {
    if (!m.t || m.t.tipo !== 'paso') { m.t = { tipo: 'paso', en: ahora + (m.cfg.rapido ? 0 : (J.retardoPaso || 800)) }; return false; }
    if (ahora < m.t.en) return false;
    m.t = null; const c = J.paso(e); if (c) m.rev++; return c;
  }
  m.t = null;
  Object.keys(m.dl).forEach((k) => { if (!q.includes(+k)) delete m.dl[k]; });
  let cambio = false;
  for (const i of q) {
    const a = m.asientos[i]; let d = m.dl[i];
    if (!d) d = m.dl[i] = nuevoPlazo(m, a, ahora);
    if (d.k === 'hum' && !a.conectado) d.en = Math.min(d.en, ahora + 1200);
    if (ahora < d.en) continue;
    let act = null;
    if (a.tipo === 'bot') { const B = J.bot; try { act = B(J.vista(e, i), i, a.nivel, m.rngBots); } catch (err) { act = null; } }
    let r = act ? J.aplicar(e, i, act) : { ok: false };
    if (!r.ok) r = J.aplicar(e, i, J.automatica(e, i));
    delete m.dl[i]; m.rev++; cambio = true; if (r.ok) break;
  }
  return cambio;
}
function botsRecompran(m, J) {
  const f = J.fichas(m.estado);
  m.asientos.forEach((a) => {
    if (a.tipo === 'bot' && f[a.i] <= 0 && !m.cfg.torneo && m.cfg.botsRecompran) { mas(m, J, a.i, m.cfg.fichasIni); a.compras += m.cfg.fichasIni; }
  });
}
function finTorneo(m, J) {
  if (!m.cfg.torneo || m.mano < 1) return false;
  return J.fichas(m.estado).filter((x) => x > 0).length <= 1;
}
function registrarMano(m, J, ahora) {
  const r = J.resumen(m.estado); if (!r) return;
  r.ganadores.forEach((i) => { if (m.asientos[i]) m.asientos[i].ganadas++; });
  const nombres = r.ganadores.map((i) => (m.asientos[i] ? m.asientos[i].nombre : '?'));
  agregarHistorial(m.historial, { n: m.mano, t: ahora, texto: r.texto, total: r.total, ganadores: nombres, delta: r.delta }, 120);
  if (r.ganadores.length) aviso(m, nombres.join(' y ') + (r.texto ? ' gana (' + r.texto + ')' : ' gana') + (r.total ? ' ' + r.total : ''), ahora);
}

// ---------------- chat ----------------
export function chat(m, i, texto, ahora) {
  texto = limpiar(texto, 160); if (!texto) return false;
  let quien = i >= 0 ? m.asientos[i] : null;
  if (quien && (quien.silenciado || ahora - (quien.ultimoChat || 0) < 600)) return false;
  if (quien) quien.ultimoChat = ahora;
  m.chat.push({ i, nombre: quien ? quien.nombre : 'Espectador', color: quien ? quien.color : '#fff', texto, t: ahora });
  if (m.chat.length > 50) m.chat.shift();
  m.rev++; return true;
}

// ---------------- vistas y serializacion ----------------
export function vistaMesa(m, J, i, ahora) {
  const st = stacks(m, J);
  return {
    id: m.id, juego: m.juego, rev: m.rev, mano: m.mano, yo: i, fin: m.fin, premio: m.premio,
    cfg: { n: m.cfg.nAsientos, torneo: m.cfg.torneo, recompra: m.cfg.recompra, compraMin: m.cfg.compraMin, compraMax: m.cfg.compraMax, tope: m.cfg.tope, turnoSeg: m.cfg.turnoSeg, baraja: m.cfg.baraja, reverso: m.cfg.reverso, op: m.cfg.op },
    asientos: m.asientos.map((a) => ({ i: a.i, tipo: a.tipo, nombre: a.nombre, color: a.color, avatar: a.avatar, nivel: a.nivel, conectado: a.conectado, silenciado: a.silenciado, host: !!a.host, salir: a.salir, pend: a.pend })),
    espectadores: m.espectadores.filter((s) => s.conectado).map((s) => s.nombre),
    j: J.vista(m.estado, i), neto: tablaSesion(m.asientos, st).map((r) => ({ i: r.i, neto: r.neto, compras: r.compras })),
    plazo: plazoRestante(m, ahora), historial: m.historial.slice(-10), chat: m.chat.slice(-24), log: m.log.slice(-4), pausa: m.t && m.t.tipo === 'entre' ? Math.max(0, m.t.en - ahora) : 0,
  };
}
export const serializar = (m) => JSON.stringify(Object.assign({}, m, { dl: {}, t: null }));
export function restaurar(texto) {
  const m = typeof texto === 'string' ? JSON.parse(texto) : texto;
  m.dl = {}; m.t = null; m.regMano = m.regMano == null ? -1 : m.regMano;
  m.asientos.forEach((a) => { if (a.tipo === 'humano' && !a.host) a.conectado = false; });
  m.espectadores.forEach((s) => { s.conectado = false; });
  return m;
}
