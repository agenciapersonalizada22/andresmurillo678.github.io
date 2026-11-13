// Integracion de Sudoku con la plataforma de cuentas (window.Cuenta): perfil, nube, puntajes, logros/XP y rankings.
// Todo es tolerante: sin Cuenta, sin sesion o sin red el juego sigue funcionando igual.
import { h } from './dom.js';
import { PUNTAJES } from './progreso.js';
import { fmtTiempo } from './formato.js';
import { CLAVES_NUBE } from './almacen.js';

const ID = 'sudoku';
const C = () => window.Cuenta || null;
export const usuario = () => { const c = C(); return (c && c.usuario) || null; };
const seguro = (f) => { try { return Promise.resolve(f()).catch(() => null); } catch (e) { return Promise.resolve(null); } };

/* ---------- nube (solo sudoku_progreso; los ajustes de dispositivo y la partida nunca se sincronizan) ---------- */
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
export function bloqueNube() {
  const u = usuario(), c = C();
  const raiz = h('div', { cls: 'bloque' }, [h('h4', { txt: 'Cuenta y nube' })]);
  if (!u) { raiz.appendChild(h('p', { cls: 'nota', txt: 'No has iniciado sesión. Entra desde el portal para guardar tu progreso en la nube y aparecer en los rankings.' })); return raiz; }
  const est = h('p', { cls: 'nota', 'aria-live': 'polite' }), msg = h('div', { cls: 'nota', 'aria-live': 'polite' });
  const b = h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: 'Sincronizar ahora', on: { click: async () => {
    b.disabled = true; msg.textContent = 'Sincronizando…';
    const r = await sincronizarAhora();
    b.disabled = false;
    msg.textContent = !r ? 'No se pudo sincronizar ahora.' : ({ igual: 'Todo está al día.', subido: 'Progreso subido a la nube.', bajado: 'Progreso de la nube aplicado.', sinRed: 'Sin conexión: se reintentará solo.', cancelado: 'Sincronización pospuesta.', sinSesion: 'Sin sesión.' })[r.estado] || 'Listo.';
    est.textContent = textoSync();
  } } });
  const refrescar = () => { if (!raiz.isConnected && raiz.dataset.visto) return false; raiz.dataset.visto = '1'; est.textContent = textoSync(); return true; };
  raiz.appendChild(h('p', { cls: 'nota' }, ['Usuario: ', h('b', { txt: u.nombre || u.usuario }), c && c.demo ? ' (modo demo: solo en este dispositivo)' : '']));
  raiz.appendChild(est); raiz.appendChild(b); raiz.appendChild(msg);
  raiz.appendChild(h('p', { cls: 'nota', txt: 'Se sincronizan estadísticas, rachas, retos y logros (no los ajustes de este dispositivo ni la partida en curso).' }));
  est.textContent = textoSync(); observadores.push(refrescar);
  return raiz;
}

/* ---------- puntajes, logros y XP ---------- */
let envio = Promise.resolve();
export function enviarPuntajes(lista) {
  const c = C(); if (!c || !usuario() || !lista || !lista.length) return envio;
  envio = Promise.all(lista.map((x) => { const m = PUNTAJES.find((p) => p.id === x.modo); if (!m) return null; const v = Math.max(m.min || 0, Math.min(Math.round(x.valor), m.tope)); return seguro(() => c.puntaje(ID, x.modo, v)); }));
  return envio;
}
export const logro = (id) => { const c = C(); return c && usuario() ? seguro(() => c.logro(ID, id)) : Promise.resolve(null); };
export const xp = (n) => { const c = C(); return c && usuario() && n > 0 ? seguro(() => c.xp(ID, Math.max(1, Math.min(1000, Math.round(n))))) : Promise.resolve(null); };
export function sincronizarLogros(logros) {
  const c = C(); if (!c || !usuario()) return;
  Object.keys(logros || {}).filter((k) => /^[a-z0-9_]{1,40}$/.test(k)).forEach((id, i) => setTimeout(() => logro(id), 1500 + i * 900));
}
export function nombreUsuario() { const u = usuario(); return u ? (u.nombre || u.usuario) : 'Jugador'; }

