// Integracion de Domino con la plataforma de cuentas (window.Cuenta): perfil, nube, puntajes, logros/XP y rankings.
// Todo es tolerante: sin Cuenta, sin sesion o sin red el juego sigue funcionando igual.
import { h } from './dom.js';
import { PUNTAJES } from './progreso.js';

const ID = 'domino';
export const CLAVES_NUBE = ['domino_progreso']; // solo progreso (la politica de la plataforma deja los ajustes por dispositivo)
const C = () => window.Cuenta || null;
export const usuario = () => { const c = C(); return (c && c.usuario) || null; };
const seguro = (f) => { try { return Promise.resolve(f()).catch(() => null); } catch (e) { return Promise.resolve(null); } };

/* ---------- perfil ---------- */
export function aplicarPerfil() {
  const u = usuario(), Red = window.Red;
  if (!u || !Red || !Red.perfil) return;
  try { Red.perfil.guardar({ nombre: u.nombre || u.usuario, color: u.color }); } catch (e) { /* sin perfil de red */ }
}

/* ---------- nube ---------- */
let sync = null, resultado = null, observadores = [];
const avisar = () => { observadores = observadores.filter((f) => f()); };
export function iniciarNube(alBajar) {
  const c = C(); if (!c || !c.nube || !usuario()) return;
  try { sync = c.nube.autoSincronizar(ID, CLAVES_NUBE, {}); } catch (e) { sync = null; }
  try {
    c.on('sincronizado', (j, r) => { if (j !== ID) return; resultado = r || null; if (r && r.estado === 'bajado' && alBajar) alBajar(); avisar(); });
    c.on('cola', avisar);
  } catch (e) { /* sin eventos */ }
  addEventListener('online', avisar); addEventListener('offline', avisar);
}
const ultimaSync = () => { const u = usuario(); if (!u) return 0; try { return (JSON.parse(localStorage.getItem('cuenta_sync_' + u.uid + '_' + ID) || '{}').t) || 0; } catch (e) { return 0; } };
export function textoSync() {
  const c = C(), u = usuario();
  if (!c || !u) return 'Sin sesión: el progreso queda solo en este dispositivo.';
  const pend = c.pendientes ? c.pendientes() : 0, t = ultimaSync();
  if (navigator.onLine === false) return 'Sin conexión: el progreso se sincroniza al volver la red.' + (pend ? ` (${pend} pendiente${pend > 1 ? 's' : ''})` : '');
  if (resultado && resultado.estado === 'sinRed') return 'No se pudo conectar con la nube; se reintentará solo.';
  if (resultado && resultado.estado === 'cancelado') return 'Sincronización pospuesta: decide el conflicto al sincronizar de nuevo.';
  if (pend) return `Sincronizando… ${pend} cambio${pend > 1 ? 's' : ''} pendiente${pend > 1 ? 's' : ''}.`;
  return t ? 'Sincronizado: ' + new Date(t).toLocaleString('es') : 'Aún sin sincronizar.';
}
export function sincronizarAhora() {
  if (!sync) return Promise.resolve(null);
  return Promise.resolve(sync.ahora()).then((r) => { if (r) resultado = r; avisar(); return r; }, () => null);
}

/* Bloque «Cuenta y nube» (pestana Datos de Ajustes y panel de cuenta). */
export function bloqueNube() {
  const u = usuario(), c = C();
  const raiz = h('div', { cls: 'cu-bloque' }, [h('div', { cls: 'aj-sub', txt: 'Cuenta y nube' })]);
  if (!u) { raiz.appendChild(h('p', { cls: 'aj-nota', txt: 'No has iniciado sesión. Entra desde el portal para guardar tu progreso en la nube y aparecer en los rankings.' })); return raiz; }
  const est = h('p', { cls: 'aj-nota', 'aria-live': 'polite' });
  const msg = h('div', { cls: 'aj-msg', 'aria-live': 'polite' });
  const b = h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Sincronizar ahora', on: { click: async () => {
    b.disabled = true; msg.textContent = 'Sincronizando…';
    const r = await sincronizarAhora();
    b.disabled = false;
    msg.textContent = !r ? 'No se pudo sincronizar ahora.' : ({ igual: 'Todo está al día.', subido: 'Progreso subido a la nube.', bajado: 'Progreso de la nube aplicado.', sinRed: 'Sin conexión: se reintentará solo.', cancelado: 'Sincronización pospuesta.', sinSesion: 'Sin sesión.' })[r.estado] || 'Listo.';
    est.textContent = textoSync();
  } } });
  const refrescar = () => { if (!raiz.isConnected && raiz.dataset.visto) return false; raiz.dataset.visto = '1'; est.textContent = textoSync(); return true; };
  raiz.appendChild(h('p', { cls: 'aj-nota' }, ['Usuario: ', h('b', { txt: u.nombre || u.usuario }), c && c.demo ? ' (modo demo: solo en este dispositivo)' : '']));
  raiz.appendChild(est); raiz.appendChild(b); raiz.appendChild(msg);
  raiz.appendChild(h('p', { cls: 'aj-nota', txt: 'Se sincronizan progreso, logros y estadísticas (no los ajustes de este dispositivo). Si el progreso cambió en dos dispositivos, se resuelve con el diálogo de la plataforma: usar nube, usar este dispositivo o conservar ambos.' }));
  est.textContent = textoSync(); observadores.push(refrescar);
  return raiz;
}

