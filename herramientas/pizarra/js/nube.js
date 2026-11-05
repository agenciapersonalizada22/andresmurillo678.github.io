// Cuenta y nube de Pizarra (plataforma: juego/comun/cuenta.js).
// Los tableros viven en IndexedDB, asi que no se usa Cuenta.nube.autoSincronizar (solo lee localStorage): aqui se serializa una
// instantanea JSON {tableros, lapidas} y se sincroniza con Cuenta.nube.cargar/guardar (gzip + trozos de 700 KB, maximo 8; lo gestiona Cuenta).
// Fusion: los tableros se fusionan por operaciones (el modelo ya es un CRDT: gana la ultima escritura de cada propiedad); los metadatos
// (titulo, papelera) los decide la marca de tiempo mas reciente; los tableros eliminados viajan como lapidas (90 dias).
// Las imagenes mayores de ~200 KB (y todo lo que exceda ~4,2 MB) se quedan en este dispositivo y se avisa en Ajustes > Datos.
// Sin sesion o sin Firebase se usa el modo demo local de la plataforma; sin Cuenta la app funciona igual. Nunca bloquea el dibujo.
import * as Almacen from './almacen.js';
import { Doc } from './modelo.js';

const MAX_ASSET = 200 * 1024, MAX_TOTAL = 4.2 * 1024 * 1024, LAPIDA_MS = 90 * 86400000, CADA_MS = 60000, ID = 'pizarra';

function canon(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}
const ordOps = (a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : a.c - b.c || (a.a < b.a ? -1 : a.a > b.a ? 1 : 0));
const opsCanon = ops => Doc.deOps(ops, 'nube').aOps().sort(ordOps);
const tsMeta = m => Math.max(m.mod || 0, m.borrado || 0, m.creado || 0);
const metaBasica = m => ({ id: m.id, titulo: m.titulo || 'Tablero sin título', creado: m.creado || 0, mod: m.mod || 0, borrado: m.borrado || 0, n: m.n || 0, paginas: m.paginas || 1 });
const nada = () => {};

