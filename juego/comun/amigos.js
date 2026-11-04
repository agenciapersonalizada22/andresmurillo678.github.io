/* Amigos: notificaciones de invitaciones a partidas (en el portal y dentro de los juegos). Script clasico: window.Amigos.
   Incluir en cada pagina (despues de cuenta.js): se activa solo cuando hay sesion. Si Cuenta no esta cargada, la carga.
   Amigos.aceptar(inv) abre el juego con la sala; si ya estas en ese juego usa Lobby.unirseInvitacion(inv). Sonido suave y vibracion al llegar. */
(function (G) {
  'use strict';
  var Amigos = G.Amigos = { sonido: true, vibracion: true }, cont, ctxAudio;
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
    function quitar() { el.remove(); if (cont && !cont.children.length) { cont.remove(); cont = null; } }
    var ac = h('button', { type: 'button', cls: 'cu-btn cu-prim', 'data-f': 1, txt: 'Aceptar', on: { click: function () { ac.disabled = true; Amigos.aceptar(inv).then(function (r) { if (r !== 'navega') quitar(); }); } } });
    var re = h('button', { type: 'button', cls: 'cu-btn cu-sec', 'data-f': 1, txt: 'Ahora no', on: { click: function () { Amigos.rechazar(inv); quitar(); } } });
    var av = Cu().ui.avatarEl(inv.avatar, inv.color, 38);
    el.appendChild(av); el.appendChild(h('div', {}, [h('b', { txt: inv.nombre }), ' te invita a jugar ', h('b', { txt: nombreJ }), h('div', { cls: 'cu-peq', style: 'font-size:12px;color:#bdb4ff', txt: 'Caduca en 5 minutos' })]));
    el.appendChild(ac); el.appendChild(re);
    setTimeout(quitar, Math.max(1000, (inv.expira || Date.now() + 300000) - Cu()._ahora()));
    return el;
  }
  Amigos.mostrar = function (inv) {
    Cu().cargarCss('cuenta.css');
    Cu().tabla().catch(function () {}).then(function () {
      if (!cont) { cont = h('div', { cls: 'cu-inv', 'aria-live': 'assertive' }); document.body.appendChild(cont); }
      cont.appendChild(tarjeta(inv)); pitido(); vibrar();
    });
  };

  Amigos.iniciar = function () {
    if (Amigos._on) return; Amigos._on = true;
    Cu().iniciar().then(function () { Cu().alInvitacion(function (inv) { if (Amigos.auto !== false) Amigos.mostrar(inv); }); });
  };
  if (G.Cuenta) Amigos.iniciar();
  else { var s = document.createElement('script'); s.src = (document.currentScript && document.currentScript.src || '').replace(/amigos\.js.*$/, 'cuenta.js'); s.onload = Amigos.iniciar; document.head.appendChild(s); }
})(window);
