/* Amigos: notificaciones de invitaciones a partidas (en el portal y dentro de los juegos). Script clasico: window.Amigos.
   Incluir en cada pagina (despues de cuenta.js): se activa solo cuando hay sesion. Si Cuenta no esta cargada, la carga.
   Amigos.aceptar(inv) abre el juego con la sala; si ya estas en ese juego usa Lobby.unirseInvitacion(inv). Sonido suave y vibracion al llegar.
   Mando Xbox: mientras hay una invitacion visible se muestra la pista «A aceptar · B ahora no» y se escuchan A/B con una lectura propia y ligera de
   navigator.getGamepads (nunca Mando.leer(), para no romper el flanco que usa el bucle del portal). Mientras la barra esta visible, y 300 ms despues de
   cerrarse, Mando.leer() oculta A/B al juego (Mando.suprimir) para que la misma pulsacion no dispare una accion; los juegos que leen el mando por su
   cuenta pueden consultar Amigos.mandoBloqueado(). Si hay un dialogo de la plataforma con mando propio (portal) tiene prioridad y se ignora A/B aqui. */
(function (G) {
  'use strict';
  var Amigos = G.Amigos = { sonido: true, vibracion: true, mando: true }, cont, ctxAudio, tarjetas = [], timerPad = 0, bloqueoHasta = 0, prevPad = { a: false, b: false };
  function Cu() { return G.Cuenta; }
  function h(t, p, k) { return Cu().ui.h(t, p, k); }

  function pitido() {
    if (!Amigos.sonido) return;
    try {
      var AC = G.AudioContext || G.webkitAudioContext; if (!AC) return;
      ctxAudio = ctxAudio || new AC(); if (ctxAudio.state === 'suspended') ctxAudio.resume();
      [660, 880].forEach(function (f, i) {
        var o = ctxAudio.createOscillator(), g = ctxAudio.createGain(), t = ctxAudio.currentTime + i * 0.14;
        o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g); g.connect(ctxAudio.destination); o.start(t); o.stop(t + 0.2);
      });
    } catch (e) {}
  }
  function vibrar() { if (Amigos.vibracion && navigator.vibrate) try { navigator.vibrate([70, 40, 70]); } catch (e) {} }


  /* ---------- mando: lectura propia y ligera (A = aceptar, B = ahora no) ---------- */
  function padActual() {
    try { var l = navigator.getGamepads ? navigator.getGamepads() : []; for (var i = 0; i < l.length; i++) if (l[i] && l[i].connected) return l[i]; } catch (e) {}
    return null;
  }
  function bot(p, i) { var b = p && p.buttons && p.buttons[i]; return !!(b && (b.pressed || b.value > 0.5)); }
  function dialogoPropio() { var u = Cu().ui; return !!(u && u.mandoPropio && u.mando && u.mando.ocupado && u.mando.ocupado()); }
  function escuchando() { return Amigos.mando && tarjetas.length > 0 && !dialogoPropio(); }
  Amigos.mandoBloqueado = function () {
    var t = Date.now();
    if (escuchando() || t < bloqueoHasta) return true;
    if (t < bloqueoHasta + 3000) { var p = padActual(); return bot(p, 0) || bot(p, 1); } // la pulsacion que cerro la barra sigue sostenida
    return false;
  };
  function vibrarMando() {
    var p = padActual(); if (!Amigos.vibracion || !p) return;
    try {
      var v = p.vibrationActuator;
      if (v && v.playEffect) v.playEffect('dual-rumble', { duration: 120, strongMagnitude: 0.5, weakMagnitude: 0.3 });
      else if (p.hapticActuators && p.hapticActuators[0]) p.hapticActuators[0].pulse(0.5, 120);
    } catch (e) {}
  }
  function pulsoPad() {
    var p = padActual(), hay = !!p && escuchando();
    tarjetas.forEach(function (c, i) { if (c.pista) c.pista.style.display = hay && i === 0 ? '' : 'none'; });
    if (!hay) { prevPad = { a: bot(p, 0), b: bot(p, 1) }; return; }
    var a = bot(p, 0), b = bot(p, 1), objetivo = null;
    for (var i = 0; i < tarjetas.length; i++) if (!tarjetas[i].ac.disabled) { objetivo = tarjetas[i]; break; }
    if (objetivo && a && !prevPad.a) objetivo.ac.click();
    else if (objetivo && b && !prevPad.b) objetivo.re.click();
    prevPad = { a: a, b: b };
  }
  function ponerMando() {
    if (G.Mando) G.Mando.suprimir = function () { return Amigos.mandoBloqueado(); };
    if (timerPad) return;
    var p = padActual(); prevPad = { a: bot(p, 0), b: bot(p, 1) }; // lo ya sostenido al aparecer no cuenta
    timerPad = setInterval(pulsoPad, 40);
    G.addEventListener('gamepadconnected', pulsoPad);
  }
  function quitarMando() { if (timerPad && !tarjetas.length) { clearInterval(timerPad); timerPad = 0; G.removeEventListener('gamepadconnected', pulsoPad); } }

  Amigos.ruta = function (juego) {
    var t = G.PlataformaJuegos, j = t && t.juego(juego);
    return j ? new URL('../' + j.ruta, Cu().base || location.href).href : '';
  };
  Amigos.aceptar = function (inv) {
    var Lb = G.Lobby;
    if (Cu().juegoActual() === inv.juego && Lb && Lb.unirseInvitacion) { Lb.unirseInvitacion(inv); return Promise.resolve('aqui'); }
    return Cu().tabla().then(function () {
      var url = Amigos.ruta(inv.juego); if (!url) { Cu().ui.aviso('Esa invitación es de un juego desconocido.', { color: '#ff6b6b' }); return 'error'; }
      location.href = url + '?sala=' + encodeURIComponent(inv.oferta) + '&inv=' + encodeURIComponent(inv.id);
      return 'navega';
    });
  };
  Amigos.rechazar = function (inv) { return Cu().responderInvitacion(inv, false).catch(function () {}); };

  function tarjeta(inv) {
    var j = G.PlataformaJuegos && G.PlataformaJuegos.juego(inv.juego), nombreJ = j ? j.nombre : inv.juego;
    var el = h('div', { cls: 'cu-inv-t', style: '--c:' + (inv.color || '#ff4fd8'), role: 'alert' });
    function quitar() {
      var k = tarjetas.indexOf(reg); if (k >= 0) { tarjetas.splice(k, 1); bloqueoHasta = Date.now() + 300; }
      el.remove(); quitarMando(); if (cont && !cont.children.length) { cont.remove(); cont = null; } }
    var ac = h('button', { type: 'button', cls: 'cu-btn cu-prim', 'data-f': 1, txt: 'Aceptar', on: { click: function () { ac.disabled = true; Amigos.aceptar(inv).then(function (r) { if (r !== 'navega') quitar(); }); } } });
    var re = h('button', { type: 'button', cls: 'cu-btn cu-sec', 'data-f': 1, txt: 'Ahora no', on: { click: function () { Amigos.rechazar(inv); quitar(); } } });
    var pista = h('div', { cls: 'cu-inv-pista', style: 'display:none', 'aria-hidden': 'true', txt: 'A aceptar · B ahora no' }), reg = { el: el, ac: ac, re: re, pista: pista };
    el._reg = reg;
    var av = Cu().ui.avatarEl(inv.avatar, inv.color, 38);
    el.appendChild(av); el.appendChild(h('div', {}, [h('b', { txt: inv.nombre }), ' te invita a jugar ', h('b', { txt: nombreJ }), h('div', { cls: 'cu-peq', style: 'font-size:12px;color:#bdb4ff', txt: 'Caduca en 5 minutos' })]));
    el.appendChild(ac); el.appendChild(re); el.appendChild(pista);
    setTimeout(quitar, Math.max(1000, (inv.expira || Date.now() + 300000) - Cu()._ahora()));
    return el;
  }
  Amigos.mostrar = function (inv) {
    Cu().cargarCss('cuenta.css');
    Cu().tabla().catch(function () {}).then(function () {
      if (!cont) { cont = h('div', { cls: 'cu-inv', 'aria-live': 'assertive' }); document.body.appendChild(cont); }
      var el = tarjeta(inv); cont.appendChild(el); tarjetas.push(el._reg); ponerMando(); pulsoPad(); pitido(); vibrar(); vibrarMando();
    });
  };

  Amigos.iniciar = function () {
    if (Amigos._on) return; Amigos._on = true;
    Cu().iniciar().then(function () { Cu().alInvitacion(function (inv) { if (Amigos.auto !== false) Amigos.mostrar(inv); }); });
  };
  if (G.Cuenta) Amigos.iniciar();
  else { var s = document.createElement('script'); s.src = (document.currentScript && document.currentScript.src || '').replace(/amigos\.js.*$/, 'cuenta.js'); s.onload = Amigos.iniciar; document.head.appendChild(s); }
})(window);
