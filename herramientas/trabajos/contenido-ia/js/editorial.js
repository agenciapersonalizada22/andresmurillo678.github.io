/* Planificador editorial, cola, recordatorios, kanban y exportacion al Calendario (CSV). Puro. CIA.editorial */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else { g.CIA = g.CIA || {}; g.CIA.editorial = m; } })(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';
  var E = {};
  E.ESTADOS = [['idea', 'Idea'], ['guion', 'Guion'], ['produccion', 'Producción'], ['listo', 'Listo'], ['programado', 'Programado'], ['publicado', 'Publicado']];
  var ORDEN = { listo: 0, produccion: 1, guion: 2, idea: 3, programado: 4, publicado: 5 };
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function utc(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (!m) throw new Error('Fecha inválida: ' + s); return Date.UTC(+m[1], +m[2] - 1, +m[3]); }
  function fmt(ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
  E.sumarDias = function (s, n) { return fmt(utc(s) + n * 86400000); };
  E.diaSemana = function (s) { return new Date(utc(s)).getUTCDay(); };
  E.dias = function (a, b) { return Math.round((utc(b) - utc(a)) / 86400000); };
  E.hoy = function (ahora) { var d = new Date(ahora == null ? Date.now() : ahora); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  E.validaHora = function (h) { return /^([01]?\d|2[0-3]):[0-5]\d$/.test(h || ''); };
  function hh(h) { return ('0' + h).slice(-5); }

  /* cadencia: {canal:{dias:[0..6], hora:'HH:MM'}} -> huecos ordenados entre desde y hasta (incluidos) */
  E.huecos = function (cadencia, desde, hasta) {
    var out = [], n = E.dias(desde, hasta);
    Object.keys(cadencia || {}).forEach(function (canal) {
      var c = cadencia[canal]; if (!c || !c.dias || !c.dias.length) return;
      for (var i = 0; i <= n; i++) { var f = E.sumarDias(desde, i); if (c.dias.indexOf(E.diaSemana(f)) >= 0) out.push({ canal: canal, fecha: f, hora: hh(c.hora || '09:00') }); }
    });
    return out.sort(function (a, b) { return (a.fecha + a.hora) < (b.fecha + b.hora) ? -1 : (a.fecha + a.hora) > (b.fecha + b.hora) ? 1 : 0; });
  };
  /* piezas sin fecha se reparten en los huecos libres de su canal (las mas avanzadas primero) */
  E.planificar = function (o) {
    var piezas = o.piezas || [], hasta = o.hasta || E.sumarDias(o.desde, (o.semanas || 4) * 7 - 1);
    var ocu = {}; piezas.forEach(function (p) { if (p.fecha && p.canal) ocu[p.canal + '|' + p.fecha + '|' + hh(p.hora || '09:00')] = 1; });
    var libres = E.huecos(o.cadencia, o.desde, hasta).filter(function (h) { return !ocu[h.canal + '|' + h.fecha + '|' + h.hora]; });
    var pend = piezas.filter(function (p) { return !p.fecha && p.canal && p.estado !== 'publicado'; }).sort(function (a, b) { return (ORDEN[a.estado] == null ? 9 : ORDEN[a.estado]) - (ORDEN[b.estado] == null ? 9 : ORDEN[b.estado]) || (a._creado || 0) - (b._creado || 0); });
    var asign = [], sin = [];
    pend.forEach(function (p) { var i = libres.findIndex(function (h) { return h.canal === p.canal; }); if (i < 0) sin.push(p.id); else { var h = libres.splice(i, 1)[0]; asign.push({ id: p.id, canal: p.canal, fecha: h.fecha, hora: h.hora }); } });
    return { asignaciones: asign, sinHueco: sin, huecosLibres: libres, hasta: hasta };
  };
  /* reparto de pilares frente a los pesos objetivo: avisa de desvios > 15 puntos */
  E.balancePilares = function (piezas, pilares) {
    var tot = 0, cnt = {}; piezas.forEach(function (p) { if (p.pilar) { cnt[p.pilar] = (cnt[p.pilar] || 0) + 1; tot++; } });
    var pesoTot = pilares.reduce(function (a, p) { return a + (+p.peso || 0); }, 0) || 1;
    return pilares.map(function (p) { var real = tot ? (cnt[p.nombre] || 0) / tot * 100 : 0, obj = (+p.peso || 0) / pesoTot * 100; return { nombre: p.nombre, real: Math.round(real), objetivo: Math.round(obj), alerta: tot >= 4 && Math.abs(real - obj) > 15, n: cnt[p.nombre] || 0 }; });
  };
  function ms(p) { var f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.fecha || ''); if (!f) return null; var h = (hh(p.hora || '09:00')).split(':'); return new Date(+f[1], +f[2] - 1, +f[3], +h[0], +h[1]).getTime(); }
  E.momento = ms;
  /* cola: programadas/listas con fecha, ordenadas; marca vencidas */
  E.cola = function (piezas, ahora) {
    return piezas.filter(function (p) { return p.fecha && p.estado !== 'publicado' && p.estado !== 'idea'; }).map(function (p) { var t = ms(p); return { pieza: p, t: t, vencida: t < ahora, enHoras: Math.round((t - ahora) / 36e5 * 10) / 10 }; }).sort(function (a, b) { return a.t - b.t; });
  };
  /* recordatorios que ya toca avisar (no avisados antes): pieza.recordar = minutos antes */
  E.recordatoriosDebidos = function (piezas, ahora) {
    return piezas.filter(function (p) { return p.fecha && p.recordar > 0 && !p.recordado && p.estado !== 'publicado' && p.estado !== 'idea'; }).filter(function (p) { var t = ms(p); return ahora >= t - p.recordar * 60000 && ahora < t + 12 * 36e5; });
  };
  E.mover = function (p, estado) { if (!ORDEN.hasOwnProperty(estado)) throw new Error('Estado desconocido'); p.estado = estado; return p; };

  /* exportacion al Calendario (contenido/calendario/js/csv.js: columnas titulo, red, formato, estado, fecha, hora...) */
  var RED = { youtube: 'youtube', tiktok: 'tiktok', instagram: 'instagram', x: 'x', facebook: 'facebook', twitch: 'youtube', podcast: 'youtube', blog: 'linkedin', newsletter: 'linkedin' };
  var FORMATO = { corto: 'Video corto', largo: 'Video largo', hilo: 'Hilo', carrusel: 'Carrusel', podcast: 'Video largo', newsletter: 'Texto', blog: 'Texto', directo: 'En vivo', publicacion: 'Publicación con imagen' };
  var EST = { idea: 'idea', guion: 'guion', produccion: 'grabacion', listo: 'edicion', programado: 'programado', publicado: 'publicado' };
  E.filasCalendario = function (piezas, nombreSerie) {
    return piezas.map(function (p) {
      var red = RED[p.canal] || 'x', nota = RED[p.canal] === p.canal ? '' : 'Canal original: ' + p.canal;
      var m = p.metricas || {};
      return { id: '', titulo: p.titulo || '(sin título)', red: red, formato: FORMATO[p.formato] || 'Texto', estado: EST[p.estado] || 'idea', fecha: p.fecha || '', hora: p.hora || '', zona: '', campana: '', serie: p.serie ? (nombreSerie && nombreSerie[p.serie]) || '' : '', tema: [p.pilar, nota].filter(Boolean).join(' · '), texto: (p.descripcion || '').slice(0, 2000), enlace: p.publicadoUrl || '', vistas: m.vistas || 0, likes: m.likes || 0, comentarios: m.comentarios || 0, compartidos: m.compartidos || 0, clics: m.clics || 0 };
    });
  };
  return E;
});
