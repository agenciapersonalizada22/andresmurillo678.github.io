// =============================================================
//  ☁  CUENTA
//  Puente con la plataforma (window.Cuenta, juego/comun/cuenta.js):
//  sesión obligatoria, nombre/color del jugador, sincronización en
//  la nube de los guardados, puntajes, logros, XP y ranking.
//  Nada de lo que hay aquí puede romper el juego: sin Cuenta, sin
//  sesión o sin red todo se convierte en un no-hacer-nada.
// =============================================================
import { CONFIG } from './config.js';
import * as Guardado from './guardado.js';

export const JUEGO = 'ajedrez';
const C = () => (typeof window !== 'undefined' && window.Cuenta) || null;
const CLAVES = Object.values(CONFIG.guardado); // partida, opciones, stats, perfil, biblioteca, rompe, lecciones
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// id local de logro -> id estable en la cuenta
export const ID_LOGRO = {
  primera: 'primera_victoria', mate: 'jaque_mate', rapido: 'mate_rapido', sinDeshacer: 'sin_red', bot2000: 'gran_rival',
  enroque: 'rey_a_salvo', corona: 'nueva_dama', p10: 'estudiante', p50: 'tactico', racha5: 'en_racha', lecciones: 'aprendiz',
  revision: 'analista', online: 'online', elo1500: 'nivel_de_club', nivel5: 'nivel5',
};

const E = { sync: null, ultima: 0, estado: '', enCurso: false, pendientes: 0, listo: false, alBajar: null };
const oyentes = new Set();
const avisar = () => oyentes.forEach((f) => { try { f(); } catch (e) { /* nada */ } });
export const alEstado = (f) => { oyentes.add(f); return () => oyentes.delete(f); };

export const hay = () => !!C();
export const usuario = () => { const c = C(); return c && c.usuario ? c.usuario : null; };
export const activo = () => !!usuario();

// Nombre y color del jugador: los de la cuenta (si no hay sesión, los del perfil compartido)
export function perfilJugador(base) {
  const u = usuario();
  if (!u) return base;
  const nombre = String(u.nombre || u.usuario || '').trim().slice(0, 16);
  return { nombre: nombre || base.nombre, color: /^#[0-9a-f]{6}$/i.test(u.color) ? u.color : base.color };
}

// ---------------------------------------------------------- arranque y nube
function registrar(r) {
  if (!r) return;
  E.estado = r.estado || '';
  if (['igual', 'subido', 'bajado'].includes(r.estado)) E.ultima = Date.now();
}

// Exige sesión (redirige al portal si falta), espera a que la primera sincronización
// llegue (máx. 3,5 s: la red nunca bloquea el juego) y devuelve el usuario o null.
export async function arrancar({ alBajar } = {}) {
  const c = C();
  if (!c) return null;
  E.alBajar = alBajar;
  const velo = document.createElement('style');
  velo.textContent = '#app, .pantalla { visibility: hidden !important; }';
  document.head.appendChild(velo);
  let u = null;
  try {
    try { u = await c.requerir(); } catch (e) { console.warn(e); }
    if (!u) return null;
    try {
      c.on('sincronizado', (juego, res) => {
        if (juego !== JUEGO) return;
        registrar(res); avisar();
        if (res && res.estado === 'bajado' && E.listo) { try { E.alBajar && E.alBajar(); } catch (e) { console.warn(e); } }
      });
      c.on('cola', (n) => { E.pendientes = n; avisar(); });
      c.on('perfil', () => avisar());
      E.pendientes = c.pendientes ? c.pendientes() : 0;
      E.sync = c.nube.autoSincronizar(JUEGO, CLAVES, { cadaMs: 60000 });
      E.enCurso = true;
      await Promise.race([E.sync.primera.then(registrar).catch(() => {}), dormir(3500)]);
      E.enCurso = false;
    } catch (e) { console.warn(e); E.enCurso = false; }
  } finally {
    E.listo = true;
    velo.remove();
  }
  avisar();
  return u;
}

// Tras cargar el juego: sube lo ya conseguido (logros y marcas) para que figure en la cuenta.
export function reportarInicial() {
  if (!activo()) return;
  try {
    const p = Guardado.cargarPerfil();
    Object.keys(p.logros || {}).forEach((id) => logro(id));
    reportarRompe(Guardado.cargarRompe());
    reportarElos();
  } catch (e) { console.warn(e); }
}

export async function sincronizarAhora() {
  if (!E.sync) return { estado: 'sinSesion' };
  E.enCurso = true; avisar();
  let r = null;
  try { r = await E.sync.ahora(); } catch (e) { r = { estado: 'error' }; }
  E.enCurso = false;
  if (r) registrar(r); else E.estado = 'ocupado';
  avisar();
  return r;
}

function hace(t) {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 10) return 'ahora mismo';
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  return `hace ${Math.round(s / 3600)} h`;
}
export function textoEstado() {
  if (!activo()) return 'Sin sesión.';
  if (E.enCurso) return 'Sincronizando…';
  const p = E.pendientes > 0 ? ` · ${E.pendientes} cambio${E.pendientes === 1 ? '' : 's'} pendiente${E.pendientes === 1 ? '' : 's'}` : '';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'Sin conexión: se sincronizará al volver' + p;
  if (E.estado === 'sinRed') return 'Sin conexión con la nube' + p + (E.ultima ? ` · última vez ${hace(E.ultima)}` : '');
  if (E.estado === 'cancelado') return 'Sincronización cancelada' + p;
  if (E.estado === 'error') return 'No se pudo sincronizar' + p;
  if (E.ultima) return `Sincronizado ${hace(E.ultima)}` + p;
  return 'Aún sin sincronizar' + p;
}

