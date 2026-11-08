/* Arranque del modulo Automatizaciones: tema, cuenta y nube, pestanas, vistas y disparadores. */
(function (g) {
  'use strict';
  var T = g.Tr, A = g.AutoApp, D = g.AutoDatos, CC = g.CuentaTrabajos, E = g.AutoEditor, V = g.AutoVivo, Vs = g.AutoVistas;
  T.tema(document.getElementById('btn-tema'));
  CC.integrar({ id: D.ID, alm: D.alm, cols: D.COLS, sync: true, etiqueta: 'flujos y almacén (sin claves; las claves y secretos se quedan en este dispositivo; el registro de ejecuciones tampoco se sincroniza)',
    alAplicar: function (n) { A.emitir('flujos'); if (E.flujo) D.flujo(E.flujo.id).then(function (f) { if (f) E.abrir(f); }); T.aviso('Se actualizaron ' + n + ' elemento(s) desde tu cuenta.'); } });
  CC.chip(document.querySelector('.tr-barra'), document.getElementById('btn-tema'));
  CC.bloque(document.getElementById('v-cuenta'));
  E.construir(document.getElementById('v-editor'));
  Vs.iniciarFlujos(); Vs.iniciarPlantillas(); Vs.iniciarRegistro(); Vs.iniciarSeguridad(); Vs.iniciarFondo();
  A.tabs = T.tabs(document.getElementById('pestanas'), function (v) { if (v === 'editor') setTimeout(E.alMostrar, 30); if (v === 'fondo' && Vs.pintarFondo) Vs.pintarFondo(); });
  D.alm.listo.then(function () { V.sincronizar(); if (D.ajustes().fondo) Vs.registrarSW(false); });
  g.addEventListener('beforeunload', function () { if (E.flujo) E.guardarYa(); });
  var q = new URLSearchParams(location.search).get('flujo'); if (q) D.flujo(q).then(function (f) { if (f) { E.abrir(f); A.ir('editor'); } });
})(window);
