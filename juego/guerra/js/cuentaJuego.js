// =============================================================
//  CUENTA: puente entre Alas y Acero y la plataforma (window.Cuenta).
//  Nada de aquí puede bloquear el juego: sin Cuenta, sin red o con errores todo sigue.
// =============================================================
export const JUEGO = 'guerra';
// guerra_ajustes y guerra_opciones (gráficos, controles) son por dispositivo: no se sincronizan.
// Claves de localStorage que representan el progreso (no se sincroniza la ranura elegida: es del dispositivo)
export const CLAVES_NUBE = ['guerra_progreso', 'guerra_progreso_2', 'guerra_progreso_3', 'guerra_partida'];
export const MODOS_PUNTAJE = [{ id: 'aire', nombre: 'CAZA' }, { id: 'tanque', nombre: 'TANQUE' }];
const TOPE = 100000000;

const C = () => (typeof window !== 'undefined' && window.Cuenta) || null;
export const hayCuenta = () => !!C();

let ctl = null;
let conflictoActivo = false;
let alBajar = null;
let bajadoTarde = false;
const est = { ultima: 0, estado: '', sincronizando: false };
const oyentes = new Set();
export const alCambiarNube = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn); };
const avisar = () => oyentes.forEach((f) => { try { f(); } catch (e) { /* nada */ } });

// ---- Arranque (antes de cargar el juego): exige sesión y baja el progreso de la nube
export async function arrancar() {
  const cu = C();
  if (!cu) return null;
  let u = null;
  try {
    cu.ui.mandoPropio = true; // los cuadros de la plataforma (conflicto, cuenta) se manejan con mando
    u = await cu.requerir(); // sin sesión redirige al portal y vuelve
  } catch (e) { console.warn(e); }
  try {
    cu.on('sincronizado', (j, res) => {
      if (j !== JUEGO) return;
      est.ultima = Date.now(); est.estado = res && res.estado; avisar();
      if (res && res.estado === 'bajado') { if (alBajar) alBajar(); else bajadoTarde = true; }
    });
    cu.on('cola', avisar);
    if (u && cu.nube) {
      ctl = cu.nube.autoSincronizar(JUEGO, CLAVES_NUBE, {
        recargar: false,
        alConflicto: async (info) => { conflictoActivo = true; try { return await cu.ui.conflicto(info); } finally { conflictoActivo = false; } },
      });
      const espera = new Promise((r) => setTimeout(() => r('t'), 4000));
      const r = await Promise.race([ctl.primera, espera]);
      if (r === 't' && conflictoActivo) await ctl.primera; // si el usuario decide, se espera
    }
  } catch (e) { console.warn(e); }
  return u;
}

// El juego avisa cómo recargar cuando la nube trajo datos nuevos (lo decide él según esté jugando o no)
export function alBajarDatos(fn) { alBajar = fn; if (bajadoTarde) { bajadoTarde = false; fn(); } }

