/* Navegacion por mando en menus (cruceta/stick, A acepta, B atras, LB/RB pestanas). */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, N = S.Nav = {}, doc = G.document;
  var rep = 0, ult = null;
  N.raiz = function () { return null; }; N.atras = function () {}; N.pestana = function () {};
  function foco(raiz) {
    return Array.prototype.filter.call(raiz.querySelectorAll('[data-f]'), function (e) { return !e.disabled && e.offsetParent !== null; });
  }
  function centro(e) { var r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  N.mover = function (raiz, dx, dy) {
    var lista = foco(raiz), act = doc.activeElement;
    if (!act || lista.indexOf(act) < 0) { var d = raiz.querySelector('[data-fdef]'); (d && d.offsetParent ? d : lista[0]) && (d && d.offsetParent ? d : lista[0]).focus(); return; }
    var c0 = centro(act), mejor = null, ms = 1e9;
    lista.forEach(function (e) {
      if (e === act) return; var c = centro(e), ax = (c.x - c0.x) * dx + (c.y - c0.y) * dy, lat = Math.abs((c.x - c0.x) * dy) + Math.abs((c.y - c0.y) * dx);
      if (ax <= 4) return; var sc = ax + lat * 2.2; if (sc < ms) { ms = sc; mejor = e; }
    });
    if (mejor) { mejor.focus(); if (mejor.scrollIntoView) mejor.scrollIntoView({ block: 'nearest' }); }
  };
  function ajustar(el, dir) {
    if (el.tagName === 'INPUT' && el.type === 'range') {
      var st = +el.step || 1; el.value = Math.max(+el.min, Math.min(+el.max, +el.value + dir * st)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true;
    }
    if (el.tagName === 'SELECT') { el.selectedIndex = Math.max(0, Math.min(el.options.length - 1, el.selectedIndex + dir)); el.dispatchEvent(new Event('change', { bubbles: true })); return true; }
    return false;
  }
  /* una vez por cuadro tras Mando.leer(); dt en segundos */
  N.tick = function (dt) {
    var M = G.Mando, raiz = N.raiz(); if (!M || !raiz || !M.conectado) return;
    var dx = 0, dy = 0, a = M.ejes.izq;
    if (M.sostenido('ARRIBA') || a.y < -0.6) dy = -1; else if (M.sostenido('ABAJO') || a.y > 0.6) dy = 1;
    else if (M.sostenido('IZQ') || a.x < -0.6) dx = -1; else if (M.sostenido('DER') || a.x > 0.6) dx = 1;
    var clave = dx + ',' + dy;
    if ((dx || dy) && (clave !== ult || (rep -= dt) <= 0)) {
      var act = doc.activeElement;
      if (dx && act && ajustar(act, dx)) { /* ajustado */ } else N.mover(raiz, dx, dy);
      rep = clave !== ult ? 0.38 : 0.12;
    }
    if (!dx && !dy) rep = 0;
    ult = (dx || dy) ? clave : null;
    if (M.pulsado('A')) { var f = doc.activeElement; if (f && raiz.contains(f) && f.tagName !== 'INPUT') f.click(); else N.mover(raiz, 0, 0); }
    if (M.pulsado('B')) N.atras();
    if (M.pulsado('LB')) N.pestana(-1); if (M.pulsado('RB')) N.pestana(1);
  };
})(typeof window !== 'undefined' ? window : globalThis);
