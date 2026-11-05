/* Celulas: bucle principal, camara, sesion de juego, progreso y persistencia. */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {}, doc = G.document, Al = C.Almacen, U = C.UI, E = C.Entrada, Aj = C.Aj, R = C.Render, Au = C.Audio, K = C.K;
  var J = C.Juego = { vista: null, mundo: null, yo: null, rol: null, pausado: false };
  var cam = { x: 2500, y: 2500, z: 1 }, obj = { x: 0, y: 0, pausa: false }, op = {}, centro = { x: 0, y: 0, m: 0, spread: 0, n: 0 };
  var acc = 0, ultimo = 0, tEj = 0, tHud = 0, tMini = 0, tProg = 0, tSave = 0, tPistas = 0, pistas = 0, miniCtx, W = 0, H = 0, wake = null;
  var fpsN = 0, fpsT = 0, fpsMalos = 0, fpsAct = 0, masaPrev = 0, prog, prev = null, sesion = null, tFin = 0, muertoMostrado = false, finMostrado = false, cuentaVida = 0;

  /* ---------------- sesion ---------------- */
  J.perfil = function () { var p = U.perfil(); return { nombre: p.nombre, skin: p.skin }; };
  J.cfgPartida = function () { return { modo: Aj.gen.modo, dif: Aj.gen.dif, bots: Aj.gen.bots }; };
  J.aviso = function (t, c) { U.toast(t, c); };

  J.nuevaSolo = function () {
    var cfg = J.cfgPartida(), p = J.perfil();
    var m = new C.Mundo({ modo: cfg.modo, semilla: (Math.random() * 4294967295) >>> 0, bots: cfg.bots, dificultad: cfg.dif });
    var yo = m.agregarJugador({ nombre: p.nombre, skin: p.skin, token: C.Multi.token() });
    J.empezar(m, yo, 'solo');
  };
  J.continuar = function () {
    var d = Al.leer('partida', null);
    if (!d || !d.mundo) return J.nuevaSolo();
    try {
      var m = C.Mundo.restaurar(d.mundo), yo = m.jugs[d.yo];
      if (!yo) return J.nuevaSolo();
      var p = J.perfil(); yo.nombre = p.nombre; yo.skin = p.skin;
      J.empezar(m, yo, 'solo');
    } catch (e) { Al.borrar('partida'); J.nuevaSolo(); }
  };
  J.empezar = function (mundo, yo, rol) {
    prog = C.progreso();
    J.mundo = mundo; J.vista = mundo; J.yo = yo; J.rol = rol; J.pausado = false; acc = 0;
    mundo.alEvento = alEvento;
    comienzo(mundo.modo);
    prog.stats.partidas++; if (rol !== 'solo') prog.stats.multi++;
    prev = statsYo(); C.Almacen.escribir('progreso', prog);
    fijarCamara(true);
  };
  J.empezarCliente = function (rep) {
    prog = C.progreso(); J.mundo = null; J.vista = rep; J.rol = 'cliente'; J.pausado = false;
    J.yo = rep.jugs[rep.yo] || { id: rep.yo, cel: [], st: {}, nombre: '' };
    comienzo(rep.modo);
    prog.stats.partidas++; prog.stats.multi++; Al.escribir('progreso', prog);
    prev = null; fijarCamara(true);
    if (G.Lobby && G.Lobby.abierto) G.Lobby.cerrar();
  };
  function comienzo(modo) {
    sesion = { modo: modo, t0: G.performance.now(), kills: 0, maxMasa: 0, victoria: false };
    muertoMostrado = finMostrado = false; tPistas = 0; pistas = 0; masaPrev = 0; cuentaVida = 0;
    ['menu', 'pausa', 'muerte', 'ajustes', 'logros', 'ayuda', 'sala'].forEach(function (id) { U.ocultar(id); });
    doc.getElementById('hud').classList.remove('oculto'); doc.body.classList.remove('en-menu');
    E.reiniciar(); E.activa = true; Au.iniciar(); Au.musica(Aj.gen.musica > 0); pedirWake();
    U.cache = {};
  }
  J.alMenu = function () {
    J.guardar();
    if (C.Multi.rol) C.Multi.cerrar(true);
    J.vista = null; J.mundo = null; J.rol = null; E.activa = false; E.reiniciar();
    doc.getElementById('hud').classList.add('oculto'); doc.body.classList.add('en-menu'); Au.pararMusica(); soltarWake();
    ['pausa', 'muerte', 'ajustes', 'logros', 'ayuda', 'sala'].forEach(function (id) { U.ocultar(id); });
    menu();
  };
  J.guardar = function () {
    if (J.rol === 'solo' && J.mundo && J.yo && J.mundo.estado === 'jugando' && (J.yo.cel.length || J.mundo.puedeReaparecer(J.yo))) {
      Al.escribir('partida', { v: 1, t: Date.now(), yo: J.yo.id, mundo: J.mundo.serializar() });
    } else if (J.rol === 'solo') Al.borrar('partida');
    if (J.rol === 'anfitrion') C.Multi.guardarSala();
    if (prog) { prog.records = prog.records; Al.escribir('progreso', prog); }
  };

  /* ---------------- eventos del mundo ---------------- */
  function alEvento(tipo, a, b) {
    if (C.Multi.rol === 'anfitrion') C.Multi.evento(tipo, a, b);
    if (tipo === 'muerte' && a === J.yo) { Au.sfx('muerte'); vibrar(250); setTimeout(alMorir, 900); }
    else if (tipo === 'kill' && a === J.yo) { Au.sfx('devorar'); sesion.kills++; U.toast('Devoraste a ' + b.nombre, '#6dff6d'); vibrar(40); if (Mando_ok()) G.Mando.vibrar(0.3, 0.5, 90); }
    else if (tipo === 'virus' && a === J.yo) { Au.sfx('virus'); U.toast('¡Un virus te hizo reventar!', '#ff6b4a'); vibrar(120); }
    else if (tipo === 'muerte' && b === J.yo) { /* ya cubierto por kill */ }
    else if (tipo === 'fin') alFin(a, b);
  }
  J.eventoRemoto = function (d) {
    if (d.t === 'muerte') { J.statsRemoto = d.st; Au.sfx('muerte'); vibrar(250); J.yo.puestoFinal = d.p; setTimeout(alMorir, 900); if (d.por) J.porQuien = d.por; }
    else if (d.t === 'kill') { Au.sfx('devorar'); U.toast('Devoraste a ' + d.a, '#6dff6d'); vibrar(40); }
    else if (d.t === 'virus') { Au.sfx('virus'); U.toast('¡Un virus te hizo reventar!', '#ff6b4a'); }
    else if (d.t === 'lleno') U.panel('sala', 'Sala llena', ['No hay hueco para más jugadores en esta partida.'], [{ txt: 'Volver al menú', cls: 'principal', fn: J.alMenu, atras: true }]);
    else if (d.t === 'fin') alFin({ id: d.g, nombre: d.gn }, d.ge);
  };
  function Mando_ok() { return G.Mando && G.Mando.conectado; }
  function vibrar(ms) { if (Aj.dev.vibracion && G.navigator.vibrate) { try { G.navigator.vibrate(ms); } catch (e) {} } }
  E.vibra = vibrar;

  function datosFin(extra) {
    var v = J.vista, s = statsYo(), d = [['Masa máx.', String(Math.round(s.max))], ['Bajas', String(s.kills)], ['Comida', String(s.comida)], ['Tiempo vivo', U.formatoTiempo(s.tv)]];
    return d.concat(extra || []);
  }
  function alMorir() {
    if (!J.vista || muertoMostrado) return; var v = J.vista, y = J.yo;
    var vivo = J.mundo ? y.cel.length > 0 : v.vivo; if (vivo) return;
    if (v.estado === 'terminado') return;
    muertoMostrado = true; prog.stats.muertes++; guardarProg(true);
    var puede = J.mundo ? J.mundo.puedeReaparecer(y) : v.cfg.reaparece || (v.modo === 'batalla' && v.t < v.cfg.gracia);
    var botones = [];
    if (puede) botones.push({ txt: 'REAPARECER', cls: 'principal', fn: J.reaparecer });
    else botones.push({ txt: 'SEGUIR MIRANDO', cls: 'principal', fn: function () { U.ocultar('muerte'); E.activa = false; muertoMostrado = true; } });
    botones.push({ txt: 'MENÚ', fn: J.alMenu, atras: !puede });
    var puesto = J.mundo ? y.puesto : (J.yo.puestoFinal || 0);
    U.panelFin({ titulo: puede ? 'TE DEVORARON' : 'ELIMINADO', sub: !puede && puesto ? 'Puesto #' + puesto : '', datos: datosFin(), botones: botones });
    E.activa = false;
  }
  J.reaparecer = function () {
    if (J.mundo) J.mundo.reaparecer(J.yo); else C.Multi.accion('r', 0, 0, false);
    U.ocultar('muerte'); muertoMostrado = false; E.activa = true; cuentaVida++; prev = statsYo(); masaPrev = 0;
  };
  function alFin(ganador, eq) {
    if (finMostrado) return; finMostrado = true;
    var v = J.vista, y = J.yo, modo = v.modo, gano = false;
    if (modo === 'equipos') gano = y.equipo === eq; else gano = !!ganador && ganador.id === y.id;
    sesion.victoria = gano; if (gano) { prog.stats.victorias++; Au.sfx('victoria'); } else Au.sfx('aviso');
    var ctx = contexto(); ctx.victoria = gano; var nuevos = C.Logros.evaluar(prog, ctx); anunciar(nuevos); guardarProg(true);
    if (J.rol === 'solo') Al.borrar('partida');
    if (J.rol === 'anfitrion') Al.borrar('sala');
    var titulo = modo === 'equipos' ? 'GANA EL EQUIPO ' + C.EQUIPOS[eq >= 0 ? eq : 0].nombre.toUpperCase() : gano ? '¡VICTORIA!' : 'FIN DE LA PARTIDA';
    var botones = [];
    if (J.rol === 'solo') botones.push({ txt: 'JUGAR DE NUEVO', cls: 'principal', fn: function () { J.nuevaSolo(); } });
    botones.push({ txt: 'MENÚ', cls: J.rol === 'solo' ? '' : 'principal', fn: J.alMenu, atras: true });
    U.panelFin({ titulo: titulo, sub: ganador && modo !== 'equipos' ? 'Ganador: ' + ganador.nombre : '', datos: datosFin(), botones: botones });
    E.activa = false;
  }

  /* ---------------- progreso y logros ---------------- */
  function statsYo() {
    var y = J.yo, v = J.vista, s;
    if (J.mundo) { s = y.st; return { comida: s.comida, kills: s.kills, kv: s.killsVida, div: s.divisiones, exp: s.expulsadas, vir: s.virus, max: s.maxMasa, tv: y.tVida, em: s.emboscadas || 0, masa: y.masa, celulas: y.cel.length, puesto: 0 }; }
    var r = v.stYo || {}; return { comida: r.c || 0, kills: r.k || 0, kv: r.kv || 0, div: r.d || 0, exp: r.x || 0, vir: r.v || 0, max: r.m || 0, tv: r.tv || 0, em: r.em || 0, masa: v.jugs[v.yo] ? v.jugs[v.yo].masa : 0, celulas: centro.n, puesto: r.p || 0 };
  }
  function contexto() {
    var s = statsYo(), v = J.vista, y = J.yo, rank = v.lb.indexOf(y.id);
    return { masa: s.masa, killsVida: s.kv, tVida: s.tv, celulas: s.celulas, top1: rank === 0 && s.masa >= 150 ? 1 : 0, dif: J.mundo ? J.mundo.dif : Aj.gen.dif, modo: v.modo, t: v.t, vivo: s.masa > 0, victoria: false };
  }
  function anunciar(nuevos) { nuevos.forEach(function (l) { U.toast('🏆 Logro: ' + l.nombre, '#ffd23d', 4500); Au.sfx('logro'); }); }
  function guardarProg(forzar) { Al.escribir('progreso', prog); }
  function progresoTick(dt) {
    var s = statsYo(), st = prog.stats; if (!prev) { prev = s; return; }
    var d = function (a, b) { return a >= b ? a - b : 0; };
    st.comida += d(s.comida, prev.comida); st.kills += d(s.kills, prev.kills); st.divisiones += d(s.div, prev.div); st.expulsadas += d(s.exp, prev.exp); st.virus += d(s.vir, prev.vir); st.emboscadas += d(s.em, prev.em);
    st.tiempo += dt; if (s.masa > st.maxMasa) st.maxMasa = s.masa;
    if (s.masa > prog.records[J.vista.modo]) prog.records[J.vista.modo] = s.masa;
    if (s.kv > st.rachaMax) st.rachaMax = s.kv;
    prev = s;
    var nuevos = C.Logros.evaluar(prog, contexto()); if (nuevos.length) { anunciar(nuevos); guardarProg(); }
  }

  /* ---------------- camara ---------------- */
  function centroPropio(v, id, out) {
    var sx = 0, sy = 0, sm = 0, n = 0, i, c;
    for (i = 0; i < v.nC; i++) { c = v.cells[i]; if (c.jid !== id) continue; sx += c.rx * c.rm; sy += c.ry * c.rm; sm += c.rm; n++; }
    out.n = n; out.m = sm; if (sm > 0) { out.x = sx / sm; out.y = sy / sm; var sp = 0; for (i = 0; i < v.nC; i++) { c = v.cells[i]; if (c.jid !== id) continue; var dd = Math.hypot(c.rx - out.x, c.ry - out.y) + c.rr; if (dd > sp) sp = dd; } out.spread = sp; }
    return out;
  }
  function fijarCamara(brusco) {
    var v = J.vista; if (!v) return;
    var y = J.mundo ? J.yo : v.jugs[v.yo], id = J.yo.id;
    var ok = centroPropio(v, id, centro).n > 0, tx, ty, masa = centro.m, spread = centro.spread;
    if (ok) { tx = centro.x; ty = centro.y; }
    else { // espectador: sigue al lider
      var l = v.lb.length ? v.jugs[v.lb[0]] : null;
      if (l && l.masa > 0) { tx = l.cx; ty = l.cy; masa = l.masa; spread = 0; } else { tx = cam.x; ty = cam.y; masa = 0; }
    }
    var Rq = Math.max(K * Math.sqrt(masa || 20), spread * 0.85);
    var esc = Math.max(0.7, Math.min(1.3, Math.min(W, H) / 900));
    var zt = 1.35 / (1 + Rq / 300) * esc * E.zoomK;
    var zmin = (W / 2) / 2600 * 1.0; if (zt < zmin) zt = zmin; if (zt > 2.4) zt = 2.4;
    if (brusco) { cam.x = tx; cam.y = ty; cam.z = zt; return; }
    var dt = fijarCamara.dt, kp = 1 - Math.exp(-dt * 12), kz = 1 - Math.exp(-dt * (doc.body.classList.contains('reducir-mov') ? 8 : 2.6));
    cam.x += (tx - cam.x) * kp; cam.y += (ty - cam.y) * kp; cam.z += (zt - cam.z) * kz;
  }
  fijarCamara.dt = 0.016;

  /* ---------------- ajuste de pantalla ---------------- */
  function ajustarPantalla() {
    W = G.innerWidth; H = G.innerHeight;
    var cal = Aj.cal(), dpr = Math.min(G.devicePixelRatio || 1, cal.dpr);
    R.ajustar(W, H, dpr);
    var m = doc.getElementById('mini'); if (m) { var s = Math.round(m.clientWidth * Math.min(2, G.devicePixelRatio || 1)) || 140; m.width = m.height = s; }
  }
  function pedirWake() { try { if (E.esTactil() && G.navigator.wakeLock && !wake) G.navigator.wakeLock.request('screen').then(function (w) { wake = w; w.addEventListener('release', function () { wake = null; }); }, function () {}); } catch (e) {} }
  function soltarWake() { try { if (wake) wake.release(); } catch (e) {} wake = null; }

  /* ---------------- pausa ---------------- */
  J.pausar = function () {
    if (!J.vista || J.pausado || finMostrado) return;
    J.pausado = true; E.activa = false;
    var mp = J.rol !== 'solo', botones = [{ txt: 'REANUDAR', cls: 'principal', fn: J.reanudar, atras: true }];
    if (J.rol === 'anfitrion') botones.push({ txt: 'INVITAR JUGADORES', fn: function () { U.ocultar('pausa'); G.Lobby.abrir(C.Multi.opciones()); } });
    botones.push({ txt: 'PANTALLA COMPLETA', fn: J.pantallaCompleta });
    botones.push({ txt: 'AJUSTES', fn: function () { abrirAjustes('pausa'); } }, { txt: 'AYUDA', fn: function () { U.ayuda(E.esTactil(), function () { U.ocultar('ayuda'); U.nav(); }); } });
    botones.push({ txt: mp ? 'SALIR DE LA SALA' : 'GUARDAR Y SALIR', cls: 'peligro', fn: J.alMenu });
    U.panel('pausa', 'PAUSA', [mp ? 'La partida multijugador no se detiene.' : 'Partida detenida. Se guarda sola.'], botones);
  };
  J.pantallaCompleta = function () {
    var d = doc, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    } catch (e) {}
  };
  J.reanudar = function () { J.pausado = false; U.ocultar('pausa'); if (!muertoMostrado && !finMostrado) E.activa = true; acc = 0; ultimo = G.performance.now(); };

  function abrirAjustes(desde) {
    var e = doc.getElementById('ajustes'); e.textContent = ''; var caja = doc.createElement('div'); caja.className = 'caja'; caja.style.width = 'min(640px,100%)'; e.appendChild(caja);
    Aj.abrir(caja, function () { U.ocultar('ajustes'); U.nav(); });
    U.mostrar('ajustes');
  }

  /* ---------------- menu ---------------- */
  function menu() {
    U.menu({
      jugar: J.nuevaSolo, continuar: J.continuar,
      multi: function () { G.Lobby.abrir(C.Multi.opciones()); },
      restaurarSala: function () { C.Multi.restaurar = true; G.Lobby.abrir(C.Multi.opciones()); },
      logros: function () { U.logros(function () { U.ocultar('logros'); U.nav(); }); },
      ajustes: function () { abrirAjustes('menu'); },
      ayuda: function () { U.ayuda(E.esTactil(), function () { U.ocultar('ayuda'); U.nav(); Al.escribir('progreso', Object.assign(C.progreso(), {})); }); }
    });
    U.mostrar('menu');
  }
  J.salaCerrada = function (motivo) {
    if (J.rol !== 'cliente' && J.rol !== 'anfitrion') return;
    if (J.rol === 'anfitrion') return;
    finMostrado = true; E.activa = false; J.pausado = true;
    U.panel('sala', 'La sala terminó', ['El anfitrión se desconectó o cerró la sala. Tu progreso (masa máxima, logros) se conserva.'], [{ txt: 'VOLVER AL MENÚ', cls: 'principal', fn: function () { U.ocultar('sala'); J.alMenu(); }, atras: true }]);
  };

  /* ---------------- bucle ---------------- */
  var cols = { nor: C.COLORES_COMIDA, cvd: C.COLORES_COMIDA_CVD };
  function opciones(t) {
    var g = Aj.gen, d = Aj.dev;
    op.cal = Aj.cal(); op.t = t / 1000; op.yo = J.yo ? J.yo.id : -1; op.cuadricula = d.cuadricula; op.nombres = d.nombres; op.masa = d.masa; op.equipos = J.vista.modo === 'equipos';
    op.fondo = '#05030f'; op.mapa = '#0d0b26'; op.rejilla = 'rgba(154,140,255,0.16)'; op.borde = 'rgba(255,79,216,0.85)'; op.virusRelleno = '#2fdc4a'; op.virusBorde = '#12a02c';
    op.paletaComida = g.daltonismo === 'ninguno' ? cols.nor : cols.cvd; op.textoK = g.textoGrande ? 1.25 : 1;
    if (g.daltonismo !== 'ninguno') { op.virusRelleno = '#e8e8e8'; op.virusBorde = '#555'; }
    return op;
  }
  function frame(now) {
    G.requestAnimationFrame(frame);
    var dt = Math.min(0.1, (now - ultimo) / 1000); ultimo = now; if (dt <= 0) return;
    fijarCamara.dt = dt;
    var lobby = G.Lobby && G.Lobby.abierto;
    if (!lobby) {
      G.Mando.leer(); E.leerMando(G.Mando, dt);
      if (U.hayOverlay()) C.Nav.leer(G.Mando, dt);
    }
    if (E.pausaPend) {
      E.pausaPend = false;
      if (J.vista && !lobby) { if (U.visible('pausa')) J.reanudar(); else if (!U.hayOverlay()) J.pausar(); else if (U.visible('ajustes') || U.visible('ayuda')) { /* Esc cierra con el boton Volver */ var b = C.Nav.raiz && C.Nav.raiz.querySelector('[data-atras]'); if (b) b.click(); } }
      else if (!J.vista) { var b2 = C.Nav.raiz && C.Nav.raiz !== doc.getElementById('menu') && C.Nav.raiz.querySelector('[data-atras]'); if (b2) b2.click(); }
    }
    var tactil = E.esTactil(); if (doc.body.classList.contains('es-tactil') !== tactil) doc.body.classList.toggle('es-tactil', tactil);
    if (!J.vista) { C.Multi.tickCliente(); return; }
    jugar(dt, now, lobby);
  }
  function jugar(dt, now, lobby) {
    var v = J.vista, y = J.yo, mundo = J.mundo, activo = E.activa && !J.pausado && !lobby;
    var congelado = J.pausado && J.rol === 'solo';
    if (activo || J.rol !== 'solo') E.objetivo(cam.z, W, H, obj); else { obj.x = obj.y = 0; obj.pausa = true; }
    if (!activo && !E.joy.act) { obj.x = obj.y = 0; }
    if (mundo) {
      if (!congelado) {
        if (y.cel.length) mundo.entrada(y, obj.x, obj.y, obj.pausa);
        if (activo && y.cel.length) acciones(dt, mundo, y);
        acc += dt; var n = 0;
        while (acc >= C.DT && n < 5) { mundo.paso(C.DT); acc -= C.DT; n++; }
        if (n >= 5) acc = 0;
        mundo.prepararRender(acc / C.DT, dt);
        if (J.rol === 'anfitrion') C.Multi.tickHost(mundo);
      } else mundo.prepararRender(acc / C.DT, 0);
      if (v.estado === 'terminado' && !finMostrado) { /* alEvento('fin') ya lo gestiona */ }
    } else {
      var rep = v; rep.entrada.ax = obj.x; rep.entrada.ay = obj.y; rep.entrada.pausa = obj.pausa;
      if (activo) accionesCliente(dt);
      C.Multi.enviarEntrada(obj.x, obj.y, obj.pausa, W / 2 / cam.z, H / 2 / cam.z);
      rep.prepararRender(dt, G.Red.reloj());
      if (rep.estado === 'terminado' && !finMostrado) { /* llega por evento */ }
      J.yo = rep.jugs[rep.yo] || J.yo;
    }
    fijarCamara(false);
    // dibujo
    var o = opciones(now);
    R.dibujar(v, cam, o);
    // sonidos de comer
    var cp = centroPropio(v, y.id, centro);
    if (cp.m > masaPrev + 0.9 && masaPrev > 0) Au.sfx('comer', Math.min(300, cp.m - masaPrev) * 3);
    masaPrev = cp.m;
    // temporizadores de interfaz
    tHud -= dt; if (tHud <= 0) { tHud = 0.25; actualizarHud(v, y); }
    tMini -= dt; if (tMini <= 0) { tMini = 0.08; if (!miniCtx) miniCtx = doc.getElementById('mini').getContext('2d'); R.minimapa(miniCtx, doc.getElementById('mini').width, v, cam, y.id, o); }
    tProg -= dt; if (tProg <= 0 && !congelado) { tProg = 1; progresoTick(1); tPistas++; pistasIniciales(); }
    tSave -= dt; if (tSave <= 0) { tSave = 5; J.guardar(); }
    rendimiento(dt);
    doc.getElementById('pausaMov').classList.toggle('oculto', !E.pausaMov);
  }
  function acciones(dt, mundo, y) {
    if (E.dividirPend) { E.dividirPend = false; if (mundo.dividir(y)) { Au.sfx('dividir'); vibrar(20); } }
    if (E.ejecutando()) { tEj -= dt; if (tEj <= 0) { tEj = 0.09; if (mundo.expulsar(y)) Au.sfx('expulsar'); } } else tEj = 0;
  }
  function accionesCliente(dt) {
    var rep = J.vista;
    if (E.dividirPend) { E.dividirPend = false; C.Multi.accion('d', obj.x, obj.y, obj.pausa); Au.sfx('dividir'); vibrar(20); }
    if (E.ejecutando()) { tEj -= dt; if (tEj <= 0) { tEj = 0.1; C.Multi.accion('e', obj.x, obj.y, obj.pausa); Au.sfx('expulsar'); } } else tEj = 0;
  }
  function actualizarHud(v, y) {
    var s = statsYo(), modo = v.modo, txt = C.MODOS[modo].corto, cfg = C.MODOS[modo], rank = v.lb.indexOf(y.id) + 1;
    if (cfg.tiempo) txt += ' · ' + U.formatoTiempo(cfg.tiempo - v.t);
    if (modo === 'batalla') txt += v.t < cfg.gracia ? ' · ZONA EN ' + Math.ceil(cfg.gracia - v.t) + 's' : ' · ZONA ' + Math.round(v.zona);
    var vivos = 0; for (var i = 0; i < v.jugs.length; i++) { var q = v.jugs[i]; if (q && (J.mundo ? q.cel.length > 0 : q.masa > 0)) vivos++; }
    if (!cfg.reaparece) txt += ' · VIVOS ' + vivos;
    var puesto = rank;
    if (!puesto && s.masa > 0 && J.mundo) { puesto = 1; for (var k = 0; k < v.jugs.length; k++) { var o = v.jugs[k]; if (o && o !== y && o.masa > s.masa) puesto++; } }
    U.hud(v, y, { masa: s.masa, puesto: puesto || 0, tiempo: s.tv, bajas: s.kv, modoTxt: txt });
    if (v.estado === 'terminado' && J.rol === 'cliente' && !finMostrado) { /* espera el evento */ }
  }
  function pistasIniciales() {
    if (prog.ayuda || !sesion) return;
    var tac = E.esTactil(), msgs = tac ? ['Arrastra el dedo para moverte', 'Come puntos y células más pequeñas', 'DIVIDIR para atacar · EXPULSAR para lanzar masa', 'Los virus verdes revientan a las células grandes']
      : ['Mueve el ratón: tu célula lo sigue', 'Come puntos y células más pequeñas; huye de las mayores', 'Espacio divide · W expulsa masa · Q pausa el movimiento', 'Los virus verdes revientan a las células grandes'];
    var etapa = [1, 7, 14, 21];
    if (pistas < 4 && tPistas >= etapa[pistas]) { U.toast(msgs[pistas], '#3df5ff', 5000); pistas++; if (pistas >= 4) { prog.ayuda = true; guardarProg(); } }
  }
  function rendimiento(dt) {
    fpsN++; fpsT += dt;
    if (fpsT >= 1) {
      fpsAct = fpsN / fpsT; fpsN = 0; fpsT = 0;
      U.fps(Aj.dev.fps ? Math.round(fpsAct) + ' FPS · ' + R.visibles + ' obj' : null);
      if (Aj.dev.autobaja && !J.pausado && fpsAct < 28) { if (++fpsMalos >= 4) { fpsMalos = 0; var n = Aj.bajarCalidad(); if (n) { U.toast('Rendimiento bajo: calidad ' + n, '#ffd23d'); ajustarPantalla(); } } } else fpsMalos = 0;
    }
  }

  /* ---------------- arranque ---------------- */
  function arrancar() {
    R.iniciar(doc.getElementById('cv'));
    E.iniciar(doc.getElementById('cv'), { btnDividir: doc.getElementById('btnDividir'), btnExpulsar: doc.getElementById('btnExpulsar'), joyBase: doc.getElementById('joyBase'), joyKnob: doc.getElementById('joyKnob') });
    Aj.onCambio = function () { if (W) ajustarPantalla(); };
    Aj.aplicar(); ajustarPantalla();
    G.addEventListener('resize', ajustarPantalla);
    doc.getElementById('btnPantalla').onclick = J.pantallaCompleta;
    G.addEventListener('keydown', function (e) { if (e.code === 'KeyF' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '') && J.vista) J.pantallaCompleta(); });
    doc.getElementById('btnPausaHud').onclick = function () { Au.iniciar(); if (U.visible('pausa')) J.reanudar(); else J.pausar(); };
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) { J.guardar(); Au.suspender(); if (J.rol === 'solo' && Aj.gen.pausaOculto && !J.pausado && J.vista && !finMostrado && !muertoMostrado) J.pausar(); }
      else { Au.reanudar(); ultimo = G.performance.now(); acc = 0; if (J.vista) pedirWake(); }
    });
    G.addEventListener('pagehide', function () { J.guardar(); if (G.Red && G.Red.conectado) G.Red.salir(); });
    ['pointerdown', 'keydown'].forEach(function (ev) { G.addEventListener(ev, function () { Au.iniciar(); }, { once: true }); });
    menu();
    if (G.Lobby && G.Lobby.hayEnlace()) G.Lobby.abrir(C.Multi.opciones());
    ultimo = G.performance.now(); G.requestAnimationFrame(frame);
    G.CelulasDepuracion = J;
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})(window);
