/* Entrada: raton, tactil (toque, pulsacion larga, arrastre, pellizco), teclado y mando. Traduce todo a acciones de BM.partida. */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};
  var E = { modoBandera: false, bloqueada: function () { return false; }, alCambiarModo: null, accionUI: null, tactilVisto: false };
  var cv, P, V, ptrs = {}, nPtr = 0, mouse = { l: false, r: false, m: false, ambos: false, celda: -1, x0: 0, y0: 0, arrastre: false, lx: 0, ly: 0 };
  var tocar = { largo: false, mov: false, tmr: 0, celda: -1, pinch: null };
  var pad = { rep: {}, ax: 0, ay: 0 };

  function d() { return BM.ajustes.disp; }
  function vib(ms) { if (d().vibracionMovil && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }

  E.iniciar = function (canvas) {
    cv = canvas; P = BM.partida; V = BM.vista;
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    cv.addEventListener('pointerdown', abajo); cv.addEventListener('pointermove', mueve);
    cv.addEventListener('pointerup', arriba); cv.addEventListener('pointercancel', arriba);
    cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !mouse.l && !mouse.r) { V.hover = -1; V.marcar(); } });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault(); if (E.bloqueada()) return;
      var r = cv.getBoundingClientRect();
      V.zoom(Math.exp(-e.deltaY * 0.0016 * d().sensZoom), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    G.addEventListener('keydown', tecla);
  };

  function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

  function abajo(e) {
    if (E.bloqueada()) return;
    G.BM.sonido.despertar();
    var p = pos(e);
    if (e.pointerType === 'mouse') {
      V.cursorVisible = false;
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      var b = e.button === 0 ? 'l' : e.button === 2 ? 'r' : 'm';
      mouse[b] = true; if (mouse.l && mouse.r) mouse.ambos = true;
      mouse.celda = V.celdaEn(p.x, p.y); mouse.x0 = mouse.lx = p.x; mouse.y0 = mouse.ly = p.y;
      if (b === 'l' || b === 'm') V.presion = mouse.celda;
      V.marcar(); return;
    }
    E.tactilVisto = true; document.body.classList.add('tactil');
    try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    ptrs[e.pointerId] = { x: p.x, y: p.y, x0: p.x, y0: p.y, mov: false }; nPtr = Object.keys(ptrs).length;
    if (nPtr === 1) {
      tocar.largo = false; tocar.mov = false; tocar.celda = V.celdaEn(p.x, p.y);
      V.presion = tocar.celda; V.marcar();
      clearTimeout(tocar.tmr);
      tocar.tmr = setTimeout(function () {
        var q = ptrs[e.pointerId]; if (!q || q.mov || nPtr !== 1) return;
        tocar.largo = true; vib(18);
        if (tocar.celda >= 0) { if (E.modoBandera) P.pulsar(tocar.celda); else P.accion('bandera', tocar.celda); }
        V.presion = -1; V.marcar();
      }, d().pulsacionLarga);
    } else if (nPtr === 2) {
      clearTimeout(tocar.tmr); tocar.mov = true;
      var k = Object.keys(ptrs).map(function (i) { return ptrs[i]; });
      tocar.pinch = { dist: Math.hypot(k[0].x - k[1].x, k[0].y - k[1].y), cx: (k[0].x + k[1].x) / 2, cy: (k[0].y + k[1].y) / 2 };
      V.presion = -1;
    }
  }

  function mueve(e) {
    var p = pos(e);
    if (e.pointerType === 'mouse') {
      var c = V.celdaEn(p.x, p.y);
      if (c !== V.hover && !E.bloqueada()) { V.hover = c; if (c >= 0) V.cursor = c; V.cursorVisible = false; V.marcar(); }
      if ((mouse.l || mouse.m) && !mouse.r && !mouse.ambos) {
        if (!mouse.arrastre && Math.hypot(p.x - mouse.x0, p.y - mouse.y0) > 9 && (mouse.l)) { mouse.arrastre = true; V.presion = -1; }
        if (mouse.arrastre) { V.mover(p.x - mouse.lx, p.y - mouse.ly); }
        else if (V.presion !== c) { V.presion = c; V.marcar(); }
      }
      mouse.lx = p.x; mouse.ly = p.y; return;
    }
    var q = ptrs[e.pointerId]; if (!q) return;
    if (nPtr === 1) {
      if (!q.mov && Math.hypot(p.x - q.x0, p.y - q.y0) > 10) { q.mov = true; tocar.mov = true; clearTimeout(tocar.tmr); V.presion = -1; }
      if (q.mov && !tocar.largo) V.mover(p.x - q.x, p.y - q.y);
    } else if (nPtr === 2 && tocar.pinch) {
      q.x = p.x; q.y = p.y;
      var k = Object.keys(ptrs).map(function (i) { return ptrs[i]; });
      var dist = Math.hypot(k[0].x - k[1].x, k[0].y - k[1].y), cx = (k[0].x + k[1].x) / 2, cy = (k[0].y + k[1].y) / 2;
      if (tocar.pinch.dist > 8) V.zoom(Math.pow(dist / tocar.pinch.dist, d().sensZoom), cx, cy);
      V.mover(cx - tocar.pinch.cx, cy - tocar.pinch.cy);
      tocar.pinch = { dist: dist, cx: cx, cy: cy };
    }
    q.x = p.x; q.y = p.y;
  }

  function arriba(e) {
    var p = pos(e);
    if (e.pointerType === 'mouse') {
      var b = e.button === 0 ? 'l' : e.button === 2 ? 'r' : 'm', c = V.celdaEn(p.x, p.y);
      if (!mouse[b]) return;
      mouse[b] = false; V.presion = -1; V.marcar();
      if (E.bloqueada()) { mouse.ambos = false; mouse.arrastre = false; return; }
      if (mouse.ambos) { if (!mouse.l && !mouse.r) { mouse.ambos = false; if (c >= 0) P.accion('acorde', c); } }
      else if (b === 'l') { if (!mouse.arrastre && c >= 0) P.pulsar(c); }
      else if (b === 'r') { if (c >= 0) P.accion('bandera', c); }
      else if (b === 'm') { if (c >= 0) P.accion('acorde', c); }
      if (!mouse.l) mouse.arrastre = false;
      return;
    }
    var q = ptrs[e.pointerId]; if (!q) return;
    var estabaUno = nPtr === 1; delete ptrs[e.pointerId]; nPtr = Object.keys(ptrs).length;
    clearTimeout(tocar.tmr); V.presion = -1; V.marcar();
    if (estabaUno && !q.mov && !tocar.largo && !tocar.mov && e.type === 'pointerup' && !E.bloqueada()) {
      var c2 = V.celdaEn(p.x, p.y);
      if (c2 >= 0) {
        V.cursor = c2;
        if (E.modoBandera && P.T && (P.T.est[c2] === 0 || P.T.est[c2] === 2 || P.T.est[c2] === 3)) P.accion('bandera', c2);
        else P.pulsar(c2);
      }
    }
    if (nPtr === 0) { tocar.mov = false; tocar.largo = false; tocar.pinch = null; }
    else if (nPtr === 1) { tocar.pinch = null; var r = ptrs[Object.keys(ptrs)[0]]; r.mov = true; }
  }

  /* ---------- teclado ---------- */
  var NOMBRE_TECLA = { Space: 'Espacio', Equal: '+', Minus: '-', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter', Escape: 'Esc' };
  E.nombreTecla = function (c) { return NOMBRE_TECLA[c] || c.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num '); };

  function mover(dx, dy) {
    if (!P.T) return;
    var T = P.T, x = V.cursor % T.w, y = Math.floor(V.cursor / T.w);
    x = Math.max(0, Math.min(T.w - 1, x + dx)); y = Math.max(0, Math.min(T.h - 1, y + dy));
    V.cursor = y * T.w + x; V.cursorVisible = true; V.hover = -1; V.seguir(V.cursor); V.marcar();
  }

  function tecla(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (E.capturando) return;
    if (E.bloqueada()) return;
    var k = d().teclas, c = e.code, paso = e.shiftKey ? 5 : 1, hecho = true;
    if (c === 'ArrowLeft') mover(-paso, 0); else if (c === 'ArrowRight') mover(paso, 0); else if (c === 'ArrowUp') mover(0, -paso); else if (c === 'ArrowDown') mover(0, paso);
    else if (c === k.abrir || c === 'Enter' || c === 'NumpadEnter') { V.cursorVisible = true; P.pulsar(V.cursor); }
    else if (c === k.bandera) { V.cursorVisible = true; P.accion('bandera', V.cursor); }
    else if (c === k.acorde) { V.cursorVisible = true; P.accion('acorde', V.cursor); }
    else if (c === k.pista) P.pista();
    else if (c === k.deshacer) { if (!P.deshacer()) E.accionUI && E.accionUI('aviso', 'Deshacer solo está disponible en modo Práctica.'); }
    else if (c === k.zoomMas || c === 'NumpadAdd') V.zoom(1.25);
    else if (c === k.zoomMenos || c === 'NumpadSubtract') V.zoom(0.8);
    else if (c === k.reiniciar) E.accionUI && E.accionUI('reiniciar');
    else if (c === k.pausa || c === 'Escape') E.accionUI && E.accionUI('pausa');
    else if (c === 'Home') { V.ajustar(); }
    else hecho = false;
    if (hecho) e.preventDefault();
  }

  /* ---------- mando (llamar tras Mando.leer()) ---------- */
  function repetir(clave, activo, dt, ini, cada) {
    var r = pad.rep[clave] || (pad.rep[clave] = { t: 0, n: 0 });
    if (!activo) { r.t = 0; r.n = 0; return false; }
    if (r.n === 0) { r.n = 1; r.t = ini; return true; }
    r.t -= dt; if (r.t <= 0) { r.t = cada; return true; }
    return false;
  }
  E.mando = function (dt) {
    var M = G.Mando; if (!M || !M.conectado || E.bloqueada()) return;
    var dz = d().zonaMuerta, s = M.ejes.izq, mag = Math.hypot(s.x, s.y);
    var sens = d().sensCursor;
    if (M.activo && !V.cursorVisible && (mag > 0.2 || M.sostenido('A') || M.sostenido('ARRIBA') || M.sostenido('ABAJO') || M.sostenido('IZQ') || M.sostenido('DER'))) { V.cursorVisible = true; V.marcar(); }
    if (repetir('u', M.sostenido('ARRIBA'), dt, 260, 85 / sens)) mover(0, -1);
    if (repetir('d', M.sostenido('ABAJO'), dt, 260, 85 / sens)) mover(0, 1);
    if (repetir('l', M.sostenido('IZQ'), dt, 260, 85 / sens)) mover(-1, 0);
    if (repetir('r', M.sostenido('DER'), dt, 260, 85 / sens)) mover(1, 0);
    if (mag > dz) {
      var v = 10 * sens * mag * dt / 1000;
      pad.ax += s.x * v / Math.max(0.3, mag) * Math.min(1, mag * 1.4); pad.ay += s.y * v / Math.max(0.3, mag) * Math.min(1, mag * 1.4);
      var ix = pad.ax | 0, iy = pad.ay | 0;
      if (ix || iy) { pad.ax -= ix; pad.ay -= iy; mover(ix, iy); }
    } else { pad.ax = 0; pad.ay = 0; }
    var rs = M.ejes.der;
    if (Math.hypot(rs.x, rs.y) > dz) { V.mover(-rs.x * 520 * sens * dt / 1000, -rs.y * 520 * sens * dt / 1000); }
    if (M.pulsado('A')) { V.cursorVisible = true; P.pulsar(V.cursor); }
    if (M.pulsado('X')) { V.cursorVisible = true; P.accion('bandera', V.cursor); }
    if (M.pulsado('Y')) { V.cursorVisible = true; P.accion('acorde', V.cursor); }
    if (M.pulsado('B')) P.deshacer();
    if (M.pulsado('VISTA')) P.pista();
    if (M.pulsado('LB')) V.zoom(0.8); if (M.pulsado('RB')) V.zoom(1.25);
    var gz = M.gatillo.der - M.gatillo.izq;
    if (Math.abs(gz) > 0.15) V.zoom(Math.exp(gz * 1.5 * dt / 1000 * d().sensZoom));
    if (M.pulsado('MENU') && E.accionUI) E.accionUI('pausa');
  };

  BM.entrada = E;
})(window);
