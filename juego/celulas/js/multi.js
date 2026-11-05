/* Celulas: multijugador P2P sobre comun/red.js + lobby.js. El anfitrion simula TODO el mundo; los clientes envian direccion y acciones.
   Mensajes: hola{tk,n,s} (cliente->anfitrion)  ini{...} (respuesta)  sn: snapshot binario base64 (~20 Hz, canal rapido, con interes por vision)
   in{x,y,p,vw,vh} (direccion objetivo, ~20 Hz)  ac{a:'d'|'e'|'r'} (dividir/expulsar/reaparecer, fiables)  if (info ~2 Hz)  jg (tabla de jugadores)  ev (eventos).
   Asientos: cada cliente guarda un token en localStorage (celulas_asiento). El anfitrion guarda la sala cada 5 s (celulas_sala).
   Si el anfitrion recarga: "Restaurar sala" abre un lobby nuevo, carga el mundo guardado y los clientes entran con un enlace nuevo;
   su token les devuelve su celula y su masa. Los humanos ausentes juegan como bots hasta volver. Si el anfitrion se cae, la sala termina con aviso. */
(function (G) {
  'use strict';
  var C = G.CEL = G.CEL || {}, Red = G.Red, Al = C.Almacen;
  var M = C.Multi = { rol: null, restaurar: false, activo: false };
  var clientes = {}, unsub = [], tSn = 0, tInfo = 0, tTabla = 0, tGuardar = 0, tHola = 0, intentos = 0, buf = new Uint8Array(14000), esperando = false;

  M.token = function () {
    var a = Al.leer('asiento', null);
    if (!a || !a.tk) { a = { tk: Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10) }; Al.escribir('asiento', a); }
    return a.tk;
  };
  M.opciones = function () {
    var modos = []; for (var k in C.MODOS) modos.push({ id: k, nombre: C.MODOS[k].nombre });
    return { juego: 'Células', maxJugadores: 4, modos: modos, alIniciar: M.alIniciar };
  };
  M.alIniciar = function (config, jugadores) {
    if (C.Juego.vista && M.rol) return;
    if (Red.esAnfitrion) iniciarAnfitrion(config); else iniciarCliente();
  };
  function limpiarNombre(n) { return String(n == null ? '' : n).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16) || 'Jugador'; }

  /* ---------------- anfitrion ---------------- */
  function iniciarAnfitrion(config) {
    var cp = C.Juego.cfgPartida(), perfil = C.Juego.perfil(), tk = M.token(), d = M.restaurar ? Al.leer('sala', null) : null, mundo, yo, i, j;
    M.restaurar = false;
    if (d && d.mundo && d.mundo.modo === config.modo) {
      mundo = C.Mundo.restaurar(d.mundo);
      for (i = 0; i < mundo.jugs.length; i++) { j = mundo.jugs[i]; if (j && j.humano && j.token !== tk) mundo.convertirBot(j); }
    } else mundo = new C.Mundo({ modo: config.modo, semilla: config.semilla, bots: cp.bots, dificultad: cp.dif });
    for (i = 0; i < mundo.jugs.length; i++) { j = mundo.jugs[i]; if (j && j.token === tk) yo = j; }
    if (yo) { mundo.reclamar(yo); yo.nombre = perfil.nombre; yo.skin = perfil.skin; if (!yo.cel.length && mundo.puedeReaparecer(yo)) mundo.reaparecer(yo); }
    else yo = mundo.agregarJugador({ nombre: perfil.nombre, skin: perfil.skin, token: tk, redId: 0 });
    yo.redId = 0; clientes = {}; M.rol = 'anfitrion'; M.activo = true; tSn = tInfo = tTabla = tGuardar = 0;
    unsub.forEach(function (f) { f(); }); unsub = [Red.on('mensaje', mensajeHost), Red.on('jugadorSalio', salioHost)];
    C.Juego.empezar(mundo, yo, 'anfitrion');
  }
  function tabla(w) {
    var out = [];
    for (var i = 0; i < w.jugs.length; i++) { var j = w.jugs[i]; if (j) out.push([j.id, j.nombre, j.skin, j.equipo, j.bot ? 1 : 0]); }
    return out;
  }
  function mensajeHost(tipo, d, de) {
    var w = C.Juego.mundo; if (!w || M.rol !== 'anfitrion' || !d) return;
    var c = clientes[de], j, i;
    if (tipo === 'hola') {
      var tk = String(d.tk || '').slice(0, 24);
      for (i = 0; i < w.jugs.length; i++) if (w.jugs[i] && tk && w.jugs[i].token === tk && w.jugs[i].id !== C.Juego.yo.id) j = w.jugs[i];
      var sk = C.Skins.texto(C.Skins.parse(d.s));
      if (j) { w.reclamar(j); j.nombre = limpiarNombre(d.n); j.skin = sk; if (!j.cel.length && w.puedeReaparecer(j)) w.reaparecer(j); }
      else j = w.agregarJugador({ nombre: limpiarNombre(d.n), skin: sk, token: tk, redId: de });
      if (!j) { Red.enviar('ev', { t: 'lleno' }, { a: de }); return; }
      j.redId = de; j.vw = 1400; j.vh = 900;
      clientes[de] = { j: j, seq: 0, tFull: 0 };
      Red.enviar('ini', { modo: w.modo, tam: w.tam, semilla: w.semilla, nFood: w.nFood, yo: j.id, t: w.t, tab: tabla(w) }, { a: de });
      Red.difundir('jg', tabla(w));
      return;
    }
    if (!c) return;
    j = c.j;
    if (tipo === 'in') {
      w.entrada(j, +d.x || 0, +d.y || 0, !!d.p);
      if (d.vw > 0) { j.vw = Math.min(3000, +d.vw); j.vh = Math.min(3000, +d.vh || 900); }
    } else if (tipo === 'ac') {
      if (d.x !== undefined) w.entrada(j, +d.x || 0, +d.y || 0, !!d.p);
      if (d.a === 'd') w.dividir(j); else if (d.a === 'e') w.expulsar(j);
      else if (d.a === 'r' && !j.cel.length && w.puedeReaparecer(j)) w.reaparecer(j);
    }
  }
  function salioHost(id) {
    var c = clientes[id], w = C.Juego.mundo;
    if (c && w) { w.convertirBot(c.j); c.j.redId = -1; delete clientes[id]; Red.difundir('jg', tabla(w)); C.Juego.aviso(c.j.nombre.replace(/\*$/, '') + ' salió: sus células pasan a un bot', '#ffd23d'); }
  }
  function infoPara(w, j) {
    var pl = [], i, p;
    for (i = 0; i < w.jugs.length; i++) { p = w.jugs[i]; if (p && p.cel.length) pl.push([p.id, Math.round(p.cx / 10), Math.round(p.cy / 10), Math.round(p.masa), 1, p.cel.length, p.puesto]); }
    var s = j.st;
    return { t: Math.round(w.t), e: w.estado === 'jugando' ? 0 : 1, g: w.ganador, ge: w.ganadorEq, z: Math.round(w.zona), lb: w.lb, eq: [Math.round(w.eqMasa[0]), Math.round(w.eqMasa[1])], pl: pl,
      yo: { p: j.puesto, c: s.comida, k: s.kills, kv: s.killsVida, d: s.divisiones, x: s.expulsadas, v: s.virus, m: Math.round(s.maxMasa), tv: Math.round(j.tVida), em: s.emboscadas || 0, vv: j.vivo ? 1 : 0 } };
  }
  M.guardarSala = function () {
    var w = C.Juego.mundo; if (M.rol !== 'anfitrion' || !w || w.estado !== 'jugando') return;
    Al.escribir('sala', { t: Date.now(), modo: w.modo, mundo: w.serializar() });
  };
  /* anfitrion: llamar cada cuadro tras avanzar el mundo */
  M.tickHost = function (w) {
    if (M.rol !== 'anfitrion') return;
    var now = G.performance.now(), id, c;
    if (now - tSn >= 50) {
      tSn = now;
      for (id in clientes) {
        c = clientes[id]; var full = now - c.tFull >= 1000; if (full) c.tFull = now;
        Red.enviar('sn', C.Proto.texto(w, c.j, c.seq++, Math.round(Red.reloj()), full), { a: +id, fiable: false });
      }
    }
    if (now - tInfo >= 500) { tInfo = now; for (id in clientes) Red.enviar('if', infoPara(w, clientes[id].j), { a: +id }); }
    if (now - tTabla >= 2000) { tTabla = now; Red.difundir('jg', tabla(w)); }
    if (now - tGuardar >= 5000) { tGuardar = now; M.guardarSala(); }
  };
  /* eventos del mundo hacia clientes remotos */
  M.evento = function (tipo, a, b) {
    if (M.rol !== 'anfitrion') return;
    if (tipo === 'muerte' && a.redId > 0) Red.enviar('ev', { t: 'muerte', por: b ? b.nombre : '', p: a.puesto, st: infoPara(C.Juego.mundo, a).yo }, { a: a.redId });
    else if (tipo === 'kill' && a.redId > 0) Red.enviar('ev', { t: 'kill', a: b ? b.nombre : '' }, { a: a.redId });
    else if (tipo === 'virus' && a.redId > 0) Red.enviar('ev', { t: 'virus' }, { a: a.redId });
    else if (tipo === 'fin') Red.difundir('ev', { t: 'fin', g: a ? a.id : -1, gn: a ? a.nombre : '', ge: b });
  };

  /* ---------------- cliente ---------------- */
  function iniciarCliente() {
    M.rol = 'cliente'; M.activo = true; esperando = true; intentos = 0; tHola = 0;
    unsub.forEach(function (f) { f(); });
    unsub = [Red.on('mensaje', mensajeCliente), Red.on('cerrado', function (m) { C.Juego.salaCerrada(m); })];
    hola();
  }
  function hola() {
    var p = C.Juego.perfil();
    Red.enviar('hola', { tk: M.token(), n: p.nombre, s: p.skin });
  }
  M.tickCliente = function () {
    if (M.rol === 'cliente' && esperando) {
      var now = G.performance.now();
      if (now - tHola > 1000 && Red.conectado) { tHola = now; if (++intentos < 120) hola(); }
    }
  };
  var rep = null;
  function mensajeCliente(tipo, d, de) {
    if (M.rol !== 'cliente') return;
    if (tipo === 'ini') {
      if (rep && C.Juego.vista === rep) return;
      esperando = false;
      rep = new C.Replica({ tam: d.tam, modo: d.modo, semilla: d.semilla, yo: d.yo, nFood: d.nFood });
      rep.aplicarJugadores(d.tab);
      C.Juego.empezarCliente(rep);
    } else if (!rep || C.Juego.vista !== rep) return;
    else if (tipo === 'sn') { var b = C.deb64(d, buf); rep.aplicar(b, b.length); }
    else if (tipo === 'if') rep.aplicarInfo(d);
    else if (tipo === 'jg') rep.aplicarJugadores(d);
    else if (tipo === 'ev') C.Juego.eventoRemoto(d);
  }
  var tIn = 0;
  M.enviarEntrada = function (x, y, p, vw, vh) {
    var now = G.performance.now(); if (now - tIn < 50) return; tIn = now;
    Red.enviar('in', { x: Math.round(x), y: Math.round(y), p: p ? 1 : 0, vw: Math.round(vw / 10) * 10, vh: Math.round(vh / 10) * 10 }, { fiable: false });
  };
  M.accion = function (a, x, y, p) { Red.enviar('ac', { a: a, x: Math.round(x), y: Math.round(y), p: p ? 1 : 0 }); };

  M.cerrar = function (salirDeLaSala) {
    unsub.forEach(function (f) { f(); }); unsub = []; clientes = {}; rep = null; esperando = false;
    if (salirDeLaSala && Red.conectado) Red.salir();
    M.rol = null; M.activo = false;
  };
  Red.on('conectado', function () { if (!Red.esAnfitrion && !M.rol) iniciarCliente(); });
})(typeof globalThis !== 'undefined' ? globalThis : window);
