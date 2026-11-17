// Integracion con la plataforma de cuentas (window.Cuenta): perfil, nube, puntajes, logros/XP y ranking. Tolerante a fallos.
import { h } from './dom.js';

const ID = 'jardin2';
export const CLAVES_NUBE = ['jardin2_progreso']; // jamas ajustes de dispositivo ni la partida efimera
const C = () => window.Cuenta || null;
export const usuario = () => { const c = C(); return (c && c.usuario) || null; };
const seguro = (f) => { try { return Promise.resolve(f()).catch(() => null); } catch (e) { return Promise.resolve(null); } };

export function aplicarPerfil() {
  const u = usuario(), Red = window.Red; if (!u || !Red || !Red.perfil) return;
  try { Red.perfil.guardar({ nombre: u.nombre || u.usuario, color: u.color }); } catch (e) { /* sin red */ }
}
const semanaActual = () => Math.floor((Date.now() / 86400000 + 3) / 7);
let sync = null, resultado = null, obs = [];
const avisar = () => { obs = obs.filter((f) => f()); };
export function iniciarNube(alBajar) {
  const c = C(); if (!c || !c.nube || !usuario()) return;
  try { sync = c.nube.autoSincronizar(ID, CLAVES_NUBE, {}); } catch (e) { sync = null; }
  try { c.on('sincronizado', (j, r) => { if (j !== ID) return; resultado = r || null; if (r && r.estado === 'bajado' && alBajar) alBajar(); avisar(); }); c.on('cola', avisar); } catch (e) { /* sin eventos */ }
  addEventListener('online', avisar); addEventListener('offline', avisar);
}
const ultimaSync = () => { const u = usuario(); if (!u) return 0; try { return (JSON.parse(localStorage.getItem('cuenta_sync_' + u.uid + '_' + ID) || '{}').t) || 0; } catch (e) { return 0; } };
export function textoSync() {
  const c = C(), u = usuario();
  if (!c || !u) return 'Sin sesión: el progreso queda solo en este dispositivo.';
  const pend = c.pendientes ? c.pendientes() : 0, t = ultimaSync();
  if (navigator.onLine === false) return 'Sin conexión: se sincroniza al volver la red.' + (pend ? ` (${pend} pendientes)` : '');
  if (resultado && resultado.estado === 'sinRed') return 'No se pudo conectar con la nube; se reintentará solo.';
  if (pend) return `Sincronizando… ${pend} cambios pendientes.`;
  return t ? 'Sincronizado: ' + new Date(t).toLocaleString('es') : 'Aún sin sincronizar.';
}
export function sincronizarAhora() { if (!sync) return Promise.resolve(null); return Promise.resolve(sync.ahora()).then((r) => { if (r) resultado = r; avisar(); return r; }, () => null); }
export function bloqueNube() {
  const u = usuario(), c = C(); const raiz = h('div', { cls: 'bloque' }, [h('h3', { txt: 'Cuenta y nube' })]);
  if (!u) { raiz.appendChild(h('p', { cls: 'nota', txt: 'No has iniciado sesión: el progreso queda solo en este dispositivo.' })); return raiz; }
  const est = h('p', { cls: 'nota', 'aria-live': 'polite' }), msg = h('div', { cls: 'nota' });
  const b = h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Sincronizar ahora', on: { click: async () => { b.disabled = true; msg.textContent = 'Sincronizando…'; const r = await sincronizarAhora(); b.disabled = false; msg.textContent = !r ? 'No se pudo sincronizar ahora.' : ({ igual: 'Todo está al día.', subido: 'Progreso subido.', bajado: 'Progreso de la nube aplicado.', sinRed: 'Sin conexión: se reintentará solo.', cancelado: 'Pospuesto.', sinSesion: 'Sin sesión.' })[r.estado] || 'Listo.'; est.textContent = textoSync(); } } });
  raiz.appendChild(h('p', { cls: 'nota' }, ['Usuario: ', h('b', { txt: u.nombre || u.usuario }), c && c.demo ? ' (modo demo: solo en este dispositivo)' : '']));
  raiz.appendChild(est); raiz.appendChild(b); raiz.appendChild(msg);
  raiz.appendChild(h('p', { cls: 'nota', txt: 'Se sincronizan progreso, logros y estadísticas; no los ajustes de este dispositivo.' }));
  est.textContent = textoSync(); obs.push(() => { if (!raiz.isConnected) return false; est.textContent = textoSync(); return true; });
  return raiz;
}
let enviados = {};
export function enviarPuntaje(modo, valor, tope) {
  const c = C(); if (!c || !usuario()) return Promise.resolve(null);
  const v = Math.min(Math.max(0, Math.floor(valor)), tope); if (v <= 0 || enviados[modo] === v) return Promise.resolve(null); enviados[modo] = v;
  return seguro(() => c.puntaje(ID, modo, v)).then((r) => { if (!r) delete enviados[modo]; return r; });
}
export const logro = (id) => { const c = C(); return c && usuario() ? seguro(() => c.logro(ID, id)) : Promise.resolve(null); };
export const xp = (n) => { const c = C(); return c && usuario() && n > 0 ? seguro(() => c.xp(ID, Math.round(n))) : Promise.resolve(null); };

