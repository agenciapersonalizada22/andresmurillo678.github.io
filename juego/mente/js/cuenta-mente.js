// Integracion de Gimnasio Mental con la plataforma de cuentas (window.Cuenta): perfil, nube, puntajes, logros/XP y rankings.
// Tolerante: sin Cuenta, sin sesion o sin red el juego sigue igual.
import { h } from './dom.js';
import { PUNTAJES } from './progreso.js';

const ID = 'mente';
export const CLAVES_NUBE = ['mente_progreso']; // solo progreso: ajustes de dispositivo y partida en curso no se sincronizan
const C = () => window.Cuenta || null;
export const usuario = () => { const c = C(); return (c && c.usuario) || null; };
const seguro = (f) => { try { return Promise.resolve(f()).catch(() => null); } catch (e) { return Promise.resolve(null); } };

export function aplicarPerfil() {
  const u = usuario(), Red = window.Red;
  if (!u || !Red || !Red.perfil) return;
  try { Red.perfil.guardar({ nombre: u.nombre || u.usuario, color: u.color }); } catch (e) { /* sin perfil de red */ }
}

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
  const raiz = h('div', { cls: 'bloque' }, [h('h3', { txt: 'Cuenta y nube' })]);
  if (!u) { raiz.appendChild(h('p', { cls: 'nota', txt: 'No has iniciado sesión. Entra desde el portal para guardar tu progreso en la nube y aparecer en los rankings.' })); return raiz; }
  const est = h('p', { cls: 'nota', 'aria-live': 'polite' }), msg = h('div', { cls: 'nota', 'aria-live': 'polite' });
  const b = h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Sincronizar ahora', on: { click: async () => {
    b.disabled = true; msg.textContent = 'Sincronizando…';
    const r = await sincronizarAhora(); b.disabled = false;
    msg.textContent = !r ? 'No se pudo sincronizar ahora.' : ({ igual: 'Todo está al día.', subido: 'Progreso subido a la nube.', bajado: 'Progreso de la nube aplicado.', sinRed: 'Sin conexión: se reintentará solo.', cancelado: 'Sincronización pospuesta.', sinSesion: 'Sin sesión.' })[r.estado] || 'Listo.';
    est.textContent = textoSync();
  } } });
  const refrescar = () => { if (!raiz.isConnected && raiz.dataset.visto) return false; raiz.dataset.visto = '1'; est.textContent = textoSync(); return true; };
  raiz.appendChild(h('p', { cls: 'nota' }, ['Usuario: ', h('b', { txt: u.nombre || u.usuario }), c && c.demo ? ' (modo demo: solo en este dispositivo)' : '']));
  raiz.appendChild(est); raiz.appendChild(b); raiz.appendChild(msg);
  raiz.appendChild(h('p', { cls: 'nota', txt: 'Se sincronizan progreso, logros e historial (no los ajustes de este dispositivo ni la partida en curso).' }));
  est.textContent = textoSync(); observadores.push(refrescar);
  return raiz;
}

/* Puntajes: indice por area (0..1000), racha diaria maxima y puntos totales. Se envian solo valores que subieron. */
let envio = Promise.resolve(); const enviados = {};
export function enviarPuntajes(v) {
  const c = C(); if (!c || !usuario() || !v) return envio;
  const lim = { puntos: 2000000, racha: 1000 };
  const lista = Object.keys(v).filter((k) => v[k] != null && v[k] > 0 && enviados[k] !== v[k]);
  const val = (k) => Math.min(Math.round(v[k]), lim[k] || 1000);
  lista.forEach((k) => { enviados[k] = v[k]; });
  if (lista.length) envio = Promise.all(lista.map((k) => seguro(() => c.puntaje(ID, k, val(k))))).then((r) => { r.forEach((x, i) => { if (!x) delete enviados[lista[i]]; }); return r; });
  return envio;
}
export const logro = (id) => { const c = C(); return c && usuario() ? seguro(() => c.logro(ID, id)) : Promise.resolve(null); };
export const xp = (n) => { const c = C(); return c && usuario() && n > 0 ? seguro(() => c.xp(ID, Math.min(1000, Math.round(n)))) : Promise.resolve(null); };
export function sincronizarLogros(logros) {
  const c = C(); if (!c || !usuario()) return;
  const ids = Object.keys(logros || {}).filter((k) => /^[a-z0-9_]{1,40}$/.test(k));
  ids.forEach((id, i) => setTimeout(() => logro(id), 1500 + i * 900));
}

