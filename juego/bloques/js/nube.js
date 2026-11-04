// =============================================================
//  ☁️  NUBE (cuenta de la plataforma)
//  Sincroniza con Cuenta.nube.autoSincronizar: ajustes, logros, la lista
//  de mundos (sus datos básicos) y los mundos que quepan en el límite
//  de la nube (se mandan comprimidos y en trozos: lo hace la plataforma).
//
//  Las claves de los mundos cambian (uno por mundo), así que la lista
//  `claves` se rearma sola: primero lo fijo, luego los mundos que caben
//  (los que ya viajaban tienen prioridad, para que no salten de un lado
//  a otro). Un mundo que no cabe NO se sube y se queda solo en este
//  dispositivo, con un aviso (nunca falla en silencio).
//
//  En la nube viaja un índice propio ('bloques_nube_indice') con los
//  mundos incluidos; al bajar, `Mundos.fusionar` lo mezcla con la lista
//  local sin tocar los mundos que solo existen aquí.
// =============================================================
import { Mundos } from './mundos.js';

const JUEGO = 'bloques';
const FIJAS = ['bloques_ajustes_v2', 'bloques_logros_v1', 'bloques_cuenta_v1'];
const IDX_NUBE = 'bloques_nube_indice';
const ESTADO = 'bloques_nube_estado';       // solo de este dispositivo
const PREF = 'bloques_mundo2_';
// La plataforma admite 8 trozos de 700 000 caracteres (base64 del gzip). Se deja bastante margen.
export const LIMITE_CARACTERES = 8 * 700000;
let PRESUPUESTO = 3300000;
const COLOR_AVISO = '#ffb347';

const claves = [];
const cacheTam = new Map();                  // id -> { len, z }
const avisados = new Set();
const oyentes = new Set();
let grandes = [];                            // [{ id, nombre, z }] mundos que no caben
let incluidos = [];
let manejador = null;
let trabajando = false;
let ultimoResultado = null;                  // 'igual' | 'subido' | 'bajado' | 'sinRed' | 'error' | 'cancelado'
let ultimoError = '';
let recargando = false;
let temporizador = 0;
let dialogo = null;

const C = () => window.Cuenta;
function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function escribir(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } }
function avisarCambio() { for (const f of oyentes) { try { f(); } catch (e) { /* nada */ } } }

function leerEstado() {
  try { const o = JSON.parse(leer(ESTADO) || 'null'); if (o && Array.isArray(o.ids)) return o; } catch (e) { /* nada */ }
  return { ids: [] };
}

// ---------------------------------------------------------------- tamaño comprimido
function aBase64Largo(bytes) { return Math.ceil(bytes * 4 / 3); }
async function tamComprimido(texto) {
  try {
    if (typeof CompressionStream === 'undefined') return Math.ceil(texto.length * 1.4);
    const cs = new CompressionStream('gzip');
    const w = cs.writable.getWriter();
    w.write(new TextEncoder().encode(JSON.stringify(texto))); w.close();
    const buf = await new Response(cs.readable).arrayBuffer();
    return Math.ceil(aBase64Largo(buf.byteLength) * 1.05);
  } catch (e) { return Math.ceil(texto.length * 1.4); }
}

// ---------------------------------------------------------------- qué viaja a la nube
async function medir() {
  if (recargando) return;
  const lista = Mundos.listar();
  const previos = new Set(leerEstado().ids);
  const info = [];
  for (const m of lista) {
    const t = Mundos.crudo(m.id);
    if (t == null) continue;
    let c = cacheTam.get(m.id);
    if (!c || c.len !== t.length) { c = { len: t.length, z: await tamComprimido(t) }; cacheTam.set(m.id, c); }
    info.push({ m, z: c.z, previo: previos.has(m.id) });
  }
  if (recargando) return;
  info.sort((a, b) => (b.previo - a.previo) || ((b.m.jugado || 0) - (a.m.jugado || 0)));
  let usado = 0;
  const dentro = [], fuera = [];
  for (const x of info) {
    if (usado + x.z <= PRESUPUESTO) { dentro.push(x); usado += x.z; } else fuera.push(x);
  }
  incluidos = dentro.map((x) => x.m.id);
  grandes = fuera.map((x) => ({ id: x.m.id, nombre: x.m.nombre, z: x.z }));
  // la lista que lee la plataforma se cambia "en sitio" (es la misma que se le dio)
  claves.length = 0;
  claves.push(...FIJAS, ...incluidos.map((id) => PREF + id), IDX_NUBE);
  // índice que viaja: solo los mundos incluidos
  const ult = Mundos.ultimo();
  const idx = JSON.stringify({ lista: dentro.map((x) => x.m), ultimo: ult && incluidos.includes(ult.id) ? ult.id : null });
  if (leer(IDX_NUBE) !== idx && (dentro.length || leer(IDX_NUBE) !== null)) escribir(IDX_NUBE, idx);   // sin mundos no se crea (así un dispositivo vacío baja limpio)
  escribir(ESTADO, JSON.stringify({ ids: incluidos }));
  avisarGrandes();
  avisarCambio();
}

function avisarGrandes() {
  for (const g of grandes) {
    if (avisados.has(g.id)) continue;
    avisados.add(g.id);
    const mb = (PRESUPUESTO * 0.75 / 1048576).toFixed(1);
    const msg = `«${g.nombre}» es demasiado grande para la nube (límite de unos ${mb} MB comprimido en total entre todos tus mundos). Se queda solo en este dispositivo: expórtalo desde Mis mundos para tener una copia.`;
    try { if (C() && C().ui && C().ui.aviso) C().ui.aviso(msg, { titulo: 'Mundo solo local', color: COLOR_AVISO, ms: 9000 }); } catch (e) { /* nada */ }
  }
}

