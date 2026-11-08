// Integracion con la plataforma de cuentas (window.Cuenta): perfil, nube, puntajes, logros y rankings. Tolerante a su ausencia.
import { h } from './dom.js';
import { CLAVES_NUBE } from './almacen.js';

const ID = 'hockey';
export const MODOS_RANKING = [{ id: 'victorias', nombre: 'Victorias', unidad: 'victorias' }, { id: 'goles', nombre: 'Goles', unidad: 'goles' }];
const C = () => window.Cuenta || null;
export const usuario = () => { const c = C(); return (c && c.usuario) || null; };

export function aplicarPerfil() {
  const u = usuario(), Red = window.Red;
  if (!u || !Red || !Red.perfil) return;
  try { Red.perfil.guardar({ nombre: u.nombre || u.usuario, color: u.color }); } catch (e) { /* sin perfil */ }
}
export const nombreJugador = () => { const u = usuario(); if (u) return u.nombre || u.usuario; try { return window.Red.perfil.obtener().nombre || 'Jugador'; } catch (e) { return 'Jugador'; } };
export const colorJugador = () => { const u = usuario(); if (u && /^#[0-9a-f]{6}$/i.test(u.color)) return u.color; try { return window.Red.perfil.obtener().color; } catch (e) { return '#3df5ff'; } };

let sync = null, resultado = null;
export function iniciarNube(alBajar) {
  const c = C(); if (!c || !c.nube || !usuario()) return;
  try { sync = c.nube.autoSincronizar(ID, CLAVES_NUBE, {}); } catch (e) { sync = null; }
  try { c.on('sincronizado', (j, r) => { if (j !== ID) return; resultado = r || null; if (r && r.estado === 'bajado' && alBajar) alBajar(); }); } catch (e) { /* sin eventos */ }
}
export const sincronizarAhora = () => (sync ? Promise.resolve(sync.ahora()).then((r) => { resultado = r || resultado; return r; }, () => null) : Promise.resolve(null));
export function textoSync() {
  const c = C(), u = usuario();
  if (!c || !u) return 'Sin sesión: el progreso queda solo en este dispositivo.';
  if (navigator.onLine === false) return 'Sin conexión: se sincroniza al volver la red.';
  if (resultado && resultado.estado === 'sinRed') return 'No se pudo conectar con la nube; se reintentará solo.';
  return (c.demo ? 'Modo demo (solo este dispositivo). ' : '') + (resultado && resultado.estado ? 'Estado: ' + resultado.estado + '.' : 'Sincronización automática activa.');
}

/* Ranking y logros hacia la plataforma (silenciosos si falla). */
export function enviarPuntajes(stats) {
  const c = C(); if (!c || !usuario() || !c.puntaje) return;
  try { Promise.resolve(c.puntaje(ID, 'victorias', stats.victorias)).catch(() => {}); Promise.resolve(c.puntaje(ID, 'goles', stats.goles)).catch(() => {}); } catch (e) { /* sin red */ }
}
export function logroNube(id) { const c = C(); if (!c || !usuario() || !c.logro) return; try { Promise.resolve(c.logro(ID, id)).catch(() => {}); } catch (e) { /* ok */ } }
export function xp(n) { const c = C(); if (!c || !usuario() || !c.xp) return; try { Promise.resolve(c.xp(ID, Math.max(1, Math.min(1000, Math.round(n))))).catch(() => {}); } catch (e) { /* ok */ } }

export function panelRanking(cont) {
  const c = C(), est = { modo: 'victorias', ambito: 'global', n: 0 };
  const fila = h('div', { cls: 'seg' }), fila2 = h('div', { cls: 'seg' }), lista = h('div', { cls: 'rk-lista' }), mi = h('p', { cls: 'nota' });
  const btns = [];
  const pint = () => btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === est.modo || b.dataset.k === est.ambito)));
  MODOS_RANKING.forEach((m) => { const b = h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, 'data-k': m.id, txt: m.nombre, on: { click: () => { est.modo = m.id; pint(); cargar(); } } }); btns.push(b); fila.appendChild(b); });
  [['global', 'Global'], ['amigos', 'Amigos']].forEach(([id, n]) => { const b = h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, 'data-k': id, txt: n, on: { click: () => { est.ambito = id; pint(); cargar(); } } }); btns.push(b); fila2.appendChild(b); });
  cont.appendChild(fila); cont.appendChild(fila2); cont.appendChild(mi); cont.appendChild(lista);
  async function cargar() {
    const tk = ++est.n; lista.textContent = ''; mi.textContent = '';
    if (!c || !usuario() || !c.top) { lista.appendChild(h('p', { cls: 'nota', txt: 'Inicia sesión desde el portal para ver los rankings.' })); return; }
    lista.appendChild(h('p', { cls: 'nota', txt: 'Cargando…' }));
    try {
      const [top, pos] = await Promise.all([c.top(ID, est.modo, 10, { soloAmigos: est.ambito === 'amigos' }), c.miPosicion(ID, est.modo).catch(() => null)]);
      if (tk !== est.n) return;
      lista.textContent = ''; const u = MODOS_RANKING.find((m) => m.id === est.modo).unidad;
      mi.textContent = pos && pos.posicion ? `Tu posición global: #${pos.posicion} de ${pos.total} · ${pos.valor} ${u}` : 'Aún no tienes puntaje en este ranking.';
      if (!top.length) { lista.appendChild(h('p', { cls: 'nota', txt: est.ambito === 'amigos' ? 'Ni tú ni tus amigos tienen puntaje aquí todavía.' : 'Aún no hay puntajes. ¡Sé el primero!' })); return; }
      const t = h('table', { cls: 'tabla' }, [h('tr', {}, [h('th', { txt: '#' }), h('th', { txt: 'Jugador' }), h('th', { txt: u })])]);
      top.forEach((e) => t.appendChild(h('tr', { cls: e.yo ? 'yo' : '', style: '--c:' + (/^#[0-9a-f]{6}$/i.test(e.color) ? e.color : '#9a8cff') }, [h('td', { txt: String(e.pos) }), h('td', { txt: (e.nombre || 'Jugador') + (e.yo ? ' (tú)' : '') }), h('td', { txt: String(e.valor) })])));
      lista.appendChild(t);
    } catch (e) { if (tk === est.n) { lista.textContent = ''; lista.appendChild(h('p', { cls: 'nota', txt: 'No se pudo cargar el ranking (' + ((c.mensajeError && c.mensajeError(e)) || 'sin conexión') + ').' })); } }
  }
  pint(); cargar();
}

export function bloqueNube() {
  const u = usuario(), c = C();
  const raiz = h('div', { cls: 'bloque' }, [h('div', { cls: 'sub', txt: 'Cuenta y nube' })]);
  if (!u) { raiz.appendChild(h('p', { cls: 'nota', txt: 'No has iniciado sesión. Entra desde el portal para guardar tu progreso en la nube y aparecer en los rankings.' })); return raiz; }
  const est = h('p', { cls: 'nota', txt: textoSync() }), msg = h('div', { cls: 'nota', 'aria-live': 'polite' });
  const b = h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Sincronizar ahora', on: { click: async () => {
    b.disabled = true; msg.textContent = 'Sincronizando…'; const r = await sincronizarAhora(); b.disabled = false;
    msg.textContent = !r ? 'No se pudo sincronizar ahora.' : ({ igual: 'Todo está al día.', subido: 'Progreso subido.', bajado: 'Progreso de la nube aplicado.', sinRed: 'Sin conexión.', cancelado: 'Pospuesto.', sinSesion: 'Sin sesión.' })[r.estado] || 'Listo.'; est.textContent = textoSync();
  } } });
  raiz.appendChild(h('p', { cls: 'nota', txt: 'Sesión: @' + (u.usuario || u.nombre) + ' · nivel ' + (u.nivel || 1) })); raiz.appendChild(est); raiz.appendChild(b); raiz.appendChild(msg);
  if (c && c.demo) raiz.appendChild(h('p', { cls: 'nota', txt: 'Modo demo: tu cuenta existe solo en este dispositivo.' }));
  return raiz;
}
