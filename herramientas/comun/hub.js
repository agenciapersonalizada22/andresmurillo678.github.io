/* Comportamiento comun de los hubs de herramientas: tema claro/oscuro, navegacion con mando/teclado, estado de sesion (si hay Cuenta). Sin dependencias obligatorias. */
(function () {
  'use strict';
  var raiz = document.documentElement, sel = '[data-f]';
  function guardado() { try { return localStorage.getItem('herr_tema'); } catch (e) { return null; } }
  function aplicarTema(t) { if (t === 'claro' || t === 'oscuro') raiz.setAttribute('data-tema', t); else raiz.removeAttribute('data-tema'); }
  aplicarTema(guardado());
  function oscuroAhora() { var t = raiz.getAttribute('data-tema'); return t ? t === 'oscuro' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  var bt = document.getElementById('btnTema');
  if (bt) {
    var pintar = function () { bt.setAttribute('aria-pressed', String(oscuroAhora())); bt.querySelector('span').textContent = oscuroAhora() ? 'Tema oscuro' : 'Tema claro'; };
    bt.addEventListener('click', function () { var n = oscuroAhora() ? 'claro' : 'oscuro'; aplicarTema(n); try { localStorage.setItem('herr_tema', n); } catch (e) {} pintar(); });
    pintar();
  }

  /* navegacion espacial con el mando (cruceta / palanca izquierda; A = abrir, B = volver) y teclado (flechas) */
  function visibles() { return Array.prototype.filter.call(document.querySelectorAll(sel), function (e) { return e.offsetParent !== null; }); }
  function centro(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function mover(dx, dy) {
    var l = visibles(), a = document.activeElement, cur = l.indexOf(a) >= 0 ? a : null;
    if (!cur) { if (l[0]) l[0].focus(); return; }
    var c = centro(cur.getBoundingClientRect()), mejor = null, md = 1e9;
    l.forEach(function (e) {
      if (e === cur) return; var p = centro(e.getBoundingClientRect()), vx = p.x - c.x, vy = p.y - c.y;
      var along = vx * dx + vy * dy; if (along <= 4) return;
      var across = Math.abs(dx ? vy : vx), d = along + across * 2.2; if (d < md) { md = d; mejor = e; }
    });
    if (mejor) { mejor.focus(); try { mejor.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
  }
  document.addEventListener('keydown', function (ev) {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
    if (d) { ev.preventDefault(); mover(d[0], d[1]); }
  });
  var antes = {};
  function bucle() {
    var M = window.Mando;
    if (M && M.leer) {
      M.leer();
      if (M.conectado) { document.body.classList.add('conMando'); }
      var e = M.ejes.izq, ahora = { U: M.sostenido('ARRIBA') || e.y < -0.6, D: M.sostenido('ABAJO') || e.y > 0.6, L: M.sostenido('IZQ') || e.x < -0.6, R: M.sostenido('DER') || e.x > 0.6 };
      var n = 0; for (var k in ahora) if (ahora[k] && !antes[k]) { document.body.classList.add('navMando'); mover(k === 'L' ? -1 : k === 'R' ? 1 : 0, k === 'U' ? -1 : k === 'D' ? 1 : 0); n++; }
      antes = ahora;
      if (M.pulsado('A')) { document.body.classList.add('navMando'); var a = document.activeElement; if (a && a.matches && a.matches(sel)) a.click(); else if (visibles()[0]) visibles()[0].focus(); }
      if (M.pulsado('B')) { var v = document.querySelector('[data-volver]'); if (v) v.click(); }
    }
    requestAnimationFrame(bucle);
  }
  if (window.Mando) requestAnimationFrame(bucle);
  ['mousemove', 'touchstart', 'pointerdown'].forEach(function (t) { addEventListener(t, function () { document.body.classList.remove('navMando'); }, { passive: true }); });

  /* estado de sesion (opcional): usa window.Cuenta si la pagina la cargo */
  var s = document.getElementById('estadoSesion');
  if (s && window.Cuenta && Cuenta.iniciar) {
    Cuenta.iniciar().then(function (u) { s.textContent = u ? 'Sesión: ' + u.nombre + (Cuenta.demo ? ' (demo)' : '') : 'Sin sesión: tus datos se guardan solo en este dispositivo.'; }).catch(function () {});
    Cuenta.alCambiar && Cuenta.alCambiar(function (u) { s.textContent = u ? 'Sesión: ' + u.nombre + (Cuenta.demo ? ' (demo)' : '') : 'Sin sesión: tus datos se guardan solo en este dispositivo.'; });
  }
})();
