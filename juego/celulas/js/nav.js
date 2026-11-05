/* Celulas: navegacion de menus con mando (cruceta/stick mueven el foco, A acepta, B atras, LB/RB cambian pestana). */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {}, doc = G.document;
  var N = C.Nav = { raiz: null, rep: 0 };
  var SEL = 'button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea,[data-f]';
  function visible(e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.offsetParent !== null; }
  function lista() { var out = [], l = N.raiz ? N.raiz.querySelectorAll(SEL) : []; for (var i = 0; i < l.length; i++) if (visible(l[i])) out.push(l[i]); return out; }
  function centro(e) { var r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  N.enfocar = function (e) { if (e) { e.focus({ preventScroll: true }); e.classList.add('nav-foco'); if (e.scrollIntoView) e.scrollIntoView({ block: 'nearest' }); } };
  function mover(dx, dy) {
    var l = lista(); if (!l.length) return;
    var act = doc.activeElement; if (!act || l.indexOf(act) < 0) { N.enfocar(l[0]); return; }
    var c = centro(act), best = null, bs = 1e12;
    for (var i = 0; i < l.length; i++) {
      if (l[i] === act) continue;
      var p = centro(l[i]), vx = p.x - c.x, vy = p.y - c.y, along = vx * dx + vy * dy, perp = Math.abs(vx * dy - vy * dx);
      if (along <= 2) continue;
      var s = along + perp * 2.2; if (s < bs) { bs = s; best = l[i]; }
    }
    if (best) N.enfocar(best);
  }
  doc.addEventListener('focusout', function (e) { if (e.target && e.target.classList) e.target.classList.remove('nav-foco'); });
  /* devuelve true si consumio la entrada */
  N.leer = function (M, dt) {
    if (!N.raiz) return false;
    var x = M.ejes.izq.x, y = M.ejes.izq.y, dx = 0, dy = 0;
    if (M.sostenido('IZQ') || x < -0.5) dx = -1; else if (M.sostenido('DER') || x > 0.5) dx = 1;
    if (M.sostenido('ARRIBA') || y < -0.5) dy = -1; else if (M.sostenido('ABAJO') || y > 0.5) dy = 1;
    N.rep -= dt;
    if ((dx || dy) && N.rep <= 0) {
      var act = doc.activeElement, rango = act && act.tagName === 'INPUT' && act.type === 'range';
      if (rango && dx) { act.value = +act.value + dx * (+act.step || 1); act.dispatchEvent(new Event('input', { bubbles: true })); act.dispatchEvent(new Event('change', { bubbles: true })); }
      else if (act && act.tagName === 'SELECT' && dx) { act.selectedIndex = Math.max(0, Math.min(act.options.length - 1, act.selectedIndex + dx)); act.dispatchEvent(new Event('change', { bubbles: true })); }
      else mover(dx, dy);
      N.rep = 0.2;
    }
    if (!dx && !dy) N.rep = 0;
    if (M.pulsado('A')) { var a = doc.activeElement; if (a && N.raiz.contains(a)) { if (a.type === 'checkbox' || a.tagName === 'BUTTON' || a.hasAttribute('data-f')) a.click(); } else mover(0, 1); }
    if (M.pulsado('B')) { var b = N.raiz.querySelector('[data-atras]'); if (b && visible(b)) b.click(); }
    if (M.pulsado('LB') || M.pulsado('RB')) {
      var tabs = N.raiz.querySelectorAll('[role=tab]'); if (tabs.length) {
        var k = 0; for (var i = 0; i < tabs.length; i++) if (tabs[i].getAttribute('aria-selected') === 'true') k = i;
        k = (k + (M.pulsado('RB') ? 1 : -1) + tabs.length) % tabs.length; tabs[k].click();
      }
    }
    return true;
  };
  N.fijar = function (raiz) { N.raiz = raiz; if (raiz) setTimeout(function () { var act = doc.activeElement; if (!act || !raiz.contains(act)) { var l = lista(); if (l.length) N.enfocar(l.filter(function (e) { return e.classList.contains('principal'); })[0] || l[0]); } }, 30); };
})(typeof globalThis !== 'undefined' ? globalThis : window);