// Bloque «Cuenta y nube» de la pestaña Datos de Ajustes
export function bloqueAjustes() {
  const u = usuario();
  if (!u) return '';
  const c = C();
  return `<div class="campo" id="cuBloque"><label>Cuenta y nube</label>
    <p class="info cuNombre"><i class="cuPunto" style="background:${esc(u.color || '#3df5ff')}"></i><b>${esc(u.nombre || u.usuario)}</b> · nivel ${u.nivel || 1}${c && c.demo ? ' · modo demo (solo este dispositivo)' : ''}</p>
    <p class="info" id="cuEstado" aria-live="polite">${esc(textoEstado())}</p>
    <div class="fichas"><button type="button" data-cu="sync" id="btnCuSync">SINCRONIZAR AHORA</button><button type="button" data-cu="portal">VOLVER AL PORTAL</button><button type="button" data-cu="salir">CERRAR SESIÓN</button></div>
    <p class="info">Se guardan en tu cuenta los ajustes, el perfil, los rompecabezas, la biblioteca y la partida en curso. Si cambian a la vez en dos dispositivos, se te preguntará cuál conservar con el diálogo de la plataforma. Sin conexión el juego sigue igual y se sincroniza al volver.</p></div>`;
}
export function refrescarBloque(raiz) {
  const e = raiz.querySelector('#cuEstado');
  if (e) e.textContent = textoEstado();
  const b = raiz.querySelector('#btnCuSync');
  if (b) b.disabled = E.enCurso;
}

export function irAlPortal() {
  const c = C();
  location.href = c && c.portalUrl ? c.portalUrl() : '../';
}
export async function cerrarSesion() {
  const c = C();
  try { if (E.sync) await Promise.race([E.sync.ahora(), dormir(2500)]); } catch (e) { /* nada */ }
  try { if (E.sync) E.sync.parar(); } catch (e) { /* nada */ }
  try { if (c) await Promise.race([c.salir(), dormir(4000)]); } catch (e) { console.warn(e); }
  irAlPortal();
}

// ---------------------------------------------------------- puntajes, logros y XP
const enviados = {};
function tope(modo) {
  try { const m = window.PlataformaJuegos.modo(JUEGO, modo); return m && m.tope ? m.tope : Infinity; } catch (e) { return Infinity; }
}
export function puntaje(modo, valor) {
  const c = C();
  if (!c || !c.usuario) return Promise.resolve(null);
  valor = Math.min(Math.floor(+valor), tope(modo));
  if (!(valor > 0) || valor <= (enviados[modo] || 0)) return Promise.resolve(null);
  enviados[modo] = valor;
  return c.puntaje(JUEGO, modo, valor).catch((e) => { enviados[modo] = 0; console.warn('puntaje', modo, e && e.message); return null; });
}
// Ids de modo de plataforma/juegos.js: 'rompecabezas' (resueltos) y 'racha' (mejor racha de aciertos seguidos)
export function reportarRompe(r) {
  puntaje('rompecabezas', r.aciertos);
  puntaje('racha', r.mejorRacha);
}

// Elo: 'elo' (contra el motor), 'elo_online' y 'elo_rompe'; solo se envía si mejora lo ya enviado
export function reportarElos() {
  try {
    const p = Guardado.cargarPerfil();
    puntaje('elo', p.partidas > 0 ? p.elo : 0);
    puntaje('elo_online', (p.extra && p.extra.partidasOnline > 0) ? p.extra.eloOnline : 0);
    const r = Guardado.cargarRompe();
    puntaje('elo_rompe', r.total > 0 || r.aciertos > 0 ? r.elo : 0);
  } catch (e) { console.warn(e); }
}

const reportados = new Set();
export function logro(idLocal) {
  const c = C();
  if (!c || !c.usuario) return;
  const id = ID_LOGRO[idLocal] || String(idLocal).toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40);
  if (reportados.has(id)) return;
  reportados.add(id);
  Promise.resolve(c.logro(JUEGO, id)).catch((e) => { reportados.delete(id); console.warn('logro', id, e && e.message); });
}

