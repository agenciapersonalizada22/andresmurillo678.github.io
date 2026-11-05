/* Controlador de partida: modos, reloj, vidas, pistas, deshacer, guardado. Sin DOM (usa BM.vista/BM.sonido por llamadas). */
(function (G) {
  'use strict';
  var BM = G.BM = G.BM || {};
  var M = BM.motor, C = BM.config;
  var P = { T: null, cfg: null, estado: 'inactiva', pausada: false, corre: false, cb: {}, interceptor: null, tiempoMs: 0, limite: 0 };
  var undo = [], saveTmr = 0, ultSeg = -1;
  var ahora = function () { return typeof performance !== 'undefined' ? performance.now() : Date.now(); };
  function cb(n) { if (P.cb[n]) { try { return P.cb[n].apply(null, Array.prototype.slice.call(arguments, 1)); } catch (e) { console.error(e); } } }
  function ajustes() { return BM.ajustes; }
  function vibrar(patron, fuerte) {
    var d = ajustes().disp;
    if (d.vibracionMovil && navigator.vibrate) { try { navigator.vibrate(patron); } catch (e) {} }
    if (d.vibracionMando && G.Mando) G.Mando.vibrar(fuerte || 0.9, 0.5, 280);
  }

  /* cfg: {modo, dif, w, h, m, semilla?, mp?, vidas?} */
  P.nueva = function (cfg) {
    clearTimeout(saveTmr);
    var d = C.DIF[cfg.dif] || C.DIF.principiante;
    var sa = cfg.modo === 'sinadivinar' || cfg.modo === 'diario' || !!cfg.mp;
    var tam = cfg.dif === 'personalizado' ? C.limitar(cfg.w, cfg.h, cfg.m, sa) : { w: d.w, h: d.h, m: d.m };
    if (cfg.modo === 'diario') { var dd = C.DIF.intermedio; tam = { w: dd.w, h: dd.h, m: dd.m }; cfg.dif = 'intermedio'; cfg.semilla = BM.azar.hash('buscaminas-diario-' + BM.azar.fechaClave()); }
    if (cfg.modo === 'supervivencia') tam = C.nivelSuperv(1);
    cfg = { modo: cfg.modo, dif: cfg.dif, w: tam.w, h: tam.h, m: tam.m, semilla: cfg.semilla == null ? null : cfg.semilla, mp: cfg.mp || null, vidas: cfg.vidas };
    P.cfg = cfg; P.nivel = 1; P.puntos = 0; P.pistas = 0; P.acordes = 0; P.banderasUsadas = 0; P.peligroUsado = false; P.tiempoMs = 0; P.nivelMs = 0;
    P.vidas = cfg.modo === 'supervivencia' ? C.VIDAS_SUPERV : cfg.vidas != null ? cfg.vidas : 0;
    P.pausada = false; P.corre = false; P.iniciado = false; P.fin = null; undo = []; ultSeg = -1;
    P.limite = cfg.modo === 'contrarreloj' ? C.limiteTiempo(cfg.w, cfg.h) * 1000 : 0;
    montar(cfg.w, cfg.h, cfg.m);
    cb('cambio'); cb('nueva', cfg);
  };

  function montar(w, h, m) {
    P.T = M.crear(w, h, m, P.vidas !== 0 || false);
    P.inicio = -1; P.estado = 'listo'; P.nivelMs = 0;
    if (P.cfg.semilla != null) {
      var s = P.cfg.semilla + (P.cfg.modo === 'supervivencia' ? P.nivel * 7919 : 0);
      var g = BM.generador.porSemilla(w, h, m, s, { sinAdivinar: true });
      M.colocar(P.T, g.mina); P.inicio = g.inicio; P.estado = 'jugando';
    }
    BM.vista.poner(P.T);
    if (P.inicio >= 0) { var R = M.abrir(P.T, P.inicio); BM.vista.abrirAnim(R, ahora()); BM.vista.centrar(P.inicio); }
    refrescarRiesgo();
  }

  P.arrancar = function () { if (!P.iniciado) { P.iniciado = true; P.corre = true; } };

  function generarEn(i) {
    var c = P.cfg, T = P.T, rng = BM.azar.crear((Math.random() * 4294967295) >>> 0);
    var g = BM.generador.generar(T.w, T.h, c.m, i, rng, { sinAdivinar: c.modo === 'sinadivinar', maxMs: 2500 });
    M.colocar(T, g.mina); P.garantizado = g.garantizado;
    P.inicio = i; P.estado = 'jugando'; P.arrancar();
  }

  function refrescarRiesgo() {
    var a = ajustes().gen;
    if (a.peligro && P.T && P.T.colocado && P.estado === 'jugando') { BM.vista.riesgo = BM.solucionador.riesgoLocal(P.T); if (P.T.abiertas) P.peligroUsado = true; }
    else BM.vista.riesgo = null;
    BM.vista.marcar();
  }
  P.refrescarRiesgo = refrescarRiesgo;

  function empujarUndo() {
    if (P.cfg.modo !== 'practica') return;
    undo.push({ s: M.instantanea(P.T), pu: P.puntos, vi: P.vidas, ac: P.acordes }); if (undo.length > 300) undo.shift();
  }
  P.puedeDeshacer = function () { return P.cfg && P.cfg.modo === 'practica' && undo.length > 0; };
  P.deshacer = function () {
    if (!P.puedeDeshacer()) return false;
    var u = undo.pop(); M.volver(P.T, u.s); P.puntos = u.pu; P.vidas = u.vi;
    if (P.estado === 'perdida' || P.estado === 'ganada') { P.estado = 'jugando'; P.corre = true; P.fin = null; cb('reabrir'); }
    BM.vista.limpiarAnim(); refrescarRiesgo(); BM.sonido.click(); cb('cambio'); P.guardarSoon(); return true;
  };

  function sinJugar() { return P.pausada || (P.estado !== 'jugando' && P.estado !== 'listo'); }

  /* Punto de entrada de jugadas locales (la red puede interceptar). */
  P.accion = function (tipo, i) {
    if (!P.T || i < 0 || i >= P.T.n || sinJugar()) return;
    if (P.interceptor && P.interceptor(tipo, i)) return;
    P.aplicar(tipo, i, -1);
  };
  P.pulsar = function (i) {
    if (!P.T || i < 0) return;
    var e = P.T.est[i];
    if (e === 1) { if (ajustes().gen.acordes) P.accion('acorde', i); } else if (e === 0 || e === 3) P.accion('abrir', i);
  };

  P.aplicar = function (tipo, i, quien) {
    var T = P.T, R = null;
    if (!T || sinJugar()) return null;
    if (tipo === 'abrir' || tipo === 'acorde') {
      if (!T.colocado) { if (tipo === 'acorde') return null; generarEn(i); }
      else if (!P.iniciado) P.arrancar();
    } else if (!P.iniciado && P.cfg.semilla != null && !P.cfg.mp) P.arrancar();
    empujarUndo();
    var antes = T.explotadas;
    if (tipo === 'abrir') R = M.abrir(T, i);
    else if (tipo === 'acorde') { R = M.acorde(T, i); if (R.hecho) P.acordes++; }
    else if (tipo === 'bandera') {
      var e = M.bandera(T, i, ajustes().gen.duda);
      if (e < 0) { undo.pop(); return null; }
      if (e === 2) P.banderasUsadas++;
      BM.vista.banderaAnim(i, ahora()); BM.sonido.bandera(e === 2); cb('accion', tipo, i, quien); cb('cambio'); refrescarRiesgo(); P.guardarSoon();
      return { hecho: true, bandera: e };
    }
    if (!R || !R.hecho) { if (undo.length && P.cfg.modo === 'practica') undo.pop(); return R; }
    procesar(R, i, T.explotadas - antes);
    cb('accion', tipo, i, quien, R);
    return R;
  };

  function procesar(R, i, nMinas) {
    var T = P.T, t = ahora();
    if (R.abiertas.length) {
      BM.vista.abrirAnim(R, t);
      if (R.abiertas.length > 6) BM.sonido.cascada(R.abiertas.length); else BM.sonido.abrir(T.num[R.abiertas[0]]);
      if (P.cfg.modo === 'supervivencia') P.puntos += R.abiertas.length;
    }
    if (R.minas.length) {
      R.minas.forEach(function (m) { BM.vista.explosion(m, t, T.estado === 'perdida'); });
      BM.sonido.explosion(); vibrar([90, 40, 200], 1);
      if (P.vidas > 0) { P.vidas -= nMinas; BM.sonido.vida(); if (P.vidas <= 0) { P.vidas = 0; T.estado = 'perdida'; T.perdidaEn = R.minas[0]; } }
    }
    refrescarRiesgo();
    if (T.estado === 'perdida') terminar('perdida');
    else if (T.estado === 'ganada') terminar('ganada');
    cb('cambio'); P.guardarSoon();
  }

  function resultado(victoria) {
    var c = P.cfg, r = { modo: c.modo, dif: c.dif, w: c.w, h: c.h, m: c.m, victoria: victoria, tiempoMs: Math.round(P.tiempoMs), pistas: P.pistas, peligro: P.peligroUsado,
      practica: c.modo === 'practica', banderas: P.banderasUsadas, acordes: P.acordes, nivel: P.nivel, puntos: P.puntos, mp: null };
    if (c.modo === 'contrarreloj' && victoria) r.puntos = Math.round(Math.max(0, P.limite - P.tiempoMs) / 100) + c.m * 10;
    else if (c.modo !== 'supervivencia') r.puntos = victoria ? r.puntos : 0;
    return r;
  }

  function terminar(como) {
    var T = P.T, t = ahora();
    if (P.estado === 'ganada' || P.estado === 'perdida' || P.estado === 'tiempo') return;
    if (como === 'ganada' && P.cfg.modo === 'supervivencia' && !P.cfg.mp) { subirNivel(); return; }
    P.estado = como; P.corre = false;
    if (como === 'perdida' || como === 'tiempo') { if (T.estado !== 'perdida') { T.estado = 'perdida'; T.perdidaEn = T.perdidaEn >= 0 ? T.perdidaEn : 0; } BM.vista.revelarMinas(t, T.perdidaEn >= 0 ? T.perdidaEn : 0); BM.sonido.pierde(); vibrar([60, 30, 60, 30, 240], 1); }
    else { BM.vista.victoria(t); BM.sonido.gana(); vibrar([30, 40, 30, 40, 90], 0.4); }
    var res = resultado(como === 'ganada'), info = null;
    if (!P.cfg.mp && !(P.cfg.modo === 'practica' && !res.victoria)) info = BM.progreso.registrar(res);
    P.fin = { res: res, info: info };
    BM.almacen.borrar(BM.almacen.CLAVES.partida);
    cb('fin', res, info);
  }
  P.terminarForzado = function (como) { terminar(como); };

  function subirNivel() {
    var bono = P.nivel * 100 + Math.max(0, P.vidas) * 50 + Math.max(0, Math.round(300 - P.nivelMs / 1000));
    P.puntos += bono; var viejo = P.nivel; P.nivel++;
    if (P.nivel % 3 === 1 && P.vidas < 5) P.vidas++;
    P.corre = false; P.estado = 'nivel'; BM.sonido.nivel(); BM.vista.victoria(ahora());
    cb('nivel', viejo, bono);
    setTimeout(function () {
      if (P.estado !== 'nivel') return;
      var n = C.nivelSuperv(P.nivel); P.cfg.w = n.w; P.cfg.h = n.h; P.cfg.m = n.m;
      P.T = null; montar(n.w, n.h, n.m); P.estado = 'listo'; P.corre = false; P.iniciado = false; undo = [];
      cb('cambio'); cb('nueva', P.cfg); P.guardarSoon();
    }, 1700);
  }

  P.tick = function (dt) {
    if (!P.corre || P.pausada) return;
    P.tiempoMs += dt; P.nivelMs += dt;
    var s = Math.floor(P.tiempoMs / 1000);
    if (s !== ultSeg) {
      ultSeg = s;
      if (P.limite && P.limite - P.tiempoMs < 10000 && P.limite - P.tiempoMs > 0) BM.sonido.tictac();
      cb('segundo', s);
    }
    if (P.limite && P.tiempoMs >= P.limite) { P.tiempoMs = P.limite; terminar('tiempo'); cb('cambio'); }
  };
  P.restanteMs = function () { return P.limite ? Math.max(0, P.limite - P.tiempoMs) : 0; };

  P.pausar = function (on) {
    if (on === P.pausada) return;
    if (on && P.estado !== 'jugando' && P.estado !== 'listo') return;
    P.pausada = on; BM.vista.marcar(); cb('pausa', on); if (on) P.guardarYa();
  };

  P.pista = function () {
    var T = P.T;
    if (!T || sinJugar() || !T.colocado) { cb('aviso', 'Abre una casilla primero para poder pedir pistas.'); return null; }
    if (P.cfg.mp && P.cfg.mp.modo !== 'coop') { cb('aviso', 'Las pistas no están disponibles en esta partida.'); return null; }
    var p = BM.solucionador.pista(T);
    if (!p) { cb('aviso', 'No hay pistas disponibles ahora.'); return null; }
    P.pistas++;
    if (P.cfg.modo === 'practica') { /* gratis */ }
    else if (P.cfg.modo === 'supervivencia') P.puntos = Math.max(0, P.puntos - 50);
    else P.tiempoMs += C.PENAL_PISTA;
    BM.vista.pistaOn(p.idx, p.tipo, ahora()); BM.vista.centrar && BM.vista.seguir(p.idx); BM.sonido.pista();
    cb('pista', p); cb('cambio');
    return p;
  };

  /* ---------- guardado ---------- */
  P.serializar = function () {
    var T = P.T, c = P.cfg;
    if (!T || P.cfg.mp || (P.estado !== 'jugando' && P.estado !== 'listo')) return null;
    var progreso = T.abiertas || T.banderas || P.tiempoMs > 0;
    if (!progreso && P.estado === 'listo') return null;
    return { v: 1, cfg: { modo: c.modo, dif: c.dif, w: c.w, h: c.h, m: c.m, semilla: c.semilla, vidas: c.vidas }, nivel: P.nivel, puntos: P.puntos, vidas: P.vidas, tiempoMs: P.tiempoMs, nivelMs: P.nivelMs,
      pistas: P.pistas, acordes: P.acordes, banderasUsadas: P.banderasUsadas, peligro: P.peligroUsado, iniciado: P.iniciado, inicio: P.inicio,
      mina: T.colocado ? M.mina2txt(T.mina) : null, est: M.serializarEst(T), guardado: Date.now() };
  };
  P.guardarYa = function () {
    clearTimeout(saveTmr);
    var s = P.serializar(); if (s) BM.almacen.escribir(BM.almacen.CLAVES.partida, s);
    else if (P.estado === 'ganada' || P.estado === 'perdida' || P.estado === 'tiempo') BM.almacen.borrar(BM.almacen.CLAVES.partida);
  };
  P.guardarSoon = function () { clearTimeout(saveTmr); saveTmr = setTimeout(P.guardarYa, 500); };
  P.hayGuardada = function () {
    var s = BM.almacen.leer(BM.almacen.CLAVES.partida, null);
    return s && s.v === 1 && s.cfg && s.est && s.est.length === s.cfg.w * s.cfg.h ? s : null;
  };
  P.restaurar = function (s) {
    var c = s.cfg; P.cfg = { modo: c.modo, dif: c.dif, w: c.w, h: c.h, m: c.m, semilla: c.semilla == null ? null : c.semilla, mp: null, vidas: c.vidas };
    P.nivel = s.nivel || 1; P.puntos = s.puntos || 0; P.vidas = s.vidas || 0; P.tiempoMs = s.tiempoMs || 0; P.nivelMs = s.nivelMs || 0;
    P.pistas = s.pistas || 0; P.acordes = s.acordes || 0; P.banderasUsadas = s.banderasUsadas || 0; P.peligroUsado = !!s.peligro; P.iniciado = !!s.iniciado;
    P.limite = c.modo === 'contrarreloj' ? C.limiteTiempo(c.w, c.h) * 1000 : 0; P.fin = null; P.pausada = false; undo = []; ultSeg = -1;
    P.T = M.crear(c.w, c.h, c.m, P.vidas !== 0);
    if (s.mina) { M.colocar(P.T, M.txt2mina(s.mina)); }
    M.restaurarEst(P.T, s.est);
    P.inicio = s.inicio == null ? -1 : s.inicio;
    P.estado = P.T.colocado ? 'jugando' : 'listo'; P.corre = P.iniciado;
    BM.vista.poner(P.T); if (P.inicio >= 0) BM.vista.centrar(P.inicio);
    refrescarRiesgo(); cb('cambio'); cb('nueva', P.cfg);
  };

  /* Sincronizacion de estado completo (multijugador): instantanea compacta y restauracion. */
  P.snapshot = function () { return { est: M.serializarEst(P.T), vidas: P.vidas, puntos: P.puntos }; };
  P.aplicarSnapshot = function (s) {
    if (!P.T) return;
    var perd = P.T.estado;
    M.restaurarEst(P.T, s.est); P.vidas = s.vidas; if (s.puntos != null) P.puntos = s.puntos;
    BM.vista.limpiarAnim(); refrescarRiesgo(); cb('cambio');
    return perd;
  };

  P.ahora = ahora;
  BM.partida = P;
  if (typeof module !== 'undefined' && module.exports) module.exports = BM;
})(typeof window !== 'undefined' ? window : globalThis);
