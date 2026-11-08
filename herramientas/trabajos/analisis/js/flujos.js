/* Flujos sugeridos para Automatizaciones (JSON importable con su boton «Importar»). Puro. window.AnaFlujos
   Honestidad: Automatizaciones no puede leer las bases de otros modulos, asi que estos flujos RECUERDAN y abren Analisis, que es quien calcula informes y alertas. */
(function (g, f) { var m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else g.AnaFlujos = m; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function F(nombre, nodos, aristas) {
    return { nombre: nombre, vars: {}, nodos: nodos.map(function (n) { return { id: n[0], tipo: n[1], x: n[2], y: n[3], cfg: n[4] || {} }; }), aristas: aristas.map(function (s) { var m = /^(\w+)(?:\.(\w+))?>(\w+)$/.exec(s); return { de: m[1], sal: m[2] || 'sal', a: m[3] }; }) };
  }
  var X = {};
  X.sugeridos = function (base) {
    base = String(base || './').replace(/[?#].*$/, '');
    function url(q) { return base + '?' + q; }
    return [
      { id: 'informe_semanal', nombre: 'Informe semanal automático', desc: 'Cada lunes a las 08:30 te avisa y abre el informe semanal de Análisis, listo para imprimir o exportar.',
        limite: 'El navegador debe estar abierto (o la pestaña de Automatizaciones activa); el informe lo calcula Análisis al abrirse.',
        flujo: F('Informe semanal (Análisis)', [['n1', 'hora_dia', 40, 40, { hora: '08:30', dias: '1' }], ['n2', 'plantilla', 300, 40, { texto: 'Lunes {{ahora.fecha}}: tu informe semanal de Trabajos está listo para revisar en Análisis.' }], ['n3', 'notificacion', 560, 0, { titulo: 'Informe semanal', texto: '{{ultimo.texto}}' }], ['n4', 'enlace', 560, 120, { url: url('vista=informes&informe=semanal') }]], ['n1>n2', 'n2>n3', 'n2>n4']) },
      { id: 'alerta_cuota', nombre: 'Revisión diaria de cuota y alertas', desc: 'Cada día a las 18:00 avisa y abre el tablero de Análisis donde se ven la cuota de almacenamiento y las alertas de tus metas.',
        limite: 'No lee la cuota por sí mismo: abre el tablero, que sí la calcula. Las alertas se evalúan al abrir Análisis.',
        flujo: F('Revisión de cuota y alertas (Análisis)', [['n1', 'hora_dia', 40, 40, { hora: '18:00', dias: '' }], ['n2', 'notificacion', 300, 0, { titulo: 'Revisa tu almacenamiento', texto: 'Mira la cuota y las alertas de metas en Análisis.' }], ['n3', 'enlace', 300, 120, { url: url('vista=tablero') }]], ['n1>n2', 'n1>n3']) },
      { id: 'alerta_fallos', nombre: 'Revisión de fallos de automatizaciones', desc: 'Los viernes a las 17:00 abre el análisis de automatizaciones (tasa de éxito y flujos que fallan).',
        limite: 'Solo recuerda y abre la vista; los fallos los calcula Análisis a partir del registro de ejecuciones.',
        flujo: F('Revisión de fallos (Análisis)', [['n1', 'hora_dia', 40, 40, { hora: '17:00', dias: '5' }], ['n2', 'notificacion', 300, 0, { titulo: 'Fallos de automatizaciones', texto: 'Revisa qué flujos fallaron esta semana.' }], ['n3', 'enlace', 300, 120, { url: url('vista=dominios&dom=automatizaciones') }]], ['n1>n2', 'n1>n3']) },
      { id: 'respaldo_mensual', nombre: 'Recordatorio de respaldo', desc: 'Los domingos a las 20:00 recuerda exportar el respaldo completo.',
        limite: 'No puede crear el respaldo por ti (necesita tu gesto para descargar el archivo).',
        flujo: F('Recordatorio de respaldo (Análisis)', [['n1', 'hora_dia', 40, 40, { hora: '20:00', dias: '0' }], ['n2', 'notificacion', 300, 0, { titulo: 'Respaldo de Trabajos', texto: 'Exporta tu respaldo completo en Análisis → Salud.' }], ['n3', 'enlace', 300, 120, { url: url('vista=salud') }]], ['n1>n2', 'n1>n3']) }
    ];
  };
  return X;
});
