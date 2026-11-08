/* Arranque del modulo QR: tema, cuenta y nube, pestañas y vistas. */
(function (g) {
  'use strict';
  var T = g.Tr, A = g.QRApp, CC = g.CuentaTrabajos;
  T.tema(document.getElementById('btn-tema'));
  CC.integrar({ id: 'trabajos_qr', alm: g.QRDatos.alm, cols: g.QRDatos.COLS, sync: true, etiqueta: 'historial, favoritos y estilos guardados', alAplicar: function (n) { A.emitir('historial'); T.aviso('Se actualizaron ' + n + ' elemento(s) desde tu cuenta.'); } });
  CC.chip(document.querySelector('.tr-barra'), document.getElementById('btn-tema'));
  CC.bloque(document.getElementById('v-cuenta'));
  A.iniciarCrear(); A.iniciarLote(); A.iniciarLeer(); A.iniciarImprimir(); A.iniciarHistorial();
  A.tabs = T.tabs(document.getElementById('pestanas'), function (v) {
    if (v !== 'leer' && A.pararCamara) A.pararCamara();
    if (v === 'imprimir') A.alMostrarImprimir(); if (v === 'historial') A.alMostrarHistorial();
    if (v === 'lote') A.regenerarLote();
  });
})(window);
