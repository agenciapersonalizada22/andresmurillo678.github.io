/* Captura rapida: boton flotante, hoja de entrada con lenguaje natural y dictado por voz (Web Speech si el navegador lo permite). */
(function (G) {
  'use strict';
  var doc = G.document, h = G.UI.h, UI = G.UI, F = G.Fechas, R = G.Repeticion, Mo = G.Modelo, NL = G.NL;
  var C = G.Captura = {}, rec = null;
  var SR = G.SpeechRecognition || G.webkitSpeechRecognition;
  C.hayVoz = function () { return !!SR; };
  C.dictar = function (cb) {
    if (!SR) { UI.aviso('Tu navegador no admite dictado por voz', { tipo: 'error' }); return; }
    if (rec) { try { rec.stop(); } catch (e) {} return; }
    var r = new SR(), final = '', cerrar = UI.aviso('Escuchando… habla ahora', { fijo: true, acciones: [{ txt: 'Detener', fn: function () { try { r.stop(); } catch (e) {} } }] });
    r.lang = 'es-ES'; r.interimResults = false; r.continuous = false; rec = r;
    r.onresult = function (e) { for (var i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '; };
    r.onerror = function (e) { UI.aviso(e.error === 'not-allowed' ? 'Permiso de micrófono denegado' : 'Error de dictado: ' + e.error, { tipo: 'error' }); };
    r.onend = function () { rec = null; cerrar(); if (final.trim()) cb(final.trim()); };
    try { r.start(); } catch (e) { rec = null; cerrar(); }
  };

  C.abrir = function (modo, texto) {
    modo = modo || 'tarea'; var App = G.App, S = App.store;
    var inp = h('textarea', { cls: 'campo', rows: modo === 'nota' ? 5 : 2, 'aria-label': 'Texto a capturar', placeholder: modo === 'nota' ? 'Escribe o dicta tu nota…' : 'Ej.: pagar luz mañana 6pm #hogar !alta', 'data-ini': 1, 'data-f': 1, style: 'resize:vertical' });
    inp.value = texto || '';
    var prev = h('div', { cls: 'preview-nl', style: 'padding:6px 0;min-height:30px', 'aria-live': 'polite' });
    var seg = h('div', { cls: 'seg', role: 'group', 'aria-label': 'Tipo' }, [['tarea', 'Tarea'], ['nota', 'Nota rápida']].map(function (x) { return h('button', { type: 'button', cls: 'btn', 'aria-pressed': String(modo === x[0]), txt: x[1], 'data-f': 1, on: { click: function () { var t = inp.value; d.cerrar(); C.abrir(x[0], t); } } }); }));
    function pintar() {
      prev.textContent = ''; if (modo !== 'tarea' || !inp.value.trim()) { if (modo === 'tarea') prev.appendChild(h('span', { cls: 'ayuda', txt: 'Entiende fechas, horas, #etiquetas, !prioridad, @lista, «cada lunes», «~30m»…' })); return; }
      var p = NL.parsear(inp.value), chips = [(p.titulo ? '✎ ' + p.titulo : '⚠ falta el título')];
      if (p.fecha) chips.push('📅 ' + F.etiqueta(p.fecha)); if (p.hora) chips.push('🕒 ' + p.hora); if (p.rep) chips.push('🔁 ' + R.describir(p.rep)); if (p.prioridad) chips.push('⚑ ' + Mo.PRIORIDADES[p.prioridad].nombre);
      p.etiquetas.forEach(function (e) { chips.push('#' + e); }); if (p.lista) chips.push('@' + p.lista); if (p.estimado) chips.push('⏱ ' + UI.fmtDur(p.estimado)); if (p.recordar != null) chips.push('🔔 ' + p.recordar + ' min antes');
      chips.forEach(function (c, i) { prev.appendChild(h('span', { cls: 'chip' + (i === 0 ? '' : ''), txt: c })); });
    }
    inp.addEventListener('input', pintar);
    function guardar(otra) {
      var t = inp.value; if (!t.trim()) return false;
      if (modo === 'tarea') { var r = G.VistaTareas.crearDesdeTexto(t, { lista: App.vista === 'tareas' && App.filtro.indexOf('lista:') === 0 ? App.filtro.slice(6) : '' }); if (!r) return false; UI.aviso('Tarea añadida: ' + r.titulo, { tipo: 'ok' }); UI.anunciar('Tarea añadida'); }
      else { var ls = t.trim().split('\n'), tit = ls[0].length <= 80 ? ls.shift() : '', n = S.poner('notas', Mo.nota({ titulo: tit.trim(), cuerpo: ls.join('\n').trim() || (tit ? '' : t.trim()), etiquetas: (t.match(/(^|\s)#([\wñáéíóú\/-]+)/gi) || []).map(function (x) { return x.trim().slice(1).toLowerCase(); }) })); App.titulos = null; UI.aviso('Nota guardada', { tipo: 'ok', acciones: [{ txt: 'Abrir', fn: function () { App.ir('notas', 'todas', { tipo: 'nota', id: n.id }); } }] }); }
      if (otra) { inp.value = ''; pintar(); inp.focus(); return false; }
    }
    var mic = SR ? h('button', { type: 'button', cls: 'btn', 'data-f': 1, 'aria-label': 'Dictar por voz', on: { click: function () { C.dictar(function (t) { inp.value = (inp.value + ' ' + t).trim(); pintar(); inp.focus(); }); } } }, [UI.icono('mic'), h('span', { txt: 'Dictar' })]) : null;
    var d = UI.dialogo({ titulo: 'Captura rápida', ancho: 520, cuerpo: h('div', {}, [seg, h('div', { style: 'margin-top:10px' }, [inp]), prev, mic ? h('div', { cls: 'fila' }, [mic]) : null]),
      acciones: [{ txt: 'Guardar y otra', fn: function () { return guardar(true); }, queda: true }, { txt: 'Guardar', cls: 'prim', fn: function () { return guardar(false); } }] });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (modo === 'tarea' && !e.shiftKey))) { e.preventDefault(); if (guardar(false) !== false) d.cerrar(); } });
    pintar(); return d;
  };
})(window);