export function xp(n) {
  const c = C();
  if (!c || !c.usuario) return;
  n = Math.round(n);
  if (n >= 1) c.xp(JUEGO, Math.min(n, 50));
}
// Una partida terminada (nunca por tiempo jugado). jugadas = medias jugadas.
export function xpPartida({ res, eloRival = 1000, puntua = false, jugadas = 0, online = false }) {
  if (jugadas < 8) return;
  const base = Math.max(0, Math.min(30, Math.round((eloRival - 500) / 60)));
  if (online) { xp(res === 'v' ? (puntua ? 25 : 12) : res === 't' ? 8 : 4); return; }
  if (res === 'v') xp((10 + base) * (puntua ? 1 : 0.5));
  else if (res === 't' && puntua) xp(5);
}

// ---------------------------------------------------------- barra de cuenta en el inicio
export function pintarBarra() {
  const el = document.getElementById('barraCuenta');
  if (!el) return;
  const u = usuario();
  el.classList.toggle('oculto', !u);
  if (!u) { el.innerHTML = ''; return; }
  el.innerHTML = `<span class="cuNombre"><i class="cuPunto" style="background:${esc(u.color || '#3df5ff')}"></i>${esc(u.nombre || u.usuario)} <small>nivel ${u.nivel || 1}</small></span><button type="button" class="chico" id="btnCuenta">CUENTA</button>`;
}

// ---------------------------------------------------------- ranking
const MODOS = [['rompecabezas', 'ROMPECABEZAS'], ['racha', 'MEJOR RACHA'], ['elo', 'ELO MOTOR'], ['elo_online', 'ELO ONLINE'], ['elo_rompe', 'ELO ROMPE']];
const RK = { modo: 'rompecabezas', ambito: 'global', token: 0, ui: null };

export function iniciarRanking(ui) {
  RK.ui = ui;
  const $ = (id) => document.getElementById(id);
  $('rkModo').innerHTML = MODOS.map(([id, n]) => `<button type="button" data-m="${id}">${n}</button>`).join('');
  $('rkAmbito').innerHTML = [['global', 'GLOBAL'], ['amigos', 'AMIGOS']].map(([id, n]) => `<button type="button" data-a="${id}">${n}</button>`).join('');
  // solo se cambia la clase: así el foco del mando no se pierde
  const pintarTabs = () => {
    $('rkModo').querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x.dataset.m === RK.modo));
    $('rkAmbito').querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x.dataset.a === RK.ambito));
  };
  RK.pintarTabs = pintarTabs;
  $('rkModo').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { RK.modo = b.dataset.m; pintarTabs(); cargarRanking(); } });
  $('rkAmbito').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { RK.ambito = b.dataset.a; pintarTabs(); cargarRanking(); } });
  $('btnRkAct').addEventListener('click', () => cargarRanking());
  $('btnRkCerrar').addEventListener('click', () => ui.ocultar('Ranking'));
}

export function abrirRanking(modo) {
  if (!RK.ui) return;
  if (modo) RK.modo = modo;
  RK.pintarTabs();
  RK.ui.mostrar('Ranking');
  cargarRanking();
}

async function cargarRanking() {
  const lista = document.getElementById('rkLista'), mia = document.getElementById('rkMia');
  const c = C();
  const tk = ++RK.token;
  if (!c || !c.usuario) { lista.innerHTML = '<p class="info">Inicia sesión para ver el ranking.</p>'; mia.textContent = ''; return; }
  lista.innerHTML = '<p class="info">Cargando…</p>'; mia.textContent = '';
  try {
    const [top, pos] = await Promise.all([
      c.top(JUEGO, RK.modo, 10, { soloAmigos: RK.ambito === 'amigos' }),
      c.miPosicion(JUEGO, RK.modo).catch(() => null),
    ]);
    if (tk !== RK.token) return;
    if (pos && pos.posicion) mia.textContent = `Tu puesto: #${pos.posicion} de ${pos.total} · ${pos.valor}`;
    else mia.textContent = 'Aún no tienes puntaje en este modo.';
    lista.innerHTML = top.length
      ? top.map((e) => `<div class="rkFila${e.yo ? ' yo' : ''}"><b>#${e.pos}</b><i class="cuPunto" style="background:${esc(e.color || '#9a8cff')}"></i><span>${esc(e.nombre || '—')}</span><em>${esc(e.valor)}</em></div>`).join('')
      : `<p class="info">${RK.ambito === 'amigos' ? 'Ni tú ni tus amigos tienen puntaje todavía.' : 'Aún no hay puntajes. ¡Sé el primero!'}</p>`;
  } catch (e) {
    if (tk !== RK.token) return;
    lista.innerHTML = `<p class="info">No se pudo cargar el ranking (${esc(c.mensajeError ? c.mensajeError(e) : 'sin conexión')}). Pulsa ACTUALIZAR para reintentar.</p>`;
  }
}