export const MODOS = [
  { id: 'sinfin', nombre: 'Zona sin fin: pisos', mayorEsMejor: true, tope: 100, unidad: 'pisos' },
  { id: 'arena', nombre: 'Arena semanal: puntos', mayorEsMejor: true, tope: 99999999, unidad: 'semana*100000+puntos' },
  { id: 'estrellas', nombre: 'Estrellas totales', mayorEsMejor: true, tope: 360, unidad: 'estrellas' },
];
export const CODIGO_ARENA = 100000;
export function panelRanking(inicial) {
  const raiz = h('div', { cls: 'ranking' }); let modo = inicial || MODOS[0].id, amigos = false;
  const tabs = h('div', { cls: 'tabs' }), lista = h('div', { cls: 'lista-rank', 'aria-live': 'polite' }), alc = h('div', { cls: 'tabs' });
  const pintar = async () => {
    lista.textContent = 'Cargando…'; const c = C();
    if (!c || !usuario()) { lista.textContent = 'Inicia sesión desde el portal para ver los rankings.'; return; }
    const [top0, mi] = await Promise.all([seguro(() => c.top(ID, modo, modo === 'arena' ? 30 : 10, { soloAmigos: amigos })), seguro(() => c.miPosicion(ID, modo))]);
    let top = top0; if (modo === 'arena' && top0) { const sem = semanaActual() % 500; top = top0.filter((f) => Math.floor(f.valor / CODIGO_ARENA) === sem).map((f, i) => ({ ...f, pos: i + 1, valor: f.valor % CODIGO_ARENA })); }
    lista.textContent = '';
    if (!top || !top.length) lista.appendChild(h('p', { cls: 'nota', txt: amigos ? 'Aún no hay puntajes de tus amigos.' : 'Aún no hay puntajes. ¡Sé el primero!' }));
    (top || []).forEach((f) => lista.appendChild(h('div', { cls: 'fila-rank' + (f.yo ? ' yo' : '') }, [h('b', { txt: '#' + f.pos }), h('span', { txt: f.nombre, style: 'color:' + (f.color || 'inherit') }), h('em', { txt: String(f.valor) })])));
    if (mi && mi.posicion && modo !== 'arena') lista.appendChild(h('p', { cls: 'nota', txt: `Tu posición: #${mi.posicion} de ${mi.total} (${mi.valor})` }));
  };
  const mk = (cont, items, get, set) => { cont.textContent = ''; items.forEach((it) => cont.appendChild(h('button', { type: 'button', cls: 'tab' + (get() === it.id ? ' on' : ''), 'data-f': 1, txt: it.n, on: { click: () => { set(it.id); mkAll(); pintar(); } } }))); };
  const mkAll = () => { mk(tabs, MODOS.map((m) => ({ id: m.id, n: m.nombre.replace('Zona sin fin: pisos', 'Zona sin fin').replace('Arena semanal: puntos', 'Arena').replace('Estrellas totales', 'Estrellas') })), () => modo, (v) => { modo = v; }); mk(alc, [{ id: 'g', n: 'Global' }, { id: 'a', n: 'Amigos' }], () => (amigos ? 'a' : 'g'), (v) => { amigos = v === 'a'; }); };
  mkAll(); raiz.appendChild(tabs); raiz.appendChild(alc); raiz.appendChild(lista); pintar(); return raiz;
}
