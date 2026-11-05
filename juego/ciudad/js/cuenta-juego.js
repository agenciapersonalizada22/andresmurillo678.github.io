// =============================================================
//  👤  CUENTA: integración con la plataforma (juego/comun/cuenta.js)
//  - exige sesión y espera a la sincronización de guardados ANTES de cargar el juego
//  - perfil (nombre/color) de la cuenta, nube, puntaje, logros, XP, ranking y panel de cuenta
//  Si Cuenta no existe o falla la red, el juego carga igual (nada de esto es bloqueante).
// =============================================================
(() => {
  'use strict';
  const ID = 'ciudad';
  const MODO = 'dinero';
  const C = window.Cuenta || null;

  // Claves de localStorage que representan progreso (3 ranuras). Se omiten las efímeras (radio, silencio, ranura activa).
  const BASES = ['dinero', 'stats', 'economia', 'historia', 'logros', 'armas'];
  // ciudad_g_ajustes (gráficos, audio, controles) es POR DISPOSITIVO: no se sincroniza.
  const CLAVES = [];
  ['ciudad_', 'ciudad_s2_', 'ciudad_s3_'].forEach((p) => BASES.forEach((b) => CLAVES.push(p + b)));

  // Ids de logro de la plataforma (plataforma/juegos.js); el resto usa el id propio del juego.
  const ID_LOGRO = { primer: 'primera_mision', millon: 'millonario', escapar: 'escapar' };

  const E = { usuario: null, ctl: null, t: 0, texto: '', ocupado: false, conflicto: false };
  const cache = { global: null, amigos: null, pos: null };

  const nada = () => 0;
  const sesion = () => !!(C && C.usuario);
  const hora = (t) => { try { return new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

  // ----------------------------------------------------------- Estado de la sincronización
  function aplicarResultado(r) {
    if (!r) return;
    if (r.estado === 'sinRed') { E.texto = 'sinRed'; return; }
    if (r.estado === 'cancelado') { E.texto = 'cancelado'; return; }
    if (r.estado === 'sinSesion') { E.texto = ''; return; }
    E.t = Date.now();
    E.texto = r.estado === 'subido' ? 'subido' : r.estado === 'bajado' ? 'bajado' : 'ok';
  }

  function textoSync() {
    if (!sesion()) return 'Sin cuenta';
    if (E.ocupado) return 'Sincronizando...';
    const pend = C.pendientes ? C.pendientes() : 0;
    const extra = pend ? ` · ${pend} pendiente${pend === 1 ? '' : 's'}` : '';
    if (navigator.onLine === false || E.texto === 'sinRed') return 'Sin conexión' + (E.t ? ` (última ${hora(E.t)})` : '') + extra;
    if (E.texto === 'cancelado') return 'Pendiente de decidir' + extra;
    if (!E.t) return 'Aún no sincronizado' + extra;
    return `${hora(E.t)} · ${E.texto === 'subido' ? 'guardado en la nube' : E.texto === 'bajado' ? 'descargado de la nube' : 'al día'}` + extra;
  }

  async function sincronizarAhora() {
    if (!sesion() || !E.ctl || E.ocupado) return null;
    E.ocupado = true;
    if (window.Panel) Panel.refrescar();
    let r = null;
    try {
      // sube lo último que el juego tiene en memoria
      try { if (window.J && J.guardarPartida && J.modo !== 'titulo') J.guardarPartida(); } catch (e) { /* nada */ }
      r = await E.ctl.ahora();
      aplicarResultado(r);
    } catch (e) { E.texto = 'sinRed'; }
    E.ocupado = false;
    if (window.Panel) Panel.refrescar();
    return r;
  }

  function iniciarNube() {
    if (!sesion() || !C.nube) return Promise.resolve();
    const opciones = {
      recargar: true,
      alConflicto: (info) => { E.conflicto = true; return C.ui.conflicto(info).then((x) => { E.conflicto = false; return x; }, () => { E.conflicto = false; return null; }); },
    };
    try { E.ctl = C.nube.autoSincronizar(ID, CLAVES, opciones); } catch (e) { E.ctl = null; return Promise.resolve(); }
    if (C.on) C.on('sincronizado', (juego, r) => { if (juego === ID) { aplicarResultado(r); if (window.Panel) Panel.refrescar(); } });
    // Espera la primera sincronización, pero sin bloquear si la red tarda (salvo que haya un diálogo abierto).
    const primera = E.ctl.primera.then((r) => aplicarResultado(r), nada);
    const limite = new Promise((ok) => {
      const ini = Date.now();
      const v = setInterval(() => { if (Date.now() - ini > 8000 && !E.conflicto) { clearInterval(v); ok(); } }, 400);
      primera.then(() => clearInterval(v));
    });
    return Promise.race([primera, limite]);
  }

  // ----------------------------------------------------------- Perfil
  function aplicarPerfil(u) {
    try {
      if (window.Red && Red.perfil) Red.perfil.guardar({ nombre: u.nombre, color: u.color });
      else localStorage.setItem('juego_perfil', JSON.stringify({ nombre: String(u.nombre).slice(0, 16), color: u.color }));
    } catch (e) { /* sin almacenamiento */ }
  }

  // ----------------------------------------------------------- Carga de los scripts del juego (en orden)
  function cargarScripts(lista) {
    return new Promise((ok) => {
      let i = 0;
      const sig = () => {
        if (i >= lista.length) { ok(); return; }
        const s = document.createElement('script');
        s.src = lista[i++];
        s.async = false;
        s.onload = sig;
        s.onerror = () => { console.error('No se pudo cargar ' + s.src); sig(); };
        document.body.appendChild(s);
      };
      sig();
    });
  }

  async function arrancar(scripts) {
    const carga = document.getElementById('cargaCuenta');
    try {
      if (C) {
        if (C.ui) C.ui.mandoPropio = true; // el diálogo de conflicto se maneja con mando antes de que arranque el juego
        E.usuario = await C.requerir();
        if (E.usuario) { aplicarPerfil(E.usuario); await iniciarNube(); }
        if (C.ui) C.ui.mandoPropio = false;
      }
    } catch (e) { console.warn('Cuenta:', e); if (C && C.ui) C.ui.mandoPropio = false; }
    await cargarScripts(scripts);
    if (carga) carga.remove();
    try { despuesDeCargar(); } catch (e) { console.error(e); }
  }

  // ----------------------------------------------------------- Puntaje, logros y XP
  let enviado = 0, relojP = 20, vistoStats = null, relojS = 2;

  function valorDinero() {
    try { return Math.round(window.Economia ? Economia.patrimonio() : J.dinero); } catch (e) { return 0; }
  }

  function enviarPuntaje() {
    if (!sesion() || !C.puntaje) return;
    const v = valorDinero();
    if (!isFinite(v) || v <= 0 || v > 1000000000) return; // tope de juegos.js
    if (v <= enviado) return;
    enviado = v;
    C.puntaje(ID, MODO, v).then((r) => { cache.global = null; cache.amigos = null; cache.pos = null; return r; }, nada);
  }

  function logro(id) {
    if (!sesion() || !C.logro) return;
    const idp = ID_LOGRO[id] || String(id).toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40);
    try { C.logro(ID, idp).then(nada, nada); } catch (e) { /* nada */ }
  }

  function xp(n) { if (sesion() && C.xp && n > 0) { try { C.xp(ID, Math.min(50, Math.round(n))); } catch (e) { /* nada */ } } }

  const XP_HITOS = [['misiones', 10], ['historia', 15], ['trabajos', 8], ['escapes3', 15]];
  function revisarHitos() {
    const s = J.stats || {};
    if (!vistoStats) { vistoStats = {}; XP_HITOS.forEach(([k]) => { vistoStats[k] = s[k] || 0; }); return; }
    let total = 0;
    XP_HITOS.forEach(([k, v]) => {
      const a = s[k] || 0;
      if (a > vistoStats[k]) total += Math.min(3, a - vistoStats[k]) * v;
      vistoStats[k] = a;
    });
    xp(total);
  }

  function despuesDeCargar() {
    if (!window.J) return;
    J.registrar({
      actualizar(dt) {
        relojS -= dt;
        if (relojS <= 0) { relojS = 2; revisarHitos(); }
        relojP -= dt;
        if (relojP <= 0) { relojP = 45; enviarPuntaje(); }
      },
      guardar() { /* el envío de puntaje va por reloj, no por cada guardado */ },
    });
    // Logros que ya tenías: se reportan una sola vez (la plataforma ignora los repetidos)
    if (sesion() && window.Logros) {
      const hechos = Logros.hechos;
      Object.keys(hechos).forEach((id) => logro(id));
    }
    revisarHitos();
    window.addEventListener('pagehide', () => enviarPuntaje());
    document.addEventListener('visibilitychange', () => { if (document.hidden) enviarPuntaje(); });
    pintarPortada();
    if (C && C.alCambiar) C.alCambiar(() => pintarPortada());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyU' && J.modo === 'titulo' && !Panel.abierto) abrirPanel();
    });
  }

  // ----------------------------------------------------------- Menú principal
  function pintarPortada() {
    const el = document.getElementById('cuentaPortada');
    const b = document.getElementById('bCuentaTitulo');
    if (!el) return;
    el.textContent = '';
    if (sesion()) {
      const u = C.usuario;
      const punto = document.createElement('i');
      punto.style.background = u.color || '#3df5ff';
      const t = document.createElement('span');
      t.textContent = 'Jugando como ' + u.nombre + (u.nivel ? ' · nivel ' + u.nivel : '');
      el.append(punto, t);
      el.hidden = false;
    } else el.hidden = true;
    if (b) b.hidden = !sesion();
  }

  // ----------------------------------------------------------- Filas del panel (Ajustes > Datos y Cuenta)
  function filasNube() {
    const f = [{ t: 'titulo', texto: 'CUENTA Y NUBE' }];
    if (!sesion()) {
      f.push({ t: 'info', texto: 'Sin sesión: el progreso queda solo en este dispositivo', valor: '' });
      return f;
    }
    const u = C.usuario;
    f.push({ t: 'info', texto: 'Usuario', valor: u.nombre + (u.nivel ? ' · nv. ' + u.nivel : '') });
    if (C.demo) f.push({ t: 'info', texto: 'Modo demo: la cuenta vive solo en este dispositivo', valor: '' });
    f.push({ t: 'info', texto: 'Sincronización', valor: textoSync() });
    f.push({ t: 'boton', texto: E.ocupado ? 'Sincronizando...' : 'Sincronizar ahora', color: '#7dff9a', deshabilitado: E.ocupado, accion: () => { sincronizarAhora(); } });
    f.push({ t: 'info', texto: 'Si tu progreso cambió en dos dispositivos, la plataforma te pregunta cuál conservar.', valor: '' });
    return f;
  }

  // ----------------------------------------------------------- Ranking
  function cargarRanking(clave) {
    const e = cache[clave];
    if (e && (e.estado === 'carga' || (e.estado === 'ok' && Date.now() - e.t < 30000))) return;
    cache[clave] = { estado: 'carga', lista: [], t: Date.now() };
    const amigos = clave === 'amigos';
    Promise.all([
      C.top(ID, MODO, 20, { soloAmigos: amigos }),
      C.miPosicion(ID, MODO).catch(() => null),
    ]).then(([lista, pos]) => {
      cache[clave] = { estado: 'ok', lista, pos, t: Date.now() };
      if (window.Panel) Panel.refrescar();
    }, (err) => {
      cache[clave] = { estado: 'error', lista: [], t: Date.now(), msg: (C.mensajeError ? C.mensajeError(err) : '') || 'Sin conexión' };
      if (window.Panel) Panel.refrescar();
    });
  }

  function filasRanking(clave) {
    if (!sesion()) return [{ t: 'info', texto: 'Inicia sesión para ver el ranking', valor: '' }];
    cargarRanking(clave);
    const e = cache[clave];
    const f = [{ t: 'boton', texto: 'Actualizar', color: '#7dff9a', accion: () => { cache[clave] = null; Panel.refrescar(); } }];
    if (!e || e.estado === 'carga') { f.push({ t: 'info', texto: 'Cargando ranking...', valor: '' }); return f; }
    if (e.estado === 'error') { f.push({ t: 'info', texto: 'No se pudo cargar: ' + e.msg, valor: '' }); return f; }
    if (e.pos && e.pos.posicion) f.push({ t: 'info', texto: `Tu posición: #${e.pos.posicion} de ${e.pos.total}`, valor: Util.dinero(e.pos.valor) });
    else f.push({ t: 'info', texto: 'Aún no tienes puntaje: junta dinero y vuelve', valor: '' });
    if (!e.lista.length) {
      f.push({ t: 'info', texto: clave === 'amigos' ? 'Ninguno de tus amigos ha jugado todavía' : 'Nadie ha puntuado todavía: sé el primero', valor: '' });
    }
    e.lista.forEach((j) => f.push({ t: 'boton', texto: `${j.pos}. ${j.yo ? '★ ' : ''}${j.nombre}`, precio: Util.dinero(j.valor), color: j.color || '#3df5ff', accion: nada }));
    return f;
  }

  // ----------------------------------------------------------- Panel de cuenta
  let confirmaSalir = 0;
  function filasCuenta() {
    const f = filasNube();
    if (!sesion()) return f;
    f.push({ t: 'titulo', texto: 'PLATAFORMA' });
    f.push({ t: 'boton', texto: 'Volver al portal', color: '#3df5ff', accion: () => volverAlPortal() });
    f.push({
      t: 'boton', texto: confirmaSalir ? '¿Seguro? Pulsa otra vez para cerrar sesión' : 'Cerrar sesión', peligro: true, accion: () => {
        if (!confirmaSalir) { confirmaSalir = 1; Panel.refrescar(); setTimeout(() => { confirmaSalir = 0; if (window.Panel) Panel.refrescar(); }, 4000); return; }
        cerrarSesion();
      },
    });
    return f;
  }

  function volverAlPortal() {
    try { if (window.J && J.modo !== 'titulo') J.guardarPartida(); } catch (e) { /* nada */ }
    enviarPuntaje();
    const ir = () => { location.href = C && C.portalUrl ? C.portalUrl() : '../'; };
    Promise.race([sincronizarAhora(), new Promise((ok) => setTimeout(ok, 2500))]).then(ir, ir);
  }

  function cerrarSesion() {
    try { if (window.J && J.modo !== 'titulo') J.guardarPartida(); } catch (e) { /* nada */ }
    enviarPuntaje();
    const fin = () => { Promise.resolve(C.salir()).then(() => location.reload(), () => location.reload()); };
    Promise.race([sincronizarAhora(), new Promise((ok) => setTimeout(ok, 2500))]).then(fin, fin);
  }

  function abrirPanel(pestana, alCerrar) {
    if (!window.Panel) return;
    const tabs = [
      { id: 'cuenta', nombre: 'CUENTA', filas: filasCuenta },
      { id: 'global', nombre: 'RANKING GLOBAL', filas: () => filasRanking('global') },
      { id: 'amigos', nombre: 'AMIGOS', filas: () => filasRanking('amigos') },
    ];
    Panel.abrir({
      titulo: sesion() ? C.usuario.nombre.toUpperCase() : 'CUENTA', pestanas: tabs,
      tab: Math.max(0, tabs.findIndex((t) => t.id === pestana)), alCerrar,
    });
  }

  function posicionTexto() {
    const e = cache.global;
    if (!e || e.estado !== 'ok') { if (sesion() && !e) cargarRanking('global'); return '—'; }
    return e.pos && e.pos.posicion ? '#' + e.pos.posicion + ' de ' + e.pos.total : '—';
  }

  window.CuentaJuego = {
    arrancar, filasNube, abrirPanel, sincronizarAhora, logro, xp, enviarPuntaje, posicionTexto,
    get usuario() { return sesion() ? C.usuario : null; },
    get sesion() { return sesion(); },
    CLAVES, MODO,
  };
})();
