/* Plan de 30 dias, ideas semanales por reglas y puntuacion de ideas. */
(function (g, f) { var m = f(g); if (typeof module === 'object' && module.exports) module.exports = m; else g.Plan = m; })(typeof self !== 'undefined' ? self : globalThis, function (g) {
  var F = g.Fechas || require('./fechas.js'), P = g.Plantillas || require('../../escritor/js/plantillas.js'), M = g.Modelo || require('./modelo.js');
  var FORMATO_RED = { 'Video corto': ['tiktok', 'instagram', 'youtube'], 'Carrusel': ['instagram', 'linkedin'], 'Hilo': ['x', 'linkedin'], 'Publicación con imagen': ['instagram', 'facebook', 'linkedin'], 'Historia': ['instagram', 'facebook'], 'Encuesta': ['x', 'linkedin', 'facebook'] };
  function puntuar(i) { return Math.round(((+i.impacto || 3) * 0.4 + (+i.encaje || 3) * 0.35 + (6 - (+i.esfuerzo || 3)) * 0.25) / 5 * 100); }
  function elegirRed(formato, redes, k) { var pref = (FORMATO_RED[formato] || []).filter(function (r) { return redes.indexOf(r) >= 0; }); var l = pref.length ? pref : redes; return l[k % l.length]; }
  function horaPara(red, fecha, horarios) {
    var l = (horarios && horarios[red]) || M.HORARIOS_DEF[red] || [], d = F.dow(fecha), c = l.filter(function (x) { return x[0] === d; })[0] || l[0];
    return c ? c[1] : '09:00';
  }
  /* opts: {nicho, redes[], inicio, cadaDias (1 = diario, 2 = cada 2 dias...), horarios, zona, semilla} */
  function plan30(o) {
    var redes = o.redes && o.redes.length ? o.redes : ['instagram'], cada = Math.max(1, o.cadaDias || 1), items = P.calendario(o.nicho, 30, o.semilla), out = [], k = 0;
    for (var d = 0; d < 30; d += cada) {
      var it = items[d], fecha = F.sumarDias(o.inicio, d), red = elegirRed(it.formato, redes, k++);
      out.push(M.nuevaPub({ titulo: it.tema, red: red, formato: it.formato, estado: 'idea', fecha: fecha, hora: horaPara(red, fecha, o.horarios), zona: o.zona || '', tema: it.pilar, notas: 'Plan de 30 días · día ' + it.dia + ' · ' + it.pilar }));
    }
    return out;
  }
  function ideasSemana(o) {
    var items = P.calendario(o.nicho, 7, o.semilla), redes = o.redes && o.redes.length ? o.redes : ['instagram'];
    return items.map(function (it, i) { return { titulo: it.tema, formato: it.formato, red: elegirRed(it.formato, redes, i), tema: it.pilar, nota: it.pilar, impacto: 3, esfuerzo: it.formato === 'Video corto' ? 3 : 2, encaje: 3 }; });
  }
  return { puntuar: puntuar, plan30: plan30, ideasSemana: ideasSemana, horaPara: horaPara };
});