// ---------------------------------------------------------------- mezcla tras bajar de la nube
export function fusionar() {
  const crudo = leer(IDX_NUBE);
  if (!crudo) return false;
  let n = null;
  try { n = JSON.parse(crudo); } catch (e) { return false; }
  if (!n || !Array.isArray(n.lista)) return false;
  try { return Mundos.fusionar(n.lista, n.ultimo, leerEstado().ids); } catch (e) { return false; }
}

// ---------------------------------------------------------------- sincronizar
function alConflicto(info) {
  // un solo diálogo a la vez (con teclado, toque y mando: lo pinta la plataforma)
  if (!dialogo) {
    dialogo = C().ui.conflicto(info).then((v) => { dialogo = null; return v; }, (e) => { dialogo = null; throw e; });
  }
  return dialogo;
}

function opciones() {
  return { recargar: true, cadaMs: 90000, alConflicto };
}

function alSincronizado(juego, res) {
  if (juego !== JUEGO || !res) return;
  ultimoResultado = res.estado; ultimoError = '';
  if (res.estado === 'bajado') { recargando = true; clearInterval(temporizador); }   // la plataforma recarga la página
  avisarCambio();
}

export async function iniciar() {
  const cu = C();
  if (!cu || !cu.usuario || !cu.nube) return null;
  fusionar();
  try { await medir(); } catch (e) { /* se sincroniza lo fijo */ if (!claves.length) claves.push(...FIJAS); }
  cu.on('sincronizado', alSincronizado);
  cu.on('cola', avisarCambio);
  addEventListener('online', avisarCambio); addEventListener('offline', avisarCambio);
  // se vuelve a medir y a escribir el índice cada tanto, y al ocultar la página (antes de que la plataforma suba)
  temporizador = setInterval(() => { medir().catch(() => {}); }, 20000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) medir().catch(() => {}); });
  addEventListener('pagehide', () => { if (!recargando) { try { medirYa(); } catch (e) { /* nada */ } } });
  try {
    manejador = cu.nube.autoSincronizar(JUEGO, claves, opciones());
  } catch (e) { ultimoResultado = 'error'; ultimoError = cu.mensajeError ? cu.mensajeError(e) : String(e); return null; }
  return manejador.primera;
}

// Versión sin esperas del índice (para pagehide): usa los tamaños ya medidos
function medirYa() {
  const ult = Mundos.ultimo();
  const lista = Mundos.listar().filter((m) => incluidos.includes(m.id));
  const idx = JSON.stringify({ lista, ultimo: ult && incluidos.includes(ult.id) ? ult.id : null });
  if (leer(IDX_NUBE) !== idx && (lista.length || leer(IDX_NUBE) !== null)) escribir(IDX_NUBE, idx);
}

export async function ahora() {
  const cu = C();
  if (!cu || !cu.usuario) return { estado: 'sinSesion' };
  if (trabajando) return { estado: 'ocupado' };
  trabajando = true; ultimoError = ''; avisarCambio();
  try {
    await medir();
    const r = await cu.nube.sincronizar(JUEGO, claves, opciones());
    ultimoResultado = r && r.estado || 'igual';
    return r;
  } catch (e) {
    ultimoResultado = 'error';
    ultimoError = cu.mensajeError ? cu.mensajeError(e) : 'No se pudo sincronizar';
    return { estado: 'error', mensaje: ultimoError };
  } finally {
    trabajando = false; avisarCambio();
  }
}

// ---------------------------------------------------------------- estado para mostrar
export function textoEstado() {
  const cu = C();
  if (!cu || !cu.usuario) return 'Sin sesión: tu progreso solo está en este dispositivo.';
  const demo = cu.demo ? ' (modo demo: la «nube» es solo este dispositivo)' : '';
  if (trabajando) return 'Sincronizando…' + demo;
  let t = 0;
  try { t = (JSON.parse(leer('cuenta_sync_' + cu.usuario.uid + '_' + JUEGO) || '{}') || {}).t || 0; } catch (e) { /* nada */ }
  const hora = t ? new Date(t).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) : '';
  const pend = cu.pendientes ? cu.pendientes() : 0;
  if (navigator.onLine === false || ultimoResultado === 'sinRed') return 'Sin conexión: se sincronizará solo al volver la red.' + (hora ? ' Última vez: ' + hora + '.' : '') + demo;
  if (ultimoResultado === 'error') return 'No se pudo sincronizar' + (ultimoError ? ' (' + ultimoError + ')' : '') + '. Se reintentará solo.' + demo;
  if (ultimoResultado === 'cancelado') return 'Pendiente: elegiste decidir luego el conflicto. Pulsa «Sincronizar ahora».' + demo;
  if (pend) return `Pendiente: ${pend} ${pend === 1 ? 'cambio' : 'cambios'} por enviar.` + (hora ? ' Última vez: ' + hora + '.' : '') + demo;
  if (!hora) return 'Todavía no se ha sincronizado.' + demo;
  return 'Sincronizado: ' + hora + '.' + demo;
}

export function mundosSoloLocal() { return grandes.map((g) => ({ ...g })); }
export function esSoloLocal(id) { return grandes.some((g) => g.id === id); }
export function alCambiar(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
export function ocupado() { return trabajando; }
export const NOTA_CONFLICTO = 'Si tu progreso cambió aquí y en otro dispositivo, la plataforma te preguntará cuál conservar (nube, este dispositivo o ambos).';

// Para pruebas y ajustes finos: cambia el presupuesto (caracteres base64) y vuelve a decidir qué viaja
export function presupuesto(n) { if (n > 0) PRESUPUESTO = n; return medir(); }
export function incluidosEnNube() { return incluidos.slice(); }
