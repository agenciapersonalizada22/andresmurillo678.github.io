/* Atajos de teclado globales. */
(function (G) {
  'use strict';
  var doc = G.document, UI = G.UI, A = G.Atajos = {}, g = 0;
  function enTexto(e) { var t = e.target; return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable); }
  function filas() { return Array.prototype.filter.call(doc.querySelectorAll('#contenido .lista-t .t-cuerpo, #contenido .lista-n .fila-n, #contenido .tablero .t-cuerpo'), function (e) { return e.offsetParent !== null; }); }
  A.iniciar = function () {
    doc.addEventListener('keydown', function (e) {
      var ctrl = e.ctrlKey || e.metaKey;
      if (G.Lobby && G.Lobby.abierto) return;
      if (ctrl && e.key.toLowerCase() === 'k') { e.preventDefault(); if (G.Paleta) G.Paleta.abrir(); return; }
      if (e.key === 'Escape') { if (doc.querySelector('.menu')) return; if (!UI.hayDialogo() && !enTexto(e)) { if (doc.body.classList.contains('menu-abierto')) G.App.alternarMenu(false); else if (G.App.sel) G.App.cerrarDetalle(); } return; }
      if (enTexto(e) || ctrl || e.altKey || UI.hayDialogo() || doc.querySelector('.menu')) return;
      var k = e.key, App = G.App;
      if (g && (Date.now() - g < 1200)) {
        g = 0; var m = { h: ['tareas', 'hoy'], i: ['tareas', 'bandeja'], p: ['tareas', 'proximos'], n: ['notas', 'todas'], c: ['calendario', ''], k: ['tablero', ''], l: ['linea', ''], e: ['enfoque', ''], s: ['stats', ''], b: ['habitos', ''], a: ['ajustes', '']}[k.toLowerCase()];
        if (m) { e.preventDefault(); App.ir(m[0], m[1]); return; }
      }
      if (k === 'g') { g = Date.now(); return; }
      if (k === 'n') { e.preventDefault(); App.nuevaNota(); }
      else if (k === 't') { e.preventDefault(); G.Captura.abrir('tarea'); }
      else if (k === '/') { e.preventDefault(); App.ir('buscar', ''); }
      else if (k === '?') { e.preventDefault(); App.ir('ajustes'); }
      else if (k === '[') { App.alternarMenu(); }
      else if (k === 'j' || k === 'k') {
        var f = filas(), i = f.indexOf(doc.activeElement); if (!f.length) return; e.preventDefault();
        var n = k === 'j' ? (i < 0 ? 0 : Math.min(f.length - 1, i + 1)) : (i < 0 ? 0 : Math.max(0, i - 1)); f[n].focus();
      } else if (k === 'x') { var fila = doc.activeElement && doc.activeElement.closest && doc.activeElement.closest('.fila-t,.card-k'); if (fila && fila.dataset.id) { e.preventDefault(); G.VistaTareas.completar(fila.dataset.id); } }
      else if (k === 'Delete') { var f2 = doc.activeElement && doc.activeElement.closest && doc.activeElement.closest('.fila-t,.card-k,.fila-n'); if (f2 && f2.dataset.id) { e.preventDefault(); f2.classList.contains('fila-n') ? G.VistaNotas.eliminar(f2.dataset.id) : G.VistaTareas.eliminar(f2.dataset.id); } }
    });
  };
})(window);
