// Integración con la plataforma de cuentas (window.Cuenta): perfil, nube, puntajes, logros y XP.
// Todo es opcional y tolerante a fallos: si no hay Cuenta, red o sesión, el juego sigue igual.
import * as Almacen from './almacen.js';
import { esc } from './hud.js';
import { numero } from '../sim/util.js';

export const ID = 'metropolis';
const MODO = 'poblacion';
const C = () => window.Cuenta || null;
const usuario = () => { const c = C(); return c && c.usuario ? c.usuario : null; };
const aviso = (J, m, t) => { try { J.aviso(m, t || 'info'); } catch (e) { /* nada */ } };
const conTiempo = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('tiempo')), ms))]);

let nube = null, enviados = new Set(), mejorEnviado = 0, ultPunt = 0, colaLog = [], timerLog = 0;

// ---------------------------------------------------------------- arranque (antes de leer guardados)
export async function preparar() {
  const c = C();
  if (!c) return null;
  const u = await c.requerir(); // sin sesión redirige al portal y vuelve
  if (!u) return null;
  try {
    nube = c.nube.autoSincronizar(ID, Almacen.clavesNube(), {});
    // si aparece el diálogo de conflicto, destapa la pantalla de carga para poder verlo
    const t = setTimeout(() => { const e = document.getElementById('cargando'); if (e) e.classList.add('fuera'); }, 900);
    await conTiempo(nube.primera, 6000).catch(() => {});
    clearTimeout(t);
  } catch (e) { console.warn('Nube no disponible', e); }
  return u;
}

export function enlazar(J) {
  const c = C();
  if (!c) return;
  c.on('sincronizado', (juego, res) => {
    if (juego !== ID || !res || res.estado !== 'bajado') return;
    try { J.alBajarNube && J.alBajarNube(); } catch (e) { /* nada */ }
  });
}

// ---------------------------------------------------------------- logros, XP y puntajes
const idLogro = (id) => String(id).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
function drenar() {
  timerLog = 0;
  const c = C(), id = colaLog.shift();
  if (id && c && c.usuario) { try { c.logro(ID, id).catch(() => {}); } catch (e) { /* nada */ } }
  if (colaLog.length) timerLog = setTimeout(drenar, 1300);
}
export function logro(J, id) {
  if (!C() || !usuario() || (J.c && J.c.modo === 'sandbox')) return;
  const ids = [idLogro(id)];
  if (id === 'primero') ids.push('primera_casa'); // ids que ya figuran en plataforma/juegos.js
  for (const q of ids) { if (!q || enviados.has(q)) continue; enviados.add(q); colaLog.push(q); }
  if (colaLog.length && !timerLog) timerLog = setTimeout(drenar, 300);
}
export function xp(J, n) {
  if (!C() || !usuario() || (J.c && J.c.modo === 'sandbox')) return;
  try { C().xp(ID, n); } catch (e) { /* nada */ }
}
export function barrerLogros(J, c) {
  for (const k of Object.keys(c.logros || {})) logro(J, k);
}
export function puntaje(J, c, forzar) {
  const cu = C();
  if (!cu || !usuario() || !c || J.enTitulo || c.modo === 'sandbox' || !c.s) return;
  if (J.multi && J.multi.activo && !J.multi.esAnfitrion) return;
  const tabla = window.PlataformaJuegos, m = tabla && tabla.modo(ID, MODO), tope = m ? m.tope : 100000000;
  const v = Math.min(Math.round(c.s.pop || 0), tope);
  if (v >= 1000) logro(J, 'pueblo');
  if (v >= 100000) logro(J, 'metropoli');
  if (v < 1 || v <= mejorEnviado) return;
  const ahora = Date.now();
  if (!forzar && ahora - ultPunt < 30000) return;
  ultPunt = ahora; mejorEnviado = v;
  try { cu.puntaje(ID, MODO, v).catch(() => {}); } catch (e) { /* nada */ }
}

// ---------------------------------------------------------------- bloque "Cuenta y nube" (Ajustes > Datos)
function ultimaSync() {
  const u = usuario(); if (!u) return 0;
  try { return (JSON.parse(localStorage.getItem('cuenta_sync_' + u.uid + '_' + ID) || '{}').t) || 0; } catch (e) { return 0; }
}
function hora(t) {
  const d = new Date(t), hoy = new Date();
  const h = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === hoy.toDateString() ? 'hoy ' + h : d.toLocaleDateString('es', { day: 'numeric', month: 'short' }) + ' ' + h;
}
export function estadoNube() {
  const c = C(), u = usuario();
  if (!c) return 'Plataforma no disponible';
  if (!u) return 'Sin sesión';
  const p = c.pendientes ? c.pendientes() : 0, t = ultimaSync();
  const partes = [];
  if (navigator.onLine === false) partes.push('Sin conexión');
  if (p > 0) partes.push(p + ' cambio' + (p > 1 ? 's' : '') + ' pendiente' + (p > 1 ? 's' : ''));
  partes.push(t ? 'Última sincronización: ' + hora(t) : 'Aún sin sincronizar');
  return partes.join(' · ');
}
export function bloqueCuenta(msg) {
  const c = C(), u = usuario();
  if (!c || !u) return '<h4>Cuenta y nube</h4><p>No hay sesión iniciada. Tus datos quedan solo en este dispositivo.</p>';
  return `<h4>Cuenta y nube</h4>
    <div class="ajuste"><span>Usuario<small>${esc(u.nombre)}${c.demo ? ' · modo demo local' : ''}</small></span><button type="button" class="btn mini foco" data-acc="cuenta">Cuenta</button></div>
    <div class="ajuste"><span>Sincronización<small>${esc(msg || estadoNube())}</small></span><button type="button" class="btn mini foco" data-acc="sincronizar">Sincronizar ahora</button></div>
    <p>Se sincronizan tus ciudades y ajustes. Si hay cambios distintos aquí y en la nube, la plataforma te preguntará con qué versión quedarte.</p>`;
}
export async function sincronizarAhora() {
  const c = C();
  if (!c || !usuario()) return 'Sin sesión';
  if (navigator.onLine === false) return 'Sin conexión: se sincronizará al volver';
  try {
    const r = await conTiempo(nube ? nube.ahora() : c.nube.sincronizar(ID, Almacen.clavesNube()), 20000);
    if (!r) return 'Ya se está sincronizando';
    return ({ igual: 'Todo al día', subido: 'Subido a la nube', bajado: 'Descargado de la nube', sinRed: 'Sin conexión: se reintentará', cancelado: 'Sincronización cancelada', sinSesion: 'Sin sesión' })[r.estado] || estadoNube();
  } catch (e) { return 'No se pudo sincronizar (se reintentará)'; }
}
export function borrarNube() {
  const c = C();
  if (!c || !usuario()) return Promise.resolve();
  return conTiempo(Promise.all([c.nube.borrar(ID), c.nube.borrar(ID, { ranura: 'respaldo' })]), 3500).catch(() => {});
}

