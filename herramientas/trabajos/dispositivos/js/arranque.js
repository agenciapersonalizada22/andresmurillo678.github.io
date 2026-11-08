/* Arranque del modulo Dispositivos: tema, cuenta y nube, pestanas y vistas. */
(function (g) {
  'use strict';
  var T = g.Tr, A = g.DispApp, CC = g.CuentaTrabajos, D = g.DispDatos;
  T.tema(document.getElementById('btn-tema'));
  CC.integrar({ id: D.ID, alm: D.alm, cols: D.COLS, sync: true, etiqueta: 'perfiles de dispositivos e historial de sesiones', alAplicar: function (n) { T.aviso('Se actualizaron ' + n + ' elemento(s) desde tu cuenta.'); } });
  CC.chip(document.querySelector('.tr-barra'), document.getElementById('btn-tema'));
  CC.bloque(document.getElementById('v-cuenta'));
  var logros = {}; g.TrabajosDispositivos.escuchar('conectado', function (ev) { var id = 'dispositivos_' + ev.tipo; if (!logros[id]) { logros[id] = 1; CC.logro(id); CC.xp(3); } });
  A.iniciarPanel(); A.iniciarSerial(); A.iniciarBluetooth(); A.iniciarUSB(); A.iniciarCamaras(); A.iniciarMandos(); A.iniciarSensores(); A.iniciarPuente(); A.iniciarPerfiles(); A.iniciarHistorial();
  A.tabs = T.tabs(document.getElementById('pestanas'), function (v) { if (v === 'panel' && A.reanalizar) A.reanalizar(); });
  var m = /[?&]p=([a-z]+)/.exec(location.search); if (m) A.ir(m[1]);
})(window);
