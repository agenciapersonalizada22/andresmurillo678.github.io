/* Arranque del estudio: tema, cuenta, carga de datos, pestanas principales y atajos. */
(function (g) {
  'use strict';
  var T = g.Tr, A = g.CApp, CC = g.CuentaTrabajos, U = g.CUI, pest, h = T.h, ini = false;
  T.tema(document.getElementById('btn-tema'));
  CC.integrar({ id: 'trabajos_contenido_ia', alm: g.CDatos.alm, cols: g.CDatos.COLS, sync: true, etiqueta: 'proyectos, piezas, series, prompts y métricas; nunca claves de IA ni archivos', alAplicar: function (n) { A.cargar().then(function () { T.aviso('Se actualizaron ' + n + ' elemento(s) desde tu cuenta.'); }); } });
  CC.chip(document.querySelector('.tr-barra'), document.getElementById('btn-tema'));
  A.pestana = function (v) { if (pest) pest.ir(v); };
  function cabecera() {
    var s = document.getElementById('cia-proy'); s.textContent = ''; A.proyectos.forEach(function (p) { var o = h('option', { value: p.id, txt: p.nombre }); s.appendChild(o); }); s.value = A.proyecto.id;
    var r = A.resumenIA(); document.getElementById('cia-ia').textContent = r.clave ? 'IA lista · hoy ' + r.dia + ' llamadas (~' + r.gasto.toFixed(2) + ' de ' + r.presupuesto + ' USD)' : 'IA sin clave (Ajustes) · plantillas locales activas';
  }
  document.getElementById('cia-proy').addEventListener('change', function (e) { A.cambiarProyecto(e.target.value); });
  A.on('proyecto', cabecera); A.on('ia', cabecera); A.on('guardado', function () { A.proyectos = A.proyectos.map(function (p) { return p.id === A.proyecto.id ? A.proyecto : p; }); });
  A.cargar().then(function () {
    cabecera(); g.CEstrategia.iniciar(document.getElementById('v-estrategia')); g.CProduccion.iniciar(document.getElementById('v-produccion')); g.COperacion.iniciar(document.getElementById('v-operacion')); g.CCalidad.iniciar(document.getElementById('v-calidad')); g.CAjustes.iniciar(document.getElementById('v-ajustes'));
    var nombres = ['estrategia', 'produccion', 'operacion', 'calidad', 'ajustes'];
    pest = T.tabs(document.getElementById('pestanas'), function (v) { var m = { estrategia: g.CEstrategia, operacion: g.COperacion, calidad: g.CCalidad }[v]; if (m && m.sub && ini) m.sub.refrescar(); }); ini = true; document.body.setAttribute('data-listo', '1');
    document.addEventListener('keydown', function (e) { if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return; if (e.altKey && /^[1-5]$/.test(e.key)) { pest.ir(nombres[+e.key - 1]); e.preventDefault(); } });
  }).catch(function (e) { console.error(e); T.aviso('No se pudo abrir el almacén local: ' + (e.message || e), 'error'); });
  g.addEventListener('beforeunload', function () { A.guardarProyecto(true); });
})(window);
