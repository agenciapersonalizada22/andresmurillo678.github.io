/* Integracion con la plataforma de cuentas (Cuenta): acceso, perfil, nube, puntajes, logros, XP y rankings.
   Todo es opcional: si Cuenta no esta o falla la red, el juego sigue funcionando igual. */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {}, doc = G.document;
  var ID = 'buscaminas';
  /* Solo el progreso viaja a la nube (estadisticas, records, logros, nombre). Ajustes y ajustes de dispositivo NO (politica por dispositivo);
     la partida en curso y la sala multijugador son efimeras y tampoco. */
  var CLAVES = ['buscaminas_progreso'];
  var S = BM.cuenta = { activa: false, estado: '', ultima: 0, oyentes: [], listo: false, handle: null };
  var logrosListos = false;

  function Cu() { return G.Cuenta || null; }
  function h(t, p, k) { return BM.ui.h(t, p, k); }
  function avisar() { S.oyentes = S.oyentes.filter(function (f) { try { return f() !== false; } catch (e) { return false; } }); }

  /* ---------- arranque ---------- */
  S.arrancar = function (listo) {
    var C = Cu(), fin = false;
    function seguir() {
      if (fin) return; fin = true;
      try { if (C && C.ui) C.ui.mandoPropio = false; } catch (e) {}
      var e = doc.getElementById('esperaCuenta'); if (e) e.remove();
      doc.body.classList.remove('esperando');
      S.listo = true; listo();
    }
    if (!C || typeof C.requerir !== 'function') { seguir(); return; }
    try {
      C.on('logros', function () { logrosListos = true; S.reportarLogrosLocales(); });
      C.on('sincronizado', alSincronizar);
      C.on('cola', avisar);
      C.on('perfil', avisar);
      if (C.ui) C.ui.mandoPropio = true; /* mientras el bucle del juego aun no corre, la plataforma maneja el mando en sus dialogos */
    } catch (e) {}
    C.requerir().then(function (u) {
      S.activa = !!u;
      if (!u) { seguir(); return; }
      try { S.handle = C.nube.autoSincronizar(ID, CLAVES, {}); } catch (e) { seguir(); return; }
      var tope = new Promise(function (ok) { setTimeout(ok, 10000); });
      Promise.race([Promise.resolve(S.handle.primera).catch(function () {}), tope]).then(function () { S.reportarLogrosLocales(); seguir(); });
    }).catch(function () { seguir(); });
  };

  function alSincronizar(juego, res) {
    if (juego !== ID || !res) return;
    S.estado = res.estado;
    if (res.estado === 'igual' || res.estado === 'subido' || res.estado === 'bajado') S.ultima = Date.now();
    if (res.estado === 'bajado' && S.listo) {
      try {
        BM.progreso.cargar();
        var ini = doc.getElementById('inicio');
        if (ini && !ini.hidden && !BM.ui.hayPanel()) BM.ui.mostrarInicio();
        BM.ui.toast('Progreso actualizado desde tu cuenta', 'ok');
      } catch (e) {}
    }
    avisar();
  }

  S.sincronizarAhora = function () {
    var C = Cu(); if (!C || !S.activa) return Promise.resolve(null);
    S.estado = ''; avisar();
    return C.nube.sincronizar(ID, CLAVES, {}).then(function (r) { return r; }, function (e) { S.estado = 'error'; avisar(); return null; });
  };

  /* ---------- perfil ---------- */
  S.usuario = function () { var C = Cu(); return C && C.usuario ? C.usuario : null; };
  S.nombre = function () { var u = S.usuario(); return u ? u.nombre : ''; };

  S.chipInicio = function () {
    var u = S.usuario(); if (!u) return null;
    var av = null;
    try { av = Cu().ui.avatarEl(u.avatar, u.color, 26); } catch (e) {}
    var b = BM.ui.btn('', function () { S.abrirPanel(); }, 'cuenta-chip', { 'aria-label': 'Cuenta de ' + u.nombre, title: 'Cuenta' });
    if (av) b.appendChild(av);
    b.appendChild(h('span', { cls: 'cc-nombre', txt: u.nombre, style: 'color:' + u.color }));
    b.appendChild(h('small', { txt: 'Cuenta' }));
    return h('div', { cls: 'cuenta-barra' }, [b]);
  };

  S.abrirPanel = function () {
    var C = Cu(), u = S.usuario(); if (!C || !u) return;
    var UI = BM.ui, p;
    var cab = h('div', { cls: 'cuenta-ficha' }, [h('b', { txt: u.nombre, style: 'color:' + u.color }), h('small', { txt: ' nivel ' + (u.nivel || 1) + ' · ' + (u.xp || 0) + ' XP' })]);
    try { cab.insertBefore(C.ui.avatarEl(u.avatar, u.color, 44), cab.firstChild); } catch (e) {}
    var cuerpo = h('div', { cls: 'menu-pausa' }, [cab,
      C.demo ? h('p', { cls: 'nota', txt: 'Modo demo: tu cuenta vive solo en este dispositivo.' }) : null,
      UI.btn('Volver al portal', function () { G.location.href = '../'; }, 'prim', { 'data-foco': 1 }),
      UI.btn('Sincronizar ahora', function () { S.sincronizarAhora().then(function (r) { UI.toast(textoEstado(r ? r.estado : 'error'), r && r.estado !== 'sinRed' ? 'ok' : 'aviso'); }); }, 'sec'),
      UI.btn('Cerrar sesión', function () {
        UI.confirmar('¿Cerrar la sesión de ' + u.nombre + '? Tu progreso queda guardado en tu cuenta.', function () {
          if (p) p.cerrar();
          var ir = function () { G.location.replace('../'); };
          try { Promise.resolve(C.salir()).then(ir, ir); } catch (e) { ir(); }
        }, 'Cerrar sesión');
      }, 'peligro')]);
    p = UI.panel({ titulo: 'Cuenta', cuerpo: cuerpo, ancho: 380 });
  };

  /* ---------- Ajustes > Datos: bloque "Cuenta y nube" ---------- */
  function textoEstado(e) {
    return { igual: 'Al día con la nube', subido: 'Progreso guardado en la nube', bajado: 'Progreso descargado de la nube', sinRed: 'Sin conexión: se sincronizará al volver la red',
      cancelado: 'Conflicto sin resolver (se preguntará de nuevo)', sinSesion: 'Sin sesión', error: 'No se pudo sincronizar (reintenta luego)', '': 'Sincronizando…' }[e] || e;
  }
  S.bloqueDatos = function () {
    var C = Cu(), u = S.usuario();
    var caja = h('div', { cls: 'bloque-cuenta' }, [h('h3', { txt: 'Cuenta y nube' })]);
    if (!C || !u) { caja.appendChild(h('p', { cls: 'nota', txt: 'Sin sesión: tu progreso solo está en este dispositivo.' })); return caja; }
    var l1 = h('p', { cls: 'cn-linea', txt: 'Usuario: ' + u.nombre + (u.usuario ? ' (@' + u.usuario + ')' : '') + (C.demo ? ' · modo demo (solo este dispositivo)' : '') });
    var l2 = h('p', { cls: 'cn-linea' }), l3 = h('p', { cls: 'cn-linea' }), l4 = h('p', { cls: 'cn-linea' });
    var btn = BM.ui.btn('Sincronizar ahora', function () { btn.disabled = true; S.sincronizarAhora().then(function () { btn.disabled = false; }); }, 'sec');
    var montado = false;
    function pinta() {
      if (montado && !caja.isConnected) return false;
      montado = true;
      l2.textContent = 'Estado: ' + textoEstado(S.estado);
      l3.textContent = 'Última sincronización: ' + (S.ultima ? new Date(S.ultima).toLocaleTimeString('es') : 'aún no en esta sesión');
      var n = 0; try { n = C.pendientes(); } catch (e) {}
      l4.textContent = n ? 'Pendiente de enviar: ' + n + (n === 1 ? ' cambio' : ' cambios') + ' (puntajes o logros, por falta de conexión)' : 'Nada pendiente de enviar.';
      return true;
    }
    pinta(); S.oyentes.push(pinta);
    [l1, l2, l3, l4, btn].forEach(function (e) { caja.appendChild(e); });
    caja.appendChild(h('p', { cls: 'nota', txt: 'Se sincroniza el progreso (estadísticas, récords y logros). Los ajustes son por dispositivo. Si tu progreso local y el de la nube difieren, la plataforma te mostrará un diálogo para elegir cuál conservar.' }));
    return caja;
  };

  /* ---------- puntajes, logros y XP ---------- */
  function modoPuntaje(r) {
    if (r.practica || r.mp) return null;
    if (r.modo === 'contrarreloj' || r.modo === 'supervivencia') {
      if (r.pistas || !(r.puntos > 0)) return null;
      var tope = r.modo === 'contrarreloj' ? 100000 : 1000000;
      return { modo: r.modo, valor: Math.min(tope, Math.round(r.puntos)) };
    }
    if (!r.victoria || r.pistas || r.peligro) return null;
    var m = r.modo === 'diario' ? 'diario' : (r.dif === 'personalizado' ? null : 'tiempo_' + r.dif);
    if (!m) return null;
    var s = Math.round(r.tiempoMs / 10) / 100;
    if (!(s >= 0.5 && s <= 999)) return null;
    return { modo: m, valor: s };
  }
  function xpPartida(r) {
    if (r.practica) return 0;
    if (r.modo === 'supervivencia') return Math.max(0, Math.min(50, (r.nivel - 1) * 5));
    if (!r.victoria) return 0;
    if (r.modo === 'diario') return 25;
    if (r.modo === 'contrarreloj') return 15;
    return { principiante: 10, intermedio: 20, experto: 35 }[r.dif] || 5;
  }
  function xp(n) { var C = Cu(); if (C && S.activa && n > 0) { try { C.xp(ID, Math.min(50, n)); } catch (e) {} } }
  function logros(info) {
    var C = Cu(); if (!C || !S.activa || !info || !info.nuevos) return;
    info.nuevos.forEach(function (l) { if (l && l.id) C.logro(ID, l.id).catch(function () {}); });
  }
  S.reportarLogrosLocales = function () {
    var C = Cu(); if (!C || !S.activa || !logrosListos || !BM.progreso.d) return;
    var ya = C.logros(ID);
    Object.keys(BM.progreso.d.logros || {}).forEach(function (id) { if (ya.indexOf(id) < 0) C.logro(ID, id).catch(function () {}); });
  };

  /* Partida de un jugador terminada. info = resultado de BM.progreso.registrar (puede ser null). */
  S.alTerminar = function (res, info) {
    var C = Cu(); if (!C || !S.activa) return;
    try {
      logros(info); xp(xpPartida(res));
      var mp = modoPuntaje(res);
      if (mp) {
        var env = { modo: mp.modo, valor: mp.valor, pendiente: false, mejoro: null };
        env.promesa = C.puntaje(ID, mp.modo, mp.valor).then(function (r) {
          env.pendiente = !!r.pendiente; env.mejoro = r.mejoro;
          if (r.mejoro) BM.ui.toast('¡Nuevo mejor puntaje en tu cuenta!', 'ok');
          return r;
        }).catch(function (e) { env.error = e; return null; });
        if (info) info.envio = env;
      }
    } catch (e) {}
  };
  S.alTerminarMulti = function (info, gano) {
    var C = Cu(); if (!C || !S.activa) return;
    try { logros(info); xp(gano ? 20 : 8); } catch (e) {}
  };

  function fmtVal(m, v) { return m.mayorEsMejor ? Math.round(v) + ' pts' : BM.ui.fmtTiempo(v * 1000, true); }
  function infoModo(id) { return BM.registro.modos.filter(function (m) { return m.id === id; })[0]; }

  /* Linea "Posicion mundial" para la pantalla de fin de partida. */
  S.nodoPosicion = function (env) {
    var m = infoModo(env.modo), p = h('p', { cls: 'nota pos-mundial', txt: 'Calculando tu posición mundial…' }), C = Cu();
    env.promesa.then(function (r) {
      if (!r) { p.textContent = 'Sin conexión: tu puntaje se enviará cuando vuelva la red.'; return; }
      if (r.pendiente) { p.textContent = 'Sin conexión: tu puntaje se enviará cuando vuelva la red.'; return; }
      return C.miPosicion(ID, env.modo).then(function (q) {
        if (!q || !q.posicion) { p.textContent = ''; return; }
        p.textContent = 'Posición mundial: #' + q.posicion + (q.total ? ' de ' + q.total : '') + ' · tu mejor: ' + fmtVal(m, q.valor);
      });
    }).catch(function () { p.textContent = ''; });
    return p;
  };

  /* Ranking Local / Global / Amigos para un modo (m) dentro de Records. local: funcion que devuelve el nodo de la tabla local. */
  S.vistaRecords = function (m, local) {
    var C = Cu();
    if (!C || !S.activa) return local();
    var raiz = h('div', { cls: 'rank' }), barra = h('div', { cls: 'chips rank-tipos', role: 'group', 'aria-label': 'Tipo de ranking' }), cuerpo = h('div', { cls: 'rank-cuerpo', 'aria-live': 'polite' }), bs = {}, tok = 0;
    function tabla(lista) {
      var tb = h('tbody');
      lista.forEach(function (e) {
        tb.appendChild(h('tr', { cls: e.yo ? 'yo' : '' }, [h('td', { txt: String(e.pos) }), h('td', { style: 'color:' + (e.color || 'inherit'), txt: String(e.nombre || '—') + (e.yo ? ' (tú)' : '') }), h('td', { txt: fmtVal(m, e.valor) })]));
      });
      var t = h('table', { cls: 'tabla' }, [h('thead', {}, [h('tr', {}, ['#', 'Jugador', m.mayorEsMejor ? 'Puntos' : 'Tiempo'].map(function (x) { return h('th', { txt: x }); }))]), tb]);
      return h('div', { cls: 'tabla-caja' }, [t]);
    }
    function ir(tipo) {
      var mi = ++tok;
      Object.keys(bs).forEach(function (k) { bs[k].setAttribute('aria-pressed', String(k === tipo)); });
      cuerpo.textContent = '';
      if (tipo === 'local') { cuerpo.appendChild(local()); return; }
      cuerpo.appendChild(h('p', { cls: 'vacio', txt: 'Cargando ranking…' }));
      var amigos = tipo === 'amigos';
      Promise.all([C.top(ID, m.id, 10, { soloAmigos: amigos }), C.miPosicion(ID, m.id).catch(function () { return null; })]).then(function (r) {
        if (mi !== tok) return;
        cuerpo.textContent = '';
        var lista = r[0] || [];
        if (!lista.length) { cuerpo.appendChild(h('p', { cls: 'vacio', txt: amigos ? 'Ninguno de tus amigos tiene puntaje aquí todavía.' : 'Aún no hay puntajes. ¡Sé el primero!' })); return; }
        cuerpo.appendChild(tabla(lista));
        var q = r[1];
        if (!amigos && q && q.posicion && !lista.some(function (e) { return e.yo; })) cuerpo.appendChild(h('p', { cls: 'nota', txt: 'Tu posición: #' + q.posicion + (q.total ? ' de ' + q.total : '') + ' · tu mejor: ' + fmtVal(m, q.valor) }));
      }, function (e) {
        if (mi !== tok) return;
        cuerpo.textContent = '';
        cuerpo.appendChild(h('p', { cls: 'vacio', txt: 'No se pudo cargar el ranking (¿sin conexión?).' }));
        cuerpo.appendChild(BM.ui.btn('Reintentar', function () { ir(tipo); }, 'sec'));
      });
    }
    [['global', 'Global'], ['amigos', 'Amigos'], ['local', 'Este dispositivo']].forEach(function (t) {
      bs[t[0]] = h('button', { type: 'button', cls: 'chip', txt: t[1], 'aria-pressed': 'false', on: { click: function () { BM.sonido.click(); ir(t[0]); } } });
      barra.appendChild(bs[t[0]]);
    });
    raiz.appendChild(barra); raiz.appendChild(cuerpo); ir('global');
    return raiz;
  };

  /* Un dialogo de la plataforma (conflicto de guardado) abierto sobre el juego. */
  S.dialogoAbierto = function () { return !!doc.querySelector('.cu-fondo .cu-tarjeta'); };
  S.dialogoRaiz = function () { return doc.querySelector('.cu-fondo .cu-tarjeta'); };
})(window);