export function usuario() { const cu = C(); return cu && cu.usuario ? cu.usuario : null; }
export function perfilCuenta() {
  const u = usuario();
  if (!u) return null;
  return { nombre: String(u.nombre || u.usuario || 'Jugador').slice(0, 16), color: /^#[0-9a-f]{6}$/i.test(u.color) ? u.color : '#3df5ff' };
}

export function estadoNube() {
  const cu = C(), u = usuario();
  if (!cu || !u) return { texto: 'Sin sesión: el progreso solo se guarda en este dispositivo.', tono: 'aviso' };
  const hora = (t) => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const pend = typeof cu.pendientes === 'function' ? cu.pendientes() : 0;
  if (est.sincronizando) return { texto: 'Sincronizando…', tono: '' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { texto: 'Sin conexión: se sincronizará al volver la red.' + (pend ? ` (${pend} pendiente${pend > 1 ? 's' : ''})` : ''), tono: 'aviso' };
  if (est.estado === 'sinRed') return { texto: 'Sin conexión con la nube. Se reintentará solo.', tono: 'aviso' };
  if (est.estado === 'cancelado') return { texto: 'Sincronización cancelada. Se preguntará de nuevo más tarde.', tono: 'aviso' };
  if (pend) return { texto: `Pendiente: ${pend} cambio${pend > 1 ? 's' : ''} por enviar.`, tono: 'aviso' };
  if (est.ultima) return { texto: 'Última sincronización: ' + hora(est.ultima) + '.', tono: 'ok' };
  return { texto: 'Aún sin sincronizar en esta sesión.', tono: '' };
}

export async function sincronizarAhora() {
  const cu = C();
  if (!cu || !usuario() || !cu.nube) return { estado: 'sinSesion' };
  est.sincronizando = true; avisar();
  let res = { estado: 'sinRed' };
  try { res = (ctl ? await ctl.ahora() : await cu.nube.sincronizar(JUEGO, CLAVES_NUBE, { recargar: false })) || { estado: 'igual' }; } catch (e) { res = { estado: 'sinRed' }; }
  est.sincronizando = false;
  if (!est.ultima || res.estado !== 'sinRed') est.estado = res.estado;
  if (res.estado === 'igual' || res.estado === 'subido') est.ultima = Date.now();
  avisar();
  return res;
}

export function borrarNube() {
  const cu = C();
  if (!cu || !usuario() || !cu.nube) return Promise.resolve();
  return Promise.race([cu.nube.borrar(JUEGO).catch(() => {}), new Promise((r) => setTimeout(r, 1500))]);
}

export async function salir() {
  const cu = C();
  try { if (ctl) ctl.parar(); if (cu) await cu.salir(); } catch (e) { console.warn(e); }
  location.replace('../');
}

// ---- Puntajes, logros y XP
export function enviarPuntaje(modo, valor) {
  const cu = C();
  valor = Math.round(+valor);
  if (!cu || !usuario() || !(valor > 0)) return Promise.resolve(null);
  if (modo !== 'aire' && modo !== 'tanque') return Promise.resolve(null);
  return cu.puntaje(JUEGO, modo, Math.min(valor, TOPE)).catch((e) => { console.warn('puntaje', e && e.codigo); return null; });
}
export function reportarLogro(id) {
  const cu = C();
  if (!cu || !usuario() || !/^[a-z0-9_]{1,40}$/.test(id)) return;
  try { Promise.resolve(cu.logro(JUEGO, id)).catch(() => {}); } catch (e) { /* nada */ }
}
export function darXp(n) {
  const cu = C();
  n = Math.max(0, Math.min(50, Math.round(n)));
  if (!cu || !usuario() || n < 1) return 0;
  try { cu.xp(JUEGO, n); } catch (e) { return 0; }
  return n;
}
// Logros que ya había ganado en este dispositivo y la cuenta aún no conoce (una sola vez; la plataforma ignora los repetidos)
export async function reportarPendientes(ids) {
  const cu = C();
  if (!cu || !usuario() || !ids.length) return;
  try {
    const nube = await cu.cargarLogros();
    const conocidos = new Set([...(nube && nube[JUEGO] ? nube[JUEGO] : []), ...cu.logros(JUEGO)]);
    for (const id of ids) if (!conocidos.has(id)) reportarLogro(id);
  } catch (e) { /* sin red: se intentará la próxima vez */ }
}

// ---- Ranking (Global / Amigos) con estados de carga y vacío
const el = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto !== undefined) e.textContent = texto; return e; };
const fmt = (n) => Number(n).toLocaleString('es');

// cont se vacía y se rellena. opciones: { modo, alcance, selectorModo }
export function pintarRanking(cont, opciones) {
  const o = { modo: 'aire', alcance: 'global', selectorModo: true, ...opciones };
  const cu = C();
  cont.textContent = '';
  cont.classList.add('ranking');
  const cab = el('div', 'tabs');
  const botones = [];
  const tab = (txt, sel, fn) => { const b = el('button', sel ? 'sel' : '', txt); b.type = 'button'; b.addEventListener('click', fn); cab.appendChild(b); botones.push(b); return b; };
  const otro = (cambio) => pintarRanking(cont, { ...o, ...cambio });
  if (o.selectorModo) for (const m of MODOS_PUNTAJE) tab(m.nombre, o.modo === m.id, () => otro({ modo: m.id }));
  tab('GLOBAL', o.alcance === 'global', () => otro({ alcance: 'global' }));
  tab('AMIGOS', o.alcance === 'amigos', () => otro({ alcance: 'amigos' }));
  const cuerpo = el('div', 'rankLista');
  const pie = el('p', 'info rankPie');
  cont.append(cab, cuerpo, pie);
  const marca = (cont._tok = (cont._tok || 0) + 1);
  const vivo = () => cont._tok === marca && cont.isConnected;
  if (!cu || !usuario()) { cuerpo.appendChild(el('p', 'info', 'Inicia sesión para ver el ranking.')); return; }
  cuerpo.appendChild(el('p', 'info rankCarga', 'Cargando ranking…'));
  const soloAmigos = o.alcance === 'amigos';
  Promise.all([cu.top(JUEGO, o.modo, 10, { soloAmigos }), cu.miPosicion(JUEGO, o.modo).catch(() => null)]).then(([lista, mi]) => {
    if (!vivo()) return;
    cuerpo.textContent = '';
    if (!lista.length) cuerpo.appendChild(el('p', 'info', soloAmigos ? 'Ninguno de tus amigos tiene puntaje todavía.' : 'Aún no hay puntajes. ¡Sé el primero!'));
    for (const e of lista) {
      const f = el('div', 'rankFila' + (e.yo ? ' yo' : ''));
      const pos = el('b', 'pos', '#' + e.pos);
      const nom = el('span', 'nom');
      const dot = el('i', 'pDot'); dot.style.background = /^#[0-9a-f]{6}$/i.test(e.color) ? e.color : '#fff';
      nom.append(dot, document.createTextNode(String(e.nombre || '?').slice(0, 18)));
      f.append(pos, nom, el('span', 'val', fmt(e.valor)));
      cuerpo.appendChild(f);
    }
    if (mi && mi.posicion) pie.textContent = `Tu mejor: ${fmt(mi.valor)} · puesto ${mi.posicion} de ${mi.total}`;
    else pie.textContent = 'Aún no tienes puntaje en este modo.';
    pie.textContent += ' · cuenta el mejor de todos los mapas';
  }).catch((e) => {
    if (!vivo()) return;
    cuerpo.textContent = '';
    cuerpo.appendChild(el('p', 'info', 'No se pudo cargar el ranking (' + (cu.mensajeError ? cu.mensajeError(e) : 'sin conexión') + ').'));
    const r = el('button', '', 'REINTENTAR'); r.type = 'button'; r.addEventListener('click', () => otro({}));
    cuerpo.appendChild(r);
  });
}