export function panelRanking(cont) {
  const c = C(), est = { modo: 'memoria', ambito: 'global', n: 0 };
  const miLinea = h('p', { cls: 'nota', 'aria-live': 'polite' }), lista = h('div', { cls: 'rk-lista', 'aria-live': 'polite' });
  const grupo = (clave, opciones) => {
    const g = h('div', { cls: 'chips', role: 'group', 'aria-label': clave });
    opciones.forEach(([val, nom]) => g.appendChild(h('button', { type: 'button', cls: 'chip', 'data-f': 1, txt: nom, 'aria-pressed': String(est[clave] === val), on: { click: () => { est[clave] = val; Array.from(g.children).forEach((x, i) => x.setAttribute('aria-pressed', String(opciones[i][0] === val))); cargar(); } } })));
    return g;
  };
  cont.appendChild(grupo('ambito', [['global', 'Global'], ['amigos', 'Amigos']]));
  cont.appendChild(grupo('modo', PUNTAJES.map((p) => [p.id, p.nombre.replace('Índice de ', '').replace(' diaria máxima', ' diaria').replace(' totales', ''), p.nombre])));
  cont.appendChild(miLinea); cont.appendChild(lista);
  if (!c || !usuario()) { lista.appendChild(h('p', { cls: 'nota', txt: 'Inicia sesión para ver los rankings.' })); return; }
  async function cargar() {
    const tk = ++est.n, m = PUNTAJES.find((p) => p.id === est.modo);
    lista.textContent = ''; miLinea.textContent = ''; lista.appendChild(h('p', { cls: 'nota', txt: 'Cargando…' }));
    try {
      await envio;
      const [top, mi] = await Promise.all([c.top(ID, est.modo, 10, { soloAmigos: est.ambito === 'amigos' }), c.miPosicion(ID, est.modo).catch(() => null)]);
      if (tk !== est.n) return;
      lista.textContent = '';
      miLinea.textContent = mi && mi.posicion ? `Tu posición global en «${m.nombre}»: #${mi.posicion} de ${mi.total} · ${mi.valor} ${m.unidad}` : 'Aún no tienes puntaje en este ranking.';
      if (!top.length) { lista.appendChild(h('p', { cls: 'nota', txt: est.ambito === 'amigos' ? 'Ni tú ni tus amigos tienen puntaje aquí todavía.' : 'Aún no hay puntajes. ¡Sé el primero!' })); return; }
      const t = h('table', { cls: 'tabla' });
      t.appendChild(h('tr', {}, [h('th', { txt: '#' }), h('th', { txt: 'Jugador' }), h('th', { txt: m.unidad })]));
      top.forEach((e) => t.appendChild(h('tr', { cls: e.yo ? 'yo' : '' }, [h('td', { txt: String(e.pos) }), h('td', { txt: (e.nombre || 'Jugador') + (e.yo ? ' (tú)' : '') }), h('td', { txt: String(e.valor) })])));
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
export function panelCuenta(cont, cerrar) {
  const u = usuario(), c = C();
  if (!u) { cont.appendChild(h('p', { cls: 'nota', txt: 'No has iniciado sesión.' })); cont.appendChild(h('a', { cls: 'btn', 'data-f': 1, href: '../', txt: 'Ir al portal' })); return; }
  cont.appendChild(h('p', {}, [h('b', { txt: u.nombre || u.usuario }), ' · nivel ' + (u.nivel || 1) + ' · ' + (u.xp || 0) + ' XP']));
  if (c.demo) cont.appendChild(h('p', { cls: 'nota', txt: 'Modo demo: tu cuenta existe solo en este dispositivo.' }));
  cont.appendChild(bloqueNube());
  cont.appendChild(h('a', { cls: 'btn sec', 'data-f': 1, href: '../', txt: 'Volver al portal' }));
  cont.appendChild(h('button', { type: 'button', cls: 'btn peligro', 'data-f': 1, txt: 'Cerrar sesión', on: { click: async () => {
    try { await Promise.race([sincronizarAhora(), new Promise((r) => setTimeout(r, 3000))]); await c.salir(); } catch (e) { /* igual salimos */ }
    location.reload();
  } } }));
}
