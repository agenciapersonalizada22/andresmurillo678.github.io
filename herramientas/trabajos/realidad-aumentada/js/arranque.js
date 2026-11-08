/* Arranque de Realidad aumentada: tema, cuenta y nube, indicador de camara, pestanas y vistas. */
(function (g) {
  'use strict';
  var T = g.Tr, RA = g.RA, A = RA.App, CC = g.CuentaTrabajos;
  function iniciar() {
    if (g.R3D && g.R3D.Formatos) RA.R3DFormatos = g.R3D.Formatos;
    T.tema(document.getElementById('btn-tema'));
    CC.integrar({ id: 'trabajos_realidad_aumentada', alm: RA.Datos.alm, cols: RA.Datos.COLS, sync: true, etiqueta: 'proyectos (capas, anclas, objetos y ajustes); nunca fotos, videos, PNG propios ni mallas', nombreLocal: 'fotos, videos, PNG propios y mallas', alAplicar: function (n) { if (RA.VProy.listar) RA.VProy.listar(); T.aviso('Se actualizaron ' + n + ' proyecto(s) desde tu cuenta.'); } });
    CC.chip(document.querySelector('.tr-barra'), document.getElementById('btn-tema'));
    RA.VProy.pngsAlInicio();
    RA.VFoto.iniciar(document.getElementById('v-foto')); RA.VVivo.iniciar(document.getElementById('v-vivo')); RA.VObjetos.iniciar(document.getElementById('v-objetos')); RA.VVisor.iniciar(document.getElementById('v-visor')); RA.VProy.iniciar(document.getElementById('v-proy'));
    CC.bloque(document.getElementById('aj-cuenta'));
    var ind = document.getElementById('ra-ind'), txt = document.getElementById('ra-ind-txt');
    RA.Cam.alCambiar(function (act) { ind.hidden = !act; document.documentElement.style.setProperty('--ra-top', act ? ind.offsetHeight + 'px' : '0px'); });
    document.getElementById('ra-ind-apagar').addEventListener('click', function () { RA.VVivo.detener(); });
    var actual = 'vivo';
    A.pestanas = T.tabs(document.getElementById('pestanas'), function (v) {
      if (actual === 'vivo' && v !== 'vivo') RA.VVivo.pausar();
      if (actual === 'visor' && v !== 'visor') RA.VVisor.desactivar();
      actual = v;
      if (v === 'visor') RA.VVisor.activar();
      if (v === 'foto') RA.VFoto.redibujar();
      if (v === 'objetos') { RA.VObjetos.refrescar(); RA.VObjetos.listar(); }
      if (v === 'proy') RA.VProy.pintar();
    });
    document.addEventListener('keydown', function (e) { if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return; if (e.altKey && ['1', '2', '3', '4', '5'].indexOf(e.key) >= 0) { A.pestanas.ir(['vivo', 'foto', 'objetos', 'visor', 'proy'][+e.key - 1]); e.preventDefault(); } });
    g.addEventListener('error', function (ev) { console.error(ev.message); });
    g.addEventListener('pagehide', function () { RA.Cam.detener(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})(window);
