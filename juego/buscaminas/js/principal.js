/* Arranque, bucle principal, aplicacion de ajustes, visibilidad, pantalla activa y autobajada de calidad. */
(function (G) {
  'use strict';
  var BM = G.BM, UI = BM.ui, P = BM.partida, V = BM.vista, E = BM.entrada, A = BM.ajustes, doc = G.document;
  var $ = function (id) { return doc.getElementById(id); };
  var ultimo = 0, ultDibujo = 0, ventana = [], fpsN = 0, fpsT = 0, wake = null, musicaIniciada = false;

  function aplicar() {
    var g = A.gen, d = A.disp, th = BM.temas.LISTA[d.tema] || BM.temas.LISTA.neon, r = doc.documentElement.style;
    V.opciones({ tema: d.tema, dalt: g.daltonismo, brillo: d.brillo, particulas: d.particulas, cascada: d.cascada, reducir: g.reducirMovimiento, dpr: Math.min(3, (G.devicePixelRatio || 1) * d.resolucion) });
    r.setProperty('--bg', th.bg); r.setProperty('--panel', th.panel); r.setProperty('--texto', th.texto); r.setProperty('--acento', th.acento);
    doc.body.dataset.tema = d.tema;
    doc.body.classList.toggle('grande', g.textoGrande); doc.body.classList.toggle('reducir', g.reducirMovimiento);
    $('fps').hidden = !d.mostrarFps;
    UI.aplicarTactil(); BM.sonido.volumenes(); P.refrescarRiesgo();
    if (musicaIniciada) BM.sonido.musica(g.volMusica > 0);
  }

  function medida() {
    var e = $('escena'), r = e.getBoundingClientRect();
    V.redim(Math.max(1, Math.floor(r.width)), Math.max(1, Math.floor(r.height)));
  }

  function bajarCalidad() {
    var orden = ['ultra', 'alta', 'media', 'baja'], i = orden.indexOf(A.disp.calidad);
    if (A.disp.calidad === 'personalizada') i = 1;
    if (i < 0 || i >= orden.length - 1) return;
    A.preset(orden[i + 1]); UI.toast('Rendimiento bajo: calidad reducida a ' + orden[i + 1], 'aviso', 3500);
  }

  function frame(t) {
    G.requestAnimationFrame(frame);
    var lim = A.disp.fps === '30' ? 33 : A.disp.fps === '60' ? 15 : 0;
    if (lim && t - ultDibujo < lim) return;
    var dt = Math.min(100, t - (ultimo || t)); ultimo = t; ultDibujo = t;
    if (!G.Lobby || !G.Lobby.abierto) {
      G.Mando.leer();
      if (!UI.nav(dt)) E.mando(dt);
    }
    P.tick(dt); UI.refrescarReloj();
    var pintado = V.dibujar(t, dt);
    if (pintado && dt < 500) {
      ventana.push(dt); if (ventana.length > 90) {
        var m = ventana.reduce(function (a, b) { return a + b; }, 0) / ventana.length; ventana = [];
        if (A.disp.autoBajar && m > 44 && !doc.hidden) bajarCalidad();
      }
    }
    fpsN++; if (t - fpsT > 1000) { if (A.disp.mostrarFps) $('fps').textContent = fpsN + ' FPS'; fpsN = 0; fpsT = t; }
  }

  function pantallaActiva() {
    if (!A.disp.pantallaActiva || !navigator.wakeLock || doc.hidden) return;
    navigator.wakeLock.request('screen').then(function (s) { wake = s; s.addEventListener('release', function () { wake = null; }); }, function () {});
  }

  function inicio() {
    A.cargar(); BM.progreso.cargar();
    UI.iniciar(); V.iniciar($('lienzo')); E.iniciar($('lienzo')); UI.enlazar();
    E.bloqueada = function () { return UI.hayPanel() || (BM.cuenta && BM.cuenta.dialogoAbierto()) || !$('inicio').hidden || (G.Lobby && G.Lobby.abierto) || !P.T; };
    medida();
    if (G.ResizeObserver) new ResizeObserver(medida).observe($('escena')); G.addEventListener('resize', medida);
    aplicar(); A.alCambiar(function (grupo, k) { aplicar(); });
    if (G.matchMedia && G.matchMedia('(pointer: coarse)').matches) doc.body.classList.add('tactil');
    BM.multi.iniciar();
    UI.mostrarInicio();
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) {
        P.guardarYa(); BM.sonido.suspender();
        if (A.gen.pausaOculta && P.cfg && !P.cfg.mp && (P.estado === 'jugando') && $('inicio').hidden) UI.pausar();
      } else { BM.sonido.reanudar(); pantallaActiva(); }
    });
    G.addEventListener('pagehide', function () { P.guardarYa(); A.guardarYa(); });
    setInterval(function () { P.guardarYa(); }, 5000);
    var primero = function () { BM.sonido.despertar(); if (!musicaIniciada) { musicaIniciada = true; BM.sonido.musica(A.gen.volMusica > 0); } pantallaActiva(); };
    ['pointerdown', 'keydown'].forEach(function (ev) { G.addEventListener(ev, primero, { once: false, passive: true }); });
    G.requestAnimationFrame(frame);
  }
  function arrancar() { if (BM.cuenta) BM.cuenta.arrancar(inicio); else inicio(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})(window);
