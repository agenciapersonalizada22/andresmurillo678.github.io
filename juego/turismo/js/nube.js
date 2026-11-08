// Integracion con la plataforma de cuentas (Cuenta): nube, puntajes, logros, XP, ranking y pantalla de cuenta.
// Todo es opcional: si Cuenta no existe o no hay sesion, cada funcion no hace nada y el juego sigue igual.
import { X, dinero } from './contexto.js';
import { h, boton, abrirHoja, refrescarHojas, cerrarHojaId, confirmar, aviso } from './dom.js';

export const JUEGO = 'turismo';
// Solo progreso viaja a la nube (logros, estadisticas, records) y las reglas de la casa. No: ajustes (por dispositivo), partida en curso, asiento.
export const CLAVES_NUBE = ['turismo_progreso', 'turismo_setup'];
export const MODOS = [
  { id: 'patrimonio_final', nombre: 'Patrimonio', tope: 30000, mayor: true, fmt: (v) => dinero(v) },
  { id: 'sellos_partida', nombre: 'Sellos', tope: 24, mayor: true, fmt: (v) => v + ' sellos' },
  { id: 'victorias', nombre: 'Victorias', tope: 2000, mayor: true, fmt: (v) => v + (v === 1 ? ' victoria' : ' victorias') }
];
const C = () => window.Cuenta || null;
export const usuario = () => { const c = C(); return (c && c.usuario) || null; };
const est = { handle: null, ultima: 0, resultado: '', sincronizando: false, recargarAlMenu: false };
const ign = () => {};

/* ---------- nube ---------- */
function recargarSiProcede() {
  if (X.E) { est.recargarAlMenu = true; aviso('Hay progreso nuevo de tu cuenta: se aplicará al volver al menú', '#6dff6d', 4000); } else location.reload();
}
export async function iniciarNube() {
  const c = C(); if (!c || !c.usuario || est.handle) return;
  try {
    c.on('sincronizado', (juego, res) => {
      if (juego !== JUEGO) return;
      if (res && res.estado !== 'sinRed' && res.estado !== 'cancelado') est.ultima = Date.now();
      est.resultado = (res && res.estado) || '';
      if (res && res.estado === 'bajado') recargarSiProcede();
      refrescarHojas(['ajustes']);
    });
    c.on('cola', () => refrescarHojas(['ajustes']));
    est.handle = c.nube.autoSincronizar(JUEGO, CLAVES_NUBE, { recargar: false });
    // la primera sincronizacion puede bajar progreso: se espera un poco para no leer guardados viejos, pero sin bloquear sin red
    await Promise.race([est.handle.primera.catch(ign), new Promise((r) => setTimeout(r, 3500))]);
  } catch (e) { console.warn(e); }
}
export const hayCambioPendienteDeNube = () => { const v = est.recargarAlMenu; est.recargarAlMenu = false; return v; };
export function sincronizarAhora() {
  if (!est.handle || est.sincronizando) return Promise.resolve();
  est.sincronizando = true; refrescarHojas(['ajustes']);
  return est.handle.ahora().then((r) => { if (r && r.estado && r.estado !== 'sinRed' && r.estado !== 'cancelado') est.ultima = Date.now(); if (r) est.resultado = r.estado; if (r && r.estado === 'sinRed') aviso('Sin conexión: se sincronizará al volver la red', '#ffd23d'); }, ign)
    .then(() => { est.sincronizando = false; refrescarHojas(['ajustes']); });
}
// Se llama cuando el juego ya cargo: reporta a la plataforma los logros locales que aun no conoce (idempotente)
export function alJuegoListo() {
  const c = C(); if (!c || !c.usuario) return;
  import('./logros.js').then((L) => {
    const ya = c.logros(JUEGO);
    Object.keys(L.progreso.logros || {}).forEach((id) => { if (!ya.includes(id)) logro(id); });
  }).catch(ign);
}