/* ---------- ranking ---------- */
const valorTxt = (m, v) => (m.unidad === 's' ? fmtTiempo(v) : String(v));
export function panelRanking(cont) {
  const c = C();
  const est = { modo: 'tiempo_medio', ambito: 'global', n: 0 };
  const sel = h('select', { 'aria-label': 'Ranking', 'data-f': 1, cls: 'sel', on: { change: () => { est.modo = sel.value; cargar(); } } }, PUNTAJES.map((p) => h('option', { value: p.id, txt: p.nombre + (p.mayorEsMejor ? '' : ' · menor es mejor') })));
  sel.value = est.modo;
  const gr = h('div', { cls: 'seg', role: 'group' });
  [['global', 'Global'], ['amigos', 'Amigos']].forEach(([val, nom]) => gr.appendChild(h('button', { type: 'button', cls: 'chip', 'data-f': 1, txt: nom, 'aria-pressed': String(est.ambito === val), on: { click: () => { est.ambito = val; Array.from(gr.children).forEach((x, i) => x.setAttribute('aria-pressed', String(i === (val === 'global' ? 0 : 1)))); cargar(); } } })));
  const miLinea = h('p', { cls: 'nota', 'aria-live': 'polite' }), lista = h('div', { 'aria-live': 'polite' });
  cont.appendChild(gr); cont.appendChild(sel); cont.appendChild(miLinea); cont.appendChild(lista);
  if (!c || !usuario()) { lista.appendChild(h('p', { cls: 'nota', txt: 'Inicia sesión para ver los rankings.' })); return; }
  async function cargar() {
    const tk = ++est.n, m = PUNTAJES.find((p) => p.id === est.modo);
    lista.textContent = ''; miLinea.textContent = '';
    lista.appendChild(h('p', { cls: 'nota', txt: 'Cargando…' }));
    try {
      await envio;
      const [top, mi] = await Promise.all([c.top(ID, est.modo, 10, { soloAmigos: est.ambito === 'amigos' }), c.miPosicion(ID, est.modo).catch(() => null)]);
      if (tk !== est.n) return;
      lista.textContent = '';
      miLinea.textContent = mi && mi.posicion ? `Tu posición global: #${mi.posicion} de ${mi.total} · ${valorTxt(m, mi.valor)} ${m.unidad === 's' ? '' : m.unidad}` : 'Aún no tienes puntaje en este ranking.';
      if (!top.length) { lista.appendChild(h('p', { cls: 'nota', txt: est.ambito === 'amigos' ? 'Ni tú ni tus amigos tienen puntaje aquí todavía.' : 'Aún no hay puntajes. ¡Sé el primero!' })); return; }
      const t = h('table', { cls: 'tabla' });
      t.appendChild(h('tr', {}, [h('th', { txt: '#' }), h('th', { txt: 'Jugador' }), h('th', { txt: m.unidad === 's' ? 'Tiempo' : (m.unidad || 'Total') })]));
      top.forEach((e) => t.appendChild(h('tr', { cls: e.yo ? 'yo' : '', style: '--c:' + (/^#[0-9a-f]{6}$/i.test(e.color) ? e.color : '#9a8cff') }, [h('td', { txt: String(e.pos) }), h('td', { txt: (e.nombre || 'Jugador') + (e.yo ? ' (tú)' : '') }), h('td', { txt: valorTxt(m, e.valor) })])));
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

export function pintarChip(el) {
  el.textContent = '';
  const u = usuario(), c = C();
  el.hidden = !u;
  if (!u) return;
  const av = c.ui && c.ui.avatarEl ? c.ui.avatarEl(u.avatar, u.color, 24) : null;
  if (av) el.appendChild(av);
  el.appendChild(h('span', { txt: u.nombre || u.usuario }));
  if (u.nivel) el.appendChild(h('small', { txt: ' · Nv ' + u.nivel }));
}
