/* Soporte opcional de mando Xbox (window.Mando): navegar tarjetas, abrir, guardar, filtros y secciones. */
(function () {
  if (!window.Mando) return;
  var Of = window.Of, A = Of.app, M = window.Mando, ult = 0, VISTAS = ['ofertas', 'nuevas', 'guardadas', 'alertas', 'ahorro', 'fuentes', 'ajustes'];
  function enfocables(d) { return A.$$('button,a[href],input,select,textarea,[tabindex="0"]', d).filter(function (e) { return !e.disabled && e.offsetParent !== null; }); }
  function paso(dlg, dir) {
    var l = enfocables(dlg), i = l.indexOf(document.activeElement);
    if (l.length) l[(i + dir + l.length) % l.length].focus();
  }
  function bucle(t) {
    requestAnimationFrame(bucle);
    M.leer();
    if (!M.conectado) return;
    var dlg = A.$$('dialog[open]').pop(), S = A.S, ok = t - ult > 170;
    var x = (M.sostenido('DER') ? 1 : 0) - (M.sostenido('IZQ') ? 1 : 0) + Math.round(M.ejes.izq.x);
    var y = (M.sostenido('ABAJO') ? 1 : 0) - (M.sostenido('ARRIBA') ? 1 : 0) + Math.round(M.ejes.izq.y);
    if (dlg) {
      if (M.pulsado('B')) dlg.close();
      else if (M.pulsado('A') && document.activeElement && document.activeElement.click) document.activeElement.click();
      else if (ok && (x || y)) { ult = t; paso(dlg, x + y > 0 ? 1 : -1); }
      return;
    }
    if (M.pulsado('B') && A.$('#filtros').classList.contains('abierto') && innerWidth < 900) { A.cerrarFiltros(); return; }
    if (M.pulsado('Y')) { A.abrirFiltros(); return; }
    if (M.pulsado('RB')) { A.ir(VISTAS[(VISTAS.indexOf(S.vista) + 1) % VISTAS.length]); return; }
    if (M.pulsado('LB')) { A.ir(VISTAS[(VISTAS.indexOf(S.vista) + VISTAS.length - 1) % VISTAS.length]); return; }
    if (M.pulsado('A')) { var it = A.selItem(); if (it) A.abrirDetalle(it); return; }
    if (M.pulsado('X')) {
      var it2 = A.selItem();
      if (it2) { var on = A.toggleGuardar(it2); A.toast(on ? 'Guardada' : 'Quitada de guardadas'); }
      return;
    }
    if (A.listaActiva && ok) {
      var c = A.listaActiva.virt.columnas();
      if (M.gatillo.der > 0.5) { ult = t; A.mover(c * 3); }
      else if (M.gatillo.izq > 0.5) { ult = t; A.mover(-c * 3); }
      else if (x || y) { ult = t; A.mover(x + y * c); }
    }
  }
  requestAnimationFrame(bucle);
})();
