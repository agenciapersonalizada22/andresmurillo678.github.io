/* Arranque del modulo Reconstruccion 3D: tema, cuenta y nube, pestanas y vistas. */
(function (g) {
  'use strict';
  var T = g.Tr, R = g.R3D, A = R.App, CC = g.CuentaTrabajos;
  function iniciar() {
    T.tema(document.getElementById('btn-tema'));
    CC.integrar({ id: 'trabajos_reconstruccion_3d', alm: R.Datos.alm, cols: R.Datos.COLS, sync: true, etiqueta: 'proyectos (medidas, notas, plano y mallas pequeñas); nunca fotos ni mallas pesadas', nombreLocal: 'fotos y mallas pesadas', alAplicar: function (n) { if (R.VArchivos.listar) R.VArchivos.listar(); T.aviso('Se actualizaron ' + n + ' proyecto(s) desde tu cuenta.'); } });
    CC.chip(document.querySelector('.tr-barra'), document.getElementById('btn-tema'));
    R.VCaptura.iniciar(document.getElementById('v-captura')); R.VRecon.iniciar(document.getElementById('v-recon')); R.VPlano.iniciar(document.getElementById('v-espacio'));
    if (R.Visor) R.VVisor.iniciar(document.getElementById('v-visor')); else document.getElementById('v-visor').appendChild(g.Tr.h('p', { cls: 'tr-nota tr-mal', txt: 'No se pudo cargar el visor 3D (Three.js). Comprueba que lib/three.module.min.js esté disponible.' }));
    R.VArchivos.iniciar(document.getElementById('v-archivos')); CC.bloque(document.getElementById('aj-cuenta'));
    A.pestanas = T.tabs(document.getElementById('pestanas'), function (v) { if (v === 'visor' && R.Visor && R.Visor.listo) { setTimeout(function () { R.Visor.redimensionar(); R.Visor.pedir(); }, 30); if (R.VVisor.pintarCapas) R.VVisor.pintarCapas(); } if (v === 'espacio' && R.VPlano.dibujar) setTimeout(R.VPlano.dibujar, 30); });
    document.addEventListener('keydown', function (e) { if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return; var k = e.key; if (e.altKey && ['1', '2', '3', '4', '5'].indexOf(k) >= 0) { A.pestanas.ir(['captura', 'recon', 'espacio', 'visor', 'archivos'][+k - 1]); e.preventDefault(); } });
    new MutationObserver(function () { if (R.Visor && R.Visor.listo) R.Visor.fondoRefrescar(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
    if (g.matchMedia) g.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (R.Visor && R.Visor.listo) R.Visor.fondoRefrescar(); });
    g.addEventListener('error', function (ev) { console.error(ev.message); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})(window);
