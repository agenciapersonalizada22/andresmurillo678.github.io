/* Cuenta y nube de la seccion Trabajos (QR, dispositivos, drones, etc.). Script clasico: window.CuentaTrabajos.
   Requiere (antes): firebase-config.js, plataforma/juegos.js, cuenta.js, amigos.js y cuenta.css de juego/.
   - Protege la pagina con Cuenta.requerir() (la oculta hasta resolver). Funciona en modo demo local (sin Firebase).
   - Sincronizacion: instantanea JSON con marca de tiempo por registro y fusion por el mas reciente,
     usando Cuenta.nube.cargar/guardar (autoSincronizar/sincronizar solo manejan claves de localStorage y resuelven conflictos
     con un dialogo de "todo o nada", no por registro; por eso no se usan). Tope ~900 KB por documento.
   - La clave de IA del usuario (<id>_claves_dispositivo) y los ajustes del dispositivo NUNCA se sincronizan.
   - Los archivos pesados (imagenes, video, modelos) se quedan en este dispositivo. */
(function (g) {
  'use strict';
  var CC = g.CuentaTrabajos = { LIMITE: 900000, INTERVALO: 180000 };
  var cfg = null, ocupado = false, aplicando = false, tDeb = 0, tInt = 0, oyentes = [], dialogo = null, chips = [];
  var E = CC.estado = { fase: 'inicio', ultima: 0, error: '', omitidos: 0, bytes: 0, pendiente: 0 };

  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function escribir(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function json(k, def) { try { return JSON.parse(leer(k) || '') || def; } catch (e) { return def; } }
  function h(tag, p, kids) {
    var e = document.createElement(tag);
    for (var k in p || {}) { if (k === 'cls') e.className = p[k]; else if (k === 'txt') e.textContent = p[k]; else if (k === 'on') { for (var ev in p.on) e.addEventListener(ev, p.on[ev]); } else e.setAttribute(k, p[k]); }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function usuario() { return g.Cuenta && g.Cuenta.usuario || null; }
  function avisar() { oyentes.forEach(function (f) { try { f(E); } catch (e) {} }); }
  CC.alCambiar = function (f) { oyentes.push(f); return function () { oyentes = oyentes.filter(function (x) { return x !== f; }); }; };

  /* ---------- acceso ---------- */
  CC.proteger = function () {
    var raiz = document.documentElement, visto = false;
    function fin() { if (visto) return; visto = true; raiz.style.visibility = ''; }
    if (!g.Cuenta || !g.Cuenta.requerir) { fin(); return Promise.resolve(null); }
    raiz.style.visibility = 'hidden';
    setTimeout(fin, 10000);   // si la plataforma no responde, la pagina no se queda en blanco
    return g.Cuenta.requerir().then(function (u) { fin(); return u; }, function () { fin(); return null; });
  };
  CC.listo = CC.proteger();

  /* ---------- instantanea con marcas de tiempo ---------- */
  var PROHIBIDAS = /^(clave|claves|apikey|api_key|token|secret|password|contrasena|contraseña)$/i;
  function limpiar(v) { try { return JSON.parse(JSON.stringify(v, function (k, x) { return PROHIBIDAS.test(k) ? undefined : x; })); } catch (e) { return null; } }
  function bytes(s) { try { return new TextEncoder().encode(s).length; } catch (e) { return s.length * 2; } }
  function lapidas() { return json(cfg.id + '_nube_lapidas', {}); }
  function guardarLapidas(l) { var lim = Date.now() - 60 * 864e5; Object.keys(l).forEach(function (k) { if (l[k] < lim) delete l[k]; }); escribir(cfg.id + '_nube_lapidas', JSON.stringify(l)); }
  async function locales() {
    var regs = await cfg.alm.volcar(), m = {}, lap = lapidas();
    regs.forEach(function (r) { if (cfg.cols.indexOf(r.col) < 0) return; m[r.col + '/' + r.id] = { k: r.col + '/' + r.id, t: r.t || 0, v: limpiar(r.v) }; });
    Object.keys(lap).forEach(function (k) { if (cfg.cols.indexOf(k.split('/')[0]) < 0) return; if (!m[k] || m[k].t < lap[k]) m[k] = { k: k, t: lap[k], d: 1 }; });
    return m;
  }
  /* Recorta por tamano: primero las lapidas y luego lo mas reciente; lo que no cabe se queda solo en este dispositivo. */
  CC.empaquetar = function (mapa, limite) {
    limite = limite || CC.LIMITE;
    var l = Object.keys(mapa).map(function (k) { return mapa[k]; }).sort(function (a, b) { return (b.d ? 1 : 0) - (a.d ? 1 : 0) || b.t - a.t || (a.k < b.k ? -1 : 1); });
    var sal = [], total = 200, omit = 0;
    l.forEach(function (r) { var n = bytes(JSON.stringify(r)) + 1; if (r.d || total + n <= limite) { sal.push(r); total += n; } else omit++; });
    return { recs: sal, bytes: total, omitidos: omit };
  };
  CC.fusionar = function (a, b) {   // mapas k -> registro; gana la marca de tiempo mayor (empate: lo local)
    var m = {}; Object.keys(a).forEach(function (k) { m[k] = a[k]; });
    Object.keys(b).forEach(function (k) { if (!m[k] || b[k].t > m[k].t) m[k] = b[k]; });
    return m;
  };
  function aMapa(recs) { var m = {}; (recs || []).forEach(function (r) { if (r && typeof r.k === 'string' && typeof r.t === 'number' && cfg.cols.indexOf(r.k.split('/')[0]) >= 0) m[r.k] = r; }); return m; }
  function canon(mapa) { return JSON.stringify(Object.keys(mapa).sort().map(function (k) { return mapa[k]; })); }
  async function aplicar(mapaNube) {   // escribe en el almacen lo que la nube tiene mas reciente
    var regs = await cfg.alm.volcar(), loc = {}, lap = lapidas(), rest = [], bor = [], cambios = 0;
    regs.forEach(function (r) { loc[r.col + '/' + r.id] = r; });
    Object.keys(mapaNube).forEach(function (k) {
      var r = mapaNube[k], l = loc[k], tL = Math.max(l ? l.t || 0 : 0, lap[k] || 0);
      if (r.t <= tL) return;
      var col = k.split('/')[0], id = k.slice(col.length + 1);
      if (r.d) { if (l) { bor.push([col, id]); cambios++; } lap[k] = r.t; }
      else if (r.v && typeof r.v === 'object') { rest.push({ k: k, col: col, id: id, t: r.t, v: r.v }); delete lap[k]; cambios++; }
    });
    if (!rest.length && !bor.length) { guardarLapidas(lap); return 0; }
    aplicando = true;
    try { if (rest.length) await cfg.alm.restaurar(rest); for (var i = 0; i < bor.length; i++) await cfg.alm.borrar(bor[i][0], bor[i][1]); }
    finally { aplicando = false; }
    guardarLapidas(lap);
    return cambios;
  }

  /* ---------- sincronizacion ---------- */
  CC.sincronizar = async function () {
    if (!cfg || !cfg.alm || ocupado) return E;
    if (!usuario()) { E.fase = 'sinSesion'; avisar(); return E; }
    ocupado = true; E.fase = 'sincronizando'; E.error = ''; avisar();
    try {
      await cfg.alm.listo;
      var nube = null;
      try { nube = await g.Cuenta.nube.cargar(cfg.id, { meta: true }); }
      catch (e) { if (e && e.codigo === 'sin_red') { E.fase = 'sinRed'; return E; } throw e; }
      var recsNube = nube && nube.datos && nube.datos.recs, mNube = aMapa(recsNube);
      var cambios = await aplicar(mNube);
      var emp = CC.empaquetar(await locales()); E.omitidos = emp.omitidos; E.bytes = emp.bytes;
      if (canon(aMapa(emp.recs)) !== canon(mNube)) {
        var r = await g.Cuenta.nube.guardar(cfg.id, { v: 1, t: Date.now(), recs: emp.recs });
        E.pendiente = r && r.pendiente ? 1 : 0;
      } else E.pendiente = 0;
      E.fase = E.pendiente ? 'pendiente' : 'ok'; E.ultima = Date.now();
      escribir(cfg.id + '_nube_ultima_' + usuario().uid, String(E.ultima));
      if (cambios && cfg.alAplicar) { try { cfg.alAplicar(cambios); } catch (e) { console.warn(e); } }
    } catch (e) {
      E.fase = 'error'; E.error = (g.Cuenta && g.Cuenta.mensajeError ? g.Cuenta.mensajeError(e) : e.message) || 'No se pudo sincronizar.';
    } finally { ocupado = false; avisar(); }
    return E;
  };
  function programar(ms) { clearTimeout(tDeb); tDeb = setTimeout(function () { CC.sincronizar(); }, ms || 6000); }
  function arrancarSync() {
    if (!cfg.sync || !cfg.alm) return;
    cfg.alm.suscribir(null, function (col, id, tipo) {
      if (aplicando || !col || cfg.cols.indexOf(col) < 0) return;
      var l = lapidas(), k = col + '/' + id;
      if (tipo === 'del') l[k] = Date.now(); else delete l[k];
      guardarLapidas(l);
      if (usuario()) { E.fase = E.fase === 'sinRed' ? 'sinRed' : 'pendiente'; avisar(); programar(); }
    });
    clearInterval(tInt); tInt = setInterval(function () { if (document.visibilityState !== 'hidden') CC.sincronizar(); }, CC.INTERVALO);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') CC.sincronizar(); });
    addEventListener('online', function () { setTimeout(CC.sincronizar, 800); });
    if (g.Cuenta && g.Cuenta.on) { g.Cuenta.on('cola', function (n) { if (E.fase === 'pendiente' && !n) { E.fase = 'ok'; E.pendiente = 0; avisar(); } }); }
    var u = usuario(); if (u) E.ultima = +leer(cfg.id + '_nube_ultima_' + u.uid) || 0;
    CC.sincronizar();
  }

  CC.logro = function (id) {   // una vez por logro (lo controla Cuenta); nunca bloquea ni lanza
    try { if (cfg && usuario() && g.Cuenta.logro) { var p = g.Cuenta.logro(cfg.id, id); if (p && p.catch) p.catch(function () {}); } } catch (e) {}
  };

  /* ---------- XP moderada (tope diario, nunca por tiempo de uso) ---------- */
  CC.xp = function (n) {
    try {
      if (!cfg || !usuario() || !g.Cuenta.xp) return;
      var hoy = new Date().toISOString().slice(0, 10), k = cfg.id + '_xp_dia', d = json(k, {}), ahora = Date.now();
      if (d.f !== hoy) d = { f: hoy, n: 0, t: 0 };
      if (ahora - d.t < 15000 || d.n + n > 60) return;
      d.n += n; d.t = ahora; escribir(k, JSON.stringify(d));
      g.Cuenta.xp(cfg.id, n).catch(function () {});
    } catch (e) {}
  };

  /* ---------- interfaz ---------- */
  function hace(t) { var s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 45 ? 'hace unos segundos' : s < 3600 ? 'hace ' + Math.round(s / 60) + ' min' : s < 86400 ? 'hace ' + Math.round(s / 3600) + ' h' : 'hace ' + Math.round(s / 86400) + ' d'; }
  function textoEstado() {
    if (!cfg.sync) return ['local', 'Esta herramienta guarda tus ' + (cfg.nombreLocal || 'proyectos') + ' solo en este dispositivo. ' + (cfg.avisoLocal || 'Los archivos son pesados y no se suben a la nube.')];
    var n = (g.Cuenta && g.Cuenta.pendientes ? g.Cuenta.pendientes() : 0);
    if (E.fase === 'sincronizando') return ['sincronizando', 'Sincronizando…'];
    if (E.fase === 'sinRed') return ['sinRed', 'Sin conexión: tus cambios quedan guardados aquí y se subirán al volver la red.'];
    if (E.fase === 'error') return ['error', 'No se pudo sincronizar: ' + E.error + ' (tus datos locales están a salvo).'];
    if (E.fase === 'pendiente') return ['pendiente', 'Cambios pendientes de subir' + (n ? ' (' + n + ' en cola)' : '') + '.'];
    if (E.fase === 'ok') return ['ok', 'Sincronizado ' + hace(E.ultima) + '.'];
    return ['inicio', E.ultima ? 'Última sincronización ' + hace(E.ultima) + '.' : 'Aún sin sincronizar.'];
  }
  CC.bloque = function (cont) {
    var u = usuario();
    var raiz = h('section', { cls: 'cc-bloque', 'aria-label': 'Cuenta y nube' });
    function pintar() {
      u = usuario(); raiz.textContent = '';
      raiz.appendChild(h('h3', { txt: 'Cuenta y nube' }));
      if (!u) { raiz.appendChild(h('p', { txt: 'No has iniciado sesión.' })); raiz.appendChild(h('div', { cls: 'cc-acciones' }, [h('a', { cls: 'cc-btn cc-pri', href: g.Cuenta ? g.Cuenta.portalUrl() : '../../../juego/', txt: 'Ir al portal para entrar' })])); return; }
      var av = g.Cuenta.ui && g.Cuenta.ui.avatarEl ? g.Cuenta.ui.avatarEl(u.avatar, u.color, 44) : null;
      raiz.appendChild(h('div', { cls: 'cc-usuario' }, [av, h('div', {}, [h('b', { txt: u.nombre || u.usuario }), h('span', { cls: 'cc-sub', txt: '@' + u.usuario + (u.nivel ? ' · nivel ' + u.nivel : '') + (g.Cuenta.demo ? ' · modo demo (solo este dispositivo)' : '') })])]));
      var t = textoEstado();
      raiz.appendChild(h('div', { cls: 'cc-estado', 'data-fase': t[0], role: 'status', 'aria-live': 'polite' }, [t[1]]));
      if (cfg.sync) {
        if (E.omitidos) raiz.appendChild(h('p', { cls: 'cc-sub', txt: 'Aviso: ' + E.omitidos + ' elemento(s) antiguo(s) no caben en el límite de la nube (~900 KB) y se quedan solo en este dispositivo.' }));
        raiz.appendChild(h('p', { cls: 'cc-sub', txt: 'Se sincroniza: ' + cfg.etiqueta + '. Si dos dispositivos editan lo mismo se conserva la versión más reciente de cada elemento (sin diálogos). Tus claves de API (<id>_claves_dispositivo) y los ajustes de este dispositivo nunca se suben.' }));
      } else raiz.appendChild(h('p', { cls: 'cc-sub', txt: 'Tu cuenta sí suma experiencia y aparece en el portal; solo los archivos pesados no viajan. Exportalos para respaldarlos o moverlos a otro dispositivo.' }));
      var acc = h('div', { cls: 'cc-acciones' });
      if (cfg.sync) acc.appendChild(h('button', { cls: 'cc-btn cc-pri', type: 'button', id: 'cc-sync', txt: 'Sincronizar ahora', on: { click: function () { this.disabled = true; CC.sincronizar(); } } }));
      acc.appendChild(h('a', { cls: 'cc-btn', href: g.Cuenta.portalUrl(), txt: 'Ir al portal' }));
      acc.appendChild(h('button', { cls: 'cc-btn', type: 'button', id: 'cc-salir', txt: 'Cerrar sesión', on: { click: function () { g.Cuenta.salir().then(function () { location.reload(); }, function () { location.reload(); }); } } }));
      raiz.appendChild(acc);
      var b = raiz.querySelector('#cc-sync'); if (b) b.disabled = E.fase === 'sincronizando';
    }
    pintar();
    var quitar = CC.alCambiar(function () { if (!raiz.isConnected) { quitar(); return; } pintar(); });
    var q2 = g.Cuenta && g.Cuenta.alCambiar ? g.Cuenta.alCambiar(function () { if (raiz.isConnected) pintar(); }) : null;
    if (cont) cont.appendChild(raiz);
    return raiz;
  };
  CC.dialogo = function () {
    if (!dialogo) {
      dialogo = h('dialog', { cls: 'cc-dlg', 'aria-label': 'Cuenta y nube' });
      document.body.appendChild(dialogo);
      dialogo.addEventListener('click', function (e) { if (e.target === dialogo) dialogo.close(); });
    }
    dialogo.textContent = '';
    CC.bloque(dialogo);
    dialogo.appendChild(h('div', { cls: 'cc-acciones', style: 'padding:0 1rem 1rem' }, [h('button', { cls: 'cc-btn', type: 'button', id: 'cc-cerrar', txt: 'Cerrar', on: { click: function () { dialogo.close(); } } })]));
    if (dialogo.showModal) { if (!dialogo.open) dialogo.showModal(); } else dialogo.setAttribute('open', '');
    var b = dialogo.querySelector('#cc-cerrar'); if (b) b.focus();
  };
  CC.chip = function (donde, antesDe) {
    var b = h('button', { cls: 'cc-chip', type: 'button', 'aria-label': 'Cuenta y nube', title: 'Cuenta y nube', on: { click: CC.dialogo } });
    function pintar() {
      var u = usuario(); b.textContent = '';
      if (!u) { b.appendChild(h('span', { cls: 'cc-nom', txt: 'Entrar' })); b.setAttribute('data-fase', 'sinSesion'); return; }
      if (g.Cuenta.ui && g.Cuenta.ui.avatarEl) b.appendChild(g.Cuenta.ui.avatarEl(u.avatar, u.color, 26));
      b.appendChild(h('span', { cls: 'cc-nom', txt: u.nombre || u.usuario })); b.appendChild(h('span', { cls: 'cc-pto', 'aria-hidden': 'true' }));
      b.setAttribute('data-fase', cfg && cfg.sync ? E.fase : 'local'); b.setAttribute('aria-label', 'Cuenta de ' + (u.nombre || u.usuario) + ': abrir Cuenta y nube');
    }
    pintar(); CC.alCambiar(pintar); if (g.Cuenta && g.Cuenta.alCambiar) g.Cuenta.alCambiar(pintar);
    if (antesDe && antesDe.parentNode) antesDe.parentNode.insertBefore(b, antesDe); else if (donde) donde.appendChild(b);
    return b;
  };

  /* integrar({id, alm, cols, etiqueta, sync, alAplicar, nombreLocal, avisoLocal}) */
  CC.integrar = function (o) {
    cfg = { id: o.id, alm: o.alm, cols: (o.cols || []).filter(function (c) { return !/claves|apikey|token|secret/i.test(c); }), etiqueta: o.etiqueta || '', sync: !!o.sync && !!o.alm, alAplicar: o.alAplicar, nombreLocal: o.nombreLocal, avisoLocal: o.avisoLocal };
    CC.listo.then(function (u) {
      if (!u || !g.Cuenta) { E.fase = 'sinSesion'; avisar(); return; }
      if (cfg.sync) arrancarSync();
      if (g.Cuenta.alCambiar) g.Cuenta.alCambiar(function (nu) { if (!nu) { E.fase = 'sinSesion'; avisar(); } else if (cfg.sync) CC.sincronizar(); });
    });
    return CC;
  };
})(window);
