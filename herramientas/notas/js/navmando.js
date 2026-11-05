/* Navegacion con mando Xbox: cruceta/stick mueven el foco espacialmente, A pulsa, B atras, X nueva tarea, Y nueva nota, LB/RB cambian de vista, MENU paleta. */
(function (G) {
  'use strict';
  var doc = G.document, UI = G.UI, NM = G.NavMando = {}, ult = { dir: '', t: 0, n: 0 }, activo = false;
  var SEL = 'button,a[href],input,select,textarea,summary,[tabindex]:not([tabindex="-1"]),[contenteditable="true"],[role="button"]';

  function visible(e) {
    if (e.disabled || e.hidden || e.getAttribute('aria-hidden') === 'true' || (e.type === 'hidden')) return false;
    var r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
    if (r.bottom < 0 || r.top > G.innerHeight * 3) return false;
    var cs = G.getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none';
  }
  function ambito() {
    var m = doc.querySelector('.menu'); if (m) return m;
    var d = UI.dialogoSup(); if (d) return d;
    if (doc.body.classList.contains('menu-abierto')) return doc.getElementById('lateral');
    return doc.getElementById('app');
  }
  NM.candidatos = function () {
    var raiz = ambito(); return Array.prototype.filter.call(raiz.querySelectorAll(SEL), function (e) { return visible(e) && !(raiz.id === 'app' && e.closest('#lateral') && G.matchMedia('(max-width: 860px)').matches); });
  };
  NM.mover = function (dir) {
    var c = NM.candidatos(), cur = doc.activeElement; if (!c.length) return;
    if (!cur || cur === doc.body || c.indexOf(cur) < 0) {
      var primero = c.filter(function (e) { var r = e.getBoundingClientRect(); return r.top >= 0 && r.top < G.innerHeight; })[0] || c[0]; primero.focus(); return;
    }
    var r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2, mejor = null, ms = Infinity;
    c.forEach(function (e) {
      if (e === cur) return; var r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, dx = x - cx, dy = y - cy, prim, cruz;
      if (dir === 'der') { prim = r.left - r0.right; if (dx <= 1) return; cruz = Math.abs(dy); }
      else if (dir === 'izq') { prim = r0.left - r.right; if (dx >= -1) return; cruz = Math.abs(dy); }
      else if (dir === 'abajo') { prim = r.top - r0.bottom; if (dy <= 1) return; cruz = Math.abs(dx); }
      else { prim = r0.top - r.bottom; if (dy >= -1) return; cruz = Math.abs(dx); }
      var solape = dir === 'der' || dir === 'izq' ? !(r.bottom < r0.top || r.top > r0.bottom) : !(r.right < r0.left || r.left > r0.right);
      var s = Math.max(0, prim) + cruz * (solape ? 0.6 : 3) + (solape ? 0 : 200);
      if (s < ms) { ms = s; mejor = e; }
    });
    if (mejor) { mejor.focus(); mejor.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  };
  function esTexto(e) { return e && (e.tagName === 'TEXTAREA' || (e.tagName === 'INPUT' && /text|search|password|number|date|time|email|url/.test(e.type)) || e.isContentEditable); }
  function atras() {
    if (doc.querySelector('.menu')) { UI.cerrarMenu(); return; }
    if (UI.hayDialogo()) { UI.cerrarDialogo(); return; }
    var a = doc.activeElement; if (esTexto(a)) { a.blur(); return; }
    if (doc.body.classList.contains('menu-abierto')) { G.App.alternarMenu(false); return; }
    if (G.App.sel) { G.App.cerrarDetalle(); return; }
    if (G.App.vista !== 'tareas' || G.App.filtro !== 'hoy') G.App.ir('tareas', 'hoy');
  }
  function desplazar(dy) {
    var e = doc.activeElement, s = e && e !== doc.body ? e : doc.getElementById('contenido');
    while (s && s !== doc.body) { var cs = G.getComputedStyle(s); if (/(auto|scroll)/.test(cs.overflowY) && s.scrollHeight > s.clientHeight + 2) { s.scrollTop += dy * 22; return; } s = s.parentElement; }
  }
  function ciclo(d) {
    var A = G.App, i = -1; A.CICLO.forEach(function (c, k) { if (c[0] === A.vista && (c[1] === A.filtro || !c[1])) i = k; });
    if (i < 0) { A.CICLO.forEach(function (c, k) { if (c[0] === A.vista) i = k; }); } if (i < 0) i = 0;
    var n = A.CICLO[(i + d + A.CICLO.length) % A.CICLO.length]; A.ir(n[0], n[1]);
  }
  function paso() {
    var M = G.Mando; if (!M) return;
    if (G.Lobby && G.Lobby.abierto) { G.requestAnimationFrame(paso); return; }
    M.leer();
    if (M.conectado) {
      if (!activo && M.activo) { activo = true; doc.body.classList.add('navMando'); var p = doc.getElementById('pista-mando'); if (p) p.hidden = false; }
      var dir = '', e = M.ejes.izq;
      if (M.sostenido('ARRIBA')) dir = 'arriba'; else if (M.sostenido('ABAJO')) dir = 'abajo'; else if (M.sostenido('IZQ')) dir = 'izq'; else if (M.sostenido('DER')) dir = 'der';
      else if (Math.abs(e.x) > 0.55 || Math.abs(e.y) > 0.55) dir = Math.abs(e.x) > Math.abs(e.y) ? (e.x > 0 ? 'der' : 'izq') : (e.y > 0 ? 'abajo' : 'arriba');
      var ahora = performance.now(), rep = G.Config.disp.mandoRepeticion || 220;
      if (!dir) ult.dir = ''; else if (dir !== ult.dir) { ult = { dir: dir, t: ahora + 220, n: 0 }; NM.mover(dir); } else if (ahora >= ult.t) { ult.t = ahora + rep; NM.mover(dir); }
      if (M.pulsado('A')) {
        var a = doc.activeElement;
        if (!a || a === doc.body) NM.mover('abajo'); else if (esTexto(a)) { /* ya enfocado: el teclado en pantalla escribe */ } else a.click();
      }
      if (M.pulsado('B')) atras();
      if (!UI.hayDialogo() && !doc.querySelector('.menu')) {
        if (M.pulsado('X')) G.Captura.abrir('tarea'); if (M.pulsado('Y')) G.App.nuevaNota();
        if (M.pulsado('LB')) ciclo(-1); if (M.pulsado('RB')) ciclo(1);
        if (M.pulsado('VISTA')) { G.App.alternarMenu(); }
      }
      if (M.pulsado('MENU')) { G.Paleta.abrir(); }
      if (Math.abs(M.ejes.der.y) > 0.3) desplazar(M.ejes.der.y);
    }
    G.requestAnimationFrame(paso);
  }
  NM.iniciar = function () {
    if (!G.Mando) return; G.requestAnimationFrame(paso);
    G.Mando.alConectar(function () { UI.aviso('Mando conectado: cruceta para mover, A para abrir, B para volver', { tipo: 'ok' }); });
    doc.addEventListener('pointerdown', function () { if (activo) { activo = false; doc.body.classList.remove('navMando'); var p = doc.getElementById('pista-mando'); if (p) p.hidden = true; if (G.Mando) G.Mando.activo = false; } }, true);
  };
})(window);