export function crearNube(app) {
  const C = window.Cuenta || null;
  const E = { ocupado: false, t: 0, estado: '', hashNube: '', sucio: true, omitidos: 0, error: '', aplicados: 0, iniciado: false };
  const oyentes = new Set();
  let temp = 0;
  try { const g = Almacen.ls.leer('nube_estado', null); if (g && g.t) E.t = g.t; } catch (e) {}
  const sesion = () => !!(C && C.usuario);
  const emitir = () => oyentes.forEach(f => { try { f(); } catch (e) {} });
  const hora = t => { try { return new Date(t).toLocaleString('es', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
  const N = { estado: E };

  N.alCambiar = f => { oyentes.add(f); return () => oyentes.delete(f); };
  N.texto = () => {
    if (!sesion()) return 'Sin cuenta: tus tableros solo viven en este dispositivo.';
    if (E.ocupado) return 'Sincronizando…';
    const pend = C.pendientes ? C.pendientes() : 0, extra = pend ? ` · ${pend} envío${pend === 1 ? '' : 's'} pendiente${pend === 1 ? '' : 's'}` : '';
    if (E.error) return E.error + extra;
    if (navigator.onLine === false || E.estado === 'sinRed') return 'Sin conexión' + (E.t ? ' · última sincronización ' + hora(E.t) : ' · aún no sincronizado') + extra;
    if (!E.t) return 'Aún no sincronizado' + extra;
    return 'Al día · última sincronización ' + hora(E.t) + (E.aplicados ? ` · ${E.aplicados} tablero${E.aplicados === 1 ? '' : 's'} actualizado${E.aplicados === 1 ? '' : 's'}` : '') + extra;
  };

  // ---------- logros y XP (moderados, con tope diario) ----------
  N.logro = id => {
    if (!sesion() || !C.logro) return;
    try { if (C.logros(ID).includes(id)) return; } catch (e) {}
    C.logro(ID, id).catch(nada);
  };
  N.xp = (tipo, n, max) => {
    if (!sesion() || !C.xp) return;
    const hoy = new Date().toISOString().slice(0, 10);
    let d = Almacen.ls.leer('xp', {}); if (d.f !== hoy) d = { f: hoy, n: {} };
    if ((d.n[tipo] || 0) >= max) return;
    d.n[tipo] = (d.n[tipo] || 0) + 1; Almacen.ls.escribir('xp', d); C.xp(ID, n);
  };

  // ---------- instantanea ----------
  async function instantanea() {
    await app.guardarAhora();
    const metas = [...await Almacen.listar(false), ...await Almacen.listar(true)];
    const tableros = {}, ahora = Date.now(), cand = [];
    let omitidos = 0;
    for (const m of metas) {
      const d = await Almacen.cargar(m.id); if (!d) continue;
      const assets = {};
      for (const [aid, data] of Object.entries(d.assets)) { if (typeof data !== 'string' || data.length > MAX_ASSET) { omitidos++; continue; } assets[aid] = data; cand.push([m.id, aid, data.length]); }
      tableros[m.id] = { meta: metaBasica(m), ops: opsCanon(d.ops), assets };
    }
    const lapidas = {};
    for (const [id, ts] of Object.entries(Almacen.lapidas())) if (ts > ahora - LAPIDA_MS && !tableros[id]) lapidas[id] = ts;
    let total = canon({ tableros, lapidas }).length;
    if (total > MAX_TOTAL) {   // se quitan las imagenes mas grandes hasta que quepa
      cand.sort((a, b) => b[2] - a[2]);
      for (const [t, a, n] of cand) { if (total <= MAX_TOTAL) break; delete tableros[t].assets[a]; total -= n; omitidos++; }
    }
    return { datos: { app: 'pizarra', v: 1, tableros, lapidas }, canon: canon({ tableros, lapidas }), omitidos };
  }

  // ---------- fusion ----------
  const resumen = d => { let n = 0; for (const e of d.ent.o.values()) if (e.v.del === false) n++; return { n, paginas: d.paginas().length }; };
  async function pasarAOtro() {
    const l = await Almacen.listar();
    if (l.length) await app.abrirTablero(l[0].id); else await app.nuevoTablero();
  }
  async function fusionar(rem) {
    let cambios = 0;
    const lap = Almacen.lapidas();
    const locales = new Map([...await Almacen.listar(false), ...await Almacen.listar(true)].map(m => [m.id, m]));
    // 1) tableros eliminados en otro dispositivo
    for (const [id, ts] of Object.entries(rem.lapidas || {})) {
      const m = locales.get(id);
      if (m && tsMeta(m) <= ts) {
        const abierto = id === app.tableroId;
        await app.guardarAhora(); await Almacen.eliminar(id, ts); locales.delete(id); cambios++;
        if (abierto) await pasarAOtro();
      } else if (!m && !(lap[id] >= ts)) Almacen.marcarLapida(id, ts);
    }
    // 2) tableros nuevos o cambiados
    for (const [id, r] of Object.entries(rem.tableros || {})) {
      if (!r || !r.meta || !Array.isArray(r.ops)) continue;
      const rl = Almacen.lapidas()[id];
      if (rl && rl >= tsMeta(r.meta)) continue;                 // eliminado aqui despues
      if (rl) Almacen.quitarLapida(id);                        // restaurado despues de la lapida
      const m = locales.get(id), assetsR = r.assets || {};
      if (!m) {
        await Almacen.crear(id, r.meta.titulo);
        await Almacen.actualizarMeta(id, { creado: r.meta.creado, mod: r.meta.mod, borrado: r.meta.borrado || 0, n: r.meta.n, paginas: r.meta.paginas });
        if (r.ops.length) await Almacen.compactar(id, r.ops);
        for (const [aid, data] of Object.entries(assetsR)) await Almacen.guardarAsset(id, aid, data);
        cambios++; continue;
      }
      const abierto = id === app.tableroId;
      let hubo = 0, d = null;
      const nuevosAssets = {};
      const local = abierto ? null : await Almacen.cargar(id);
      const aLocal = abierto ? app.assets : (local ? local.assets : {});
      for (const [aid, data] of Object.entries(assetsR)) if (!(aid in aLocal)) nuevosAssets[aid] = data;
      if (abierto) {
        hubo = app.doc.aplicarVarias(r.ops);
        if (hubo) await Almacen.anexar(id, r.ops);
        for (const [aid, data] of Object.entries(nuevosAssets)) { app.recibirAsset(aid, data); hubo++; }
        if (hubo) { app.vista.redibujarTodo(); app.ui.refrescarTodo(); }
      } else {
        d = Doc.deOps(local ? local.ops : [], 'nube');
        hubo = d.aplicarVarias(r.ops);
        if (hubo) await Almacen.compactar(id, d.aOps());
        for (const [aid, data] of Object.entries(nuevosAssets)) { await Almacen.guardarAsset(id, aid, data); hubo++; }
      }
      const doc = abierto ? app.doc : d, cam = {};
      if (tsMeta(r.meta) > tsMeta(m)) { Object.assign(cam, { titulo: r.meta.titulo, mod: r.meta.mod, borrado: r.meta.borrado || 0 }); hubo++; }
      if (hubo) { Object.assign(cam, resumen(doc)); if (!cam.titulo && doc.meta('titulo')) cam.titulo = doc.meta('titulo'); await Almacen.actualizarMeta(id, cam); cambios++; }
    }
    return cambios;
  }

  // ---------- sincronizacion ----------
  async function guardarNube(inst) { return C.nube.guardar(ID, inst.datos); }
  async function sincronizar(manual) {
    if (!sesion() || !C.nube) return { estado: 'sinSesion' };
    if (E.ocupado) return { estado: 'ocupado' };
    if (navigator.onLine === false) { E.estado = 'sinRed'; emitir(); return { estado: 'sinRed' }; }
    E.ocupado = true; E.error = ''; emitir();
    let res = { estado: 'igual' };
    try {
      await app.guardarAhora();
      const nube = await C.nube.cargar(ID, { meta: true });
      let cambios = 0;
      Almacen.enlace.silencio++;
      try {
        if (nube && nube.datos && (manual || E.sucio || nube.hash !== E.hashNube)) cambios = await fusionar(nube.datos);
        if (nube) E.hashNube = nube.hash;
        E.sucio = false;
        const inst = await instantanea();
        const remoto = nube && nube.datos ? canon({ tableros: nube.datos.tableros || {}, lapidas: nube.datos.lapidas || {} }) : null;
        E.omitidos = inst.omitidos;
        if (remoto !== inst.canon && (nube || Object.keys(inst.datos.tableros).length || Object.keys(inst.datos.lapidas).length)) {
          const r = await guardarNube(inst); if (r && r.hash) E.hashNube = r.hash; res = { estado: 'subido' };
        } else if (cambios) res = { estado: 'bajado' };
      } finally { Almacen.enlace.silencio--; }
      E.aplicados = cambios; E.estado = 'ok'; E.t = Date.now(); Almacen.ls.escribir('nube_estado', { t: E.t });
      if (nube || res.estado === 'subido') N.logro('en_la_nube');
    } catch (e) {
      if (e && e.codigo === 'sin_red') { E.estado = 'sinRed'; res = { estado: 'sinRed' }; }
      else { E.error = 'No se pudo sincronizar: ' + (C && C.mensajeError ? C.mensajeError(e) : (e && e.message) || 'error'); res = { estado: 'error' }; console.warn('Nube:', e); }
    }
    E.ocupado = false; emitir(); return res;
  }
  N.sincronizar = () => sincronizar(true);
  const programar = () => { clearTimeout(temp); temp = setTimeout(() => sincronizar(false), 7000); };
  N.marcar = () => { E.sucio = true; if (sesion()) programar(); };

  // ---------- perfil ----------
  const aplicarPerfil = u => {
    try {
      if (window.Red && window.Red.perfil) window.Red.perfil.guardar({ nombre: u.nombre, color: u.color });
      else localStorage.setItem('juego_perfil', JSON.stringify({ nombre: String(u.nombre).slice(0, 16), color: u.color }));
    } catch (e) {}
  };
  N.requerir = async () => {
    if (!C) return null;
    try { if (C.ui) C.ui.mandoPropio = true; const u = await C.requerir(); if (u) aplicarPerfil(u); return u; }
    catch (e) { console.warn('Cuenta:', e); return null; }
    finally { try { if (C.ui) C.ui.mandoPropio = false; } catch (e) {} }
  };
  const irPortal = () => { location.href = C && C.portalUrl ? C.portalUrl() : '../../juego/'; };
  N.irPortal = irPortal;
  N.cerrarSesion = async () => {
    if (!confirm('¿Cerrar sesión? Tus tableros se sincronizan antes y quedan guardados en este dispositivo.')) return;
    try { await sincronizar(true); } catch (e) {}
    try { await C.salir(); } catch (e) {}
    irPortal();
  };

  // ---------- bloque "Cuenta y nube" (Ajustes > Datos) ----------
  N.bloque = (h) => {
    const u = C && C.usuario, cont = h('div', { cls: 'bloque-cuenta' });
    let off = null;
    const btn = (t, fn, cls = '') => h('button', { type: 'button', cls: 'btn ' + cls, 'data-f': 1, txt: t, on: { click: fn } });
    const pintar = () => {
      cont.replaceChildren(h('h4', { txt: 'Cuenta y nube' }));
      if (!C) { cont.append(h('p', { cls: 'nota-aj', txt: 'La plataforma de cuentas no se cargó: los tableros siguen guardándose en este dispositivo.' })); return; }
      if (!u) { cont.append(h('p', { cls: 'nota-aj', txt: 'Sin sesión. Inicia sesión desde el portal para sincronizar tus tableros entre dispositivos.' }), btn('Ir al portal', irPortal, 'principal')); return; }
      const av = C.ui && C.ui.avatarEl ? C.ui.avatarEl(u.avatar, u.color, 36) : h('span', { cls: 'punto', style: 'background:' + u.color });
      cont.append(h('div', { cls: 'fila', style: 'justify-content:flex-start' }, [av, h('div', {}, [h('b', { txt: u.nombre }), h('small', { txt: (C.demo ? 'Modo demo: la cuenta vive solo en este navegador · ' : '') + 'Nivel ' + (u.nivel || 1) + ' · ' + (u.xp || 0) + ' XP' })])]),
        h('p', { cls: 'nota-aj', role: 'status', 'data-nube-estado': 1, txt: N.texto() }));
      if (C.demo) cont.append(h('p', { cls: 'nota-aj', txt: 'En modo demo la «nube» es local: sirve para probar, pero no llega a otros dispositivos.' }));
      if (E.omitidos) cont.append(h('p', { cls: 'nota-aj', style: 'color:var(--peligro,#b45309)', txt: `${E.omitidos} imagen${E.omitidos === 1 ? '' : 'es'} grande${E.omitidos === 1 ? '' : 's'} (más de ~200 KB) no se suben a la nube y se quedan solo en este dispositivo.` }));
      cont.append(h('div', { cls: 'fila-bot' }, [
        btn('Sincronizar ahora', async () => { const r = await N.sincronizar(); app.aviso(r.estado === 'sinRed' ? 'Sin conexión: se sincronizará al volver.' : r.estado === 'error' ? E.error : 'Sincronizado'); }, 'principal'),
        btn('Volver al portal', irPortal), btn('Cerrar sesión', N.cerrarSesion, 'peligro')]),
      h('p', { cls: 'nota-aj', txt: 'Los tableros se fusionan por operaciones (gana el último cambio de cada elemento) y las eliminaciones también se propagan. Las versiones del historial, las miniaturas y los ajustes de cada dispositivo no se sincronizan.' }));
    };
    off = N.alCambiar(() => {
      if (!cont.isConnected) { if (off) off(); off = null; return; }
      const s = cont.querySelector('[data-nube-estado]'); if (s) s.textContent = N.texto(); else pintar();
    });
    pintar(); return cont;
  };

  // ---------- arranque ----------
  N.iniciar = () => {
    if (E.iniciado) return; E.iniciado = true;
    Almacen.enlace.alCambiar = () => N.marcar();
    if (!C) return;
    window.addEventListener('online', () => setTimeout(() => sesion() && sincronizar(false), 800));
    document.addEventListener('visibilitychange', () => { if (document.hidden && E.sucio && sesion()) sincronizar(false); });
    setInterval(() => { if (sesion()) sincronizar(false); }, CADA_MS);
    if (C.alCambiar) C.alCambiar(u => { if (u) aplicarPerfil(u); });
    if (C.on) C.on('cola', emitir);
    if (sesion()) sincronizar(false);
    const R = window.Red;
    if (R && R.on) {
      const ver = () => { try { if (sesion() && app.colab.activo && R.cuantos() >= 2) { N.logro('colaborativa'); N.xp('colab', 10, 2); } } catch (e) {} };
      R.on('jugadores', ver); R.on('conectado', ver);
    }
  };
  return N;
}