// ---------------------------------------------------------------- ventanas: cuenta y ranking
export function cuentaModal(J) {
  const c = C(), u = usuario();
  const cuerpo = !c || !u ? '<p>No hay sesión iniciada.</p>'
    : `<div class="grande" style="color:${esc(u.color || '#3df5ff')}">${esc(u.nombre)}</div>
      <p style="text-align:center">Usuario @${esc(u.usuario || '')} · Nivel ${u.nivel || 1} · ${numero(u.xp || 0)} XP${c.demo ? '<br>Modo demo: la cuenta solo existe en este dispositivo.' : ''}</p>
      <p style="text-align:center">${esc(estadoNube())}</p>`;
  return J.paneles.modal({
    titulo: 'Cuenta', pausa: true,
    html: `${cuerpo}<div class="lista"><a class="btn primario foco" href="../" style="text-decoration:none" data-guardar>Volver al portal</a>${u ? '<button type="button" class="btn peligro foco" data-acc="salir">Cerrar sesión</button>' : ''}</div>`,
    acc: {
      salir: async (b) => {
        if (b.dataset.seguro !== '1') { b.dataset.seguro = '1'; b.textContent = '¿Seguro? Pulsa otra vez'; setTimeout(() => { if (b.isConnected) { b.dataset.seguro = ''; b.textContent = 'Cerrar sesión'; } }, 3000); return; }
        try { J.guardar(); if (nube) await conTiempo(nube.ahora(), 4000).catch(() => {}); await c.salir(); } catch (e) { /* nada */ }
        location.href = '../';
      },
    },
  });
}

export function ranking(J) {
  const c = C();
  let tab = 'global', n = 0;
  const lista = (r) => r.length ? '<div class="lista">' + r.map((e) => `<div class="item ${e.yo ? 'act' : ''}"><div class="tit"><span>${e.pos}. <b style="color:${esc(e.color || '#fff')}">${esc(e.nombre)}</b>${e.yo ? ' (tú)' : ''}</span><em>${numero(e.valor)} hab.</em></div></div>`).join('') + '</div>' : '';
  const pie = '<button type="button" class="btn foco" data-acc="recargar">Actualizar</button>';
  async function cargar(a) {
    const mi = ++n;
    a.rehacer('<p>Cargando ranking…</p>');
    if (!c || !usuario()) { a.rehacer('<p>Inicia sesión para ver el ranking.</p>'); return; }
    try {
      const amigos = tab === 'amigos';
      const [top, pos] = await conTiempo(Promise.all([c.top(ID, MODO, 10, { soloAmigos: amigos }), c.miPosicion(ID, MODO).catch(() => null)]), 9000);
      if (mi !== n || a.cerrado) return;
      let h = '';
      if (pos && pos.posicion) h += `<div class="grande">#${pos.posicion} <small style="font-size:11px;color:var(--suave)">DE ${pos.total} · ${numero(pos.valor)} HAB.</small></div>`;
      else h += '<p style="text-align:center">Aún no tienes puntaje. Haz crecer tu ciudad para entrar al ranking.</p>';
      h += top.length ? lista(top) : `<p style="text-align:center">${amigos ? 'Ningún amigo tiene puntaje todavía.' : 'Todavía no hay puntajes. ¡Sé el primero!'}</p>`;
      a.rehacer(h);
    } catch (e) {
      if (mi !== n || a.cerrado) return;
      a.rehacer('<p style="text-align:center">No se pudo cargar el ranking (sin conexión). Prueba de nuevo más tarde.</p>');
    }
  }
  const a = J.paneles.modal({
    titulo: 'Ranking: población', pausa: true, tabs: [{ id: 'global', nombre: 'Global' }, { id: 'amigos', nombre: 'Amigos' }], tab, html: '<p>Cargando ranking…</p>', pie,
    alTab: (id, ap) => { tab = id; cargar(ap); },
    acc: { recargar: (b, ap) => cargar(ap) },
  });
  cargar(a);
  return a;
}
