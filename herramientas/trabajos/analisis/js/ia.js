/* Resumen narrativo con IA: arma el mensaje EXACTO que se enviaria (solo agregados, nunca texto libre ni claves), con anonimizacion opcional. Puro. window.AnaIA
   La interfaz muestra `mensaje` tal cual y solo llama a VIA.consultar tras consentimiento explicito. */
(function (g, f) { var m = f(typeof require === 'function' && typeof module === 'object' ? require('./agregar.js') : g.AnaAgg); if (typeof module === 'object' && module.exports) module.exports = m; else g.AnaIA = m; })(typeof self !== 'undefined' ? self : this, function (Agg) {
  'use strict';
  var X = {}, U = Agg.u, col = Agg.col;
  X.SISTEMA = 'Eres un analista de operaciones para un creador independiente (drones, video, contenido con IA y finanzas). Recibes SOLO métricas agregadas en JSON. Responde en español, sin inventar datos que no estén en el JSON: 1) resumen narrativo en 5 líneas como máximo, 2) tres riesgos con el dato que los justifica, 3) plan de mejora de 5 pasos concretos y medibles. Si falta un dato, dilo.';
  /* nombres propios que podrian identificar a alguien: se cambian por alias estables */
  X.nombres = function (datos) {
    var s = {}; function add(v) { v = String(v || '').trim(); if (v.length >= 2) s[v] = 1; }
    [['monetizacion', 'proyectos'], ['monetizacion', 'clientes'], ['drones', 'proyectos'], ['automatizaciones', 'flujos'], ['contenido-ia', 'proyectos'], ['video-ia', 'proyectos'], ['reconstruccion-3d', 'proyectos'], ['realidad-aumentada', 'proyectos'], ['monetizacion', 'equipo']].forEach(function (p) { col(datos.modulos[p[0]], p[1]).forEach(function (x) { add(x.nombre); }); });
    col(datos.modulos.drones, 'bitacora').forEach(function (b) { add(b.piloto); add(b.dron); add(b.lugar); });
    var cfg = col(datos.modulos.monetizacion, 'config')[0]; if (cfg && cfg.emisor) { add(cfg.emisor.nombre); add(cfg.emisor.contacto); }
    return Object.keys(s).sort(function (a, b) { return b.length - a.length || (a < b ? -1 : 1); });
  };
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  X.anonimizar = function (texto, nombres) {
    var mapa = {}; nombres.forEach(function (nm, i) { mapa[nm] = 'Nombre-' + (i + 1); });
    var out = texto; nombres.forEach(function (nm) { out = out.replace(new RegExp(reEsc(JSON.stringify(nm).slice(1, -1)), 'gi'), mapa[nm]); });
    return { texto: out, mapa: mapa };
  };
  X.payload = function (an, modelo) {
    var d = an.dom, o = { periodo: { tipo: modelo.periodo.tipo, desde: modelo.periodo.desde, hasta: modelo.periodo.hasta }, kpis_periodo: modelo.kpis.map(function (k) { return { metrica: k.etq, valor: k.valor, periodo_anterior: k.previo }; }),
      modulos: an.resumen.map(function (m) { return { modulo: m.nombre, registros: m.registros, sin_datos: m.sinDatos }; }), almacenamiento_pct: an.cuota.pct == null ? null : Math.round(an.cuota.pct * 100), kpis: an.valores };
    if (d.drones && !d.drones.sinDatos) o.drones = { vuelos: d.drones.vuelos, horas: d.drones.horas, misiones: d.drones.misiones, incidencias: d.drones.incidencias };
    if (d.monetizacion && !d.monetizacion.sinDatos) o.finanzas = { moneda: d.monetizacion.moneda, ingresos: d.monetizacion.ingresos, gastos: d.monetizacion.gastos, margen: d.monetizacion.margen, por_cobrar: d.monetizacion.porCobrar, vencido: d.monetizacion.vencido };
    if (d.automatizaciones && !d.automatizaciones.sinDatos) o.automatizaciones = { flujos: d.automatizaciones.flujos, ejecuciones: d.automatizaciones.ejecuciones, tasa_exito: d.automatizaciones.tasaExito };
    if (d.contenido && !d.contenido.sinDatos) o.contenido = { piezas: d.contenido.piezas, por_estado: d.contenido.porEstado, vencidas: d.contenido.vencidas };
    if (an.rent && !an.rent.sinDatos) o.rentabilidad_proyectos = an.rent.proyectos.slice(0, 8).map(function (p) { return { proyecto: p.nombre, ingresos: p.ingresos, gastos: p.gastos, margen: p.margen, horas_vuelo: p.horasVuelo }; });
    if (an.roi && !an.roi.sinDatos) o.roi_equipo = { inversion: an.roi.inversion, roi: an.roi.roi, horas_para_recuperar: an.roi.horasParaRecuperar };
    if (an.ia && !an.ia.sinDatos) o.costo_ia = { gasto: an.ia.gasto, por_pieza: an.ia.costoPorPieza };
    o.recomendaciones_por_reglas = an.recomendaciones.map(function (r) { return { regla: r.titulo, nivel: r.nivel, datos: r.evidencia.map(function (e) { return e.etq + ': ' + e.valor; }) }; });
    return o;
  };
  /* -> {sistema, mensaje, mapa, bytes, claves: ['campos que se envian']} ; mensaje es exactamente lo que se manda como texto del usuario */
  X.construir = function (an, modelo, datos, anonimo) {
    var json = JSON.stringify(X.payload(an, modelo), null, 1), mapa = {};
    if (anonimo) { var a = X.anonimizar(json, X.nombres(datos)); json = a.texto; mapa = a.mapa; }
    var mensaje = 'Analiza estas métricas de mi sistema de trabajo (' + modelo.periodo.etiqueta + '). Datos' + (anonimo ? ' anonimizados' : '') + ':\n' + json;
    return { sistema: X.SISTEMA, mensaje: mensaje, mapa: mapa, bytes: (X.SISTEMA + mensaje).length, secciones: Object.keys(JSON.parse(json)) };
  };
  /* si se anonimizo, la respuesta puede citar alias: se devuelven a nombres reales solo en pantalla */
  X.desanonimizar = function (texto, mapa) { var out = texto; Object.keys(mapa).sort(function (a, b) { return mapa[b].length - mapa[a].length; }).forEach(function (nm) { out = out.split(mapa[nm]).join(nm); }); return out; };
  return X;
});
