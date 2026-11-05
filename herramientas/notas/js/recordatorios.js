/* Recordatorios: comprueba cada 15 s mientras la app este abierta. Avisos dentro de la app y Notification API si hay permiso.
   Limitacion: una app web sin servidor no puede avisar con el navegador cerrado; al abrir se muestran los avisos perdidos. */
(function (G) {
  'use strict';
  var F = G.Fechas, UI = G.UI, T = G.Tareas, Cfg = G.Config, R = G.Recordatorios = {}, S = function () { return G.App.store; };
  var avisados = {}, primera = true, timer = 0;
  try { avisados = JSON.parse(G.localStorage.getItem('notas_avisados')) || {}; } catch (e) {}
  function guardar() { var lim = Date.now() - 3 * 86400000; Object.keys(avisados).forEach(function (k) { if (avisados[k] < lim) delete avisados[k]; }); try { G.localStorage.setItem('notas_avisados', JSON.stringify(avisados)); } catch (e) {} }
  R.pedirPermiso = function () {
    if (!G.Notification) return Promise.resolve('no-soportado'); Cfg.setProg('pedido', true);
    return Promise.resolve(G.Notification.requestPermission()).then(function (p) { UI.aviso(p === 'granted' ? 'Notificaciones activadas' : 'Notificaciones no activadas', { tipo: p === 'granted' ? 'ok' : '' }); return p; });
  };
  R.sugerirPermiso = function (fuerza) {
    if (!G.Notification || G.Notification.permission !== 'default' || (Cfg.prog.pedido && !fuerza)) return;
    Cfg.setProg('pedido', true); UI.aviso('¿Quieres recibir notificaciones del navegador para tus recordatorios?', { acciones: [{ txt: 'Activar', fn: function () { R.pedirPermiso(); } }], ms: 9000 });
  };
  function notificar(t, clave, cuerpo) {
    if (!G.Notification || G.Notification.permission !== 'granted') return;
    var op = { body: cuerpo, tag: clave, icon: '../../juego/comun/icono-192.png', data: { tarea: t.id } };
    try {
      if (G.navigator.serviceWorker && G.navigator.serviceWorker.controller) G.navigator.serviceWorker.ready.then(function (reg) { reg.showNotification(t.titulo, op); });
      else { var n = new G.Notification(t.titulo, op); n.onclick = function () { G.focus(); G.App.abrir('tarea', t.id); n.close(); }; }
    } catch (e) {}
  }
  function avisar(t, clave, perdido) {
    avisados[clave] = Date.now(); var cuerpo = F.etiqueta(t.fecha) + ' ' + t.hora + (t.notas ? ' · ' + t.notas.slice(0, 80) : '');
    UI.aviso('🔔 ' + t.titulo + ' (' + F.etiqueta(t.fecha).toLowerCase() + ' ' + t.hora + ')', { tipo: 'recordatorio', fijo: true, acciones: [{ txt: 'Hecha', fn: function () { G.VistaTareas.completar(t.id); } }, { txt: '+10 min', fn: function () { T.aplazarMinutos(t.id, 10); } }, { txt: 'Ver', fn: function () { G.App.abrir('tarea', t.id); } }] });
    notificar(t, clave, cuerpo); if (Cfg.disp.vibracion && G.navigator.vibrate) G.navigator.vibrate([150, 80, 150]);
  }
  R.comprobar = function () {
    var S2 = S(); if (!S2) return; var ahora = Date.now(), perdidos = [], hubo = false;
    S2.lista('tareas', function (t) { return !t.papelera && t.estado !== 'hecha' && t.fecha && t.hora && t.recordar != null; }).forEach(function (t) {
      var inst = F.aInstante(t.fecha, t.hora) - t.recordar * 60000, clave = t.id + '|' + t.fecha + '|' + t.hora + '|' + t.recordar;
      if (inst > ahora || avisados[clave] || ahora - inst > 2 * 86400000) return;
      hubo = true; if (primera && ahora - inst > 120000) { perdidos.push([t, clave]); avisados[clave] = ahora; } else avisar(t, clave);
    });
    if (perdidos.length) UI.aviso('Tienes ' + perdidos.length + ' recordatorio' + (perdidos.length > 1 ? 's' : '') + ' que vencieron mientras la app estaba cerrada: ' + perdidos.slice(0, 3).map(function (p) { return p[0].titulo; }).join(', ') + (perdidos.length > 3 ? '…' : ''), { tipo: 'recordatorio', fijo: true, acciones: [{ txt: 'Ver Hoy', fn: function () { G.App.ir('tareas', 'hoy'); } }] });
    primera = false; if (hubo) guardar();
  };
  R.resumen = function () {
    var hoy = F.hoy(); if (!Cfg.pref.resumen || Cfg.prog.resumenFecha === hoy) return;
    var n = T.consulta('hoy').length, v = T.consulta('hoy').filter(function (t) { return t.fecha < hoy; }).length; Cfg.setProg('resumenFecha', hoy);
    if (n) UI.aviso('Hoy tienes ' + n + ' tarea' + (n > 1 ? 's' : '') + (v ? ' (' + v + ' vencida' + (v > 1 ? 's' : '') + ')' : ''), { acciones: [{ txt: 'Ver', fn: function () { G.App.ir('tareas', 'hoy'); } }], ms: 8000 });
  };
  R.iniciar = function () { R.comprobar(); R.resumen(); clearInterval(timer); timer = setInterval(R.comprobar, 15000); G.document.addEventListener('visibilitychange', function () { if (!G.document.hidden) R.comprobar(); }); };
})(window);
