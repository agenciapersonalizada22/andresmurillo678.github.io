/* Celulas: puente con la plataforma de cuentas (window.Cuenta, comun/cuenta.js).
   Sesion obligatoria, nombre/color de la cuenta, sincronizacion de progreso y perfil, puntajes (masa maxima), logros, XP y ranking.
   Politica "ajustes por dispositivo": solo viajan celulas_perfil y celulas_progreso (los ajustes, la partida, la sala y el asiento NO).
   Si la plataforma no carga o no hay red, el juego sigue funcionando: toda llamada va envuelta y nunca bloquea. */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {}, doc = G.document;
  var JUEGO = 'celulas', CLAVES = ['celulas_perfil', 'celulas_progreso'];
  var MAPA = { ffa: 'masa_ffa', equipos: 'masa_equipos', superv: 'masa_superv', batalla: 'masa_batalla' }, TOPE = 100000000;
  var Cu = C.Cu = { sync: null, estado: { ultima: 0, res: '', cola: 0, ocupado: false, error: '' }, ultimoEnvio: null };
  var enviado = {}, oyentes = [];

  function api() { return G.Cuenta || null; }
  function h(tag, cls, txt, attrs) { return C.UI.h(tag, cls, txt, attrs); }
  Cu.activa = function () { return !!(api() && api().usuario); };
  Cu.usuario = function () { var c = api(); return (c && c.usuario) || null; };
  function seguro(p) { try { return Promise.resolve(p).catch(function (e) { if (G.console) G.console.warn('Cuenta:', e && e.message || e); }); } catch (e) { return Promise.resolve(); } }

  /* ---------- acceso y sincronizacion ---------- */
  /* Exige sesion (redirige al portal) y sincroniza antes de leer guardados; la espera esta acotada (4 s) para que la red nunca bloquee. */
  Cu.entrar = function (listo) {
    var c = api(), ya = false;
    function fin() { if (ya) return; ya = true; try { listo(); } catch (e) { if (G.console) G.console.error(e); } }
    if (!c || !c.requerir) { fin(); return; }
    try { c.ui.mandoPropio = true; } catch (e) {}
    c.requerir().then(function (u) {
      if (!u) { fin(); return; }
      suscribir(c);
      try { Cu.sync = c.nube.autoSincronizar(JUEGO, CLAVES, { alConflicto: alConflicto }); } catch (e) { Cu.sync = null; }
      Cu.estado.ocupado = true;
      var esp = Cu.sync && Cu.sync.primera ? Cu.sync.primera.then(function () {}, function () {}) : Promise.resolve();
      esp.then(function () { Cu.estado.ocupado = false; avisar(); });
      Promise.race([esp, new Promise(function (ok) { setTimeout(ok, 4000); })]).then(function () {
        if (!Cu.estado.ultima) Cu.estado.ocupado = false;
        fin(); setTimeout(reconciliarLogros, 4000);
      });
    }, fin);
    setTimeout(fin, 15000); // ultimo recurso: la plataforma no responde
  };
  function alConflicto(info) {
    var J = C.Juego, c = api();
    if (J && J.vista && !J.pausado) return Promise.resolve(null); // en plena partida: decidir luego (se pregunta en el menu)
    return c.ui.conflicto(info);
  }
  function suscribir(c) {
    try {
      oyentes.push(c.on('sincronizado', function (juego, res) {
        if (juego !== JUEGO) return;
        var e = Cu.estado; e.ultima = Date.now(); e.res = (res && res.estado) || ''; e.ocupado = false;
        if (res && res.estado === 'bajado' && C.Juego && C.Juego.refrescarProgreso) C.Juego.refrescarProgreso();
        avisar();
      }));
      oyentes.push(c.on('cola', function (n) { Cu.estado.cola = n | 0; avisar(); }));
      oyentes.push(c.on('perfil', avisar));
    } catch (e) {}
  }
  var oyentesUI = [];
  function avisar() { oyentesUI.slice().forEach(function (f) { try { f(); } catch (e) {} }); }
  Cu.alCambiar = function (f) { oyentesUI.push(f); return function () { var i = oyentesUI.indexOf(f); if (i >= 0) oyentesUI.splice(i, 1); }; };
  Cu.sincronizarAhora = function () {
    var e = Cu.estado; if (!Cu.sync || e.ocupado) return Promise.resolve();
    e.ocupado = true; e.error = ''; avisar();
    return Cu.sync.ahora().then(function (r) {
      if (!r) { e.error = ''; }
      e.ocupado = false; avisar();
    }, function (err) { e.ocupado = false; e.error = (api() && api().mensajeError) ? api().mensajeError(err) : 'No se pudo sincronizar.'; avisar(); });
  };
  Cu.textoEstado = function () {
    var e = Cu.estado, c = api(), t = [];
    if (!c || !c.usuario) return 'Sin sesión.';
    if (e.ocupado) return 'Sincronizando…';
    if (G.navigator.onLine === false || e.res === 'sinRed') t.push('Sin conexión: se sincroniza al volver la red');
    else if (e.res === 'cancelado') t.push('Pendiente de resolver un conflicto');
    else if (e.ultima) t.push('Última sincronización: ' + new Date(e.ultima).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) + ' (' + ({ igual: 'al día', subido: 'subido', bajado: 'descargado' }[e.res] || e.res || 'ok') + ')');
    else t.push('Aún sin sincronizar');
    if (e.cola > 0) t.push(e.cola + ' cambio' + (e.cola === 1 ? '' : 's') + ' pendiente' + (e.cola === 1 ? '' : 's'));
    if (e.error) t.push(e.error);
    return t.join(' · ');
  };

  /* ---------- perfil ---------- */
  Cu.nombre = function () { var u = Cu.usuario(); return u ? String(u.nombre || u.usuario || '') : ''; };
  Cu.color = function () { var u = Cu.usuario(); return u && /^#[0-9a-fA-F]{6}$/.test(u.color || '') ? u.color : ''; };
  /* ajusta el perfil de Red (lobby) con el de la cuenta si el jugador no personalizo el suyo */
  Cu.perfilRed = function () {
    var R = G.Red, p = C.Almacen.leer('perfil', null) || {};
    if (!R || !R.perfil || !Cu.activa()) return;
    var u = C.UI.perfil(); R.perfil.guardar({ nombre: p.nombre || Cu.nombre() || u.nombre, color: p.c || Cu.color() || u.c });
  };

  /* ---------- puntajes, logros, XP ---------- */
  Cu.enviarPuntaje = function (modo, masa) {
    var c = api(), id = MAPA[modo], v = Math.round(+masa);
    if (!c || !c.usuario || !id || !(v > 0) || v > TOPE || v <= (enviado[id] || 0)) return Promise.resolve();
    var antes = enviado[id] || 0; enviado[id] = v;
    Cu.ultimoEnvio = seguro(c.puntaje(JUEGO, id, v)).then(function (r) { if (r === undefined) enviado[id] = antes; return r; });
    return Cu.ultimoEnvio;
  };
  Cu.logro = function (id) { var c = api(); if (c && c.usuario) seguro(c.logro(JUEGO, id)); };
  Cu.xp = function (n) { var c = api(); n = Math.max(0, Math.min(50, Math.floor(n))); if (c && c.usuario && n > 0) { try { c.xp(JUEGO, n); } catch (e) {} } };
  /* XP moderado por hito (muerte o fin de partida): 5 base + masa (max 15) + bajas (max 10) + victoria 20 => tope 50 */
  Cu.xpHito = function (s, victoria) { Cu.xp(5 + Math.min(15, Math.floor((s.max || 0) / 100)) + Math.min(10, s.kills || 0) + (victoria ? 20 : 0)); };
  /* logros ya conseguidos antes de tener cuenta (o en otro dispositivo sin sincronizar): se reportan despacio y en silencio */
  function reconciliarLogros() {
    var c = api(); if (!c || !c.usuario) return;
    var loc = Object.keys(C.progreso().logros || {}), ya = c.logros(JUEGO), pend = loc.filter(function (id) { return ya.indexOf(id) < 0; });
    (function sig() { var id = pend.shift(); if (!id) return; seguro(c.logro(JUEGO, id)).then(function () { setTimeout(sig, 700); }); })();
  }

  /* ---------- linea de posicion (fin de vida / partida) ---------- */
  Cu.lineaPosicion = function (modo, el) {
    var c = api(), id = MAPA[modo]; if (!c || !c.usuario || !id) { el.remove(); return; }
    el.textContent = 'Consultando tu posición…';
    Promise.resolve(Cu.ultimoEnvio).catch(function () {}).then(function () { return c.miPosicion(JUEGO, id); }).then(function (r) {
      if (!el.isConnected) return;
      el.textContent = r && r.posicion ? 'Ranking global · puesto #' + r.posicion + ' de ' + r.total + ' · tu mejor masa: ' + Math.round(r.valor).toLocaleString('es') : 'Aún no tienes puntaje en este modo.';
    }, function () { if (el.isConnected) el.textContent = 'Ranking no disponible sin conexión.'; });
  };

  /* ---------- pantalla de ranking ---------- */
  function fmt(v) { return Math.round(v).toLocaleString('es'); }
  Cu.ranking = function (modoIni, cerrar) {
    var U = C.UI, c = api(), e = U.$('ranking'), modo = C.MODOS[modoIni] ? modoIni : 'ffa', ambito = 'global', ficha = 0;
    e.textContent = ''; var caja = h('div', 'caja'); caja.style.width = 'min(640px,100%)';
    var cab = h('div', 'aj-cab'); cab.appendChild(h('h2', '', 'Ranking'));
    var x = h('button', 'btn', 'Volver', { type: 'button', 'data-atras': 1 }); x.onclick = cerrar; cab.appendChild(x); caja.appendChild(cab);
    caja.appendChild(h('p', 'suave', 'Masa máxima alcanzada en cada modo. LB/RB cambian de modo.'));
    var tabs = h('div', 'aj-tabs', null, { role: 'tablist' }), btnsTab = {};
    Object.keys(C.MODOS).forEach(function (k) {
      var b = h('button', 'aj-tab', C.MODOS[k].corto, { type: 'button', role: 'tab', 'aria-selected': String(k === modo), title: C.MODOS[k].nombre });
      b.onclick = function () { modo = k; marcar(); cargar(); }; tabs.appendChild(b); btnsTab[k] = b;
    });
    caja.appendChild(tabs);
    var chips = h('div', 'chips'); chips.style.margin = '8px 0'; var bAmb = {};
    [['global', 'Global'], ['amigos', 'Amigos']].forEach(function (a) {
      var b = h('button', 'chip', a[1], { type: 'button', 'aria-pressed': String(a[0] === ambito) });
      b.onclick = function () { ambito = a[0]; marcar(); cargar(); }; chips.appendChild(b); bAmb[a[0]] = b;
    });
    caja.appendChild(chips);
    var lista = h('div', 'rk-lista', null, { 'aria-live': 'polite' }), pie = h('p', 'suave rk-pie');
    caja.appendChild(lista); caja.appendChild(pie); e.appendChild(caja); U.mostrar('ranking');
    function marcar() {
      Object.keys(btnsTab).forEach(function (k) { btnsTab[k].setAttribute('aria-selected', String(k === modo)); });
      Object.keys(bAmb).forEach(function (k) { bAmb[k].setAttribute('aria-pressed', String(k === ambito)); });
    }
    function msg(txt, reintento) {
      lista.textContent = ''; var m = h('div', 'rk-msg', txt); lista.appendChild(m);
      if (reintento) { var b = h('button', 'btn', 'Reintentar', { type: 'button' }); b.onclick = cargar; m.appendChild(b); }
    }
    function cargar() {
      var mi = ++ficha, id = MAPA[modo]; pie.textContent = '';
      if (!c || !c.usuario) { msg('El ranking necesita una cuenta con sesión iniciada.'); return; }
      msg('Cargando…');
      Promise.resolve(Cu.ultimoEnvio).catch(function () {}).then(function () {
        return Promise.all([c.top(JUEGO, id, 10, { soloAmigos: ambito === 'amigos' }), c.miPosicion(JUEGO, id).catch(function () { return null; })]);
      }).then(function (r) {
        if (mi !== ficha || !e.isConnected) return;
        var top = r[0] || [], mio = r[1];
        if (!top.length) { msg(ambito === 'amigos' ? 'Ni tú ni tus amigos tienen puntaje en este modo todavía.' : 'Aún no hay puntajes en este modo. ¡Sé el primero!'); }
        else {
          lista.textContent = '';
          top.forEach(function (f) {
            var fila = h('div', 'rk-fila' + (f.yo ? ' yo' : '')); fila.appendChild(h('span', 'rk-pos', '#' + f.pos));
            var pt = h('span', 'rk-pt'); pt.style.background = /^#[0-9a-fA-F]{6}$/.test(f.color || '') ? f.color : '#9a8cff'; fila.appendChild(pt);
            fila.appendChild(h('span', 'rk-nom', f.nombre || '?')); fila.appendChild(h('b', 'rk-val', fmt(f.valor))); lista.appendChild(fila);
          });
        }
        pie.textContent = mio && mio.posicion ? 'Tu puesto global: #' + mio.posicion + ' de ' + mio.total + ' · tu mejor masa: ' + fmt(mio.valor) : 'Aún no tienes puntaje en este modo.';
      }, function (err) { if (mi === ficha) msg('No se pudo cargar el ranking' + (G.navigator.onLine === false ? ' (sin conexión).' : '.'), true); });
    }
    cargar();
  };

  /* ---------- menu: cuenta ---------- */
  Cu.chipCuenta = function (alAbrir) {
    var u = Cu.usuario(); if (!u) return h('span');
    var b = h('button', 'cu-chip', null, { type: 'button', 'aria-label': 'Cuenta: ' + Cu.nombre() });
    try { if (api().ui.avatarEl) { var av = api().ui.avatarEl(u.avatar, u.color, 26); b.appendChild(av); } } catch (e) {}
    b.appendChild(h('span', 'cu-nom', Cu.nombre())); b.onclick = alAbrir; return b;
  };
  Cu.panelCuenta = function () {
    var U = C.UI, c = api(), u = Cu.usuario(); if (!u) return;
    var lineas = ['Sesión iniciada como ' + Cu.nombre() + ' · nivel ' + (u.nivel || 1) + (c.demo ? ' (modo demo: solo en este dispositivo)' : '') + '.'];
    var cerrarP = function () { U.ocultar('sala'); };
    U.panel('sala', 'CUENTA', lineas, [
      { txt: 'IR AL PORTAL', cls: 'principal', fn: function () { Cu.guardarYSalir(function () { G.location.href = c.portalUrl(); }); } },
      { txt: 'CERRAR SESIÓN', cls: 'peligro', fn: function () { Cu.guardarYSalir(function () { seguro(c.salir()).then(function () { G.location.reload(); }); }); } },
      { txt: 'VOLVER', fn: cerrarP, atras: true }]);
  };
  /* sube lo pendiente (maximo 3 s) antes de abandonar la pagina */
  Cu.guardarYSalir = function (fn) {
    try { if (C.Juego && C.Juego.guardar) C.Juego.guardar(); } catch (e) {}
    var p = Cu.sync ? Cu.sync.ahora().catch(function () {}) : Promise.resolve();
    Promise.race([p, new Promise(function (ok) { setTimeout(ok, 3000); })]).then(fn);
  };

  /* ---------- bloque "Cuenta y nube" (Ajustes > Datos) ---------- */
  Cu.bloqueNube = function (p) {
    var c = api(), caja = h('div', 'cu-bloque'); caja.appendChild(h('h3', '', 'CUENTA Y NUBE'));
    if (!c || !c.usuario) { caja.appendChild(h('p', 'suave', 'Sin sesión: el progreso solo se guarda en este dispositivo.')); p.appendChild(caja); return; }
    caja.appendChild(h('p', '', 'Usuario: ' + Cu.nombre() + (c.demo ? ' · modo demo (solo este dispositivo)' : '')));
    var est = h('p', 'suave cu-estado', Cu.textoEstado(), { 'aria-live': 'polite' }); caja.appendChild(est);
    var f = h('div', 'aj-fila botones'), b = h('button', 'btn', 'Sincronizar ahora', { type: 'button' }); b.onclick = function () { Cu.sincronizarAhora(); }; f.appendChild(b); caja.appendChild(f);
    caja.appendChild(h('p', 'suave', 'Se sincronizan tu perfil, estadísticas, logros y récords (no los ajustes, que son de cada dispositivo). Si el progreso cambió aquí y en la nube, la plataforma te pregunta con qué quedarte.'));
    p.appendChild(caja);
    var quitar = Cu.alCambiar(function () {
      if (!caja.isConnected) { quitar(); return; }
      est.textContent = Cu.textoEstado(); b.disabled = !!Cu.estado.ocupado;
    });
    b.disabled = !!Cu.estado.ocupado;
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
