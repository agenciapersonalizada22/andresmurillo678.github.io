/* Entrada unificada: raton, teclado, tactil (joystick flotante + TURBO) y mando Xbox. Produce E.ang (rumbo deseado) y E.turbo. */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, E = S.Entrada = {}, A = S.Almacen, doc = G.document;
  E.ang = 0; E.turbo = false; E.disp = 'ninguno'; E.pausa = false; E.tactil = false; E.activa = false;
  var cv, mx = 0, my = 0, ratonTurbo = false, teclas = {}, joy = null, btnT = false, el = {}, mandoTurbo = false, pausaPrev = false;

  function disp() { return A.disp.controles; }
  E.sincronizar = function (a) { E.ang = a; };
  E.init = function (canvas) {
    cv = canvas;
    G.addEventListener('mousemove', function (e) { if (e.pointerType === 'touch') return; mx = e.clientX; my = e.clientY; E.disp = 'mouse'; });
    cv.addEventListener('mousedown', function (e) { if (e.button === 0) { ratonTurbo = true; E.disp = 'mouse'; } });
    G.addEventListener('mouseup', function () { ratonTurbo = false; });
    G.addEventListener('blur', function () { ratonTurbo = false; teclas = {}; });
    G.addEventListener('keydown', function (e) {
      var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (E.capturando) return;
      teclas[e.code] = true; E.disp = 'teclado';
      if (e.code === disp().teclas.pausa || e.code === 'Escape') E.pausa = true;
      if (E.activa && (e.code === 'Space' || e.code.indexOf('Arrow') === 0)) e.preventDefault();
    });
    G.addEventListener('keyup', function (e) { teclas[e.code] = false; });
    el.raiz = doc.getElementById('tactil'); el.zona = doc.getElementById('tzona'); el.base = doc.getElementById('tbase'); el.knob = doc.getElementById('tknob'); el.turbo = doc.getElementById('tturbo');
    if (G.matchMedia && G.matchMedia('(pointer:coarse)').matches) { E.tactil = true; E.disp = 'tactil'; }
    el.zona.addEventListener('pointerdown', function (e) {
      if (joy) return; E.tactil = true; E.disp = 'tactil'; el.zona.setPointerCapture(e.pointerId);
      joy = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
      el.base.style.cssText = 'display:block;left:' + e.clientX + 'px;top:' + e.clientY + 'px'; el.knob.style.transform = 'translate(0,0)';
      e.preventDefault();
    });
    el.zona.addEventListener('pointermove', function (e) {
      if (!joy || e.pointerId !== joy.id) return;
      var dx = e.clientX - joy.x, dy = e.clientY - joy.y, m = Math.hypot(dx, dy), max = 56 * disp().tactilTam;
      if (m > max) { joy.x += dx / m * (m - max); joy.y += dy / m * (m - max); dx = e.clientX - joy.x; dy = e.clientY - joy.y; el.base.style.left = joy.x + 'px'; el.base.style.top = joy.y + 'px'; }
      joy.dx = dx; joy.dy = dy; el.knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    });
    function suelta(e) { if (joy && e.pointerId === joy.id) { joy = null; el.base.style.display = 'none'; } }
    el.zona.addEventListener('pointerup', suelta); el.zona.addEventListener('pointercancel', suelta);
    el.turbo.addEventListener('pointerdown', function (e) { btnT = true; E.tactil = true; E.disp = 'tactil'; el.turbo.setPointerCapture(e.pointerId); el.turbo.classList.add('on'); e.preventDefault(); });
    function sueltaT() { btnT = false; el.turbo.classList.remove('on'); }
    el.turbo.addEventListener('pointerup', sueltaT); el.turbo.addEventListener('pointercancel', sueltaT);
    el.raiz.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };
  E.aplicarTactil = function () {
    if (!el.raiz) return; var d = disp();
    el.raiz.style.setProperty('--tam', d.tactilTam); el.raiz.style.setProperty('--op', d.tactilOp); el.raiz.style.setProperty('--sube', d.tactilPos + 'px');
    el.raiz.classList.toggle('zurdo', !!d.zurdo);
  };
  E.mostrarTactil = function (si) { if (el.raiz) el.raiz.style.display = si && E.tactil ? 'block' : 'none'; if (!si) { joy = null; btnT = false; if (el.base) el.base.style.display = 'none'; } };
  E.limpiar = function () { teclas = {}; ratonTurbo = false; btnT = false; joy = null; if (el.base) el.base.style.display = 'none'; };

  /* Se llama una vez por cuadro. leerMando=false si el Lobby esta abierto. */
  E.actualizar = function (dt, anguloActual, leerMando) {
    var d = disp(), tk = d.teclas, M = G.Mando, turbo = false, usoMando = false;
    var izq = teclas[tk.izq] || teclas[tk.izq2], der = teclas[tk.der] || teclas[tk.der2];
    if (izq || der) E.ang += ((der ? 1 : 0) - (izq ? 1 : 0)) * 4.4 * d.sens * dt;
    if (teclas[tk.turbo]) turbo = true;
    if (E.disp === 'mouse' && cv) {
      var r = cv.getBoundingClientRect(), dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
      if (dx * dx + dy * dy > 400) E.ang = Math.atan2(dy, dx);
    }
    if (ratonTurbo) turbo = true;
    if (joy && Math.hypot(joy.dx, joy.dy) > 8) E.ang = Math.atan2(joy.dy, joy.dx);
    if (btnT) turbo = true;
    if (M && leerMando) {
      var ax = M.ejes.izq, rx = M.ejes.der, zona = d.zona;
      var sx = Math.abs(ax.x) > Math.abs(rx.x) || Math.abs(ax.y) > Math.abs(rx.y) ? ax : rx;
      if (Math.hypot(sx.x, sx.y) > Math.max(0.25, zona + 0.07)) { E.ang = Math.atan2(sx.y, sx.x); usoMando = true; }
      if (M.sostenido('A') || M.gatillo.der > 0.4) { turbo = true; usoMando = true; }
      if (M.sostenido('IZQ')) { E.ang -= 4.4 * d.sens * dt; usoMando = true; } if (M.sostenido('DER')) { E.ang += 4.4 * d.sens * dt; usoMando = true; }
      if (M.pulsado('MENU')) E.pausa = true;
      if (usoMando) { E.disp = 'mando'; G.Serp.huboMando = true; }
    }
    if (E.ang > Math.PI) E.ang -= S.TAU; else if (E.ang < -Math.PI) E.ang += S.TAU;
    E.turbo = turbo;
  };
  E.vibrar = function (f, s, ms) { if (G.Mando && disp().vibracion && G.Mando.conectado) G.Mando.vibrar(f, s, ms); };
  E.nombreTecla = function (c) { return c.replace('Key', '').replace('Arrow', 'Flecha ').replace('Space', 'Espacio').replace('Escape', 'Esc').replace('Digit', '').replace('Left', 'izq.').replace('Right', 'der.').replace('Up', 'arriba').replace('Down', 'abajo'); };
})(typeof window !== 'undefined' ? window : globalThis);
