/* Multijugador (Red/Lobby): Carrera, Cooperativo y Duelo. El anfitrion es arbitro de semilla, turnos y fin.
   Flujo de persistencia:
   - Cada jugador guarda un token de asiento en localStorage (buscaminas_asiento). Al empezar o reconectar envia 'hola' {tok}.
   - El anfitrion guarda la sala (buscaminas_sala): modo, dif, semilla, asientos (token, nombre, puntos), estado del tablero, vidas, turno.
   - Si el anfitrion recarga: Menu > Multijugador > "Reanudar sala" crea una sala nueva con enlaces nuevos; al pulsar Iniciar se restaura la partida.
   - Los demas abren el enlace nuevo; su token les devuelve el mismo asiento y reciben el estado completo ('cfg').
   - Un jugador desconectado a mitad de partida se reconecta con un enlace nuevo; el anfitrion re-inicia la sincronizacion al detectar su entrada. */
(function (G) {
  'use strict';
  var BM = G.BM, UI = BM.ui, h = UI.h, P = BM.partida, C = BM.config, A = BM.ajustes, Red = G.Red, Lobby = G.Lobby, doc = G.document;
  var MP = BM.multi = { J: null, miAsiento: -1 };
  var NOMBRE = { carrera: 'Carrera', coop: 'Cooperativo', duelo: 'Duelo' };
  var token = '', pendiente = null, holaT = 0, cuenta = 0, saveT = 0, lastProg = 0, progEnv = -1, curEnv = -1, curT = 0, turnoT = 0, syncT = 0, finCarreraT = 0, esperaHola = false;
  var OPTS = null;

  function $(id) { return doc.getElementById(id); }
  function miToken() {
    if (token) return token;
    var o = BM.almacen.leer(BM.almacen.CLAVES.asiento, null);
    if (o && o.token) token = o.token; else { token = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); BM.almacen.escribir(BM.almacen.CLAVES.asiento, { token: token }); }
    return token;
  }
  function perfil() { return Red.perfil.obtener(); }
  function dims(dif) { var d = C.DIF[dif] || C.DIF.intermedio; return { w: d.w, h: d.h, m: d.m }; }
  function publico() { return MP.J.asientos.map(function (a) { return { n: a.nombre, c: a.color, e: a.estado, p: a.puntos, g: a.pct, t: a.t }; }); }
  function activo() { return !!(MP.J && MP.J.activo && !MP.J.fin); }

  MP.iniciar = function () {
    OPTS = { juego: 'Buscaminas', maxJugadores: 4, minJugadores: 2, modos: [{ id: 'carrera', nombre: 'Carrera' }, { id: 'coop', nombre: 'Cooperativo' }, { id: 'duelo', nombre: 'Duelo' }], alIniciar: alIniciar };
    Red.on('mensaje', mensaje);
    Red.on('jugadorSalio', function (id) { if (Red.esAnfitrion) alSalir(id); });
    Red.on('jugadorUnido', function (id) { if (Red.esAnfitrion && activo()) { clearTimeout(holaT); holaT = setTimeout(function () { if (activo() && Red.esAnfitrion) Red.iniciar({ modo: MP.J.modo, juego: 'Buscaminas', maxJugadores: Red.max, semilla: MP.J.semilla }); }, 700); } });
    Red.on('cerrado', function (motivo) { if (MP.J && activo()) { UI.toast('Se perdió la conexión con la sala', 'mal'); if (!Red.esAnfitrion) terminarLocal(); } });
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) guardarSala(); });
    G.addEventListener('pagehide', guardarSala);
    if (Lobby.hayEnlace()) { miToken(); Lobby.abrir(OPTS); }
  };

  MP.abrirMenu = function () {
    miToken();
    var sala = BM.almacen.leer(BM.almacen.CLAVES.sala, null), cuerpo = h('div', { cls: 'menu-mp' });
    var difs = h('div', { cls: 'chips' }), chs = {};
    ['principiante', 'intermedio', 'experto'].forEach(function (k) {
      chs[k] = h('button', { type: 'button', cls: 'chip', 'aria-pressed': String(A.gen.mpDif === k), on: { click: function () { A.poner('gen', 'mpDif', k); Object.keys(chs).forEach(function (q) { chs[q].setAttribute('aria-pressed', String(q === k)); }); } } }, [C.DIF[k].nombre, h('small', { txt: C.DIF[k].w + '×' + C.DIF[k].h + ' · ' + C.DIF[k].m })]);
      difs.appendChild(chs[k]);
    });
    cuerpo.appendChild(h('p', { txt: 'Juega con hasta 3 amigos sin servidor: el anfitrión envía un enlace de invitación. Tableros garantizados sin adivinar (la misma semilla para todos).' }));
    cuerpo.appendChild(h('div', { cls: 'bloque' }, [h('h3', { txt: 'Dificultad (si eres anfitrión)' }), difs]));
    cuerpo.appendChild(h('ul', { cls: 'lista-modos' }, [h('li', { html: '<b>Carrera:</b> mismo tablero para todos; gana quien lo resuelve primero. Ves el progreso de los rivales.' }),
      h('li', { html: '<b>Cooperativo:</b> un tablero compartido, turnos libres y 3 vidas compartidas.' }), h('li', { html: '<b>Duelo:</b> por turnos; abrir suma puntos, reventar resta 10.' })]));
    var p;
    var pie = [UI.btn('Crear sala / unirme', function () { p.cerrar(); pendiente = null; Lobby.abrir(OPTS); }, 'prim', { 'data-foco': 1 })];
    if (sala && !sala.fin && sala.est) pie.unshift(UI.btn('Reanudar sala guardada (' + NOMBRE[sala.modo] + ' · ' + (C.DIF[sala.dif] || {}).nombre + ')', function () { p.cerrar(); pendiente = sala; A.poner('gen', 'mpDif', sala.dif); Lobby.abrir(OPTS); }, 'sec'));
    p = UI.panel({ titulo: 'Multijugador', cuerpo: cuerpo, pie: pie, ancho: 460 });
  };

  /* ---------- arranque ---------- */
  function alIniciar(config, jugadores) {
    miToken(); clearTimeout(holaT);
    if (activo()) { if (!Red.esAnfitrion && !MP.sincronizado) enviarHola(); return; }
    if (Red.esAnfitrion) crearJuegoAnfitrion(config, jugadores);
    else { MP.J = null; MP.sincronizado = false; esperaHola = true; UI.cerrarTodos(); UI.ocultarInicio(); UI.banner('Esperando al anfitrión…', 3000); enviarHola(); }
  }
  function enviarHola() {
    var n = 0; clearInterval(MP.holaI);
    function una() { if (MP.sincronizado || !Red.conectado || ++n > 20) { clearInterval(MP.holaI); return; } var pf = perfil(); Red.enviar('hola', { tok: miToken(), n: pf.nombre, c: pf.color }); }
    una(); MP.holaI = setInterval(una, 1000);
  }

  function crearJuegoAnfitrion(config, jugadores) {
    var guard = pendiente; pendiente = null;
    var modo = guard ? guard.modo : (config.modo || 'carrera'), dif = guard ? guard.dif : (A.gen.mpDif || 'intermedio'), semilla = guard ? guard.semilla : (config.semilla >>> 0);
    var d = dims(dif), pf = perfil();
    var J = MP.J = { modo: modo, dif: dif, semilla: semilla, w: d.w, h: d.h, m: d.m, activo: true, fin: false, asientos: [], turno: 0, turnoHasta: 0, seq: 0, t0: Red.reloj() + 3200, ganador: -2, ok: false };
    if (guard) {
      guard.asientos.forEach(function (a) { J.asientos.push({ token: a.token, nombre: a.nombre, color: a.color, redId: -1, estado: a.token === miToken() ? 'jugando' : 'desconectado', puntos: a.puntos || 0, pct: a.pct || 0, t: null }); });
      J.seq = guard.seq || 0; J.turno = guard.turno || 0;
    }
    var mio = J.asientos.map(function (a) { return a.token; }).indexOf(miToken());
    if (mio < 0) { J.asientos.push({ token: miToken(), nombre: pf.nombre, color: pf.color, redId: 0, estado: 'jugando', puntos: 0, pct: 0, t: null }); mio = J.asientos.length - 1; }
    J.asientos[mio].redId = 0; J.asientos[mio].estado = 'jugando'; J.asientos[mio].nombre = pf.nombre; J.asientos[mio].color = pf.color;
    MP.miAsiento = mio;
    if (!guard) (jugadores || []).forEach(function (j) { if (j.id !== 0 && J.asientos.length < 4) J.asientos.push({ token: '', nombre: j.nombre, color: j.color, redId: j.id, estado: 'jugando', puntos: 0, pct: 0, t: null }); });
    arrancarLocal({ est: guard && guard.est, vidas: guard && guard.vidas, puntos: guard && guard.puntosTot, tms: guard && guard.tms });
    saveT = setInterval(guardarSala, 3000); syncT = setInterval(function () { if (activo() && J.modo !== 'carrera') Red.difundir('sync', snap(), { fiable: true }); }, 10000);
    turnoT = setInterval(vigilarTurno, 1000);
    if (J.modo === 'duelo') { J.turnoHasta = Red.reloj() + C.DUELO_TURNO * 1000 + 3200; }
  }

  function snap() { var s = P.snapshot(); return { n: MP.J.seq, est: s.est, v: s.vidas, pu: MP.J.asientos.map(function (a) { return a.puntos; }), tu: MP.J.turno, th: MP.J.turnoHasta, tms: Math.round(P.tiempoMs) }; }

  function arrancarLocal(ini) {
    var J = MP.J;
    UI.cerrarTodos(); UI.ocultarInicio(); UI.fijarCfgUlt(null);
    ini = ini || {};
    var vidas = J.modo === 'coop' ? C.VIDAS_COOP : J.modo === 'duelo' ? -1 : 0;
    P.cb.accion = alAccion;
    P.nueva({ modo: 'mp', dif: J.dif, semilla: J.semilla, vidas: vidas, mp: { modo: J.modo } });
    P.interceptor = J.modo === 'carrera' ? null : interceptar;
    if (ini.est) { P.aplicarSnapshot({ est: ini.est, vidas: ini.vidas != null ? ini.vidas : vidas, puntos: null }); P.tiempoMs = ini.tms || 0; if (ini.puntos) P.puntos = ini.puntos; }
    P.pausada = true; BM.vista.cursorVisible = false;
    $('rivales').hidden = false; document.body.classList.add('mp'); pintarRivales();
    var falta = J.t0 - Red.reloj();
    function arr() { P.pausada = false; P.arrancar(); UI.banner('¡YA!', 700); BM.sonido.nivel(); UI.actualizarHud(); BM.vista.marcar(); }
    clearTimeout(cuenta);
    if (falta > 200) {
      var k = Math.ceil(falta / 1000);
      (function tic() { var f = J.t0 - Red.reloj(); if (f <= 80) { arr(); return; } UI.banner(String(Math.ceil(f / 1000)), 900); BM.sonido.tictac(); cuenta = setTimeout(tic, Math.min(1000, f % 1000 || 1000)); })();
    } else arr();
    UI.actualizarHud();
    if (J.modo === 'carrera') { clearInterval(MP.progI); MP.progI = setInterval(enviarProg, 400); }
    clearInterval(MP.curI); MP.curI = setInterval(enviarCursor, 140);
  }

  /* ---------- mensajes ---------- */
  function mensaje(tipo, d, de) {
    var J = MP.J;
    if (tipo === 'fin' && d && d.cerrado) { UI.toast('La sala está llena', 'mal'); return; }
    if (Red.esAnfitrion) {
      if (tipo === 'hola') return hostHola(d, de);
      if (!J) return;
      if (tipo === 'req') return hostReq(d, de);
      if (tipo === 'fin') return hostFin(d, de);
      if (tipo === 'resync') return Red.enviar('sync', snap(), { a: de });
    }
    if (tipo === 'cfg') return clienteCfg(d);
    if (tipo === 'prog') { if (J && J.asientos[d.s]) { var a = J.asientos[d.s]; a.pct = d.p; a.estado = d.e || a.estado; pintarRivales(); } return; }
    if (!J) return;
    if (tipo === 'acc' && !Red.esAnfitrion) return clienteAcc(d);
    if (tipo === 'sync' && !Red.esAnfitrion) return aplicarSync(d);
    if (tipo === 'as') { d.a.forEach(function (x, i) { var a = J.asientos[i]; if (!a) a = J.asientos[i] = { token: '', redId: -1, pct: 0 }; a.nombre = x.n; a.color = x.c; a.estado = x.e; a.puntos = x.p; a.pct = x.g; a.t = x.t; }); J.asientos.length = d.a.length; pintarRivales(); return; }
    if (tipo === 'turno') { J.turno = d.tu; J.turnoHasta = d.th; pintarRivales(); return; }
    if (tipo === 'fin' && !Red.esAnfitrion) return mostrarFinMP(d);
    if (tipo === 'cur') { if (d.s !== MP.miAsiento && J.asientos[d.s]) { if (d.i < 0) delete BM.vista.remotos[d.s]; else BM.vista.remotos[d.s] = { i: d.i, color: J.asientos[d.s].color, nombre: J.asientos[d.s].nombre }; BM.vista.marcar(); } }
  }

  function hostHola(d, de) {
    var J = MP.J; if (!J || !J.activo) return;
    var tok = String(d.tok || ''), idx = -1, i;
    for (i = 0; i < J.asientos.length; i++) if (tok && J.asientos[i].token === tok) idx = i;
    if (idx < 0) for (i = 0; i < J.asientos.length; i++) if (J.asientos[i].redId === de && !J.asientos[i].token) idx = i;
    if (idx < 0 && J.asientos.length < 4) { J.asientos.push({ token: tok, nombre: '', color: '', redId: de, estado: J.modo === 'carrera' && !J.fin ? 'fuera' : 'jugando', puntos: 0, pct: 0, t: null }); idx = J.asientos.length - 1; }
    if (idx < 0) { Red.enviar('fin', { cerrado: true, modo: J.modo }, { a: de }); return; }
    var a = J.asientos[idx]; a.token = tok; a.redId = de; a.nombre = String(d.n || 'Jugador').slice(0, 16); a.color = /^#[0-9a-f]{6}$/i.test(d.c) ? d.c : '#3df5ff';
    if (a.estado === 'desconectado') a.estado = J.modo === 'carrera' ? 'fuera' : 'jugando';
    var s = snap();
    Red.enviar('cfg', { modo: J.modo, dif: J.dif, semilla: J.semilla, seat: idx, as: publico(), t0: J.t0, est: J.seq || P.T.abiertas || P.T.banderas ? s.est : null, v: s.v, pu: s.pu, tu: J.turno, th: J.turnoHasta, tms: s.tms, n: J.seq, ya: J.t0 < Red.reloj() }, { a: de });
    Red.difundir('as', { a: publico() }); pintarRivales(); guardarSala();
  }

  function clienteCfg(d) {
    if (MP.sincronizado && MP.J && MP.J.semilla === d.semilla && MP.J.activo) return;
    miToken(); clearInterval(MP.holaI); MP.sincronizado = true; esperaHola = false;
    var dm = dims(d.dif);
    var J = MP.J = { modo: d.modo, dif: d.dif, semilla: d.semilla, w: dm.w, h: dm.h, m: dm.m, activo: true, fin: false, asientos: [], turno: d.tu, turnoHasta: d.th, seq: d.n || 0, t0: d.t0, ganador: -2 };
    d.as.forEach(function (x, i) { J.asientos.push({ nombre: x.n, color: x.c, estado: x.e, puntos: d.pu[i] || 0, pct: x.g || 0, t: x.t, token: '', redId: -1 }); });
    MP.miAsiento = d.seat;
    arrancarLocal({ est: d.est, vidas: d.v, tms: d.tms });
  }

  /* ---------- carrera ---------- */
  function enviarProg() {
    var J = MP.J; if (!activo() || J.modo !== 'carrera' || !P.T) return;
    var p = Math.round(BM.motor.progreso(P.T) * 100), a = J.asientos[MP.miAsiento]; if (!a) return;
    var e = P.estado === 'ganada' ? 'termino' : P.estado === 'perdida' ? 'fuera' : 'jugando';
    if (p === progEnv && e === a.estado) return;
    progEnv = p; a.pct = p; if (a.estado !== 'fuera' && a.estado !== 'termino') a.estado = e; pintarRivales();
    Red.difundir('prog', { s: MP.miAsiento, p: p, e: e });
  }
  function hostFin(d, de) {
    var J = MP.J; if (!J || J.modo !== 'carrera' || J.fin) return;
    var i = J.asientos.map(function (a) { return a.redId; }).indexOf(de); if (i < 0) return;
    var a = J.asientos[i];
    a.estado = d.ok ? 'termino' : 'fuera'; a.pct = d.ok ? 100 : a.pct; a.t = d.ok ? d.t : null;
    Red.difundir('as', { a: publico() }); pintarRivales(); evaluarCarrera();
  }
  function evaluarCarrera() {
    var J = MP.J; if (J.fin) return;
    var ok = J.asientos.filter(function (a) { return a.estado === 'termino'; });
    var vivos = J.asientos.filter(function (a) { return a.estado === 'jugando'; });
    if (ok.length && !finCarreraT) finCarreraT = setTimeout(function () { finCarreraT = 0; cierraCarrera(); }, 450);
    else if (!ok.length && !vivos.length) cierraCarrera();
  }
  function cierraCarrera() {
    var J = MP.J; if (J.fin) return;
    var ranking = J.asientos.map(function (a, i) { return { s: i, n: a.nombre, c: a.color, e: a.estado, v: a.t, g: a.pct }; });
    ranking.sort(function (x, y) { if ((x.e === 'termino') !== (y.e === 'termino')) return x.e === 'termino' ? -1 : 1; if (x.e === 'termino') return x.v - y.v; return y.g - x.g; });
    var gan = ranking[0].e === 'termino' ? ranking[0].s : -1;
    var d = { modo: 'carrera', ganador: gan, ranking: ranking };
    Red.difundir('fin', d); mostrarFinMP(d);
  }

  /* ---------- cooperativo y duelo ---------- */
  function interceptar(tipo, i) {
    var J = MP.J; if (!activo()) return true;
    if (J.modo === 'duelo' && J.turno !== MP.miAsiento) { UI.toast('No es tu turno', 'aviso', 1200); return true; }
    if (Red.esAnfitrion) hostReq({ k: tipo, i: i }, 0); else Red.enviar('req', { k: tipo, i: i });
    return true;
  }
  function hostReq(d, de) {
    var J = MP.J; if (!activo() || P.pausada) return;
    var seat = J.asientos.map(function (a) { return a.redId; }).indexOf(de); if (seat < 0) return;
    if (J.asientos[seat].estado === 'desconectado') return;
    if (['abrir', 'bandera', 'acorde'].indexOf(d.k) < 0 || !(d.i >= 0 && d.i < P.T.n)) return;
    if (J.modo === 'duelo' && J.turno !== seat) return;
    var r = P.aplicar(d.k, d.i, seat);
    if (!r || (!r.hecho && !r.abiertas)) return;
    if (r.hecho === false && r.abiertas && !r.abiertas.length && !r.minas.length) return;
    J.seq++;
    Red.difundir('acc', { n: J.seq, k: d.k, i: d.i, q: seat, tu: J.turno, th: J.turnoHasta, pu: J.asientos.map(function (a) { return a.puntos; }), v: P.vidas });
    pintarRivales(); guardarSalaSoon();
  }
  function clienteAcc(d) {
    var J = MP.J; if (!J) return;
    if (d.n !== J.seq + 1) { if (d.n > J.seq + 1) Red.enviar('resync', {}); return; }
    J.seq = d.n;
    P.aplicar(d.k, d.i, d.q);
    J.turno = d.tu; J.turnoHasta = d.th; d.pu.forEach(function (p, i) { if (J.asientos[i]) J.asientos[i].puntos = p; }); if (d.v != null && P.vidas !== d.v) { P.vidas = d.v; UI.actualizarHud(); }
    pintarRivales();
  }
  function aplicarSync(d) {
    var J = MP.J; if (!J) return;
    J.seq = d.n; J.turno = d.tu; J.turnoHasta = d.th; d.pu.forEach(function (p, i) { if (J.asientos[i]) J.asientos[i].puntos = p; });
    if (P.T && P.T.estado === 'jugando' && P.snapshot().est !== d.est) P.aplicarSnapshot({ est: d.est, vidas: d.v, puntos: null });
    pintarRivales();
  }
  function alAccion(tipo, i, quien, R) {
    var J = MP.J; if (!J || !J.activo || quien < 0 || !J.asientos[quien]) return;
    if (J.modo === 'duelo' && R && tipo !== 'bandera') {
      J.asientos[quien].puntos += R.abiertas.length - 10 * R.minas.length;
      if (Red.esAnfitrion && P.estado === 'jugando') avanzarTurno();
    }
  }
  function avanzarTurno() {
    var J = MP.J, n = J.asientos.length, t = J.turno;
    for (var k = 1; k <= n; k++) { var c = (t + k) % n; if (J.asientos[c].estado !== 'desconectado') { J.turno = c; break; } }
    J.turnoHasta = Red.reloj() + C.DUELO_TURNO * 1000;
  }
  function vigilarTurno() {
    var J = MP.J; if (!J || !activo() || !Red.esAnfitrion || J.modo !== 'duelo' || P.pausada) return;
    if (Red.reloj() > J.turnoHasta || J.asientos[J.turno].estado === 'desconectado') { avanzarTurno(); Red.difundir('turno', { tu: J.turno, th: J.turnoHasta }); pintarRivales(); }
    else pintarRivales(true);
  }

  function alSalir(id) {
    var J = MP.J; if (!J) return;
    var i = J.asientos.map(function (a) { return a.redId; }).indexOf(id); if (i < 0) return;
    var a = J.asientos[i]; a.redId = -1; if (a.estado === 'jugando' || a.estado === 'fuera') a.estado = a.estado === 'jugando' && J.modo === 'carrera' ? 'fuera' : 'desconectado';
    if (J.modo !== 'carrera') a.estado = 'desconectado';
    UI.toast(a.nombre + ' se desconectó', 'aviso');
    if (J.modo === 'duelo' && J.turno === i) { avanzarTurno(); Red.difundir('turno', { tu: J.turno, th: J.turnoHasta }); }
    Red.difundir('as', { a: publico() }); pintarRivales(); if (J.modo === 'carrera' && !J.fin) evaluarCarrera(); guardarSala();
  }

  /* ---------- fin de partida ---------- */
  MP.alFinPartida = function (res) {
    var J = MP.J; if (!J || J.fin) return;
    if (J.modo === 'carrera') {
      if (res.victoria) Red.esAnfitrion ? hostFin({ ok: true, t: res.tiempoMs }, 0) : Red.enviar('fin', { ok: true, t: res.tiempoMs });
      else { UI.toast('¡Has explotado! Sigues como espectador.', 'mal', 3000); Red.esAnfitrion ? hostFin({ ok: false }, 0) : Red.enviar('fin', { ok: false }); }
      enviarProg();
    } else if (Red.esAnfitrion) setTimeout(function () {
      var rank = J.asientos.map(function (a, i) { return { s: i, n: a.nombre, c: a.color, e: a.estado, v: a.puntos, g: 0 }; });
      rank.sort(function (x, y) { return y.v - x.v; });
      var d = { modo: J.modo, ok: res.victoria, ranking: rank, ganador: J.modo === 'duelo' ? (rank.length > 1 && rank[0].v === rank[1].v ? -1 : rank[0].s) : (res.victoria ? 0 : -1), t: res.tiempoMs };
      Red.difundir('fin', d); mostrarFinMP(d);
    }, 80);
  };

  function mostrarFinMP(d) {
    var J = MP.J; if (!J || J.fin) return;
    if (d.cerrado) { UI.toast('La sala está llena', 'mal'); return; }
    J.fin = true; clearInterval(MP.progI); clearInterval(saveT); clearInterval(syncT); clearInterval(turnoT); clearTimeout(cuenta);
    if (Red.esAnfitrion) BM.almacen.borrar(BM.almacen.CLAVES.sala);
    P.corre = false; P.pausada = true;
    var yo = MP.miAsiento, gane = J.modo === 'coop' ? !!d.ok : d.ganador === yo;
    var info = BM.progreso.registrar({ modo: 'mp', dif: J.dif, w: J.w, h: J.h, m: J.m, victoria: gane, tiempoMs: Math.round(P.tiempoMs), mp: { modo: J.modo, gano: gane }, acordes: P.acordes, pistas: P.pistas });
    var tit = J.modo === 'coop' ? (d.ok ? '¡Lo lograron juntos!' : 'Fin: se acabaron las vidas') : d.ganador < 0 ? 'Sin ganador' : d.ganador === yo ? '¡Ganaste!' : 'Ganó ' + (J.asientos[d.ganador] || {}).nombre;
    var tb = h('table', { cls: 'tabla mini' });
    (d.ranking || []).forEach(function (r, i) {
      var val = J.modo === 'carrera' ? (r.e === 'termino' ? UI.fmtTiempo(r.v, true) : r.e === 'fuera' ? 'Explotó (' + r.g + '%)' : r.g + '%') : r.v + ' pts';
      tb.appendChild(h('tr', {}, [h('th', { txt: (i + 1) + '. ' }, []), h('td', { style: 'color:' + r.c, txt: r.n + (r.s === yo ? ' (tú)' : '') }), h('td', { txt: val })]));
    });
    var cuerpo = h('div', { cls: 'resultado ' + (gane ? 'gana' : 'pierde') }, [h('div', { cls: 'res-icono', txt: gane ? '🏆' : '💥' }), tb]);
    if (info.nuevos.length) info.nuevos.forEach(function (l) { cuerpo.appendChild(h('div', { cls: 'logro ok' }, [h('span', { cls: 'ico', txt: '★' }), h('div', {}, [h('b', { txt: 'Logro: ' + l.nombre }), h('small', { txt: l.desc })])])); });
    if (gane) { BM.vista.victoria(P.ahora()); BM.sonido.gana(); } else BM.sonido.pierde();
    var pie = [];
    if (Red.esAnfitrion) pie.push(UI.btn('Jugar otra vez', function () { p.cerrar(); Red.iniciar({ modo: J.modo, juego: 'Buscaminas', maxJugadores: Red.max }); }, 'prim', { 'data-foco': 1 }));
    else cuerpo.appendChild(h('p', { cls: 'nota', txt: 'Esperando a que el anfitrión inicie otra partida…' }));
    pie.push(UI.btn('Salir', function () { p.cerrar(); MP.salir(); UI.mostrarInicio(); }, 'sec'));
    var p = UI.panel({ titulo: tit, cuerpo: cuerpo, pie: pie, ancho: 440, alCerrar: function () {} });
  }

  function terminarLocal() { var J = MP.J; if (J) { J.activo = false; } clearInterval(MP.progI); clearInterval(MP.curI); }
  MP.salir = function () {
    clearInterval(MP.progI); clearInterval(MP.curI); clearInterval(MP.holaI); clearInterval(saveT); clearInterval(syncT); clearInterval(turnoT); clearTimeout(cuenta);
    if (MP.J && Red.esAnfitrion && !MP.J.fin && MP.J.activo) guardarSala();
    MP.J = null; MP.sincronizado = false; P.interceptor = null; P.cb.accion = null; P.pausada = false;
    BM.vista.remotos = {}; $('rivales').hidden = true; document.body.classList.remove('mp');
    try { Red.salir(); } catch (e) {}
  };

  /* ---------- cursores y panel de rivales ---------- */
  function enviarCursor() {
    var J = MP.J; if (!activo() || J.modo === 'carrera' || !Red.conectado) return;
    var i = BM.vista.cursorVisible ? BM.vista.cursor : BM.vista.hover; if (i === curEnv) return; curEnv = i;
    Red.difundir('cur', { s: MP.miAsiento, i: i }, { fiable: false });
  }
  function pintarRivales(soloTurno) {
    var J = MP.J, box = $('rivales'); if (!J) return;
    box.textContent = '';
    J.asientos.forEach(function (a, i) {
      var fila = h('div', { cls: 'rival' + (J.modo === 'duelo' && J.turno === i ? ' turno' : '') + (a.estado === 'fuera' || a.estado === 'desconectado' ? ' fuera' : '') + (i === MP.miAsiento ? ' yo' : ''), style: '--c:' + (a.color || '#3df5ff') });
      var det = J.modo === 'carrera' ? h('div', { cls: 'barra' }, [h('i', { style: 'width:' + (a.pct || 0) + '%' })]) : h('b', { cls: 'pts', txt: J.modo === 'duelo' ? a.puntos + ' pts' : '' });
      var nom = a.nombre + (a.estado === 'desconectado' ? ' ⚠' : a.estado === 'fuera' ? ' ✖' : a.estado === 'termino' ? ' ✔' : '');
      fila.appendChild(h('span', { cls: 'nom', txt: nom }));
      fila.appendChild(det);
      if (J.modo === 'carrera') fila.appendChild(h('span', { cls: 'pct', txt: (a.pct || 0) + '%' }));
      if (J.modo === 'duelo' && J.turno === i) fila.appendChild(h('span', { cls: 'pct', txt: Math.max(0, Math.ceil((J.turnoHasta - Red.reloj()) / 1000)) + ' s' }));
      box.appendChild(fila);
    });
  }

  /* ---------- guardado de sala (anfitrion) ---------- */
  var saveSoonT = 0;
  function guardarSalaSoon() { clearTimeout(saveSoonT); saveSoonT = setTimeout(guardarSala, 400); }
  function guardarSala() {
    var J = MP.J; if (!J || !Red.esAnfitrion || !J.activo || J.fin || !P.T) return;
    var s = P.snapshot();
    BM.almacen.escribir(BM.almacen.CLAVES.sala, { v: 1, modo: J.modo, dif: J.dif, semilla: J.semilla, seq: J.seq, turno: J.turno, est: s.est, vidas: s.vidas, puntosTot: P.puntos, tms: Math.round(P.tiempoMs), fin: false,
      asientos: J.asientos.map(function (a) { return { token: a.token, nombre: a.nombre, color: a.color, puntos: a.puntos, pct: a.pct }; }), guardado: Date.now() });
  }
  MP.abrirLobby = function () { miToken(); Lobby.abrir(OPTS); };
  MP.ocultarRivales = function () { $('rivales').hidden = true; };
})(window);
