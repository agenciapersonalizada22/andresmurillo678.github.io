/* Navegacion con mando Xbox (opcional): cruceta/stick mueve el foco, A pulsa, B cierra/vuelve, LB/RB cambian de vista. Requiere juego/comun/mando.js. */
(function () {
  if (!window.Mando) return;
  var SEL = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  var ultimo = 0, rep = 0;
  function visibles() {
    var d = document.querySelector('dialog[open]'), raiz = d || document;
    return Array.prototype.filter.call(raiz.querySelectorAll(SEL), function (e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
  }
  function mover(dx, dy) {
    var act = document.activeElement, lista = visibles();
    if (!act || act === document.body || lista.indexOf(act) < 0) { if (lista[0]) lista[0].focus(); return; }
    var a = act.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, mejor = null, mp = 1e9;
    lista.forEach(function (e) {
      if (e === act) return; var r = e.getBoundingClientRect(), x = r.left + r.width / 2 - ax, y = r.top + r.height / 2 - ay;
      var along = dx ? x * dx : y * dy, across = dx ? Math.abs(y) : Math.abs(x);
      if (along <= 4) return; var p = along + across * 2.2; if (p < mp) { mp = p; mejor = e; }
    });
    if (mejor) { mejor.focus(); mejor.scrollIntoView({ block: 'nearest' }); }
  }
  function bucle(t) {
    requestAnimationFrame(bucle); Mando.leer();
    if (!Mando.conectado) return;
    document.body.classList.toggle('mando-activo', !!Mando.activo);
    var ed = document.activeElement && /^(TEXTAREA|INPUT)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'checkbox' && document.activeElement.type !== 'button';
    var dx = (Mando.pulsado('DER') ? 1 : 0) - (Mando.pulsado('IZQ') ? 1 : 0), dy = (Mando.pulsado('ABAJO') ? 1 : 0) - (Mando.pulsado('ARRIBA') ? 1 : 0);
    var s = Mando.ejes.izq; if (!dx && !dy && Math.hypot(s.x, s.y) > 0.6 && t - ultimo > (rep ? 180 : 350)) { if (Math.abs(s.x) > Math.abs(s.y)) dx = s.x > 0 ? 1 : -1; else dy = s.y > 0 ? 1 : -1; ultimo = t; rep = 1; }
    if (Math.hypot(s.x, s.y) < 0.3) rep = 0;
    if (dx || dy) mover(dx, dy);
    if (Mando.pulsado('A') && document.activeElement && !ed) document.activeElement.click();
    if (Mando.pulsado('B')) { var d = document.querySelector('dialog[open]'); if (d) U.cerrarDialogo(d); else if (window.MandoUI && MandoUI.atras) MandoUI.atras(); }
    if (Mando.pulsado('LB') && window.MandoUI && MandoUI.vista) MandoUI.vista(-1);
    if (Mando.pulsado('RB') && window.MandoUI && MandoUI.vista) MandoUI.vista(1);
    if (Mando.pulsado('Y') && window.MandoUI && MandoUI.accion) MandoUI.accion();
  }
  window.MandoUI = window.MandoUI || {};
  requestAnimationFrame(bucle);
})();
