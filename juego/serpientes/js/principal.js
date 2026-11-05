/* Serpientes: bucle principal y orquestacion (solo, anfitrion, cliente). */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, A = S.Almacen, U = S.UI, E = S.Entrada, Z = S.Sonido, Lg = S.Logros, D = S.Dibujo, C = S.C, O = S.Online, doc = G.document;
  var $ = function (id) { return doc.getElementById(id); };
  var P = S.Juego = { tipo: 'ninguno', W: null, yo: null, estado: 'menu', pausado: false };
  var render, acc = 0, ult = 0, t0 = 0, tHud = 0, tVida = 0, tGuardar = 0, tPuntos = 0, tFps = 0, frames = 0, fps = 60, lowT = 0, mPausa = null, ultFoco = { x: 0, y: 0, r: 10 };
  var puntos = [], wake = null, finMostrado = false, tFinRonda = 0, ultMasa = 0, ultTurbo = false;

  function perfilNombre() { return S.Cta && S.Cta.usuario() ? S.Cta.nombre().slice(0, 16) : G.Red ? G.Red.perfil.obtener().nombre : 'Jugador'; }
  var ultPunt = null;
  function modoActual() { return P.tipo === 'cliente' ? (O.c && O.c.cfg && O.c.cfg.modo) || 'ffa' : (P.W ? P.W.modo.id : A.aj.modo); }
  function rankingEl() { return S.Cta && S.Cta.usuario() ? [S.Cta.rankingEl(modoActual(), { n: 5, espera: ultPunt }).el] : []; }
  function skinPropia() { if (!A.prog.skin) { A.prog.skin = K().aleatoria(); A.guardarProg(); } return A.prog.skin; }
  function K() { return S.Skins; }

  /* ---------- ajustes ---------- */
  function aplicar() {
    var g = A.disp.graficos, a = A.aj.acc;
    render.calidad(g.calidad); render.op.nombres = g.nombres; render.op.reducir = a.reducir; render.op.daltonismo = a.dalton;
    render.partFactor = g.particulas ? 1 : 0; D.setDalton(a.dalton);
    doc.body.classList.toggle('grande', !!a.textoGrande); doc.body.classList.toggle('reducir', !!a.reducir);
    $('hFps').style.display = g.fps ? 'block' : 'none';
    Z.volumenes(); E.aplicarTactil();
  }

  /* ---------- inicio de partidas ---------- */
  function datosMenu() {
    var sv = A.leer(A.CL.partida, null), sala = A.leer(A.CL.sala, null);
    return { partida: sv && sv.mundo ? S.MODOS[sv.mundo.cfg.modo].nombre + ' · ' + S.fmt((sv.masa || 0)) : '', sala: !!(sala && sala.mundo) };
  }
  function irMenu() {
    cerrarPartida();
    P.estado = 'menu'; U.cerrarTodo(); U.menu(datosMenu()); Z.turbo(false);
  }
  function cerrarPartida(conservarRed) {
    if (!conservarRed && G.Red && G.Red.conectado) G.Red.salir();
    if (!conservarRed) O.limpiar(); P.W = null; P.yo = null; P.tipo = 'ninguno'; U.enPartida = false; U.hudMostrar(false); E.mostrarTactil(false); E.limpiar(); soltarWake(); mPausa = null;
  }
  function nuevaSolo() {
    var cfg = { modo: A.aj.modo, dif: A.aj.dif };
    var W = new S.Mundo(cfg), yo = W.humano({ nombre: perfilNombre(), skin: skinPropia() });
    yo.autoReaparecer = false; A.prog.stats.partidas++; Lg.partida(); A.guardarProg();
    empezar('solo', W, yo);
  }
  function continuarSolo() {
    var sv = A.leer(A.CL.partida, null);
    if (!sv || !sv.mundo) return nuevaSolo();
    try {
      var W = S.Mundo.importar(sv.mundo), yo = W.porId[sv.yoId];
      if (!yo) throw new Error('sin jugador');
      yo.humano = true; yo.autoReaparecer = false; if (yo.vivo) yo.inmune = 1.5;
      empezar('solo', W, yo, !yo.vivo);
    } catch (e) { console.warn('Partida guardada invalida', e); A.borrar(A.CL.partida); nuevaSolo(); }
  }
  function empezar(tipo, W, yo, muerto) {
    cerrarPartida(tipo !== 'solo');
    P.tipo = tipo; P.W = W; P.yo = yo; P.estado = 'juego'; P.pausado = false; finMostrado = false; acc = 0; tFinRonda = 0;
    U.cerrarTodo(); U.ocultarMenu(); U.hudMostrar(true); U.enPartida = true; E.mostrarTactil(true); E.aplicarTactil(); if (yo) { E.sincronizar(yo.ang); render.cam.x = yo.x; render.cam.y = yo.y; ultFoco.x = yo.x; ultFoco.y = yo.y; ultFoco.r = yo.r; }
    Z.iniciar(); Z.musica(true); pedirWake();
    if (!A.aj.tutorialVisto && tipo === 'solo') { A.aj.tutorialVisto = true; A.guardarAj(); U.pistas(E.tactil ? 'tactil' : E.disp); }
    if (tipo === 'host') { A.prog.stats.mpPartidas++; Lg.fin(W.modo.id, false, true); Lg.partida(); A.guardarProg(); }
    if (muerto) setTimeout(function () { mostrarMuerteSolo(); }, 200);
  }

  /* ---------- multijugador ---------- */
  var OPTS = {
    juego: 'Serpientes', maxJugadores: 4, minJugadores: 1,
    modos: Object.keys(S.MODOS).map(function (k) { return { id: k, nombre: S.MODOS[k].nombre }; }),
    alIniciar: function (config) { if (G.Red.esAnfitrion) iniciarHost(config); else iniciarCliente(config); }
  };
  function abrirLobby(restaurar) {
    var o = Object.assign({}, OPTS), sala = A.leer(A.CL.sala, null);
    if (sala && sala.mundo) o.modos = OPTS.modos.concat([{ id: 'restaurar', nombre: 'Restaurar sala guardada' }]);
    G.Lobby.abrir(o);
    if (restaurar && sala && sala.mundo) setTimeout(function () { try { if (G.Red.esAnfitrion) G.Red.fijarSala({ modo: 'restaurar' }); } catch (e) {} }, 400);
  }
  function iniciarHost(config) {
    if (P.tipo === 'host') return; // anfitrion ya en partida: solo llega un amigo tarde
    var W, seats = {}, sala = A.leer(A.CL.sala, null);
    if (config.modo === 'restaurar' && sala && sala.mundo) {
      W = S.Mundo.importar(sala.mundo); seats = sala.seats || {};
      W.serps.filter(function (s) { return s.humano; }).forEach(function (s) { seats[s.red && s.red.token || ('s' + s.id)] = seats[s.red && s.red.token] || { n: s.nombre, k: K().codificar(s.skin), m: s.masa, est: s.est }; W.quitar(s); });
      W.drenar();
    } else W = new S.Mundo({ modo: config.modo, dif: A.aj.dif });
    var seat = seats.host, yo = W.humano({ nombre: perfilNombre(), skin: skinPropia(), masa: seat && seat.m ? Math.max(C.MASA_INI, seat.m * 0.6) : C.MASA_INI });
    yo.autoReaparecer = W.modo.respawn;
    empezar('host', W, yo); O.host(W, yo, seats);
  }
  function iniciarCliente() {
    if (P.tipo === 'cliente') return;
    empezar('cliente', null, null);
    var c = O.cliente(eventoCliente); c.nombre = perfilNombre(); c.skin = skinPropia(); P.tipo = 'cliente';
    A.prog.stats.mpPartidas++; Lg.fin('', false, true); Lg.partida(); A.guardarProg();
    P.yo = c.yo; P.modoCli = null; U.aviso('Conectando con el anfitrión…', 5000);
  }
  function eventoCliente(d) {
    if (d.k === 'cerrado') {
      cerrarPartida(); P.estado = 'menu'; U.cerrarTodo(); U.menu(datosMenu());
      U.info('Sala cerrada', 'El anfitrión cerró la sala o se perdió la conexión. Puedes volver a unirte con un enlace nuevo.');
    } else if (d.k === 'muerte') { onMuerteMP(d); }
    else if (d.k === 'rep') { U.cerrarTodo(); U.aviso('', 1); }
    else if (d.k === 'kf') U.feed((d.a ? d.a + ' eliminó a ' : '') + d.v + (d.a ? '' : ' murió'));
    else if (d.k === 'fin') mostrarFin(d.fin, d.nombre);
    else if (d.k === 'ronda') { finMostrado = false; U.cerrarTodo(); }
  }
  function onMuerteMP(d) {
    Z.efecto('muerte'); E.vibrar(0.8, 0.5, 250); render.temblor = 0.4;
    var modoC = O.c && O.c.cfg && O.c.cfg.modo || 'ffa';
    if (S.Cta && modoC !== 'rey') ultPunt = S.Cta.vida(modoC, { maxMasa: d.max || d.masa, vivo: d.vivo, kills: d.kills }); else if (S.Cta) S.Cta.xp(5);
    var st = A.prog.stats; st.muertes++; st.orbes += d.orbes || 0; st.tiempo += d.vivo || 0; st.turbo += d.turbo || 0; if ((d.max || 0) > st.maxMasa) st.maxMasa = d.max;
    var nuevo = (d.max || d.masa) > A.prog.record; if (nuevo) A.prog.record = d.max || d.masa; A.guardarProg();
    U.aviso(d.resp ? 'Has muerto. Reapareces en unos segundos…' : 'Has muerto. Te quedas mirando hasta el final de la ronda.', 3500);
    if (d.kills) U.toast('Eliminaciones en esta vida: ' + d.kills);
    if (d.resp && P.tipo === 'cliente') setTimeout(function () { if (O.c && !O.c.vivo) O.clientePedirReaparecer(); }, 3300);
  }

  /* ---------- fin de vida / ronda (solo y anfitrion) ---------- */
  function mostrarMuerteSolo(ev) {
    var W = P.W, yo = P.yo; if (!W || P.tipo !== 'solo') return;
    var nuevo = yo.est.maxMasa > A.prog.record;
    var botones = [];
    if (W.modo.respawn && !W.fin) botones.push(['Jugar de nuevo', function () { yo.est.maxMasa = 0; W.reaparecer(yo); E.sincronizar(yo.ang); }, 'prim']);
    botones.push(['Salir al menú', function () { A.borrar(A.CL.partida); irMenu(); }, 'sec']);
    var causa = ev ? (ev.killer && W.porId[ev.killer] ? 'Te eliminó ' + W.porId[ev.killer].nombre + '.' : ev.tipo === 'borde' ? 'Chocaste con el borde de la arena.' : 'Chocaste.') : '';
    U.muerte({ extra: rankingEl(), masa: yo.est.maxMasa, kills: yo.est.kills, vivo: yo.est.vivo, puesto: ev && ev.puesto, nuevoRecord: nuevo, causa: causa, botones: botones, titulo: W.modo.respawn ? 'Has muerto' : 'Eliminado' });
  }
  function contabilizar(yo, modo) {
    var st = A.prog.stats, e = yo.est;
    st.muertes++; st.orbes += e.orbes; st.tiempo += e.vivo; st.turbo += e.turbo; if (e.maxMasa > st.maxMasa) st.maxMasa = e.maxMasa;
    if (e.maxMasa > A.prog.record) A.prog.record = Math.floor(e.maxMasa);
    var mj = A.prog.mejores, clave = modo === 'ffa' ? 'ffa_longitud' : modo === 'equipos' ? 'equipos_longitud' : modo === 'superv' ? 'superv_tiempo' : 'rey_zona', val = modo === 'superv' ? e.vivo : modo === 'rey' ? (e.zona || 0) : e.maxMasa;
    if (val > (mj[clave] || 0)) mj[clave] = Math.floor(val);
    A.guardarProg();
    if (S.Cta) ultPunt = S.Cta.vida(modo, e);
  }
  function eventosJuego(evs) {
    var W = P.W, yo = P.yo, i;
    for (i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.t === 'come') { if (e.id === yo.id) { Z.efecto('come'); if (render.part.n < 30) render.chispa(yo.x, yo.y, 50, 2, 70); } }
      else if (e.t === 'muerte') {
        var v = W.porId[e.id], k = W.porId[e.killer];
        render.chispa(e.x, e.y, v && v.skin ? v.skin.h1 : 0, 26, 220);
        if (v && (v.humano || (k && k.humano))) U.feed(k ? k.nombre + ' eliminó a ' + v.nombre : v.nombre + ' murió');
        if (e.id === yo.id) {
          Z.efecto('muerte'); E.vibrar(0.9, 0.5, 300); render.temblor = 0.45; Z.turbo(false);
          contabilizar(yo, W.modo.id);
          if (P.tipo === 'solo') { var ev = e; setTimeout(function () { if (P.tipo === 'solo' && !finMostrado && !yo.vivo) mostrarMuerteSolo(ev); }, 900); }
          else U.aviso(W.modo.respawn ? 'Has muerto. Reapareces en unos segundos…' : 'Has muerto. Observa hasta el final.', 3000);
        } else if (e.killer === yo.id) { Z.efecto('kill'); E.vibrar(0.3, 0.6, 120); Lg.kill(W.t); U.toast('Eliminaste a ' + (v ? v.nombre : '?')); }
      } else if (e.t === 'reaparece' && e.id === yo.id) { U.cerrarTodo(); U.aviso('', 1); E.sincronizar(yo.ang); }
      else if (e.t === 'fin') { mostrarFin(e.fin, W.porId[e.fin.ganador] ? W.porId[e.fin.ganador].nombre : ''); }
    }
  }
  function mostrarFin(fin, nombreGanador) {
    if (finMostrado) return; finMostrado = true; Z.efecto('fin');
    var W = P.W, txt = '', lista = null, gano = false, esHost = P.tipo === 'host', modo = fin.tipo;
    if (P.tipo === 'cliente') { modo = fin.tipo; gano = O.c && fin.ganador === O.c.id; }
    else gano = fin.ganador === P.yo.id;
    if (fin.tipo === 'equipos') { txt = fin.ganador < 0 ? 'Empate.' : 'Gana el equipo ' + (fin.ganador === 0 ? 'azul' : 'rojo') + '.'; var mi = P.tipo === 'cliente' ? (O.c.yo.equipo) : P.yo.equipo; gano = fin.ganador >= 0 && fin.ganador === mi; if (fin.masa) txt += ' Masa: azul ' + fin.masa[0] + ' · rojo ' + fin.masa[1]; }
    else if (fin.tipo === 'rey') txt = (nombreGanador || 'Alguien') + ' conquistó la colina' + (gano ? ': ¡eres el rey!' : '.');
    else txt = gano ? '¡Eres la última serpiente!' : (nombreGanador ? 'Gana ' + nombreGanador + '.' : 'La ronda terminó.');
    if (P.tipo !== 'cliente' && W) {
      lista = W.tabla(5).map(function (s, i) { return (i + 1) + '. ' + s.nombre + ' · ' + S.fmt(W.modo.id === 'rey' ? s.pt : s.masa) + (W.modo.id === 'rey' ? ' pts' : ''); });
      if (P.yo && P.yo.vivo) contabilizar(P.yo, W.modo.id);
    }
    Lg.fin(fin.tipo, gano, P.tipo !== 'solo'); A.guardarProg();
    var botones = [];
    if (P.tipo === 'solo') { A.borrar(A.CL.partida); botones.push(['Jugar de nuevo', function () { nuevaSolo(); }, 'prim']); }
    else if (esHost) { botones.push(['Seguir (nueva ronda en breve)', function () {}, 'prim']); tFinRonda = 12; }
    else botones.push(['Seguir (el anfitrión inicia otra ronda)', function () {}, 'prim']);
    botones.push(['Salir al menú', function () { irMenu(); }, 'sec']);
    U.cerrarTodo(); if (gano && S.Cta) S.Cta.xp(15);
    U.fin({ titulo: gano ? '¡Victoria!' : 'Fin de la ronda', texto: txt, lista: lista, extra: rankingEl(), botones: botones });
  }
  function nuevaRondaHost() {
    var W0 = P.W, W = new S.Mundo({ modo: W0.modo.id, dif: W0.dif.id }), yo = W.humano({ nombre: perfilNombre(), skin: skinPropia() });
    yo.autoReaparecer = W.modo.respawn; P.W = W; P.yo = yo; O.hostNuevaRonda(W, yo); finMostrado = false; U.cerrarTodo(); E.sincronizar(yo.ang);
  }

  /* ---------- pausa ---------- */
  function pausa() {
    if (P.estado !== 'juego') return;
    if (mPausa && U.raizActiva() === mPausa) { cerrarPausa(); return; }
    if (U.hayModal()) return;
    P.pausado = P.tipo === 'solo';
    mPausa = U.pausa({
      continuar: function () { P.pausado = false; mPausa = null; ult = performance.now(); },
      salir: function () { if (P.tipo === 'solo') guardarSolo(); if (P.tipo === 'host') guardarSala(); irMenu(); },
      invitar: P.tipo === 'host' ? function () { abrirLobby(false); } : null, red: P.tipo !== 'solo'
    });
    if (P.tipo === 'solo') guardarSolo();
  }
  function cerrarPausa() { if (mPausa) { var m = mPausa; mPausa = null; U.cerrar(m); P.pausado = false; ult = performance.now(); } }

  /* ---------- guardado ---------- */
  function guardarSolo() {
    if (P.tipo !== 'solo' || !P.W || P.W.fin) return;
    A.escribir(A.CL.partida, { ts: Date.now(), yoId: P.yo.id, masa: Math.floor(P.yo.vivo ? P.yo.masa : P.yo.est.maxMasa), mundo: P.W.exportar() });
  }
  function guardarSala() {
    if (P.tipo !== 'host' || !P.W || P.W.fin) return;
    var s = O.hostGuardar(); if (s) A.escribir(A.CL.sala, s);
  }
  function guardarTodo() { if (P.estado !== 'juego') return; guardarSolo(); guardarSala(); if (P.yo && P.yo.est.maxMasa > A.prog.record) { A.prog.record = Math.floor(P.yo.est.maxMasa); } A.guardarProg(); }

  /* ---------- wake lock / pantalla completa ---------- */
  function pedirWake() { try { if (navigator.wakeLock && E.tactil) navigator.wakeLock.request('screen').then(function (w) { wake = w; }, function () {}); } catch (e) {} }
  function soltarWake() { try { if (wake) wake.release(); } catch (e) {} wake = null; }
  function pantallaCompleta() {
    var el = doc.documentElement;
    if (!doc.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el); else (doc.exitFullscreen || doc.webkitExitFullscreen || function () {}).call(doc);
  }

  /* ---------- bucle ---------- */
  function escenaLocal() {
    var W = P.W, yo = P.yo;
    if (yo.vivo) { ultFoco.x = yo.x; ultFoco.y = yo.y; ultFoco.r = yo.r; }
    if (ts() - tPuntos > 0.2) {
      tPuntos = ts(); puntos.length = 0;
      for (var i = 0; i < W.vivas.length; i++) { var s = W.vivas[i]; puntos.push({ id: s.id, x: s.x, y: s.y, equipo: s.equipo, r: s.r }); }
    }
    return { foco: yo.vivo ? yo : { x: ultFoco.x, y: ultFoco.y, r: ultFoco.r, turbo: false }, serps: W.serps, orbes: function (a, b, c, d, o) { return W.orbes.visibles(a, b, c, d, o); }, R: W.R, Rc: W.Rc, zona: W.zona, yoId: yo.id, puntos: puntos };
  }
  var tAhora = 0; function ts() { return tAhora; }

  function hudLocal() {
    var W = P.W, yo = P.yo, tabla = W.tabla(), rank = tabla.indexOf(yo) + 1, rey = W.modo.id === 'rey', top = [];
    for (var i = 0; i < Math.min(8, tabla.length); i++) top.push({ nombre: tabla[i].nombre, v: rey ? tabla[i].pt : tabla[i].masa, yo: tabla[i] === yo });
    if (rank > 8) top.push({ nombre: yo.nombre, v: rey ? yo.pt : yo.masa, yo: true });
    var mh = '';
    if (W.modo.id === 'equipos') mh = '<span class="eq0">Azul ' + S.fmt(W.eqMasa[0]) + '</span> · <span class="eq1">Rojo ' + S.fmt(W.eqMasa[1]) + '</span> · ' + S.tiempo(Math.max(0, W.modo.duracion - W.t));
    else if (W.modo.id === 'superv') mh = 'Vivas: ' + W.vivas.length + ' · Arena ' + Math.round(W.Rc / W.R * 100) + '%';
    else if (rey) mh = 'Tus puntos: ' + Math.floor(yo.pt) + ' / ' + W.modo.meta + (Math.hypot(yo.x - W.zona.x, yo.y - W.zona.y) < W.zona.r ? ' · ¡En la zona!' : ' · Ve a la zona dorada');
    return { masa: yo.vivo ? yo.masa : 0, rank: yo.vivo ? rank : 0, n: tabla.length, top: top, modoHtml: mh, tituloTabla: rey ? 'Puntos' : 'Clasificación', fps: A.disp.graficos.fps ? Math.round(fps) + ' FPS · ' + render.nombreQ : '' };
  }
  function hudCliente() {
    var c = O.c, e = c.estado, top = [], mh = '', rey = c.cfg && c.cfg.modo === 'rey';
    if (e) {
      e.top.forEach(function (q) { var m = c.meta[q[0]]; top.push({ nombre: q[0] === c.id ? c.nombre : (m ? m.nombre : '?'), v: rey ? q[1] / 10 : q[1], yo: q[0] === c.id }); });
      if (c.cfg && c.cfg.modo === 'equipos') mh = '<span class="eq0">Azul ' + S.fmt(e.eq[0]) + '</span> · <span class="eq1">Rojo ' + S.fmt(e.eq[1]) + '</span> · ' + S.tiempo(Math.max(0, S.MODOS.equipos.duracion - e.tl));
      else if (c.cfg && c.cfg.modo === 'superv') mh = 'Vivas: ' + e.n + ' · Arena ' + Math.round(e.rc / c.R * 100) + '%';
    }
    return { masa: c.vivo ? c.yo.masa : 0, rank: e && c.vivo ? e.rk : 0, n: e ? e.n : 0, top: top, modoHtml: mh, tituloTabla: rey ? 'Puntos' : 'Clasificación', fps: A.disp.graficos.fps ? Math.round(fps) + ' FPS · ' + render.nombreQ : '' };
  }

  function bucle(now) {
    G.requestAnimationFrame(bucle);
    tAhora = now / 1000;
    var dt = Math.min(0.1, (now - ult) / 1000); ult = now; if (dt <= 0) return;
    var lobby = G.Lobby && G.Lobby.abierto;
    if (!lobby && G.Mando) G.Mando.leer();
    if (G.Mando && G.Mando.activo && !lobby) { if (G.Mando.conectado) E.disp = E.disp; }
    if (!lobby) S.Nav.tick(dt);
    U.animarPrevias(tAhora);
    frames++; if (now - tFps > 500) { fps = frames * 1000 / (now - tFps); frames = 0; tFps = now; autoCalidad(); }
    if (P.estado !== 'juego') { if (P.estado === 'menu') renderFondoMenu(dt); return; }
    var modal = U.hayModal();
    E.activa = !modal;
    E.actualizar(dt, P.yo ? P.yo.ang : 0, !lobby);
    if (E.pausa) { E.pausa = false; pausa(); }
    var esc;
    if (P.tipo === 'cliente') {
      var c = O.c;
      if (c.vivo && !modal) { O.clienteTick(dt, E.ang, E.turbo); } else O.clienteTick(dt, c.yo.ang, false);
      var comidos = O.clienteComer(); if (comidos) Z.efecto('come');
      Z.turbo(E.turbo && c.vivo && !modal);
      esc = O.escenaCliente(dt); P.yo = c.yo;
    } else {
      var W = P.W, yo = P.yo;
      if (yo.vivo) { if (!modal) { yo.objAng = E.ang; yo.pideTurbo = E.turbo; } else yo.pideTurbo = false; }
      Z.turbo(yo.vivo && yo.turbo);
      if (!P.pausado) {
        acc = Math.min(acc + dt, 0.25); var n = 0;
        while (acc >= C.DT && n < 4) { W.paso(C.DT); acc -= C.DT; n++; if (n < 4 && acc >= C.DT) { /* varios pasos: recoger eventos entre ellos */ } }
        var evs = W.drenar(); eventosJuego(evs); if (P.tipo === 'host') { O.hostEventos(evs); O.hostTick(dt); }
        if (W.fin && P.tipo === 'host' && finMostrado) { tFinRonda -= dt; if (tFinRonda <= 0) nuevaRondaHost(); }
      }
      esc = escenaLocal();
    }
    render.dibujar(esc, dt, tAhora);
    tHud += dt; tVida += dt; tGuardar += dt;
    if (tHud > 0.12) { tHud = 0; U.hudActualizar(P.tipo === 'cliente' ? hudCliente() : hudLocal()); }
    if (tVida > 1) { tVida = 0; vida(); }
    if (tGuardar > 5) { tGuardar = 0; guardarTodo(); }
  }
  function vida() {
    var yo = P.yo; if (!yo) return;
    if (P.tipo === 'cliente') { var c = O.c; if (!c.vivo) return; Lg.vida({ masa: yo.masa, orbes: yo.est.orbes, vivoT: yo.est.vivo + 0, turboVida: yo.est.turbo, rank: c.estado ? c.estado.rk : 99, n: c.estado ? c.estado.n : 0 }); if (yo.masa > A.prog.record) A.prog.record = Math.floor(yo.masa); yo.est.vivo += 1; if (E.turbo) yo.est.turbo += 1; return; }
    if (!yo.vivo) return;
    if (yo.masa > A.prog.record) A.prog.record = Math.floor(yo.masa);
    var tabla = P.W.tabla(), rank = tabla.indexOf(yo) + 1;
    Lg.vida({ masa: yo.masa, orbes: yo.est.orbes, vivoT: yo.est.vivo, turboVida: yo.est.turbo, rank: rank, n: tabla.length });
    if (G.Mando && G.Mando.conectado && (E.disp === 'mando')) Lg.dar('mando');
  }
  function autoCalidad() {
    if (!A.disp.graficos.auto || P.estado !== 'juego' || document.hidden) { lowT = 0; return; }
    if (fps < 38) lowT += 0.5; else lowT = Math.max(0, lowT - 0.5);
    if (lowT >= 4) {
      lowT = 0; var orden = ['ultra', 'alta', 'media', 'baja'], i = orden.indexOf(A.disp.graficos.calidad);
      if (i >= 0 && i < orden.length - 1) { A.disp.graficos.calidad = orden[i + 1]; A.guardarDisp(); aplicar(); U.toast('Calidad gráfica bajada a ' + orden[i + 1] + ' para mantener la fluidez'); }
    }
  }
  var fondoSer = null;
  function renderFondoMenu(dt) {
    if (!fondoSer) {
      var W = new S.Mundo({ modo: 'ffa', dif: 'normal', total: 12, semilla: 7 }); for (var i = 0; i < 12; i++) W.nuevoBot(); fondoSer = { W: W, t: 0 };
      var pre = 0; while (pre++ < 600) W.paso(C.DT);
    }
    var W2 = fondoSer.W; W2.paso(C.DT); W2.paso(C.DT); W2.drenar();
    var foco = W2.vivas[0]; if (!foco) return;
    for (var q = 0; q < W2.vivas.length; q++) if (W2.vivas[q].masa > foco.masa) foco = W2.vivas[q];
    var esc = { foco: foco, serps: W2.serps, orbes: function (a, b, c, d, o) { return W2.orbes.visibles(a, b, c, d, o); }, R: W2.R, Rc: W2.Rc, zona: null, yoId: -1, puntos: [] };
    var nom = render.op.nombres; render.op.nombres = false; render.dibujar(esc, dt, tAhora); render.op.nombres = nom;
    if (W2.t > 120) fondoSer = null;
  }

  /* ---------- arranque ---------- */
  function init() {
    render = new D.Render($('lienzo'), $('mini')); P.render = render;
    E.init($('lienzo')); S.Ajustes.alCambiar = function () { aplicar(); }; S.Ajustes.alImportar = function () { aplicar(); if (U.menuVisible()) U.menu(datosMenu()); };
    U.init({ jugar: nuevaSolo, continuar: continuarSolo, multi: abrirLobby, pausa: pausa, skinCambiada: function () { U.menu(datosMenu()); } });
    Lg.alDesbloquear(function (l) { Z.efecto('logro'); U.logroToast(l); });
    skinPropia(); aplicar();
    $('btnFs').addEventListener('click', pantallaCompleta);
    G.addEventListener('resize', function () { render.redim(false); });
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) { guardarTodo(); if (A.aj.audio.pausaOculta) Z.suspender(true); if (P.estado === 'juego' && P.tipo === 'solo' && !U.hayModal()) pausa(); }
      else { Z.suspender(false); pedirWake(); ult = performance.now(); }
    });
    G.addEventListener('pagehide', function () { guardarTodo(); if (G.Red && G.Red.conectado) G.Red.salir(); });
    doc.addEventListener('pointerdown', function () { Z.iniciar(); }, { once: true });
    doc.addEventListener('keydown', function () { Z.iniciar(); }, { once: true });
    if (S.Cta) {
      S.Cta.alRecargar(function () { aplicar(); if (U.menuVisible()) U.menu(datosMenu()); });
      S.Cta.alPerfil = function () { if (U.menuVisible()) U.menu(datosMenu()); };
    }
    irMenu();
    if (G.Lobby) { G.Lobby.registrar(OPTS); if (G.Lobby.hayEnlace()) G.Lobby.abrir(OPTS); }
    G.requestAnimationFrame(function (t) { ult = t; bucle(t); });
  }
  P.abrirLobby = abrirLobby; P.guardarTodo = guardarTodo; P.iniciarHost = iniciarHost;
  P.estadoDebug = function () { return { tipo: P.tipo, estado: P.estado, fps: fps, calidad: A.disp.graficos.calidad, vivas: P.W ? P.W.vivas.length : 0, orbes: P.W ? P.W.orbes.n : 0, masa: P.yo ? P.yo.masa : 0 }; };
  function arrancar() { (S.Cta ? S.Cta.arrancar() : Promise.resolve()).then(init, init); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})(window);