/* ---------- puntajes, logros y XP ---------- */
let envio = Promise.resolve(), enviados = {};
export function enviarPuntajes(d) {
  const c = C(); if (!c || !usuario() || !d) return envio;
  const v = { victorias: Math.min(d.victorias | 0, 100000), puntos: Math.min(d.puntos | 0, 1000000), capicuas: Math.min(d.capicuas | 0, 100000) };
  const lista = Object.keys(v).filter((k) => v[k] > 0 && enviados[k] !== v[k]);
  lista.forEach((k) => { enviados[k] = v[k]; });
  if (lista.length) envio = Promise.all(lista.map((k) => seguro(() => c.puntaje(ID, k, v[k])))).then((r) => { r.forEach((x, i) => { if (!x) delete enviados[lista[i]]; }); return r; });
  return envio;
}
export const logro = (id) => { const c = C(); return c && usuario() ? seguro(() => c.logro(ID, id)) : Promise.resolve(null); };
export const xp = (n) => { const c = C(); return c && usuario() && n > 0 ? seguro(() => c.xp(ID, Math.round(n))) : Promise.resolve(null); };
/* Recompensas moderadas al terminar ronda/partida (nunca por tiempo jugado). */
export function recompensaFin(ev, unidad) {
  if (!ev) return;
  let n = 0;
  if (ev.unidad === unidad) n += 8;
  if (ev.partida) n += ev.campeon === unidad ? 40 : 10;
  xp(n);
}
/* Sube a la cuenta los logros ya conseguidos antes de tener sesion (escalonado para no saturar avisos). */
export function sincronizarLogros(logros) {
  const c = C(); if (!c || !usuario()) return;
  const ids = Object.keys(logros || {}).filter((k) => /^[a-z0-9_]{1,40}$/.test(k));
  ids.forEach((id, i) => setTimeout(() => logro(id), 1500 + i * 900));
}