// ---- Panel de cuenta (acceso discreto desde el menú)
export function abrirCuenta() {
  const cu = C(), u = usuario();
  if (!cu || !u) { location.href = '../'; return; }
  const cont = el('div', 'cuentaModal');
  const fila = el('div', 'cuentaFila');
  try { fila.appendChild(cu.ui.avatarEl(u.avatar, u.color, 44)); } catch (e) { /* sin avatar */ }
  const t = el('div');
  t.append(el('b', '', u.nombre || u.usuario), el('small', '', `Nivel ${u.nivel || 1}${cu.demo ? ' · modo demo (solo este dispositivo)' : ''}`));
  fila.appendChild(t);
  cont.appendChild(fila);
  const est2 = el('p', 'info', estadoNube().texto);
  cont.appendChild(est2);
  cu.ui.modal({
    titulo: 'CUENTA', contenido: cont, valorAtras: 'cerrar',
    botones: [{ txt: 'Volver al portal', valor: 'portal' }, { txt: 'Cerrar sesión', valor: 'salir' }, { txt: 'Cerrar', valor: 'cerrar', cls: 'cu-primario' }],
  }).promesa.then((v) => { if (v === 'portal') location.href = '../'; else if (v === 'salir') salir(); });
}

// Bloque "Cuenta y nube" de Ajustes > Datos
export function bloqueAjustes(c) {
  const cu = C(), u = usuario();
  c.appendChild(el('h4', 'subt', 'CUENTA Y NUBE'));
  const caja = el('div', 'cuentaBloque');
  c.appendChild(caja);
  if (!cu || !u) {
    caja.appendChild(el('p', 'info', 'Sin sesión de la plataforma: el progreso solo se guarda en este dispositivo.'));
    return;
  }
  caja.appendChild(el('p', 'info', `Usuario: ${u.nombre || u.usuario}${cu.demo ? ' (modo demo local)' : ''}`));
  const estado = el('p', 'info estadoNube');
  caja.appendChild(estado);
  const pintar = () => { const s = estadoNube(); estado.textContent = s.texto; estado.dataset.tono = s.tono; };
  pintar();
  const baja = alCambiarNube(() => { if (!estado.isConnected) baja(); else pintar(); });
  const f = el('div', 'fila');
  const b = el('button', '', 'SINCRONIZAR AHORA');
  b.type = 'button';
  b.addEventListener('click', async () => { b.disabled = true; await sincronizarAhora(); b.disabled = false; pintar(); try { b.focus({ preventScroll: true }); } catch (e) { /* nada */ } });
  const p = el('button', '', 'CUENTA'); p.type = 'button'; p.addEventListener('click', abrirCuenta);
  f.append(b, p);
  caja.appendChild(f);
  caja.appendChild(el('p', 'info', 'Se guardan en la nube las ranuras y los récords; los ajustes (gráficos, controles) son de cada dispositivo. Si cambian en dos dispositivos a la vez, la plataforma te pregunta cuál conservar.'));
}
