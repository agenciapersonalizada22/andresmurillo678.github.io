/* Cuenta y nube de la plataforma (juego/comun/cuenta.js): perfil, logros, XP y sincronizacion de las notas con la nube.
   Notas guarda en IndexedDB, asi que NO usa Cuenta.nube.autoSincronizar (solo lee localStorage): serializa una instantanea JSON del almacen
   y la sincroniza con Cuenta.nube.cargar/guardar (gzip + trozos de 700 KB, maximo 8, los gestiona Cuenta).
   Fusion registro a registro y campo a campo por marca de tiempo (la mas reciente gana); los borrados viajan como lapidas (_del) y se
   purgan a los 90 dias. Las imagenes adjuntas muy grandes se quedan en este dispositivo. Sin sesion/Firebase todo sigue funcionando
   (modo demo local de la plataforma) y sin Cuenta la app funciona igual (sin nube). Nunca bloquea la app. */
(function (G) {
  'use strict';
  var ID = 'notas', C = G.Cuenta || null, N = G.Nube = {};
  var LAPIDA_MS = 90 * 86400000, MAX_REG = 300 * 1024, MAX_TOTAL = 4.2 * 1024 * 1024, CADA_MS = 60000;
  var E = { ocupado: false, t: 0, estado: '', hashNube: '', sucio: false, omitidos: 0, error: '', aplicados: 0, tope: false, iniciado: false };
  var oyentes = [], S = null, temp = 0;
  try { var g = JSON.parse(G.localStorage.getItem('notas_nube_estado')); if (g && g.t) E.t = g.t; } catch (e) {}

  var sesion = function () { return !!(C && C.usuario); };
  var nada = function () {};
  function emitir() { oyentes.slice().forEach(function (f) { try { f(); } catch (e) {} }); }
  N.alCambiar = function (f) { oyentes.push(f); return function () { var i = oyentes.indexOf(f); if (i >= 0) oyentes.splice(i, 1); }; };
  function hora(t) { try { return new Date(t).toLocaleString('es', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }); } catch (e) { return ''; } }

  /* ---------- texto de estado ---------- */
  N.texto = function () {
    if (!sesion()) return 'Sin cuenta: tus datos solo viven en este dispositivo.';
    if (E.ocupado) return 'Sincronizando…';
    var pend = C.pendientes ? C.pendientes() : 0, extra = pend ? ' · ' + pend + ' envío' + (pend === 1 ? '' : 's') + ' pendiente' + (pend === 1 ? '' : 's') : '';
    if (E.error) return E.error + extra;
    if (G.navigator.onLine === false || E.estado === 'sinRed') return 'Sin conexión' + (E.t ? ' · última sincronización ' + hora(E.t) : ' · aún no sincronizado') + extra;
    if (!E.t) return 'Aún no sincronizado' + extra;
    return 'Al día · última sincronización ' + hora(E.t) + (E.aplicados ? ' · ' + E.aplicados + ' cambio' + (E.aplicados === 1 ? '' : 's') + ' recibido' + (E.aplicados === 1 ? '' : 's') : '') + extra;
  };

  /* ---------- instantanea ---------- */
  function canon(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
  }
  function tsBorrado(r) { return r._m && r._m._del ? r._m._del[1] : 0; }
  /* instantanea de lo que cabe: sin lapidas viejas ni registros enormes (imagenes) */
  function instantanea(sinAdjuntos) {
    var vol = S.volcado(), cols = {}, omitidos = 0, total = 0, ahora = Date.now(), grandes = [];
    Object.keys(vol.cols).sort().forEach(function (c) {
      var l = [];
      vol.cols[c].forEach(function (r) {
        if (r._del && tsBorrado(r) < ahora - LAPIDA_MS) return;
        if (c === 'adjuntos' && !r._del) {
          if (sinAdjuntos) { omitidos++; return; }
          var tam = (r.url || '').length; if (tam > MAX_REG) { omitidos++; return; }
        }
        l.push(r);
      });
      l.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
      if (l.length) cols[c] = l;
    });
    var txt = canon({ app: 'notas', esquema: vol.esquema, cols: cols });
    total = txt.length;
    if (total > MAX_TOTAL && !sinAdjuntos) return instantanea(true);
    return { datos: { app: 'notas', esquema: vol.esquema, cols: cols, sitio: S.sitio, t: ahora }, canon: txt, omitidos: omitidos };
  }

  /* ---------- fusion ---------- */
  /* Ajusta un registro remoto para que aplicarRemoto lo resuelva por marca de tiempo (ms), no por reloj logico: gana lo mas reciente.
     Devuelve el registro a aplicar o null si no aporta nada. */
  function ajustar(loc, rem) {
    var rm = rem._m;
    if (!rm) return loc && !loc._del ? null : rem;
    var lm = loc ? loc._m : {}, nm = {}, out = { id: rem.id, _m: nm }, n = 0, k, maxLoc = 0, maxRem = 0, lam = S.lam + 1;
    for (k in lm) if (k !== '_del' && lm[k] && lm[k][1] > maxLoc) maxLoc = lm[k][1];
    var delLoc = loc && loc._del ? tsBorrado(loc) : 0;
    if (rem._del) {
      if (!rm._del) return null;
      if (loc && loc._del) return null;                        /* ya borrado aqui */
      if (loc && maxLoc >= rm._del[1]) return null;            /* se edito aqui despues del borrado remoto */
      out._del = true; nm._del = [lam, rm._del[1], rm._del[2]]; return out;
    }
    for (k in rm) {
      if (k === '_del') continue;
      var c = rm[k]; if (!c || !(k in rem)) continue;
      var l = lm[k];
      if (delLoc && c[1] <= delLoc) continue;                  /* borrado aqui despues de esta edicion */
      if (l && !(c[1] > l[1] || (c[1] === l[1] && c[2] > l[2]))) continue;
      out[k] = rem[k]; nm[k] = [lam, c[1], c[2]]; n++; if (c[1] > maxRem) maxRem = c[1];
    }
    if (!n) return null;
    if (loc && loc._del) nm._del = [lam, maxRem, ''];          /* revive: sin out._del, aplicarRemoto quita la lapida */
    return out;
  }
  function fusionarRemoto(rem) {
    var Mig = G.Migraciones, cont = 0;
    if (Mig && rem.esquema != null && rem.esquema > Mig.ESQUEMA) throw Object.assign(new Error('Los datos de la nube son de una versión más nueva de la app. Recarga la página.'), { codigo: 'version' });
    if (Mig && rem.esquema != null && rem.esquema < Mig.ESQUEMA) { rem = { esquema: rem.esquema, cols: rem.cols || {} }; Mig.migrar(rem); }
    Object.keys(rem.cols || {}).forEach(function (c) {
      var idx = {}; S.crudos(c).forEach(function (r) { idx[r.id] = r; });
      (rem.cols[c] || []).forEach(function (r) {
        if (!r || !r.id) return;
        var a = ajustar(idx[r.id], r); if (!a) return;
        if (S.aplicarRemoto(c, r.id, a, { origen: 'nube' }).length) cont++;
      });
    });
    return cont;
  }

  /* ---------- sincronizacion ---------- */
  async function guardarNube(inst) {
    try { return await C.nube.guardar(ID, inst.datos); }
    catch (e) {
      if (e && e.codigo === 'fuera_de_rango' && !inst.sinAdjuntos) { var i2 = instantanea(true); i2.sinAdjuntos = true; var r = await C.nube.guardar(ID, i2.datos); E.tope = true; E.omitidos = i2.omitidos; return r; }
      throw e;
    }
  }
  async function sincronizar(manual) {
    if (!S || !sesion() || !C.nube) return { estado: 'sinSesion' };
    if (E.ocupado) return { estado: 'ocupado' };
    if (G.navigator.onLine === false) { E.estado = 'sinRed'; emitir(); return { estado: 'sinRed' }; }
    E.ocupado = true; E.error = ''; emitir();
    var res = { estado: 'ok' };
    try {
      await S.vaciar();
      var nube = await C.nube.cargar(ID, { meta: true }), aplicados = 0;
      if (nube && nube.datos) {
        if (manual || nube.hash !== E.hashNube || E.sucio) aplicados = fusionarRemoto(nube.datos);
        E.hashNube = nube.hash;
      }
      E.sucio = false;
      var inst = instantanea(false), remoto = nube && nube.datos ? canon({ app: 'notas', esquema: nube.datos.esquema, cols: nube.datos.cols || {} }) : null;
      E.omitidos = inst.omitidos; E.tope = false;
      if (remoto !== inst.canon && (nube || Object.keys(inst.datos.cols).length)) {
        var r = await guardarNube(inst); if (r && r.hash) E.hashNube = r.hash; res.estado = 'subido';
        if (!nube) logro('en_la_nube');
      } else if (inst.omitidos) E.tope = true;
      E.aplicados = aplicados; E.estado = 'ok'; E.t = Date.now();
      try { G.localStorage.setItem('notas_nube_estado', JSON.stringify({ t: E.t })); } catch (e) {}
      if (aplicados && G.App) { G.App.titulos = null; try { G.App.lateral(true); } catch (e) {} }
      if (res.estado === 'ok' && nube) res.estado = aplicados ? 'bajado' : 'igual';
      if (nube || res.estado === 'subido') logro('en_la_nube');
    } catch (e) {
      if (e && e.codigo === 'sin_red') { E.estado = 'sinRed'; res.estado = 'sinRed'; }
      else { E.error = 'No se pudo sincronizar: ' + (C && C.mensajeError ? C.mensajeError(e) : (e && e.message) || 'error'); res.estado = 'error'; console.warn('Nube:', e); }
    }
    E.ocupado = false; emitir(); return res;
  }
  N.sincronizar = function () { return sincronizar(true); };
  function programar() { clearTimeout(temp); temp = setTimeout(function () { sincronizar(false); }, 7000); }

  /* ---------- logros y XP (moderados, con tope diario) ---------- */
  function hoyS() { return new Date().toISOString().slice(0, 10); }
  function logro(id) {
    if (!sesion() || !C.logro) return;
    try { if (C.logros(ID).indexOf(id) >= 0) return; } catch (e) {}
    C.logro(ID, id).catch(nada);
  }
  function xp(tipo, n, max) {
    if (!sesion() || !C.xp) return;
    var d = {}; try { d = JSON.parse(G.localStorage.getItem('notas_xp') || '{}'); } catch (e) {}
    if (d.f !== hoyS()) d = { f: hoyS(), n: {} };
    if ((d.n[tipo] || 0) >= max) return;
    d.n[tipo] = (d.n[tipo] || 0) + 1;
    try { G.localStorage.setItem('notas_xp', JSON.stringify(d)); } catch (e) {}
    C.xp(ID, n);
  }
  N.logro = logro;
  function alEvento(ev) {
    if (ev.origen === 'local') { E.sucio = true; if (sesion() && ev.col !== 'cambios') programar(); }
    if (ev.origen !== 'local' || !sesion()) return;
    var r = ev.rec, App = G.App;
    if (ev.col === 'tareas' && ev.campos.indexOf('estado') >= 0 && r.estado === 'hecha') {
      logro('primera_tarea'); xp('tarea', 5, 10);
      if (S.lista('tareas', function (t) { return t.estado === 'hecha'; }).length >= 25) logro('tareas_25');
    } else if (ev.col === 'notas' && ev.tipo === 'crear') {
      logro('primera_nota'); xp('nota', 3, 5);
    }
    if (ev.col === 'notas' && ev.campos.indexOf('cif') >= 0 && r.cif) logro('bloqueo');
    if (ev.col === 'notas' && ev.campos.indexOf('cuerpo') >= 0 && r.cuerpo && r.cuerpo.indexOf('[[') >= 0 && G.Md && G.Md.enlaces && App) {
      var hay = false; try { G.Md.enlaces(r.cuerpo).forEach(function (t) { var id = App.mdCtx.nota(t); if (id && id !== r.id) hay = true; }); } catch (e) {}
      if (hay) logro('nota_enlazada');
    }
    if (ev.col === 'checks' && ev.tipo !== 'borrar' && !r._del) {
      xp('habito', 4, 10);
      var hab = S.get('habitos', r.habito), T = G.Tareas;
      if (hab && T && T.habitos && T.habitos.rachas(hab, T.habitos.marcasDe(hab.id), G.Fechas.hoy()).actual >= 7) logro('racha_7');
    }
    if (ev.col === 'sesiones' && ev.tipo === 'crear' && r.tipo !== 'descanso') {
      if (r.tipo === 'pomodoro') xp('pomodoro', 10, 8);
      var min = 0; S.lista('sesiones', function (s) { return s.tipo !== 'descanso'; }).forEach(function (s) { min += s.dur || 0; });
      if (min >= 60) logro('enfoque_1h');
    }
  }

  /* ---------- perfil: nombre y color de la cuenta ---------- */
  function aplicarPerfil(u) {
    try {
      if (G.Red && G.Red.perfil) G.Red.perfil.guardar({ nombre: u.nombre, color: u.color });
      else G.localStorage.setItem('juego_perfil', JSON.stringify({ nombre: String(u.nombre).slice(0, 16), color: u.color }));
    } catch (e) {}
  }

  /* ---------- UI: entrada lateral y bloque "Cuenta y nube" ---------- */
  function irPortal() { try { G.location.href = C && C.portalUrl ? C.portalUrl() : '../../juego/'; } catch (e) { G.location.href = '../../juego/'; } }
  function cerrarSesion() {
    var UI = G.UI;
    UI.confirmar('Cerrar sesión', 'Tus datos quedan en este dispositivo y en tu cuenta. Podrás volver a entrar cuando quieras.', function () {
      (S ? S.vaciar() : Promise.resolve()).then(function () { return sincronizar(true); }).catch(nada).then(function () { return C.salir(); }).catch(nada).then(irPortal);
    }, { txt: 'Cerrar sesión' });
  }
  N.entradaLateral = function () {
    var h = G.UI.h, UI = G.UI, u = C && C.usuario;
    if (!C) return null;
    if (!u) return h('button', { type: 'button', cls: 'nav', 'data-f': 1, 'data-k': 'cuenta', on: { click: irPortal } }, [UI.icono('home'), h('span', { cls: 'txt', txt: 'Iniciar sesión' })]);
    var b = h('button', { type: 'button', cls: 'nav cuenta-nav', 'data-f': 1, 'data-k': 'cuenta', 'aria-haspopup': 'menu', 'aria-label': 'Cuenta de ' + u.nombre, on: { click: function (e) {
      UI.menu(e.currentTarget, [{ titulo: u.nombre + (C.demo ? ' · modo demo' : '') },
        { txt: 'Cuenta y nube', fn: function () { G.App.ir('ajustes', ''); setTimeout(function () { if (G.VistaAjustes && G.VistaAjustes.irA) G.VistaAjustes.irA('datos'); }, 0); } },
        { txt: 'Sincronizar ahora', fn: function () { N.sincronizar().then(function (r) { UI.aviso(r.estado === 'sinRed' ? 'Sin conexión: se sincronizará al volver.' : r.estado === 'error' ? E.error : 'Sincronizado', { tipo: r.estado === 'error' ? 'error' : 'ok' }); }); } },
        { txt: 'Volver al portal', fn: irPortal }, { txt: 'Cerrar sesión', fn: cerrarSesion }]);
    } } }, [h('span', { cls: 'punto', style: 'background:' + (u.color || 'var(--acento)') }), h('span', { cls: 'txt', txt: u.nombre }), h('small', { cls: 'cuenta-est', txt: C.demo ? 'demo' : 'cuenta' })]);
    return b;
  };
  N.bloque = function () {
    var h = G.UI.h, UI = G.UI, u = C && C.usuario, cont = h('div', { cls: 'bloque', style: 'margin:14px' }), off = null;
    function pintar() {
      cont.textContent = '';
      cont.appendChild(h('b', { txt: 'Cuenta y nube' }));
      if (!C) { cont.appendChild(h('p', { cls: 'ayuda', txt: 'La plataforma de cuentas no se cargó: los datos siguen guardándose en este dispositivo.' })); return; }
      if (!u) { cont.appendChild(h('p', { cls: 'ayuda', txt: 'Sin sesión. Inicia sesión desde el portal para sincronizar tus notas entre dispositivos.' })); cont.appendChild(UI.boton('Ir al portal', irPortal)); return; }
      cont.appendChild(h('div', { cls: 'fila', style: 'align-items:center;gap:10px;margin:6px 0' }, [
        C.ui && C.ui.avatarEl ? C.ui.avatarEl(u.avatar, u.color, 36) : h('span', { cls: 'punto', style: 'background:' + u.color }),
        h('div', {}, [h('b', { txt: u.nombre }), h('small', { style: 'display:block;color:var(--suave)', txt: (C.demo ? 'Modo demo: tu cuenta vive solo en este navegador · ' : '') + 'Nivel ' + (u.nivel || 1) + ' · ' + (u.xp || 0) + ' XP' })])]));
      cont.appendChild(h('p', { cls: 'ayuda', role: 'status', 'data-nube-estado': 1, txt: N.texto() }));
      if (C.demo) cont.appendChild(h('p', { cls: 'ayuda', txt: 'En modo demo la «nube» es local: sirve para probar, pero no llega a otros dispositivos.' }));
      if (E.omitidos) cont.appendChild(h('p', { cls: 'ayuda', style: 'color:var(--aviso,#b7791f)', txt: E.omitidos + ' imagen' + (E.omitidos === 1 ? '' : 'es') + ' adjunta' + (E.omitidos === 1 ? '' : 's') + ' es' + (E.omitidos === 1 ? '' : 'tán') + ' demasiado grande' + (E.omitidos === 1 ? '' : 's') + ' para la nube (máx. ~300 KB cada una) y se quedan solo en este dispositivo.' }));
      cont.appendChild(h('div', { cls: 'fila', style: 'flex-wrap:wrap;gap:8px' }, [
        UI.boton('Sincronizar ahora', function () { N.sincronizar().then(function (r) { if (r.estado === 'sinRed') UI.aviso('Sin conexión: se sincronizará al volver.'); else if (r.estado === 'error') UI.aviso(E.error, { tipo: 'error' }); else UI.aviso('Sincronizado', { tipo: 'ok' }); }); }, { cls: 'prim' }),
        UI.boton('Volver al portal', irPortal), UI.boton('Cerrar sesión', cerrarSesion, { cls: 'peligro' })]));
      cont.appendChild(h('p', { cls: 'ayuda', txt: 'Las notas, tareas, hábitos y sesiones se fusionan registro a registro: gana el cambio más reciente de cada campo y los borrados también se propagan, sin diálogos de conflicto. Los ajustes de apariencia, avisos y mando no se sincronizan (son de cada dispositivo).' }));
    }
    off = N.alCambiar(function () { if (!cont.isConnected) { if (off) off(); off = null; return; } var s = cont.querySelector('[data-nube-estado]'); if (s) s.textContent = N.texto(); else pintar(); });
    pintar(); return cont;
  };

  /* ---------- arranque ---------- */
  N.requerir = function () {
    if (!C) return Promise.resolve(null);
    try { if (C.ui) C.ui.mandoPropio = true; } catch (e) {}
    return C.requerir().then(function (u) { try { if (C.ui) C.ui.mandoPropio = false; } catch (e) {} if (u) aplicarPerfil(u); return u; }, function (e) { console.warn('Cuenta:', e); try { if (C.ui) C.ui.mandoPropio = false; } catch (e2) {} return null; });
  };
  N.iniciar = function (store) {
    S = store; if (E.iniciado) return; E.iniciado = true;
    S.suscribir(alEvento);
    if (!C) return;
    function reintentar() { if (sesion()) sincronizar(false); }
    G.addEventListener('online', function () { setTimeout(reintentar, 800); });
    G.document.addEventListener('visibilitychange', function () { if (G.document.hidden && E.sucio) reintentar(); });
    setInterval(reintentar, CADA_MS);
    if (C.alCambiar) C.alCambiar(function (u) { if (u) aplicarPerfil(u); try { G.App.lateral(true); } catch (e) {} });
    if (C.on) C.on('cola', function () { emitir(); });
    if (sesion()) { E.sucio = true; sincronizar(false); }
    if (G.Red && G.Red.on) { var ver = function () { try { if (sesion() && G.Colab && G.Colab.activo() && G.Red.cuantos() >= 2) logro('colaborador'); } catch (e) {} }; G.Red.on('jugadores', ver); G.Red.on('conectado', ver); }
  };
  N._ajustar = ajustar; N._estado = E;
})(window);
