/* Integracion con la plataforma de cuentas (comun/cuenta.js): sesion, nube, puntajes, logros, XP y ranking.
   Todo es tolerante a fallos: sin Cuenta, sin sesion o sin red el juego sigue funcionando igual. */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, A = S.Almacen, h = S.h, btn = S.btn, Cta = S.Cta = {};
  var ID = 'serpientes', CLAVES = [A.CL.prog];   /* ajustes de audio/accesibilidad/dispositivo NO viajan (politica de la plataforma) */
  var MODOS = { ffa: 'ffa_longitud', equipos: 'equipos_longitud', superv: 'superv_tiempo', rey: 'rey_zona' };
  var UNIDAD = { ffa_longitud: '', equipos_longitud: '', superv_tiempo: ' s', rey_zona: ' s' };
  var TOPES = { ffa_longitud: 100000, equipos_longitud: 100000, superv_tiempo: 7200, rey_zona: 7200 };
  var sync = null, estado = { ultima: 0, res: '', error: false }, alRecargar = null, oyentes = [];
  function C() { return G.Cuenta || null; }
  function noop() {}
  function usuario() { var c = C(); return c && c.usuario ? c.usuario : null; }
  function seguro(f) { try { var p = f(); if (p && p.catch) p.catch(noop); return p; } catch (e) { return null; } }

  Cta.activa = function () { return !!C(); };
  Cta.usuario = usuario;
  Cta.nombre = function () { var u = usuario(); return u ? u.nombre : (G.Red ? G.Red.perfil.obtener().nombre : 'Jugador'); };
  Cta.alRecargar = function (f) { alRecargar = f; };

  /* ---------- perfil: la cuenta manda sobre juego_perfil (nombre y color que usa el multijugador) ---------- */
  Cta.perfil = function () {
    var u = usuario(); if (!u || !G.Red) return false;
    var p = G.Red.perfil.obtener();
    if (p.nombre !== String(u.nombre).slice(0, 16) || (u.color && p.color !== String(u.color).toLowerCase())) { G.Red.perfil.guardar({ nombre: u.nombre, color: u.color || p.color }); return true; }
    return false;
  };

  /* ---------- arranque: exige sesion, espera a iniciar() y sincroniza el guardado ---------- */
  Cta.arrancar = function (espera) {
    var c = C(); if (!c) return Promise.resolve(null);
    return Promise.resolve().then(function () { return c.requerir(); }).then(function (u) {
      A.recargar(); Cta.perfil();
      if (!u) return u;
      c.on('perfil', function () { if (Cta.perfil() && Cta.alPerfil) Cta.alPerfil(); });
      c.on('sincronizado', function (j, res) {
        if (j !== ID) return;
        estado.ultima = Date.now(); estado.res = res && res.estado || ''; estado.error = false;
        if (res && res.estado === 'bajado') { A.recargar(); if (alRecargar) alRecargar(); }
        avisar();
      });
      c.on('cola', avisar);
      G.addEventListener('online', avisar); G.addEventListener('offline', avisar);
      sync = c.nube.autoSincronizar(ID, CLAVES, {});
      var limite = new Promise(function (r) { setTimeout(r, espera || 3500); });
      return Promise.race([sync.primera.catch(function () { estado.error = true; }), limite]).then(function () { A.recargar(); backfillLogros(); return u; });
    }).catch(function (e) { console.warn('Cuenta no disponible:', e); return null; });
  };
  function avisar() { oyentes = oyentes.filter(function (f) { return f.el.isConnected; }); oyentes.forEach(function (f) { f.fn(); }); }
  function backfillLogros() { Object.keys(A.prog.logros || {}).forEach(function (id) { Cta.logro(id); }); }

  /* ---------- logros, XP y puntajes ---------- */
  Cta.logro = function (id) { var c = C(); if (c && usuario()) seguro(function () { return c.logro(ID, id); }); };
  Cta.xp = function (n) { var c = C(); n = Math.max(0, Math.min(50, Math.floor(n))); if (c && usuario() && n) seguro(function () { return c.xp(ID, n); }); };
  Cta.puntaje = function (modo, valor) {
    var c = C(); valor = Math.floor(+valor || 0);
    if (!c || !usuario() || !MODOS[modo] && !TOPES[modo]) return Promise.resolve(null);
    var m = MODOS[modo] || modo; valor = Math.min(valor, TOPES[m]);
    if (valor < 1) return Promise.resolve(null);
    return Promise.resolve().then(function () { return c.puntaje(ID, m, valor); }).catch(function (e) { console.warn('Puntaje no enviado', e && e.codigo); return null; });
  };
  /* fin de vida: e = serpiente.est (maxMasa, vivo, zona, kills); gano = ronda ganada. Devuelve la promesa del envio. */
  Cta.vida = function (modo, e, gano) {
    var val = modo === 'superv' ? e.vivo : modo === 'rey' ? (e.zona || 0) : e.maxMasa;
    Cta.xp(5 + Math.min(20, (e.kills || 0) * 3) + Math.min(10, Math.floor((e.maxMasa || 0) / 100)) + (gano ? 15 : 0));
    return Cta.puntaje(modo, val);
  };

  /* ---------- ranking (Global / Amigos) con estados de carga, vacio y error ---------- */
  Cta.rankingEl = function (modo, opts) {
    opts = opts || {}; var m = MODOS[modo] || modo, n = opts.n || 8, amigos = false, tok = 0, c = C();
    var caja = h('div', { cls: 'rank' }), lista = h('div', { cls: 'rank-l', 'aria-live': 'polite' }), pos = h('div', { cls: 'nota rank-p' });
    if (!c || !usuario()) { caja.appendChild(h('div', { cls: 'nota', txt: 'Inicia sesión en tu cuenta para ver la clasificación.' })); return { el: caja, recargar: noop }; }
    var tabs = h('div', { cls: 'pills', role: 'tablist', 'aria-label': 'Clasificación' });
    function pestana(txt, am) {
      return h('button', { type: 'button', cls: 'pill' + (amigos === am ? ' sel' : ''), role: 'tab', 'aria-selected': String(amigos === am), 'data-f': 1, txt: txt, on: { click: function () { if (amigos !== am) { amigos = am; pintarTabs(); cargar(); } } } });
    }
    function pintarTabs() { tabs.textContent = ''; tabs.appendChild(pestana('Global', false)); tabs.appendChild(pestana('Amigos', true)); }
    function mensaje(t, reintentar) {
      lista.textContent = ''; lista.appendChild(h('div', { cls: 'nota', txt: t }));
      if (reintentar) lista.appendChild(btn('Reintentar', cargar, 'peq'));
    }
    function cargar(espera) {
      var mi = ++tok; mensaje('Cargando clasificación…'); pos.textContent = '';
      Promise.resolve(espera).catch(noop).then(function () { return Promise.all([c.top(ID, m, n, { soloAmigos: amigos }), c.miPosicion(ID, m).catch(function () { return null; })]); }).then(function (r) {
        if (mi !== tok) return;
        var top = r[0] || [], mp = r[1]; lista.textContent = '';
        if (!top.length) mensaje(amigos ? 'Ni tú ni tus amigos tenéis puntajes todavía.' : 'Aún no hay puntajes. ¡Sé el primero!');
        else top.forEach(function (e) {
          lista.appendChild(h('div', { cls: 'rk' + (e.yo ? ' yo' : '') }, [h('span', { cls: 'rp', txt: '#' + e.pos }), h('span', { cls: 'rn', txt: e.nombre, style: e.color ? 'color:' + e.color : false }), h('b', { txt: S.fmt(e.valor) + (UNIDAD[m] || '') })]));
        });
        if (mp && mp.posicion) pos.textContent = 'Tu posición: #' + mp.posicion + ' de ' + mp.total + ' · tu mejor: ' + S.fmt(mp.valor) + (UNIDAD[m] || '');
      }).catch(function () { if (mi === tok) mensaje('No se pudo cargar la clasificación (¿sin conexión?).', true); });
    }
    pintarTabs(); caja.appendChild(tabs); caja.appendChild(lista); caja.appendChild(pos);
    cargar(opts.espera);
    return { el: caja, recargar: cargar };
  };
  Cta.MODOS = MODOS;

  /* ---------- UI: acceso a la cuenta (menu) y bloque de Ajustes > Datos ---------- */
  Cta.chip = function (abrir) {
    var u = usuario(), c = C();
    if (!u || !c) return null;
    var av = c.ui && c.ui.avatarEl ? c.ui.avatarEl(u.avatar, u.color, 34) : null;
    return h('div', { cls: 'cuenta-chip' }, [av, h('div', { cls: 'cc-d' }, [h('b', { txt: u.nombre, style: u.color ? 'color:' + u.color : false }), h('span', { txt: 'Nivel ' + (u.nivel || 1) + (c.demo ? ' · modo demo' : '') })]), btn('Cuenta', abrir, 'peq sec')]);
  };
  Cta.cerrarSesion = function () {
    var c = C(); if (!c) return;
    seguro(function () { return sync && sync.ahora(); });
    Promise.resolve().then(function () { return c.salir(); }).catch(noop).then(function () { G.location.replace(c.portalUrl()); });
  };
  Cta.estadoTexto = function () {
    var c = C(); if (!c || !usuario()) return 'Sin sesión: el progreso solo se guarda en este dispositivo.';
    var p = c.pendientes ? c.pendientes() : 0, off = G.navigator.onLine === false, t;
    if (off) t = 'Sin conexión';
    else if (estado.res === 'sinRed') t = 'Sin conexión con la nube';
    else if (estado.error) t = 'No se pudo sincronizar';
    else if (!estado.ultima) t = 'Sin sincronizar todavía';
    else t = ({ igual: 'Al día', subido: 'Subido', bajado: 'Descargado de la nube', cancelado: 'Conflicto sin resolver', sinSesion: 'Sin sesión' }[estado.res] || 'Sincronizado');
    if (estado.ultima) t += ' · ' + new Date(estado.ultima).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    if (p) t += ' · ' + p + ' pendiente' + (p > 1 ? 's' : '');
    return t;
  };
  Cta.bloqueDatos = function () {
    var c = C(), u = usuario();
    var caja = h('div', { cls: 'cuenta-datos' }), est = h('div', { cls: 'nota', 'aria-live': 'polite' });
    caja.appendChild(h('div', { cls: 'etq', txt: 'Cuenta y nube' }));
    if (!c || !u) { caja.appendChild(h('div', { cls: 'nota', txt: Cta.estadoTexto() })); return caja; }
    function pintar() { est.textContent = Cta.estadoTexto(); }
    pintar(); oyentes.push({ el: est, fn: pintar });
    var bs = btn('Sincronizar ahora', function () {
      if (!sync) return; bs.disabled = true; est.textContent = 'Sincronizando…';
      Promise.resolve().then(function () { return sync.ahora(); }).then(function (r) { if (!r) { estado.ultima = estado.ultima || 0; } }).catch(function () { estado.error = true; }).then(function () { bs.disabled = false; pintar(); });
    }, 'peq');
    caja.appendChild(h('div', { cls: 'sf' }, [h('span', { txt: 'Usuario' }), h('b', { txt: u.nombre })]));
    caja.appendChild(h('div', { cls: 'sf' }, [h('span', { txt: 'Estado' }), est]));
    caja.appendChild(h('div', { cls: 'fila fila-btns' }, [bs, btn('Cuenta', function () { S.UI.cuenta(); }, 'peq sec')]));
    caja.appendChild(h('div', { cls: 'nota', txt: 'Se sincronizan récord, skins, estadísticas y logros. Si el progreso cambió en otro dispositivo y en este, la plataforma te pregunta cuál conservar. Los ajustes de gráficos, audio y controles no se sincronizan.' }));
    return caja;
  };
  Cta.cuerpoCuenta = function () {
    var u = usuario(), c = C(); if (!u || !c) return null;
    var cuerpo = [
      h('div', { cls: 'cuenta-chip' }, [c.ui && c.ui.avatarEl ? c.ui.avatarEl(u.avatar, u.color, 44) : null, h('div', { cls: 'cc-d' }, [h('b', { txt: u.nombre, style: u.color ? 'color:' + u.color : false }), h('span', { txt: 'Nivel ' + (u.nivel || 1) })])]),
      h('div', { cls: 'nota', txt: Cta.estadoTexto() }),
      btn('Volver al portal (perfil, amigos)', function () { G.location.href = c.portalUrl(); }, 'prim'),
      btn('Cerrar sesión', function () { Cta.cerrarSesion(); }, 'sec pel')
    ];
    return cuerpo;
  };
})(typeof window !== 'undefined' ? window : globalThis);
