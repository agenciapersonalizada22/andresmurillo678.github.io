/* Datos de ejemplo deterministas: 500 notas y 300 tareas (libretas, listas, etiquetas jerarquicas, enlaces, repeticiones). */
(function (G) {
  'use strict';
  var F = G.Fechas, Mo = G.Modelo, E = G.Ejemplos = {};
  function rng(sem) { var s = sem >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  var TEMAS = ['proyecto', 'reunión', 'presupuesto', 'viaje', 'receta', 'lectura', 'idea', 'diseño', 'código', 'salud', 'finanzas', 'hogar', 'estudio', 'compras', 'plan', 'informe', 'cliente', 'deporte', 'música', 'jardín'];
  var VERBOS = ['Revisar', 'Llamar a', 'Preparar', 'Enviar', 'Comprar', 'Pagar', 'Organizar', 'Escribir', 'Reservar', 'Actualizar', 'Estudiar', 'Limpiar', 'Planificar', 'Entregar'];
  var FRASES = ['Hay que decidir el alcance antes del viernes.', 'Pendiente de confirmar con el equipo.', 'Ver comparativa de precios y elegir la mejor opción.', 'Anotar las dudas para la próxima reunión.', 'Referencia útil guardada para más adelante.', 'Resumen de los puntos principales y próximos pasos.', 'Recordar revisar los costes y el calendario.'];
  E.cargar = function (store, hoy) {
    hoy = hoy || F.hoy(); var r = rng(42), pick = function (a) { return a[Math.floor(r() * a.length)]; };
    var libs = ['Trabajo', 'Personal', 'Estudio', 'Ideas', 'Viajes', 'Recetas'].map(function (n, i) { return store.poner('libretas', Mo.libreta({ id: 'ej_lb' + i, nombre: n, orden: i })); });
    var listas = ['Personal', 'Trabajo', 'Hogar', 'Proyecto web'].map(function (n, i) { return store.poner('listas', Mo.lista({ id: 'ej_ls' + i, nombre: n, orden: i, color: 'var(--c' + (i + 1) + ')', tipo: i === 3 ? 'proyecto' : 'lista' })); });
    var tags = ['trabajo', 'trabajo/proyectos', 'trabajo/reuniones', 'personal', 'hogar', 'finanzas', 'ideas', 'estudio/mates', 'estudio/historia', 'salud'];
    var titulos = [];
    var t0 = Date.now();
    for (var i = 0; i < 500; i++) {
      var tema = TEMAS[i % TEMAS.length], tit = tema[0].toUpperCase() + tema.slice(1) + ' ' + (i + 1) + ' ' + pick(['semanal', 'borrador', 'resumen', 'notas', 'lista', 'esquema']);
      var cuerpo = '## ' + tit + '\n\n' + pick(FRASES) + ' ' + pick(FRASES) + '\n\n- [ ] ' + pick(VERBOS) + ' ' + tema + '\n- [x] ' + pick(VERBOS) + ' ' + pick(TEMAS) + '\n- Punto sobre **' + pick(TEMAS) + '** y *' + pick(TEMAS) + '*\n';
      if (i > 20 && i % 7 === 0) cuerpo += '\nVer también [[' + titulos[Math.floor(r() * titulos.length)] + ']].\n';
      if (i % 11 === 0) cuerpo += '\n| Concepto | Valor |\n| --- | --- |\n| ' + tema + ' | ' + Math.floor(r() * 900) + ' |\n';
      for (var k = 0; k < (i % 5); k++) cuerpo += '\n' + pick(FRASES);
      titulos.push(tit);
      var t = t0 - Math.floor(r() * 60) * 86400000 - i * 1000;
      store.poner('notas', Mo.nota({ id: 'ej_n' + i, titulo: tit, cuerpo: cuerpo, libreta: i % 9 < 6 ? libs[i % 6].id : '', etiquetas: [pick(tags)].concat(i % 4 === 0 ? [pick(tags)] : []).filter(function (x, j, a) { return a.indexOf(x) === j; }), fijada: i % 40 === 0, color: i % 13 === 0 ? 'var(--c' + (1 + i % 8) + ')' : '', creada: t, modificada: t }));
    }
    for (var j = 0; j < 300; j++) {
      var dias = Math.floor(r() * 40) - 8, hecha = j % 6 === 0, tema2 = pick(TEMAS), rep = null;
      if (j % 17 === 0) rep = { tipo: 'semana', cada: 1, base: 'fecha', dias: [1 + (j % 5)] }; else if (j % 23 === 0) rep = { tipo: 'mes', cada: 1, base: 'fecha' };
      store.poner('tareas', Mo.tarea({ id: 'ej_t' + j, titulo: pick(VERBOS) + ' ' + tema2 + ' ' + (j + 1), lista: j % 5 === 0 ? '' : pick(listas).id, prioridad: j % 5, fecha: j % 9 === 0 ? '' : F.sumDias(hoy, dias), hora: j % 3 === 0 ? F.p2(8 + j % 11) + ':' + (j % 2 ? '30' : '00') : '', rep: rep, etiquetas: j % 2 ? [pick(tags)] : [], estado: hecha ? 'hecha' : 'pendiente', hecha: hecha ? Date.now() - Math.floor(r() * 12) * 86400000 : 0, estimado: j % 4 === 0 ? 30 + (j % 3) * 30 : 0, orden: j }));
    }
    for (var q = 0; q < 14; q++) store.poner('hechos', { id: 'ej_h' + q, tarea: 'ej_t' + q, titulo: 'Ejemplo', ts: Date.now() - q * 86400000, fecha: F.sumDias(hoy, -q), lista: '', prioridad: 0 });
    G.App.titulos = null;
  };
})(window);
