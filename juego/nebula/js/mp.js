// =============================================================
//  MULTIJUGADOR COOPERATIVO (2-4 naves) sobre window.Red / Lobby.
//  El anfitrión corre la simulación completa (enemigos, jefes, power-ups,
//  oleadas, puntos). Cada jugador mueve su propia nave al instante y
//  manda su posición a ~20 Hz; el anfitrión difunde una foto del mundo
//  a ~15 Hz que los clientes extrapolan. Eventos importantes: fiables.
// =============================================================
const MP = (() => {
  if (!window.Red || !window.Lobby) return { evento() {}, actualizar() {}, dibujarHud() {}, salir() {}, abrirLobby() { Hud.toast('Multijugador no disponible', '#ff6b6b'); } };
  const W = CONFIG.ancho, H = CONFIG.alto, S = Sim;
  const M = { chatAbierto: false };
  const FRASES = ['¡Ayuda!', '¡Gracias!', '¡Buen tiro!', 'Cuidado atrás', 'Voy por el jefe', '¡Listo!'];
  const TIPOS = Object.keys(ENEMIGOS), PU = Object.keys(POWERUPS), ARMAS_ID = ['pulso', 'disp', 'laser', 'misil'];
  const FWD = { explosion: 1, texto: 1, multi: 0, graze: 0, dano: 0, escudoRoto: 0, muerteNave: 0, pickup: 0, moneda: 0, hab: 0, oleada: -1, oleadaLista: -1, jefe: -1, fase: -1, jefeMuerto: 'j', mundoCompleto: -1, victoria: -1, sacudir: -1, aviso: -1, carga: -1, revive: 'r', disparo: 0, golpe: -1, chispa: -1, sdisparo: -1 };
  let listoTemprano = null, host = false, activo = false, esperando = null, cargas = {}, cola = [], tSnap = 0, tNv = 0, tEv = 0, remotos = {}, chatSel = 0, tListo = 0;
  const OPTS = {
    juego: 'Nebula', maxJugadores: 4,
    modos: [{ id: 'campana', nombre: 'Campaña cooperativa' }, { id: 'infinito', nombre: 'Infinito cooperativo' }, { id: 'jefes', nombre: 'Duelo de jefes cooperativo' }],
    alIniciar: (config, jugadores) => preparar(config, jugadores),
  };
  M.abrirLobby = () => { Lobby.abrir(OPTS); };
  const naveDe = (pid) => S.naves.find((n) => n.pid === pid);
  const jugador = (pid) => (Red.jugadores && Red.jugadores[pid]) || { nombre: 'Jugador', color: '#fff' };

  // ------------------------------------------------ Preparación
  function preparar(config, jugadores) {
    host = Red.esAnfitrion; cargas = {}; esperando = { config, jugadores: jugadores.slice(), t: 0 };
    const s = Datos.save, nave = s.naveSel;
    const mi = { nave, mej: s.mej, nombre: Datos.perfil().nombre, color: Datos.perfil().color };
    if (host) { cargas[Red.miId] = mi; }
    else Red.enviar('carga', mi);
    Hud.toast('Preparando partida cooperativa…', '#3df5ff');
    if (!host && listoTemprano) { const d = listoTemprano; listoTemprano = null; empezar(d); }
  }
  function construirCfg() {
    const { config, jugadores } = esperando;
    return { modo: config.modo === 'campana' || config.modo === 'infinito' || config.modo === 'jefes' ? config.modo : 'campana', semilla: config.semilla,
      naves: jugadores.map((j) => { const c = cargas[j.id] || { nave: 'centella', mej: Datos.save.mej }; return { pid: j.id, nave: c.nave, mej: c.mej, nombre: j.nombre || c.nombre, color: j.color || c.color }; }) };
  }
  function empezar(cfg) {
    esperando = null; activo = true; remotos = {}; cola.length = 0; tSnap = tNv = tEv = 0; M.chatAbierto = false;
    host = Red.esAnfitrion;
    S.iniciar({ modo: cfg.modo, mundo: 0, jefe: -1, semilla: cfg.semilla, dif: 'normal', mod: null,
      naves: cfg.naves.map((n) => ({ def: NAVES.find((q) => q.id === n.nave) || NAVES[0], mejoras: Object.assign({ casco: 0, motor: 0, canon: 0, cadencia: 0, reactor: 0, iman: 0, botin: 0, blindaje: 0 }, n.mej), color: n.color })) });
    S.espejo = !host;
    cfg.naves.forEach((n, i) => { const v = S.naves[i]; v.pid = n.pid; v.nombre = n.nombre; v.colorP = n.color; v.remota = host && n.pid !== Red.miId; v.tx = v.x; v.ty = v.y; if (n.pid === Red.miId) S.yo = i; });
    S.naves[S.yo].ctl = Entrada.ctl(0);
    Juego.iniciarMP();
  }
  Red.on('mensaje', (t, d, de) => {
    switch (t) {
      case 'carga': if (host && esperando) cargas[de] = d; break;
      case 'listo': if (!host) { if (esperando) empezar(d); else listoTemprano = d; } break;
      case 'nv': { const n = naveDe(de); if (host && n && n.remota) { n.tx = d[0]; n.ty = d[1]; n.ctl.fuego = !!d[2]; } break; }
      case 'hab': { const n = naveDe(de); if (host && n && n.remota) { n.ctl.ax = d[0]; n.ctl.ay = d[1]; n.ctl.hab = true; } break; }
      case 'snap': if (!host && activo) aplicarSnap(d); break;
      case 'evs': if (!host && activo) for (const e of d) recibirEv(e); break;
      case 'q': { const n = naveDe(de); if (n && FRASES[d]) { n.burbuja = FRASES[d]; n.burbujaT = 3; } break; }
      case 'fin': if (!host && activo) aplicarFin(d); break;
    }
  });
  Red.on('jugadorSalio', (id, j) => {
    if (!activo) return;
    if (host) { S.retirar(id); Hud.toast((j && j.nombre || 'Jugador') + ' salió', '#ff6b6b'); }
  });
  Red.on('cerrado', () => {
    if (activo && !host) { Hud.toast('El anfitrión salió: partida terminada', '#ff6b6b'); activo = false; Juego.salirAlMenu(); }
    else if (esperando) { esperando = null; Hud.toast('Conexión cerrada', '#ff6b6b'); }
  });

  // ------------------------------------------------ Eventos (anfitrión -> clientes)
  M.evento = function (t, a, b, c, d, e) {
    if (!host || !activo) return;
    const k = FWD[t]; if (k === undefined) return;
    if ((t === 'golpe' || t === 'chispa' || t === 'sdisparo') && cola.length > 24) return;
    if (t === 'disparo' && cola.length > 12) return;
    if (cola.length > 60) return;
    if (k === 0) cola.push([t, a && a.pid, b, c, d, e]);
    else if (k === 'j') cola.push([t, a.id, b, c]);
    else if (k === 'r') cola.push([t, a, b && b.pid]);
    else if (k === 1) cola.push([t, Math.round(a), Math.round(b), c, d, e ? 1 : 0]);
    else cola.push([t, a, b, c, d, e]);
  };
  function recibirEv(e) {
    const t = e[0], K = FWD[t];
    if (K === 0) { const n = naveDe(e[1]); if (n) Juego.evento(t, n, e[2], e[3], e[4], e[5]); }
    else if (K === 'j') Juego.evento(t, JEFES.find((q) => q.id === e[1]) || JEFES[0], e[2], e[3]);
    else if (K === 'r') Juego.evento(t, e[1], naveDe(e[2]));
    else if (t === 'explosion') Juego.evento(t, e[1], e[2], e[3], e[4], !!e[5]);
    else Juego.evento(t, e[1], e[2], e[3], e[4], e[5]);
  }

  // ------------------------------------------------ Foto del mundo
  const r1 = Math.round;
  function hacerSnap() {
    const e = [], b = [], eb = [], p = [], z = [], n = [];
    for (const v of S.naves) n.push([v.pid, r1(v.x), r1(v.y), v.vida, v.vidaMax, v.escudo, r1(v.inv * 10), ARMAS_ID.indexOf(v.arma), v.nivel, r1(v.rapido * 10), r1(v.iman * 10), r1(v.habCd * 10), r1(v.habMax * 10), r1(v.habT * 10), v.vivo ? 1 : 0, v.puntos, r1(v.racha), v.mult, v.monedas, v.kills, v.dash > 0 ? 1 : 0, r1(v.rel * 10), r1((v.reviv || 0) * 100), v.retirada ? 1 : 0]);
    const E = S.enem;
    for (let i = 0; i < E.n && i < 64; i++) {
      const o = E.a[i], fl = (o.flash > 0 ? 1 : 0) | (o.inv > 0 ? 2 : 0) | (o.intro > 0 ? 4 : 0) | (o.carga === 1 ? 8 : 0) | (o.fase ? 16 : 0);
      e.push(o.jefe ? 100 + JEFES.indexOf(o.jefe) : TIPOS.indexOf(o.tipo), r1(o.x), r1(o.y), r1(o.rvx), r1(o.rvy), Math.ceil(o.vida), Math.ceil(o.vidaMax), r1(o.d * 100), r1(o.ang * 100), r1(o.rot * 100), r1(o.esc * 10), fl);
    }
    const k = S.lento > 0 ? 0.5 : 1;
    for (let i = 0; i < S.balas.n && i < 160; i++) { const o = S.balas.a[i]; b.push(o.tipo, r1(o.x), r1(o.y), r1(o.vx), r1(o.vy)); }
    for (let i = 0; i < S.balasE.n && i < 340; i++) { const o = S.balasE.a[i]; eb.push(o.tipo, r1(o.x), r1(o.y), r1(o.vx * k), r1(o.vy * k)); }
    for (let i = 0; i < S.pus.n; i++) { const o = S.pus.a[i]; p.push(PU.indexOf(o.tipo), r1(o.x), r1(o.y)); }
    for (let i = 0; i < S.hazs.n; i++) { const o = S.hazs.a[i]; z.push(r1(o.x), r1(o.y), r1(o.w), r1(o.h), r1(o.warn * 100), r1(o.dur * 100)); }
    return { t: Red.reloj(), h: [S.mundo, S.oleada, S.esJefe ? 1 : 0, S.puntos, r1(S.lento * 10)], n, e, b, eb, p, z };
  }
  function aplicarSnap(d) {
    S.mundo = d.h[0]; S.oleada = d.h[1]; S.esJefe = !!d.h[2]; S.puntos = d.h[3]; S.lento = d.h[4] / 10;
    for (const a of d.n) {
      const v = naveDe(a[0]); if (!v) continue;
      v.vida = a[3]; v.vidaMax = a[4]; v.escudo = a[5]; v.inv = a[6] / 10; v.arma = ARMAS_ID[a[7]] || 'pulso'; v.nivel = a[8]; v.rapido = a[9] / 10; v.iman = a[10] / 10;
      v.habCd = a[11] / 10; v.habMax = a[12] / 10; v.habT = a[13] / 10; v.vivo = !!a[14]; v.puntos = a[15]; v.racha = a[16]; v.mult = a[17]; v.monedas = a[18]; v.kills = a[19];
      v.rel = a[21] / 10; v.reviv = a[22] / 100; v.retirada = !!a[23];
      if (v.id !== S.yo) { (remotos[v.pid] = remotos[v.pid] || new Red.Interpolador({ retardo: 100 })).agregar(d.t, { x: a[1], y: a[2] }); v.dash = a[20] ? 0.1 : 0; }
      else { v.escudo = a[5]; if (!v.vivo) { v.x = a[1]; v.y = a[2]; } }
    }
    S.enem.vaciar(); S.jefe = null;
    for (let i = 0; i < d.e.length; i += 12) {
      const o = S.enem.nuevo(); if (!o) break;
      const ti = d.e[i], boss = ti >= 100, J = boss ? JEFES[ti - 100] : null, tipo = boss ? 'jefe' : TIPOS[ti], def = boss ? { r: J.r } : ENEMIGOS[tipo];
      o.tipo = tipo; o.jefe = J; o.def = def; o.uid = 1; o.x = d.e[i + 1]; o.y = d.e[i + 2]; o.rvx = d.e[i + 3]; o.rvy = d.e[i + 4]; o.vida = d.e[i + 5]; o.vidaMax = d.e[i + 6];
      o.d = d.e[i + 7] / 100; o.ang = d.e[i + 8] / 100; o.rot = d.e[i + 9] / 100; o.esc = d.e[i + 10] / 10; const fl = d.e[i + 11];
      o.r = boss ? J.r : def.r * o.esc; o.flash = fl & 1 ? 0.05 : 0; o.inv = fl & 2 ? 1 : 0; o.intro = fl & 4 ? 1 : 0; o.carga = fl & 8 ? 1 : 0; o.fase = fl & 16 ? 1 : 0; o.mov = 0;
      if (boss) S.jefe = o;
    }
    S.balas.vaciar(); for (let i = 0; i < d.b.length; i += 5) { const o = S.balas.nuevo(); if (!o) break; o.tipo = d.b[i]; o.x = d.b[i + 1]; o.y = d.b[i + 2]; o.vx = d.b[i + 3]; o.vy = d.b[i + 4]; }
    S.balasE.vaciar(); for (let i = 0; i < d.eb.length; i += 5) { const o = S.balasE.nuevo(); if (!o) break; o.tipo = d.eb[i]; o.x = d.eb[i + 1]; o.y = d.eb[i + 2]; o.vx = d.eb[i + 3]; o.vy = d.eb[i + 4]; }
    S.pus.vaciar(); for (let i = 0; i < d.p.length; i += 3) { const o = S.pus.nuevo(); if (!o) break; o.tipo = PU[d.p[i]] || 'nivel'; o.x = d.p[i + 1]; o.y = d.p[i + 2]; o.r = o.tipo === 'moneda' ? 9 : 13; }
    S.hazs.vaciar(); for (let i = 0; i < d.z.length; i += 6) { const o = S.hazs.nuevo(); if (!o) break; o.x = d.z[i]; o.y = d.z[i + 1]; o.w = d.z[i + 2]; o.h = d.z[i + 3]; o.warn = d.z[i + 4] / 100; o.dur = d.z[i + 5] / 100; }
  }
  function extrapolar(dt) {
    const k = 1;
    for (let i = 0; i < S.balas.n; i++) { const o = S.balas.a[i]; o.x += o.vx * dt; o.y += o.vy * dt; }
    for (let i = 0; i < S.balasE.n; i++) { const o = S.balasE.a[i]; o.x += o.vx * dt; o.y += o.vy * dt; }
    for (let i = 0; i < S.enem.n; i++) { const o = S.enem.a[i]; o.x += o.rvx * dt * k; o.y += o.rvy * dt * k; o.t += dt; o.flash = Math.max(0, o.flash - dt); }
    for (let i = 0; i < S.pus.n; i++) { const o = S.pus.a[i]; o.y += 85 * dt; o.t += dt; }
    for (let i = 0; i < S.hazs.n; i++) { const o = S.hazs.a[i]; if (o.warn > 0) o.warn -= dt; else o.dur -= dt; }
    S.lento = Math.max(0, S.lento - dt);
  }

  // ------------------------------------------------ Fin
  function enviarFin() {
    const res = { puntos: S.puntos, oleada: S.oleada, est: S.est, victoria: S.victoria, naves: S.naves.map((n) => [n.pid, n.puntos, n.kills, n.monedas]) };
    const r = Red.difundir('fin', res); if (r === false) Red.difundir('fin', { puntos: S.puntos, oleada: S.oleada, est: { kills: S.est.kills, jefes: S.est.jefes, jefesIds: S.est.jefesIds, maxMult: S.est.maxMult, maxRacha: S.est.maxRacha, rozes: S.est.rozes, habilidades: S.est.habilidades, sinDano: S.est.sinDano, mejorOleada: S.est.mejorOleada, armasMax: S.est.armasMax }, victoria: S.victoria, naves: res.naves });
  }
  function aplicarFin(d) {
    S.puntos = d.puntos; S.oleada = d.oleada; Object.assign(S.est, d.est); S.victoria = d.victoria;
    for (const a of d.naves) { const n = naveDe(a[0]); if (n) { n.puntos = a[1]; n.kills = a[2]; n.monedas = a[3]; } }
    S.terminado = true; S.activo = false;
  }
  M.alFinalizar = function (res, extra) {
    extra.jugadores = S.naves.map((n) => ({ nombre: n.nombre || 'Jugador', color: n.colorP || n.color, puntos: n.puntos, kills: n.kills }));
    res.puntos = S.puntos;
  };
  M.salir = function (abandono) {
    if (abandono && Red.conectado) { try { Red.salir(); } catch (e) { /* nada */ } }
    activo = false; esperando = null; M.chatAbierto = false; remotos = {};
  };

  // ------------------------------------------------ Bucle
  M.actualizar = function (dt, entradaActiva) {
    if (esperando && !activo) { /* espera de cargas (anfitrión) */ }
    const yo = S.naves[S.yo];
    for (const n of S.naves) { const j = Red.jugadores && Red.jugadores[n.pid]; n.ping = n.pid === Red.miId ? Red.rtt | 0 : (j && j.ping) | 0; if (n.burbujaT > 0) n.burbujaT -= dt; }
    // chat rápido
    let abrio = false;
    if (entradaActiva && Entrada.chatPulsado && !M.chatAbierto) { M.chatAbierto = true; chatSel = 0; abrio = true; }
    if (M.chatAbierto && !abrio) chat();
    if (host) {
      S.actualizar(dt);
      tSnap += dt; if (tSnap >= 0.066) { tSnap = 0; const sn = hacerSnap(); if (Red.difundir('snap', sn, { fiable: false }) === false) { sn.eb.length = Math.min(sn.eb.length, 600); sn.b.length = Math.min(sn.b.length, 250); sn.e.length = Math.min(sn.e.length, 360); Red.difundir('snap', sn, { fiable: false }); } }
      tEv += dt; if (cola.length && tEv >= 0.05) { tEv = 0; Red.difundir('evs', cola.splice(0, cola.length)); }
      if (S.terminado && !M.finEnviado) { M.finEnviado = true; enviarFin(); }
      if (!S.terminado) M.finEnviado = false;
    } else {
      const n = yo;
      if (n) {
        const c = n.ctl;
        if (c.hab) { c.hab = false; if (n.habCd <= 0 && n.dash <= 0 && n.vivo) { Red.enviar('hab', [c.ax, c.ay]); n.habCd = n.habMax || 5; if (n.def.hab === 'dash') S.dashLocal(n); } }
        S.moverLocal(n, dt);
        tNv += dt; if (tNv >= 0.05) { tNv = 0; Red.enviar('nv', [r1(n.x), r1(n.y), c.fuego ? 1 : 0], { fiable: false }); }
      }
      for (const v of S.naves) if (v.id !== S.yo) { const o = remotos[v.pid]; if (o) { const p = o.obtener(); if (p) { v.x = p.x; v.y = p.y; } } }
      extrapolar(dt);
    }
    // el anfitrión también manda su posición implícitamente (su nave no es remota)
  };

  // ------------------------------------------------ Chat rápido y HUD
  function chat() {
    const N = Entrada.nav;
    for (let i = 0; i < FRASES.length; i++) if (Entrada.pulso('Digit' + (i + 1), 'Numpad' + (i + 1))) return decir(i);
    if (N.arriba) chatSel = (chatSel + FRASES.length - 1) % FRASES.length; if (N.abajo) chatSel = (chatSel + 1) % FRASES.length;
    if (N.ok) return decir(chatSel);
    if (N.atras || Entrada.chatPulsado) { M.chatAbierto = false; Entrada.reiniciarJuego(); return; }
    for (const e of Entrada.tomarEventos()) if (e.t === 'd') {
      const i = Math.floor((e.y - 270) / 52);
      if (e.x > 90 && e.x < 390 && i >= 0 && i < FRASES.length) return decir(i);
      M.chatAbierto = false; Entrada.reiniciarJuego();
    }
  }
  function decir(i) {
    M.chatAbierto = false; Entrada.reiniciarJuego(); Entrada.limpiarEventos();
    Red.difundir('q', i); const n = S.naves[S.yo]; n.burbuja = FRASES[i]; n.burbujaT = 3;
  }
  M.dibujarHud = function (g, t) {
    const B = Entrada.botones; B.chat.ver = Entrada.mostrarTactil();
    g.globalAlpha = 0.6; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(B.chat.x, B.chat.y, B.chat.r - 3, 0, 6.283); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(B.chat.x - 8, B.chat.y - 6, 16, 10); g.beginPath(); g.moveTo(B.chat.x - 3, B.chat.y + 4); g.lineTo(B.chat.x - 3, B.chat.y + 9); g.lineTo(B.chat.x + 3, B.chat.y + 4); g.fill(); g.globalAlpha = 1;
    // compañeros
    let y = 150;
    for (const n of S.naves) {
      if (n.id === S.yo) continue;
      g.fillStyle = n.colorP || '#fff'; g.fillRect(14, y - 7, 4, 28); Hud.txt(g, n.nombre || 'Jugador', 24, y, 11, n.colorP || '#fff', 'left');
      Hud.txt(g, n.vivo ? '♥'.repeat(Math.max(0, n.vida)) : (n.retirada ? 'SALIÓ' : 'CAÍDO'), 24, y + 14, 10, n.vivo ? '#ff5c8a' : '#ff6b6b', 'left', 700);
      Hud.txt(g, Util.fmt(n.puntos), 130, y + 7, 11, '#c9c2ff', 'left'); y += 36;
    }
    if (M.chatAbierto) {
      g.fillStyle = 'rgba(5,3,15,.82)'; g.fillRect(70, 230, 340, FRASES.length * 52 + 40); g.strokeStyle = '#3df5ff'; g.lineWidth = 2; g.strokeRect(70, 230, 340, FRASES.length * 52 + 40);
      Hud.txt(g, 'CHAT RÁPIDO', W / 2, 250, 12, '#3df5ff', 'center');
      FRASES.forEach((f, i) => { g.fillStyle = i === chatSel ? 'rgba(61,245,255,.2)' : 'rgba(255,255,255,.06)'; g.fillRect(90, 270 + i * 52 - 20 + 20, 300, 44); Hud.txt(g, (i + 1) + '  ' + f, W / 2, 292 + i * 52, 15, '#fff', 'center'); });
    }
  };

  // Sala por enlace
  if (Lobby.hayEnlace()) setTimeout(() => Lobby.abrir(OPTS), 300);

  // Anfitrión: espera las cargas y arranca
  setInterval(() => {
    if (!esperando || activo) return;
    esperando.t += 0.1;
    if (host && (esperando.jugadores.every((j) => cargas[j.id]) || esperando.t > 4)) {
      const cfg = construirCfg(); Red.difundir('listo', cfg); empezar(cfg);
    } else if (!host && esperando.t > 12) { esperando = null; Hud.toast('No se pudo iniciar: el anfitrión no respondió', '#ff6b6b'); }
  }, 100);
  window.MP = M;
  return M;
})();
