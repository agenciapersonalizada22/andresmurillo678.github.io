/* Arranque de Analisis: tema, cuenta, permiso de lectura, pestanas y carga de datos. */
(function (g) {
  'use strict';
  var T = g.Tr, h = T.h, A = g.Ana, U = A.u, V = g.AnaV, D = g.AnaDatos, CC = g.CuentaTrabajos, KP = 'trabajos_analisis_permiso_dispositivo', vista = 'tablero', args = new URLSearchParams(location.search);
  T.tema(document.getElementById('btn-tema'));
  CC.integrar({ id: D.ID, alm: D.alm, cols: D.COLS, sync: true, etiqueta: 'solo tus metas y KPIs (los datos analizados y la clave de IA nunca salen de este dispositivo)', alAplicar: function () { D.metas().then(function (m) { A.est.metas = m; if (A.est.datos) { A.recalcular(); pintar(); } }); } });
  CC.chip(document.querySelector('.tr-barra'), document.getElementById('btn-tema'));
  CC.bloque(document.getElementById('v-cuenta'));
  function permiso() { try { return g.localStorage.getItem(KP) === 'si'; } catch (e) { return false; } }
  var MAPA = { tablero: V.tablero, dominios: V.dominios, cruces: V.cruces, informes: V.informes, metas: V.metas, salud: V.salud };
  function pintar() { var c = document.getElementById('v-' + vista); if (!c || !MAPA[vista]) return; if (A.est.cargando && !A.est.an) { c.textContent = ''; c.appendChild(U.sinDatos('Leyendo los datos de tus módulos…')); return; } if (A.est.error && !A.est.an) { c.textContent = ''; c.appendChild(U.nota(A.est.error, 'tr-mal')); return; } try { MAPA[vista](c); } catch (e) { console.error(e); c.textContent = ''; c.appendChild(U.nota('No se pudo dibujar esta sección: ' + e.message, 'tr-mal')); } }
  A.on('listo', pintar); A.on('metas', pintar); A.on('cargando', function () { if (!A.est.an) pintar(); });
  function iniciar() {
    document.getElementById('puerta').hidden = true; document.getElementById('app').hidden = false;
    var ids = ['tablero', 'dominios', 'cruces', 'informes', 'metas', 'salud', 'cuenta'], v0 = args.get('vista');
    A.tabs = T.tabs(document.getElementById('pestanas'), function (v) { vista = v; pintar(); });
    if (args.get('informe') === 'semanal' || args.get('informe') === 'mensual') { var aj = D.ajustes(); aj.periodo = args.get('informe'); D.guardarAjustes(aj); }
    if (args.get('dom')) V.dominiosSet(args.get('dom'));
    if (v0 && ids.indexOf(v0) >= 0 && v0 !== 'tablero') A.tabs.ir(v0);
    A.cargar();
  }
  function puerta() {
    var p = document.getElementById('puerta'); p.hidden = false; p.textContent = '';
    p.appendChild(U.panel('Permiso para leer tus datos locales', [h('p', { txt: 'Para analizar tu trabajo, este módulo necesita LEER las bases de datos que guardan los demás módulos de Trabajos en este navegador (QR, dispositivos, drones, automatizaciones, video, 3D, realidad aumentada, contenido y monetización).' }),
      h('ul', { cls: 'an-lista' }, [h('li', { txt: 'Solo lectura: no se modifica nada, salvo la limpieza y la restauración que tú apruebes en la pestaña Salud.' }), h('li', { txt: 'Nada se envía a ningún servidor. Solo si pides un resumen con IA, verás antes el texto exacto y confirmarás el envío con tu propia clave.' }), h('li', { txt: 'Las claves de API de los otros módulos no se leen nunca.' })]),
      h('div', { cls: 'tr-acciones' }, [U.btn('Permitir lectura local', function () { try { g.localStorage.setItem(KP, 'si'); } catch (e) {} iniciar(); }, 'tr-pri', 'btn-permiso'), h('a', { cls: 'tr-btn', href: '../', txt: 'Ahora no' })])]));
  }
  if (permiso()) iniciar(); else puerta();
})(window);
