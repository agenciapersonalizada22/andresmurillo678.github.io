// Puente con la plataforma de cuentas (window.Cuenta). Todo es opcional y nunca lanza: sin cuenta, sin red o sin la libreria el juego sigue igual.
import * as A from './almacen.js';

export const ID = 'cartas';
// Progreso que viaja a la nube. NO van: ajustes (por dispositivo), ajustes_dispositivo, mesas/asientos guardados, ultima, cobros (efimeros).
export const CLAVES_NUBE = [A.CLAVES.monedero, A.CLAVES.stats, A.CLAVES.logros, A.CLAVES.historial];
const C = () => window.Cuenta || null;
const CLAVE_SYNC = 'cuenta_cartas_ultima_sync'; // fuera del prefijo cartas_: no entra en exportar/borrar
export const hay = () => { const c = C(); return !!(c && c.usuario); };
export const usuario = () => (hay() ? C().usuario : null);
const quieto = (p) => { if (p && p.catch) p.catch(() => {}); return p; };

// ---------- logros y XP ----------
let xpSesion = 0; const XP_MAX_SESION = 600; // tope por carga de pagina: el XP solo viene de hitos, nunca de tiempo
export function logro(id) { try { if (hay()) quieto(C().logro(ID, id)); } catch (e) {} }
export function xp(n) {
  try {
    if (!hay()) return; n = Math.min(Math.floor(n), XP_MAX_SESION - xpSesion); if (n < 1) return;
    xpSesion += n; C().xp(ID, n);
  } catch (e) {}
}
// Logros ganados antes de tener cuenta (o en otro dispositivo): se reportan una vez; los ya conocidos se ignoran.
export function reportarLogrosLocales() {
  try { if (!hay()) return; const ya = new Set(C().logros(ID)); Object.keys(A.logros.obtener()).forEach((id) => { if (!ya.has(id)) logro(id); }); } catch (e) {}
}

// ---------- puntajes ---------- [min, max] = topes de plataforma/juegos.js; mayorEsMejor false = solo baja
const LIMITES = { monedero: [1, 1e9, true], bote: [1, 1e9, true], dompe_racha: [1, 1000, true], conq_turnos: [1, 200, false], pesc_libros: [1, 26, true] };
const enviado = {}; let tPunt = 0, proveedor = null;
async function volcar() {
  tPunt = 0; if (!hay() || !proveedor) return;
  let v; try { v = proveedor(); } catch (e) { return; }
  for (const modo of Object.keys(LIMITES)) {
    const [min, max, mayor] = LIMITES[modo], x = Math.round(+v[modo]);
    if (!(x >= min) || x > max) continue;
    if (enviado[modo] != null && (mayor ? x <= enviado[modo] : x >= enviado[modo])) continue;
    try { await C().puntaje(ID, modo, x); enviado[modo] = x; } catch (e) { /* se reintenta en el proximo hito */ }
  }
}
export function programarPuntajes(fn) { proveedor = fn || proveedor; if (!hay() || tPunt) return; tPunt = setTimeout(volcar, 1500); }
export function enviarPuntajesYa() { clearTimeout(tPunt); return volcar(); }

// ---------- nube ----------
let manejo = null, ultima = 0, sinRed = false, cancelado = false, oyentes = [], alBajar = null;
try { ultima = +localStorage.getItem(CLAVE_SYNC) || 0; } catch (e) {}
const avisar = () => oyentes.slice().forEach((f) => { try { f(); } catch (e) {} });
export function alEstado(fn) { oyentes.push(fn); return () => { oyentes = oyentes.filter((x) => x !== fn); }; }
function resultado(res) {
  if (!res) return;
  if (res.estado === 'sinRed') { sinRed = true; }
  else if (res.estado === 'cancelado') { cancelado = true; }
  else if (res.estado === 'sinSesion') { /* sin cuenta */ }
  else { sinRed = false; cancelado = false; ultima = Date.now(); try { localStorage.setItem(CLAVE_SYNC, String(ultima)); } catch (e) {} }
  if (res.estado === 'bajado' && alBajar) { try { alBajar(); } catch (e) {} }
  avisar();
}
// Devuelve una promesa que resuelve como mucho en maxMs (nunca bloquea el juego); la sincronizacion sigue en segundo plano.
export function iniciarNube(alDescargar, maxMs) {
  alBajar = alDescargar;
  if (!hay()) return Promise.resolve();
  try {
    C().on('sincronizado', (juego, res) => { if (juego === ID) resultado(res); });
    window.addEventListener('online', () => { sinRed = false; avisar(); });
    window.addEventListener('offline', avisar);
    manejo = C().nube.autoSincronizar(ID, CLAVES_NUBE, {});
    return Promise.race([quieto(manejo.primera) || Promise.resolve(), new Promise((r) => setTimeout(r, maxMs || 4000))]).then(() => {}, () => {});
  } catch (e) { return Promise.resolve(); }
}
export async function sincronizarAhora() {
  if (!hay()) return { estado: 'sinSesion' };
  try { const r = await C().nube.sincronizar(ID, CLAVES_NUBE, {}); resultado(r); return r; }
  catch (e) { sinRed = true; avisar(); return { estado: 'sinRed' }; }
}
function hace(t) { const s = Math.max(0, (Date.now() - t) / 1000); return s < 90 ? 'hace un momento' : s < 5400 ? 'hace ' + Math.round(s / 60) + ' min' : s < 172800 ? 'hace ' + Math.round(s / 3600) + ' h' : 'hace ' + Math.round(s / 86400) + ' días'; }
export function estadoNube() {
  const pend = (() => { try { return C().pendientes() | 0; } catch (e) { return 0; } })();
  const offline = sinRed || navigator.onLine === false;
  let txt = ultima ? 'Última sincronización: ' + hace(ultima) : 'Aún sin sincronizar en este dispositivo';
  if (offline) txt = 'Sin conexión: se sincronizará al volver la red. ' + txt;
  else if (cancelado) txt = 'Conflicto sin resolver (decidiste decidir luego). ' + txt;
  if (pend) txt += ' · ' + pend + ' envío' + (pend > 1 ? 's' : '') + ' pendiente' + (pend > 1 ? 's' : '');
  return { texto: txt, offline, pendientes: pend, ultima };
}