/* ---------- ranking ---------- */
const NOMBRE_MODO = { victorias: 'Victorias', puntos: 'Puntos', capicuas: 'Capicúas' };
export async function posicion(modo = 'puntos') {
  const c = C(); if (!c || !usuario()) return null;
  await envio;
  return seguro(() => c.miPosicion(ID, modo));
}
export function panelRanking(cont, inicial) {
  const c = C();
  const est = { modo: (inicial && inicial.modo) || 'victorias', ambito: 'global', n: 0 };
  const cab = h('div', { cls: 'rk-cab' });
  const miLinea = h('p', { cls: 'nota rk-mi', 'aria-live': 'polite' });
  const lista = h('div', { cls: 'rk-lista', 'aria-live': 'polite' });
  const grupo = (clave, opciones) => {
    const g = h('div', { cls: 'aj-opc', role: 'group' });
    opciones.forEach(([val, nom]) => g.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: nom, 'aria-pressed': String(est[clave] === val), on: { click: () => { est[clave] = val; Array.from(g.children).forEach((x, i) => x.setAttribute('aria-pressed', String(opciones[i][0] === val))); cargar(); } } })));
    return g;
  };
  cab.appendChild(grupo('ambito', [['global', 'Global'], ['amigos', 'Amigos']]));
  cab.appendChild(grupo('modo', PUNTAJES.map((p) => [p.id, NOMBRE_MODO[p.id] || p.nombre])));
  cont.appendChild(cab); cont.appendChild(miLinea); cont.appendChild(lista);
  if (!c || !usuario()) { lista.appendChild(h('p', { cls: 'nota', txt: 'Inicia sesión para ver los rankings.' })); return; }
  const info = () => PUNTAJES.find((p) => p.id === est.modo);
  async function cargar() {
    const tk = ++est.n, m = info();
    lista.textContent = ''; miLinea.textContent = '';
    lista.appendChild(h('p', { cls: 'nota', txt: 'Cargando…' }));
    try {
      await envio;
      const [top, mi] = await Promise.all([c.top(ID, est.modo, 10, { soloAmigos: est.ambito === 'amigos' }), c.miPosicion(ID, est.modo).catch(() => null)]);
      if (tk !== est.n) return;
      lista.textContent = '';
      miLinea.textContent = mi && mi.posicion ? `Tu posición global: #${mi.posicion} de ${mi.total} · ${mi.valor} ${m.unidad}` : 'Aún no tienes puntaje en este ranking.';
      if (!top.length) { lista.appendChild(h('p', { cls: 'nota', txt: est.ambito === 'amigos' ? 'Ni tú ni tus amigos tienen puntaje aquí todavía.' : 'Aún no hay puntajes. ¡Sé el primero!' })); return; }
      const t = h('table', { cls: 'tabla rk-tabla' });
      t.appendChild(h('tr', {}, [h('th', { txt: '#' }), h('th', { txt: 'Jugador' }), h('th', { txt: m.unidad })]));
      top.forEach((e) => t.appendChild(h('tr', { cls: e.yo ? 'rk-yo' : '', style: '--c:' + (/^#[0-9a-f]{6}$/i.test(e.color) ? e.color : '#9a8cff') }, [h('td', { txt: String(e.pos) }), h('td', { txt: (e.nombre || 'Jugador') + (e.yo ? ' (tú)' : '') }), h('td', { txt: String(e.valor) })])));
      lista.appendChild(t);
    } catch (e) {
      if (tk !== est.n) return;
      lista.textContent = '';
      lista.appendChild(h('p', { cls: 'nota', txt: 'No se pudo cargar el ranking (' + ((c.mensajeError && c.mensajeError(e)) || 'sin conexión') + ').' }));
      lista.appendChild(h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: 'Reintentar', on: { click: cargar } }));
    }
  }
  cargar();
}

/* ---------- accesos de cuenta en el menu ---------- */
export function pintarChip(el, abrir) {
  el.textContent = '';
  const u = usuario(), c = C();
  el.hidden = !u;
  if (!u) return;
  const av = c.ui && c.ui.avatarEl ? c.ui.avatarEl(u.avatar, u.color, 26) : null;
  const nv = u.nivel ? ' · Nv ' + u.nivel : '';
  el.appendChild(h('button', { type: 'button', cls: 'cuenta-chip', 'data-f': 1, 'aria-label': 'Cuenta de ' + (u.nombre || u.usuario), on: { click: abrir } }, [av, h('span', { cls: 'cc-n', txt: u.nombre || u.usuario }), h('span', { cls: 'cc-v', txt: nv + ' · Cuenta' })]));
}
export function panelCuenta(cont, api, { ranking, antesDeSalir }) {
  const u = usuario(), c = C();
  if (!u) { cont.appendChild(h('p', { cls: 'nota', txt: 'No has iniciado sesión.' })); cont.appendChild(h('a', { cls: 'btn', 'data-f': 1, href: '../', txt: 'Ir al portal' })); return; }
  const fr = u.nivelInfo && u.nivelInfo.fraccion != null ? Math.round(u.nivelInfo.fraccion * 100) : 0;
  cont.appendChild(h('div', { cls: 'cu-perfil' }, [c.ui && c.ui.avatarEl ? c.ui.avatarEl(u.avatar, u.color, 56) : null,
    h('div', {}, [h('b', { txt: u.nombre || u.usuario }), h('small', { txt: '@' + u.usuario + ' · nivel ' + (u.nivel || 1) + ' · ' + (u.xp || 0) + ' XP' }), h('i', { cls: 'cu-barra', style: '--p:' + fr + '%' })])]));
  if (c.demo) cont.appendChild(h('p', { cls: 'nota', txt: 'Modo demo: tu cuenta existe solo en este dispositivo.' }));
  cont.appendChild(bloqueNube());
  cont.appendChild(h('div', { cls: 'aj-botones' }, [
    h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Ver rankings', on: { click: () => { api.cerrar(); ranking(); } } }),
    h('a', { cls: 'btn sec', 'data-f': 1, href: '../', txt: 'Volver al portal' })
  ]));
  cont.appendChild(h('button', { type: 'button', cls: 'btn peligro', 'data-f': 1, txt: 'Cerrar sesión', on: { click: async () => {
    if (!confirm('¿Cerrar sesión? Tu progreso queda guardado en tu cuenta.')) return;
    try { antesDeSalir && antesDeSalir(); await Promise.race([sincronizarAhora(), new Promise((r) => setTimeout(r, 3000))]); await c.salir(); } catch (e) { /* aun asi salimos */ }
    location.reload();
  } } }));
}