/* ---------- puntajes, logros, XP ---------- */
export function logro(id) { const c = C(); if (c && c.usuario) { try { c.logro(JUEGO, id).catch(ign); } catch (e) { /* nada */ } } }
export function xp(n) { const c = C(); if (c && c.usuario) { try { c.xp(JUEGO, n); } catch (e) { /* nada */ } } }
export function puntaje(modo, valor) {
  const c = C(), m = MODOS.find((x) => x.id === modo);
  if (!c || !c.usuario || !m || !isFinite(valor)) return Promise.resolve(null);
  valor = Math.max(m.mayor ? 0 : 1, Math.min(m.tope, Math.round(valor)));
  try { return c.puntaje(JUEGO, modo, valor).then((r) => { delete cache[modo + '/global']; delete cache[modo + '/amigos']; return r; }, ign); } catch (e) { return Promise.resolve(null); }
}
// Fin de partida (una vez por partida): XP moderado y puntajes si gano
export function finPartida(gano, pat, sellos, victorias, e) {
  if (!usuario()) return;
  xp(gano ? 35 : 10);
  // contra rivales reales o bots (>= 2 rivales) para que el ranking no se infle con partidas triviales
  if (gano && e && e.jug.length >= 3) { puntaje('patrimonio_final', Math.min(pat, 30000)); puntaje('sellos_partida', Math.max(1, sellos)); puntaje('victorias', victorias); }
}

/* ---------- ranking ---------- */
const rk = { modo: 'patrimonio_final', alcance: 'global' };
const cache = {};
function cargar(modo, alcance) {
  const k = modo + '/' + alcance, c = C(); if (!c) return;
  if (cache[k] && (cache[k].estado === 'cargando' || Date.now() - cache[k].t < 20000)) return;
  cache[k] = { estado: 'cargando', t: Date.now() };
  const amigos = alcance === 'amigos';
  Promise.all([c.top(JUEGO, modo, 10, { soloAmigos: amigos }), amigos ? null : c.miPosicion(JUEGO, modo).catch(() => null)]).then(
    (r) => { cache[k] = { estado: 'ok', lista: r[0] || [], mi: r[1], t: Date.now() }; refrescarHojas(['ranking', 'fin']); },
    (e) => { cache[k] = { estado: 'error', msg: c.mensajeError ? c.mensajeError(e) : 'No se pudo cargar', t: 0 }; refrescarHojas(['ranking', 'fin']); });
}
export function panelRanking(c, opc) {
  opc = opc || {};
  const modo = MODOS.find((m) => m.id === rk.modo) || MODOS[0], k = modo.id + '/' + rk.alcance;
  const cam = (fn) => () => { fn(); refrescarHojas(['ranking', 'fin']); };
  c.appendChild(h('div', { cls: 'chips', role: 'tablist', 'aria-label': 'Tipo de ranking' }, MODOS.map((m) => boton(m.nombre, cam(() => { rk.modo = m.id; }), 'chip' + (m.id === modo.id ? ' on' : ''), { role: 'tab', 'aria-selected': m.id === modo.id, 'data-k': 'rm' + m.id }))));
  c.appendChild(h('div', { cls: 'chips', role: 'tablist', 'aria-label': 'Alcance' },
    boton('Global', cam(() => { rk.alcance = 'global'; }), 'chip' + (rk.alcance === 'global' ? ' on' : ''), { role: 'tab', 'aria-selected': rk.alcance === 'global', 'data-k': 'ra1' }),
    boton('Amigos', cam(() => { rk.alcance = 'amigos'; }), 'chip' + (rk.alcance === 'amigos' ? ' on' : ''), { role: 'tab', 'aria-selected': rk.alcance === 'amigos', 'data-k': 'ra2' }),
    boton('↻ Actualizar', () => { delete cache[k]; cargar(modo.id, rk.alcance); refrescarHojas(['ranking', 'fin']); }, 'sec chip', { 'data-k': 'ract' })));
  if (!usuario()) { c.appendChild(h('p', { cls: 'peq' }, 'Inicia sesión para ver los rankings.')); return; }
  cargar(modo.id, rk.alcance);
  const d = cache[k];
  if (!d || d.estado === 'cargando') { c.appendChild(h('p', { cls: 'peq', role: 'status' }, 'Cargando ranking…')); return; }
  if (d.estado === 'error') { c.appendChild(h('p', { cls: 'peq', role: 'status' }, 'No se pudo cargar el ranking (' + d.msg + '). Pulsa Actualizar para reintentar.')); return; }
  if (!d.lista.length) c.appendChild(h('p', { cls: 'peq', role: 'status' }, rk.alcance === 'amigos' ? 'Aún no hay puntajes tuyos ni de tus amigos. ¡Gana una partida!' : 'Aún no hay puntajes. ¡Sé el primero en ganar una partida!'));
  else c.appendChild(h('ol', { cls: 'rk' }, d.lista.map((e) => h('li', { cls: e.yo ? 'yo' : '' }, h('span', { cls: 'pos' }, '#' + e.pos), h('span', { cls: 'pt', style: '--c:' + (e.color || '#fff') }), h('b', {}, e.nombre + (e.yo ? ' (tú)' : '')), h('span', { cls: 'val' }, modo.fmt(e.valor))))));
  if (d.mi && d.mi.posicion) c.appendChild(h('p', { cls: 'peq' }, 'Tu posición: #' + d.mi.posicion + (d.mi.total ? ' de ' + d.mi.total : '') + ' · ' + modo.fmt(d.mi.valor)));
}
export function abrirRanking(modo) {
  if (modo) rk.modo = modo;
  abrirHoja({ id: 'ranking', titulo: 'Ranking', ancha: true, render: (c) => panelRanking(c) });
}

