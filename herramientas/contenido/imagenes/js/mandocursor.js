/* Mando Xbox opcional: cursor virtual para dibujar y editar (usa juego/comun/mando.js). */
(function (IM) {
  var E = IM.E, M = window.Mando, cur = null, x = 200, y = 200, abajo = false, ultimoT = 0, activo = false;
  function ev() { return { cx: x, cy: y, pr: 1, tipo: 'mando', shift: M.sostenido('RB') && false, alt: false, ctrl: false, id: 'mando' }; }
  function dentro() { var r = IM.Vista.area.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
  function paso(t) {
    requestAnimationFrame(paso);
    if (!M) return; M.leer();
    if (!M.conectado) { if (activo) { activo = false; cur.hidden = true; if (abajo) { IM.Entrada.arriba(ev()); abajo = false; } } return; }
    if (document.querySelector('.dialogo[open]')) return;
    var dt = Math.min(0.05, (t - ultimoT) / 1000 || 0.016); ultimoT = t;
    if (!activo) { activo = true; var r = IM.Vista.area.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; cur.hidden = false; IM.aviso('Mando conectado: stick izquierdo mueve el cursor, A hace clic'); }
    var l = M.ejes.izq, rr = M.ejes.der, vel = 650 * (M.sostenido('R3') ? 0.3 : 1);
    x = IM.clamp(x + l.x * Math.abs(l.x) * vel * dt * 1.4, 0, innerWidth - 2); y = IM.clamp(y + l.y * Math.abs(l.y) * vel * dt * 1.4, 0, innerHeight - 2);
    cur.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    if (rr.x || rr.y) IM.Vista.mover(-rr.x * 600 * dt, -rr.y * 600 * dt);
    if (M.sostenido('RB')) IM.Vista.zoom(1 + 1.2 * dt, x, y); if (M.sostenido('LB')) IM.Vista.zoom(1 - 1.0 * dt, x, y);
    if (M.gatillo.der > 0.2) { E.pincel.tam = IM.clamp(E.pincel.tam * (1 + M.gatillo.der * dt * 2), 1, 600); IM.Vista.pedirOv(); } if (M.gatillo.izq > 0.2) { E.pincel.tam = IM.clamp(E.pincel.tam * (1 - M.gatillo.izq * dt * 2), 1, 600); IM.Vista.pedirOv(); }
    if (M.pulsado('X')) E.deshacer(); if (M.pulsado('Y')) E.rehacer();
    if (M.pulsado('B')) { IM.Entrada.cancelar(); abajo = false; }
    if (M.pulsado('MENU')) IM.Dialogos.exportar(); if (M.pulsado('VISTA')) IM.Dialogos.proyectos();
    var ids = IM.UI.HERR.map(function (h) { return h[0]; });
    if (M.pulsado('DER') || M.pulsado('IZQ')) { var i = ids.indexOf(E.herr); i = (i + (M.pulsado('DER') ? 1 : -1) + ids.length) % ids.length; IM.UI.elegirHerr(ids[i]); }
    if (M.pulsado('A')) {
      var el = document.elementFromPoint(x, y);
      if (el && el.id !== 'ov' && el.closest && !el.closest('#area')) { if (el.focus) el.focus(); if (el.click) el.click(); }
      else if (dentro()) { IM.Entrada.abajo(ev()); abajo = true; }
    }
    if (abajo && M.sostenido('A')) IM.Entrada.mover(ev(), true);
    if (abajo && M.soltado('A')) { IM.Entrada.arriba(ev()); abajo = false; }
    if (!abajo && dentro()) IM.Entrada.mover(ev(), false);
  }
  IM.MandoCursor = { iniciar: function () { cur = document.getElementById('cursorMando'); document.body.appendChild(cur); requestAnimationFrame(paso); } };
})(window.IM);
