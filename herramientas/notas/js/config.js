/* Ajustes y progreso en localStorage con prefijo notas_.
   notas_ajustes_dispositivo: apariencia/controles de este equipo (nunca se sincroniza); notas_ajustes: preferencias de cuenta; notas_progreso: marcas de uso. */
(function (G) {
  'use strict';
  var C = {};
  var DISP = { tema: 'auto', textoGrande: false, escala: 100, reducir: 'auto', contraste: false, daltonismo: false, zurdo: false, gestos: true, vibracion: true, sonido: true, mandoRepeticion: 220, mandoVibra: true, densidad: 'normal' };
  var PREF = { pomo: { trabajo: 25, corto: 5, largo: 15, cada: 4, auto: false }, aviso: 0, inicioSemana: 1, vistaNotas: 'lista', ordenNotas: 'modificada', ordenTareas: 'fecha', ocultarHechas: false, papeleraDias: 30, resumen: true };
  function leer(k, def) {
    var o = {}; try { o = JSON.parse(G.localStorage.getItem(k)) || {}; } catch (e) {}
    var r = JSON.parse(JSON.stringify(def)); Object.keys(o).forEach(function (q) { if (typeof o[q] === 'object' && o[q] && !Array.isArray(o[q]) && typeof r[q] === 'object') Object.assign(r[q], o[q]); else r[q] = o[q]; }); return r;
  }
  function guardar(k, v) { try { G.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  C.disp = leer('notas_ajustes_dispositivo', DISP);
  C.pref = leer('notas_ajustes', PREF);
  C.prog = leer('notas_progreso', { tutorial: false, avisados: 0 });
  C.setDisp = function (k, v) { C.disp[k] = v; guardar('notas_ajustes_dispositivo', C.disp); C.aplicar(); };
  C.setPref = function (k, v) { C.pref[k] = v; guardar('notas_ajustes', C.pref); };
  C.setProg = function (k, v) { C.prog[k] = v; guardar('notas_progreso', C.prog); };
  C.guardarPref = function () { guardar('notas_ajustes', C.pref); };
  C.exportar = function () { return JSON.stringify({ notas_ajustes: C.pref, notas_progreso: C.prog }); };
  C.aplicar = function () {
    var r = G.document.documentElement, d = C.disp;
    r.dataset.tema = d.tema; r.style.fontSize = (16 * (d.escala / 100) * (d.textoGrande ? 1.18 : 1)) + 'px';
    r.classList.toggle('reducir', d.reducir === 'si' || (d.reducir === 'auto' && G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches));
    r.classList.toggle('contraste', !!d.contraste); r.classList.toggle('daltonismo', !!d.daltonismo); r.classList.toggle('zurdo', !!d.zurdo); r.classList.toggle('compacto', d.densidad === 'compacta');
    var m = G.document.querySelector('meta[name=theme-color]'); if (m) { var osc = d.tema === 'oscuro' || (d.tema === 'auto' && G.matchMedia && G.matchMedia('(prefers-color-scheme: dark)').matches); m.content = osc ? '#14161a' : '#ffffff'; }
  };
  G.Config = C;
})(window);
