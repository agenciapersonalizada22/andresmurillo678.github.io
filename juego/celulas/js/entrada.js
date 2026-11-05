/* Celulas: entrada unificada (raton, teclado, tactil con joystick flotante, mando Xbox). */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {}, doc = G.document;
  var E = C.Entrada = {
    tipo: 'raton', mx: 0, my: 0, activa: false, ajustes: null,
    joy: { act: false, id: -1, bx: 0, by: 0, x: 0, y: 0, mag: 0 }, pad: { x: 0, y: 0, mag: 0 },
    ejTouch: false, ejKey: false, ejPad: false, dividirPend: false, expulsarPend: false, pausaPend: false, pausaMov: false, zoomK: 1, zoomFuerza: 0,
    teclas: { dividir: 'Space', expulsar: 'KeyW', pausaMov: 'KeyQ', pausa: 'Escape', zoomMas: 'Equal', zoomMenos: 'Minus' },
    onAccion: null
  };
  var canvas, ui = {};
  function dispTactil() { return G.matchMedia && G.matchMedia('(pointer: coarse)').matches; }
  E.esTactil = function () { return E.tipo === 'tactil' || (E.tipo !== 'mando' && E.tipo !== 'raton' && dispTactil()); };

  E.iniciar = function (cv, elementos) {
    canvas = cv; ui = elementos || {};
    if (dispTactil()) E.tipo = 'tactil';
    cv.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse') { E.tipo = 'raton'; E.mx = e.clientX; E.my = e.clientY; return; }
      if (e.pointerId === E.joy.id) moverJoy(e.clientX, e.clientY);
    });
    cv.addEventListener('pointerdown', function (e) {
      if (!E.activa) return;
      if (e.pointerType === 'mouse') { E.tipo = 'raton'; E.mx = e.clientX; E.my = e.clientY; if (e.button === 0 && E.ajustes && E.ajustes.clicDivide) E.dividirPend = true; return; }
      E.tipo = 'tactil';
      if (!E.joy.act) {
        E.joy.act = true; E.joy.id = e.pointerId; E.joy.bx = e.clientX; E.joy.by = e.clientY; E.joy.x = E.joy.y = 0; E.joy.mag = 0;
        var s = E.ajustes && E.ajustes.joyFijo;
        if (s) { var r = ui.joyZona ? ui.joyZona.getBoundingClientRect() : { left: 70, top: G.innerHeight - 150 }; E.joy.bx = r.left + 60; E.joy.by = r.top + 60; moverJoy(e.clientX, e.clientY); }
        try { cv.setPointerCapture(e.pointerId); } catch (x) {}
        mostrarJoy(true);
      }
    });
    function fin(e) { if (e.pointerId === E.joy.id) { E.joy.act = false; E.joy.id = -1; E.joy.mag = 0; mostrarJoy(false); } }
    cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    cv.addEventListener('wheel', function (e) { if (!E.activa) return; e.preventDefault(); E.zoomK = Math.max(0.5, Math.min(2, E.zoomK * (e.deltaY > 0 ? 0.92 : 1.08))); }, { passive: false });
    function boton(el, ac, hold) {
      if (!el) return;
      el.addEventListener('pointerdown', function (e) { e.preventDefault(); E.tipo = 'tactil'; try { el.setPointerCapture(e.pointerId); } catch (x) {} el.classList.add('pulsado'); if (hold) E.ejTouch = true; else E.dividirPend = true; if (E.vibra) E.vibra(15); });
      var up = function () { el.classList.remove('pulsado'); if (hold) E.ejTouch = false; };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    }
    boton(ui.btnDividir, 'd', false); boton(ui.btnExpulsar, 'e', true);
    G.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (E.captura) { e.preventDefault(); var f = E.captura; E.captura = null; f(e.code); return; }
      var t = E.teclas;
      if (e.code === t.pausa) { E.pausaPend = true; e.preventDefault(); return; }
      if (!E.activa) return;
      if (e.code === t.dividir) { if (!e.repeat) E.dividirPend = true; e.preventDefault(); }
      else if (e.code === t.expulsar) { E.ejKey = true; e.preventDefault(); }
      else if (e.code === t.pausaMov) { if (!e.repeat) E.pausaMov = !E.pausaMov; e.preventDefault(); }
      else if (e.code === t.zoomMas || e.code === 'NumpadAdd') E.zoomK = Math.min(2, E.zoomK * 1.12);
      else if (e.code === t.zoomMenos || e.code === 'NumpadSubtract') E.zoomK = Math.max(0.5, E.zoomK / 1.12);
      if (e.code.indexOf('Key') === 0 || e.code === 'Space') E.tipo = E.tipo === 'tactil' ? 'tactil' : 'raton';
    });
    G.addEventListener('keyup', function (e) { if (e.code === E.teclas.expulsar) E.ejKey = false; });
    G.addEventListener('blur', function () { E.ejKey = false; E.ejTouch = false; E.joy.act = false; mostrarJoy(false); });
  };
  function moverJoy(x, y) {
    var j = E.joy, dx = x - j.bx, dy = y - j.by, d = Math.hypot(dx, dy), R = 60 * ((E.ajustes && E.ajustes.tamTactil) || 1);
    if (d > R) { if (!(E.ajustes && E.ajustes.joyFijo)) { j.bx += dx / d * (d - R); j.by += dy / d * (d - R); } dx = dx / d * R; dy = dy / d * R; d = R; }
    j.x = dx / R; j.y = dy / R; j.mag = d / R;
    if (j.mag < 0.12) { j.mag = 0; j.x = j.y = 0; }
    pintarJoy();
  }
  function mostrarJoy(v) { if (ui.joyBase) { ui.joyBase.style.display = v ? 'block' : 'none'; if (v) pintarJoy(); } }
  function pintarJoy() {
    var j = E.joy, R = 60 * ((E.ajustes && E.ajustes.tamTactil) || 1);
    if (!ui.joyBase) return;
    ui.joyBase.style.transform = 'translate(' + (j.bx - R) + 'px,' + (j.by - R) + 'px)';
    ui.joyBase.style.width = ui.joyBase.style.height = R * 2 + 'px';
    ui.joyKnob.style.transform = 'translate(' + (j.x * R) + 'px,' + (j.y * R) + 'px)';
  }
  /* lectura del mando; llamar una vez por cuadro con el objeto Mando ya leido */
  E.leerMando = function (M, dt) {
    var zm = (E.ajustes && E.ajustes.zonaMuerta) || 0.18, x = M.ejes.izq.x, y = M.ejes.izq.y, m = Math.hypot(x, y);
    if (m < zm) { x = y = m = 0; }
    E.pad.x = m ? x / m : 0; E.pad.y = m ? y / m : 0; E.pad.mag = Math.min(1, m);
    if (M.activo && (m > 0 || M.pulsado('A') || M.pulsado('X'))) E.tipo = 'mando';
    if (M.pulsado('MENU')) E.pausaPend = true;
    if (!E.activa) return;
    if (M.pulsado('A')) E.dividirPend = true;
    E.ejPad = M.sostenido('X') || M.gatillo.der > 0.5;
    if (M.pulsado('Y')) E.pausaMov = !E.pausaMov;
    var z = (M.sostenido('RB') || M.sostenido('ARRIBA') ? 1 : 0) - (M.sostenido('LB') || M.sostenido('ABAJO') ? 1 : 0);
    if (z) E.zoomK = Math.max(0.5, Math.min(2, E.zoomK * Math.pow(1.7, z * dt)));
  };
  E.ejecutando = function () { return E.ejKey || E.ejTouch || E.ejPad; };
  /* vector objetivo en unidades de mundo, relativo al centro de masa */
  E.objetivo = function (z, W, H, out) {
    var sens = (E.ajustes && E.ajustes.sens) || 1;
    out.pausa = E.pausaMov;
    if (E.joy.act && E.joy.mag > 0) { var d = 80 + E.joy.mag * 520; out.x = E.joy.x / E.joy.mag * d; out.y = E.joy.y / E.joy.mag * d; return out; }
    if (E.pad.mag > 0) { var d2 = 80 + E.pad.mag * 520; out.x = E.pad.x * d2; out.y = E.pad.y * d2; return out; }
    if (E.tipo === 'raton') { out.x = (E.mx - W / 2) / z * sens; out.y = (E.my - H / 2) / z * sens; return out; }
    out.x = out.y = 0; return out;
  };
  E.reiniciar = function () { E.dividirPend = E.expulsarPend = false; E.ejKey = E.ejTouch = E.ejPad = false; E.joy.act = false; E.joy.mag = 0; E.pausaMov = false; mostrarJoy(false); };
})(typeof globalThis !== 'undefined' ? globalThis : window);