/* ---------- cuenta ---------- */
export function pastillaCuenta() {
  const u = usuario(); if (!u) return null;
  return h('div', { cls: 'cuentaPie' }, h('span', { cls: 'pt', style: '--c:' + (u.color || '#fff') }), h('span', { cls: 'cn' }, u.nombre),
    boton('Cuenta', () => abrirCuenta(), 'sec chip', { 'aria-label': 'Cuenta de ' + u.nombre }));
}
export function irPortal() { const c = C(); location.href = c && c.portalUrl ? c.portalUrl() : '../'; }
export function abrirCuenta() {
  abrirHoja({ id: 'cuenta', titulo: 'Cuenta', render: (c) => {
    const u = usuario();
    if (!u) { c.append(h('p', {}, 'No hay sesión iniciada.'), boton('Ir al portal', irPortal, 'prim', { 'data-pref': 1 })); return; }
    c.append(h('p', { cls: 'grande' }, h('span', { cls: 'pt', style: '--c:' + (u.color || '#fff') }), ' ' + u.nombre),
      h('p', { cls: 'peq' }, 'Nivel ' + (u.nivel || 1) + ' · ' + (u.xp || 0) + ' XP' + (C().demo ? ' · modo demo (solo en este dispositivo)' : '')),
      h('div', { cls: 'botonera' },
        boton('Ir al portal', irPortal, 'sec', { 'data-pref': 1 }),
        boton('Ver ranking', () => { cerrarHojaId('cuenta'); abrirRanking(); }, 'sec'),
        boton('Cerrar sesión', () => confirmar('Se cerrará tu sesión en este dispositivo. Tu progreso queda guardado en tu cuenta.', () => { sincronizarAhora().then(() => C().salir()).catch(ign).then(irPortal); }, 'Cerrar sesión'), 'mal')));
  } });
}
const hace = (t) => { const s = Math.round((Date.now() - t) / 1000); return s < 10 ? 'hace un momento' : s < 90 ? 'hace ' + s + ' s' : s < 5400 ? 'hace ' + Math.round(s / 60) + ' min' : new Date(t).toLocaleString('es'); };
export function bloqueNube(c) {
  c.appendChild(h('h3', {}, 'Cuenta y nube'));
  const u = usuario();
  if (!u) { c.appendChild(h('p', { cls: 'peq' }, 'No hay sesión: el progreso queda solo en este dispositivo.')); return; }
  const cl = C(), pend = cl.pendientes ? cl.pendientes() : 0, offline = navigator.onLine === false;
  let estado = est.sincronizando ? 'Sincronizando…' : offline ? 'Sin conexión: se sincronizará al volver la red' : est.ultima ? 'Sincronizado ' + hace(est.ultima) : 'Aún sin sincronizar en esta sesión';
  if (pend) estado += ' · ' + pend + ' pendiente' + (pend === 1 ? '' : 's') + ' de enviar';
  c.appendChild(h('div', { cls: 'ajuste' }, h('span', { cls: 'etq' }, 'Usuario'), h('div', { cls: 'ctl' }, h('b', {}, u.nombre), boton('Cuenta', () => abrirCuenta(), 'sec peq'))));
  c.appendChild(h('div', { cls: 'ajuste' }, h('span', { cls: 'etq', role: 'status' }, estado), h('div', { cls: 'ctl' }, boton('Sincronizar ahora', () => { sincronizarAhora(); }, 'prim', { 'data-k': 'sinc' }))));
  c.appendChild(h('p', { cls: 'peq' }, 'Se sincronizan tu progreso, logros, récords y reglas de la casa. Los ajustes y la partida en curso son de este dispositivo. Si dos dispositivos cambian a la vez, la plataforma te pregunta qué versión conservar.'));
}
