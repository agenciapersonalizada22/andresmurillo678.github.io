/* Flujo de persistencia multijugador:
   - Anfitrion: guarda cada 5 s y al ocultar la pagina 'serpientes_sala' = {mundo (exportar), seats{token->{n,k,m,est}}}. Tras recargar, el menu ofrece
     "volver a abrir tu sala": se abre el Lobby con el modo extra "Restaurar sala guardada"; al iniciar con ese modo se importa el mundo (bots, orbes, zona, reloj)
     y las serpientes humanas quedan como asientos dormidos hasta que su dueno vuelva.
   - Cliente: token de asiento en 'serpientes_asiento'. Al recargar abre el enlace nuevo del anfitrion; en 'hola' envia su token y el anfitrion le devuelve
     su asiento (conserva ~60% de su masa y sus eliminaciones). Si el anfitrion se cae, los clientes reciben 'cerrado' y vuelven al menu con aviso.
   Multijugador P2P: el anfitrion simula la arena y difunde snapshots por vision; los clientes envian rumbo+turbo, predicen su cabeza e interpolan al resto. */
(function (G) {
  'use strict';
  var S = G.Serp = G.Serp || {}, P = S.Proto, A = S.Almacen, Red = G.Red, O = S.Online = { modo: 'ninguno' };
  var HZ_SNAP = 1 / 18, DELAY = 110;
  var offs = [];
  function on(ev, fn) { offs.push(Red.on(ev, fn)); }
  O.limpiar = function () { offs.forEach(function (f) { f(); }); offs = []; O.modo = 'ninguno'; O.h = null; O.c = null; };
  function num(v, a, b, d) { v = +v; return isFinite(v) ? Math.max(a, Math.min(b, v)) : d; }
  function token() {
    var t = A.leer(A.CL.asiento, null);
    if (!t || !t.tok) { t = { tok: Math.random().toString(36).slice(2, 12) + Date.now().toString(36) }; A.escribir(A.CL.asiento, t); }
    return t.tok;
  }

  /* ======================= ANFITRION ======================= */
  O.host = function (W, yo, seats) {
    O.limpiar(); O.modo = 'host';
    var H = O.h = { W: W, yo: yo, seats: seats || {}, cl: {}, acc: 0, tO: 0, tE: 0, tR: 0, rDirty: true, tRd: 0, finEnv: false };
    yo.red = { token: 'host', id: 0 };
    on('mensaje', function (tipo, d, de) {
      if (tipo === 'hola') alta(de, d);
      else if (tipo === 'i') { var c = H.cl[de]; if (c && c.s.vivo && d) { c.s.objAng = num(d.a, -7, 7, c.s.objAng); c.s.pideTurbo = !!d.b; } }
      else if (tipo === 'rep') { var c2 = H.cl[de]; if (c2 && !c2.s.vivo && W.t - c2.s.muertoT > 1.2) W.reaparecer(c2.s, c2.s.masaRespawn); }
    });
    on('jugadorSalio', function (id) { baja(id); });
    Red.lista().forEach(function (j) { if (j.id !== 0) { /* se daran de alta con su 'hola' */ } });
  };
  function alta(id, d) {
    var H = O.h, W = H.W; if (!d || !Red.jugadores[id]) return;
    var c = H.cl[id];
    if (!c) {
      var tok = String(d.tok || '').slice(0, 24) || 'x' + id, seat = H.seats[tok], j = Red.jugadores[id];
      for (var k in H.cl) if (H.cl[k].tok === tok) baja(+k); // misma persona reconectando
      var skin = S.Skins.decodificar(d.skin), nombre = String(d.nombre || j.nombre || 'Jugador').replace(/[<>\u0000-\u001f]/g, '').slice(0, 16) || 'Jugador';
      var s = W.humano({ nombre: nombre, skin: skin, red: { token: tok, id: id }, masa: seat && seat.m ? Math.max(S.C.MASA_INI, seat.m * 0.6) : S.C.MASA_INI });
      s.autoReaparecer = W.modo.respawn; if (seat && seat.est) { s.est.kills = seat.est.kills || 0; }
      c = H.cl[id] = { s: s, tok: tok, ready: true };
      H.rDirty = true;
    }
    Red.enviar('bienvenida', { id: c.s.id, modo: W.modo.id, dif: W.dif.id, R: W.R, total: W.total, t: Math.round(W.t) }, { a: id });
    sendRoster(id);
  }
  function baja(id) {
    var H = O.h, c = H && H.cl[id]; if (!c) return;
    H.seats[c.tok] = { n: c.s.nombre, k: S.Skins.codificar(c.s.skin), m: c.s.masa, est: c.s.est, t: Date.now() };
    if (c.s.vivo) H.W.matar(c.s, null, 'salida');
    H.W.quitar(c.s); delete H.cl[id]; H.rDirty = true;
  }
  function sendRoster(a) {
    var H = O.h; var m = P.roster(H.W, S.Skins.codificar);
    var txt = { r: m, z: H.W.zona ? 1 : 0 };
    if (a == null) Red.difundir('r', txt); else Red.enviar('r', txt, { a: a });
  }
  O.hostGuardar = function () {
    var H = O.h; if (!H) return null;
    Object.keys(H.cl).forEach(function (id) { var c = H.cl[id]; H.seats[c.tok] = { n: c.s.nombre, k: S.Skins.codificar(c.s.skin), m: c.s.masa, est: c.s.est, t: Date.now() }; });
    H.seats.host = { n: H.yo.nombre, k: S.Skins.codificar(H.yo.skin), m: H.yo.masa, est: H.yo.est, t: Date.now() };
    return { mundo: H.W.exportar(), seats: H.seats, ts: Date.now() };
  };
  O.hostEventos = function (evs) {
    var H = O.h, W = H.W; if (!H) return;
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.t === 'muerte') {
        var v = W.porId[e.id], kl = W.porId[e.killer];
        Red.difundir('ev', { k: 'kf', v: v ? v.nombre : '?', a: kl ? kl.nombre : '', tp: e.tipo });
        if (v && v.red && v.red.id > 0 && H.cl[v.red.id]) {
          v.masaRespawn = undefined;
          Red.enviar('ev', { k: 'muerte', killer: kl ? kl.nombre : '', masa: Math.round(e.masa), puesto: e.puesto, kills: v.est.kills, vivo: Math.round(v.est.vivo), orbes: v.est.orbes, turbo: Math.round(v.est.turbo), tp: e.tipo, resp: W.modo.respawn ? 1 : 0, max: Math.round(v.est.maxMasa) }, { a: v.red.id });
        }
      } else if (e.t === 'reaparece') {
        var r = W.porId[e.id]; if (r && r.red && r.red.id > 0) Red.enviar('ev', { k: 'rep' }, { a: r.red.id });
      } else if (e.t === 'nace' || e.t === 'sale') H.rDirty = true;
      else if (e.t === 'fin') Red.difundir('ev', { k: 'fin', fin: e.fin, nombre: W.porId[e.fin.ganador] ? W.porId[e.fin.ganador].nombre : '' });
    }
  };
  O.hostTick = function (dt) {
    var H = O.h; if (!H) return;
    var W = H.W, ids = Object.keys(H.cl), i;
    H.acc += dt; H.tO += dt; H.tE += dt; H.tR += dt; H.tRd += dt;
    if (H.rDirty && H.tRd > 0.3) { H.rDirty = false; H.tRd = 0; H.tR = 0; sendRoster(); }
    else if (H.tR > 3) { H.tR = 0; sendRoster(); }
    if (H.acc >= HZ_SNAP) {
      H.acc = 0; var t = Red.reloj();
      for (i = 0; i < ids.length; i++) { var c = H.cl[ids[i]]; Red.enviar('s', P.snapshot(W, c.s, t, c.s.x, c.s.y), { a: +ids[i], fiable: false }); }
    }
    if (H.tO >= 0.2) { H.tO = 0; for (i = 0; i < ids.length; i++) { var c2 = H.cl[ids[i]]; Red.enviar('o', P.codificarOrbes(W, c2.s.x, c2.s.y), { a: +ids[i], fiable: false }); } }
    if (H.tE >= 0.25) { H.tE = 0; for (i = 0; i < ids.length; i++) { var c3 = H.cl[ids[i]]; Red.enviar('e', P.codificarEstado(W, c3.s), { a: +ids[i], fiable: false }); } }
  };
  /* nueva ronda: mundo nuevo, mismos jugadores */
  O.hostNuevaRonda = function (W2, yo2) {
    var H = O.h; H.W = W2; H.yo = yo2; yo2.red = { token: 'host', id: 0 };
    Object.keys(H.cl).forEach(function (id) {
      var c = H.cl[id], v = c.s, s = W2.humano({ nombre: v.nombre, skin: v.skin, red: v.red });
      s.autoReaparecer = W2.modo.respawn; c.s = s;
      Red.enviar('bienvenida', { id: s.id, modo: W2.modo.id, dif: W2.dif.id, R: W2.R, total: W2.total, t: 0, ronda: 1 }, { a: +id });
    });
    H.rDirty = true;
  };
  O.humanos = function () { return O.h ? Object.keys(O.h.cl).length + 1 : 1; };

  /* ======================= CLIENTE ======================= */
  O.cliente = function (alEvento) {
    O.limpiar(); O.modo = 'cliente';
    var C = O.c = { id: 0, listo: false, yo: new S.Serpiente(0), meta: {}, vistos: {}, orbes: null, estado: null, mm: [], hist: [], tIn: 0, tHola: 0, snapMs: 0, reinit: true, R: S.C.R, Rc: S.C.R, zona: null, cfg: null, vivo: true, alEvento: alEvento, ultimoFoco: { x: 0, y: 0 }, yoVisto: false, dif: 'normal', objetosRender: {}, tok: token() };
    C.yo.humano = true;
    on('mensaje', function (tipo, d) {
      if (tipo === 'bienvenida') { if (C.listo) { C.vistos = {}; C.hist.length = 0; C.vivo = true; C.reinit = true; C.yoVisto = false; C.orbes = null; if (C.alEvento) C.alEvento({ k: 'ronda' }); } C.id = d.id; C.listo = true; C.cfg = d; C.R = d.R; C.yo.id = d.id; }
      else if (tipo === 'r') { var m = {}; d.r.forEach(function (q) { m[q[0]] = { nombre: q[1], skin: S.Skins.decodificar(q[2]), equipo: q[3], bot: !!q[4] }; }); C.meta = m; var me = m[C.id]; if (me) C.yo.equipo = me.equipo; }
      else if (tipo === 's') recibirSnap(d);
      else if (tipo === 'o') { C.orbes = P.decodificarOrbes(d, C.orbes); }
      else if (tipo === 'e') { C.estado = d; C.mm = P.decodificarMinimapa(d.mm); if (d.z) C.zona = { x: d.z[0], y: d.z[1], r: d.z[2], desde: 0 }; else C.zona = null; C.Rc = d.rc || C.R; }
      else if (tipo === 'ev') {
        if (d.k === 'muerte') { C.vivo = false; C.yo.vivo = false; }
        else if (d.k === 'rep') { C.vivo = true; C.reinit = true; }
        if (C.alEvento) C.alEvento(d);
      }
    });
    on('cerrado', function (motivo) { if (C.alEvento) C.alEvento({ k: 'cerrado', motivo: motivo }); });
    on('jugadorSalio', function (id) { if (id === 0 && C.alEvento) C.alEvento({ k: 'cerrado', motivo: 'anfitrion' }); });
    C.hola = function () { Red.enviar('hola', { tok: C.tok, nombre: C.nombre, skin: S.Skins.codificar(C.skin) }); };
    return C;
  };
  function recibirSnap(d) {
    var C = O.c, lista = P.decodificarSerpientes(d.s), ahora = G.performance.now();
    C.snapMs = ahora;
    var vistosAhora = {};
    for (var i = 0; i < lista.length; i++) {
      var e = lista[i]; e.t = d.t; vistosAhora[e.id] = 1;
      if (e.id === C.id) { reconciliar(e, d.t); continue; }
      var v = C.vistos[e.id] || (C.vistos[e.id] = { buf: [], odo: 0, px: e.x, py: e.y, ult: ahora });
      v.buf.push(e); v.ult = ahora; if (v.buf.length > 6) v.buf.shift();
    }
    for (var id in C.vistos) if (!vistosAhora[id] && ahora - C.vistos[id].ult > 1200) delete C.vistos[id];
  }
  function reconciliar(e, t) {
    var C = O.c, y = C.yo;
    C.yoVisto = true;
    if (C.reinit || !y.vivo || C.vivo && y.masa < 1) {
      y.masa = e.masa; y.vivo = true; y.reiniciar(e.x, e.y, e.ang, e.masa); y.desdeSegs(e.segs); C.reinit = false; C.hist.length = 0; y.inmune = e.inmune ? 1 : 0; return;
    }
    // posicion local en el instante equivalente del anfitrion (t - ida)
    var T = t - Math.min(250, (Red.rtt || 60) / 2), h = C.hist, a = null, b = null;
    for (var i = h.length - 1; i >= 0; i--) if (h[i][0] <= T) { a = h[i]; b = h[i + 1] || h[i]; break; }
    var lx = y.x, ly = y.y;
    if (a) { var f = b[0] === a[0] ? 0 : (T - a[0]) / (b[0] - a[0]); lx = a[1] + (b[1] - a[1]) * f; ly = a[2] + (b[2] - a[2]) * f; }
    var ex = e.x - lx, ey = e.y - ly, er = Math.hypot(ex, ey);
    if (er > 160) { y.x = e.x; y.y = e.y; y.ang = e.ang; y.desdeSegs(e.segs); C.hist.length = 0; }
    else if (er > 0.5) { var k = er > 40 ? 0.5 : 0.22; y.x += ex * k; y.y += ey * k; }
    y.masa = e.masa; y.inmune = e.inmune ? 1 : 0; y.actualizar();
  }
  /* una vez por cuadro: avanza la cabeza propia, envia la entrada */
  O.clienteTick = function (dt, ang, turbo) {
    var C = O.c; if (!C) return;
    var y = C.yo, t = Red.reloj();
    if (C.vivo && C.yoVisto && !C.reinit) {
      y.objAng = ang; y.pideTurbo = turbo; y.paso(dt);
      var R = C.Rc || C.R; var d = Math.hypot(y.x, y.y); if (d > R + 50) { y.x *= (R + 50) / d; y.y *= (R + 50) / d; }
      C.hist.push([t, y.x, y.y]); if (C.hist.length > 90) C.hist.shift();
    }
    C.tIn += dt; C.tHola += dt;
    if (!C.listo) { if (C.tHola > 0.8) { C.tHola = 0; C.hola(); } return; }
    if (C.tIn >= 0.05) { C.tIn = 0; Red.enviar('i', P.entrada(ang, turbo), { fiable: false }); }
  };
  O.clientePedirReaparecer = function () { Red.enviar('rep', {}); };
  /* escena interpolada para el dibujo */
  O.escenaCliente = function (dt) {
    var C = O.c, T = Red.reloj() - DELAY, serps = [], pts = [], id;
    for (id in C.vistos) {
      var v = C.vistos[id], buf = v.buf, n = buf.length; if (!n) continue;
      var a = buf[0], b = buf[n - 1];
      for (var i = n - 1; i >= 0; i--) if (buf[i].t <= T) { a = buf[i]; b = buf[i + 1] || buf[i]; break; }
      var f = b.t === a.t ? 1 : S.clamp((T - a.t) / (b.t - a.t), 0, 1.15);
      if (T < buf[0].t) { a = b = buf[0]; f = 0; }
      var o = C.objetosRender[id] || (C.objetosRender[id] = { id: +id, vivo: true, segs: new Float32Array(128), nombre: '', skin: null, equipo: -1, ns: 0, odo: 0 });
      var ns = b.ns, mn = Math.min(a.ns, b.ns);
      if (o.segs.length < ns * 2) o.segs = new Float32Array(ns * 2 + 64);
      var s0 = a.segs, s1 = b.segs, sg = o.segs, k;
      for (k = 0; k < mn * 2; k++) sg[k] = s0[k] + (s1[k] - s0[k]) * f;
      for (; k < ns * 2; k++) sg[k] = s1[k];
      o.x = sg[0]; o.y = sg[1]; o.ang = a.ang + S.angDiff(a.ang, b.ang) * f; o.masa = b.masa; o.ns = ns; o.r = S.radio(b.masa); o.sp = S.espaciado(o.r); o.turbo = b.turbo; o.inmune = b.inmune ? 1 : 0;
      v.odo += Math.hypot(o.x - v.px, o.y - v.py); v.px = o.x; v.py = o.y; o.odo = v.odo;
      var m = C.meta[id]; if (m) { o.nombre = m.nombre; o.skin = m.skin; o.equipo = m.equipo; }
      serps.push(o);
    }
    for (id in C.objetosRender) if (!C.vistos[id]) delete C.objetosRender[id];
    var y = C.yo; y.nombre = C.nombre; y.skin = C.skin;
    if (C.vivo && C.yoVisto) { serps.push(y); C.ultimoFoco.x = y.x; C.ultimoFoco.y = y.y; C.ultimoFoco.r = y.r; }
    for (var j = 0; j < C.mm.length; j++) { var q = C.mm[j]; if (q.id === C.id) continue; var mt = C.meta[q.id]; pts.push({ id: q.id, x: q.x, y: q.y, equipo: mt ? mt.equipo : -1, r: 10 }); }
    if (C.vivo && C.yoVisto) pts.push({ id: C.id, x: y.x, y: y.y, equipo: y.equipo, r: y.r });
    return { foco: C.vivo && C.yoVisto ? y : { x: C.ultimoFoco.x, y: C.ultimoFoco.y, r: C.ultimoFoco.r || 10, turbo: false }, serps: serps, orbes: orbesCliente, R: C.R, Rc: C.Rc, zona: C.zona, yoId: C.id, puntos: pts, snapCam: !C.yoVisto };
  };
  var tmp = { x: new Float32Array(1400), y: new Float32Array(1400), t: new Uint8Array(1400), n: 0 };
  function orbesCliente(x0, y0, x1, y1, out) {
    var C = O.c, ob = C.orbes, k = 0, mx = out.x.length;
    if (ob) for (var i = 0; i < ob.n && k < mx; i++) { var x = ob.x[i], y = ob.y[i]; if (x >= x0 && x <= x1 && y >= y0 && y <= y1) { out.x[k] = x; out.y[k] = y; out.t[k] = ob.t[i]; k++; } }
    out.n = k; return out;
  }
  /* comer localmente (prediccion visual): quita orbes tocados por mi cabeza */
  O.clienteComer = function () {
    var C = O.c, ob = C.orbes, y = C.yo; if (!ob || !C.vivo) return 0;
    var rr = (y.r + 14) * (y.r + 14), n = ob.n, comidos = 0;
    for (var i = n - 1; i >= 0; i--) {
      var dx = ob.x[i] - y.x, dy = ob.y[i] - y.y;
      if (dx * dx + dy * dy < rr) { n--; ob.x[i] = ob.x[n]; ob.y[i] = ob.y[n]; ob.t[i] = ob.t[n]; comidos++; }
    }
    ob.n = n; return comidos;
  };
})(typeof window !== 'undefined' ? window : globalThis);
