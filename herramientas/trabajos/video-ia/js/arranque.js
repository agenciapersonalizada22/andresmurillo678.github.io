/* Arranque del modulo Video IA: tema, cuenta y nube, pestanas, vistas y reglas de buffer. */
(function (g) {
  'use strict';
  var T = g.Tr, V = g.VApp, CC = g.CuentaTrabajos, C = g.VCaptura;
  T.tema(document.getElementById('btn-tema'));
  CC.integrar({ id: 'trabajos_video_ia', alm: g.VDatos.alm, cols: g.VDatos.COLS, sync: true, etiqueta: 'proyectos (zonas, líneas, ajustes) y reglas; nunca videos, capturas ni claves de IA', alAplicar: function (n) { g.VReglasUI.cargar(); g.VAjustes.recargar(); T.aviso('Se actualizaron ' + n + ' elemento(s) desde tu cuenta.'); } });
  CC.chip(document.querySelector('.tr-barra'), document.getElementById('btn-tema'));
  g.VVivo.iniciar(document.getElementById('v-vivo')); g.VReglasUI.iniciar(document.getElementById('v-reglas')); g.VIAUI.iniciar(document.getElementById('v-ia')); g.VEdicionUI.iniciar(document.getElementById('v-edicion')); g.VAnalisisUI.iniciar(document.getElementById('v-analisis')); g.VAjustes.iniciar(document.getElementById('v-ajustes'));
  var cuentaDiv = document.getElementById('aj-cuenta'); if (cuentaDiv) { CC.bloque(cuentaDiv); }
  /* con reglas de clip activas, el buffer de pre-roll arranca solo (con indicador visible) al abrir una fuente en vivo */
  function auto() { var quiere = V.reglas.some(function (r) { return r.activo && g.VReglas.accionesDe(r).some(function (a) { return a.tipo === 'clip'; }); }); if (quiere && V.fuente && !V.fuente.esArchivo && C.puede() && !C.prerollActivo) { try { C.activarPreroll(V.cfg.preroll || 5); } catch (e) {} } }
  V.on('fuente', auto); V.on('reglas', auto);
  g.VApp.pestanas = T.tabs(document.getElementById('pestanas'), function (v) { if (v === 'analisis') g.VAnalisisUI.alMostrar(); else g.VAnalisisUI.alOcultar(); });
  g.addEventListener('beforeunload', function () { try { g.VMotor.parar(); C.pararTodo(); } catch (e) {} });
  document.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    var k = e.key.toLowerCase(); if (e.altKey && ['1', '2', '3', '4', '5', '6'].indexOf(k) >= 0) { g.VApp.pestanas.ir(['vivo', 'reglas', 'ia', 'edicion', 'analisis', 'ajustes'][+k - 1]); e.preventDefault(); }
    else if (k === 'f' && g.VApp.fuente && !e.ctrlKey && !e.metaKey) { C.guardarFoto('manual', V.reloj()).then(function () { T.aviso('Captura guardada.'); }); }
  });
})(window);
