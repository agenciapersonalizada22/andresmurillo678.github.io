// =============================================================
//  JUEGO: bucle principal, estados (menú, partida, pausa, fin),
//  eventos de la simulación (sonido, vibración, efectos) y progreso.
// =============================================================
const Juego = (() => {
  'use strict';
  const W = CONFIG.ancho, H = CONFIG.alto;
  const lienzo = document.getElementById('juego'), g = lienzo.getContext('2d');
  const aj = () => Datos.aj, save = () => Datos.save;
  const J = { };
  let estado = 'menu', ultimo = performance.now(), tGlobal = 0, fade = 1, ultimaCfg = null, ctlNulo = { ax: 0, ay: 0, dx: 0, dy: 0, fuego: false, hab: false };
  let fpsAcum = 0, fpsN = 0, fpsMostrado = 60, lentoT = 0, wake = null, hintI = 0, hintT = 0, mpActivo = false;

  // ------------------------------------------------ Pantalla
  let sx = 1;
  function redimensionar() {
    const dpr = Math.min(window.devicePixelRatio || 1, aj().resolucion);
    const escala = Math.min(window.innerWidth / W, window.innerHeight / H);
    const cw = Math.floor(W * escala), ch = Math.floor(H * escala);
    lienzo.style.width = cw + 'px'; lienzo.style.height = ch + 'px';
    lienzo.width = Math.max(1, Math.floor(cw * dpr)); lienzo.height = Math.max(1, Math.floor(ch * dpr));
    sx = lienzo.width / W;
  }
  window.addEventListener('resize', redimensionar);
  J.aplicarAjustes = function () {
    redimensionar(); Dibujo.construirSprites(); Dibujo.reconstruirFondo(); Sonido.aplicarVolumenes(); Datos.guardarAj();
    if (UI.actual()) UI.reconstruir();
  };
  J.pantallaCompleta = function () {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement);
    } catch (e) { /* no disponible */ }
  };
  async function pedirWake() { try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; } }
  function soltarWake() { try { if (wake) wake.release(); } catch (e) { /* nada */ } wake = null; }

  try { document.fonts.load('800 20px Orbitron'); } catch (e) { /* sin fuentes web */ }
  ['pointerdown', 'keydown', 'touchend', 'click'].forEach((ev) => window.addEventListener(ev, Sonido.iniciar, { passive: true }));

  // ------------------------------------------------ Utilidades
  function vibrar(f, s, ms) {
    const a = aj(); if (!a.vibracion) return;
    Mando.vibrar(f * a.vibInt, s * a.vibInt, ms);
    if (Entrada.dispositivo() === 'tactil' && navigator.vibrate) { try { navigator.vibrate(Math.round(ms * 0.5 * a.vibInt)); } catch (e) { /* nada */ } }
  }
  J.vibrar = vibrar;
  J.logro = (id) => {
    const s = save(); if (s.logros[id]) return;
    const l = LOGROS.find((q) => q.id === id); if (!l) return;
    s.logros[id] = Datos.hoy(); Datos.guardarSave(); Hud.toast('LOGRO: ' + l.nom, '#ffd23d', l.desc); Sonido.logro();
    if (window.NebulaCuenta) NebulaCuenta.logro(id); // además de lo local: a la cuenta (+25 XP, una sola vez)
  };
  function revisarLogros() { for (const l of LOGROS) if (l.st && !save().logros[l.id] && (save().stats[l.st] || 0) >= l.meta) J.logro(l.id); }
  J.diario = () => {
    const f = Datos.hoy(), r = Util.rng(f);
    return { fecha: f, semilla: f, mod: MODIFICADORES[Math.floor(r() * MODIFICADORES.length)], nave: NAVES[Math.floor(r() * NAVES.length)], mundo: Math.floor(r() * 6) };
  };
  J.estado = () => estado;
  J.esMP = () => mpActivo;
  J.sim = Sim;
  const colorEn = (t) => (t === 'misil' ? '#ffb02e' : t === 'jefe' ? '#ffffff' : (Dibujo.pal().en[t] || '#ffffff'));

  // ------------------------------------------------ Eventos de la simulación
  const LBL = { nivel: 'ARMA +', disp: 'DISPERSIÓN', laser: 'LÁSER', misil: 'MISILES', rapido: 'RÁPIDO', escudo: 'ESCUDO', vida: '+VIDA', iman: 'IMÁN', bomba: 'HABILIDAD LISTA', lento: 'TIEMPO LENTO' };
  const yo = () => Sim.naves[Sim.yo | 0];
  J.evento = function (t, a, b, c, d, e) {
    switch (t) {
      case 'disparo': if (a === yo() || !mpActivo) Sonido.disparo(); break;
      case 'golpe': Sonido.golpe(); Fx.chispa(a, b, '#fff'); break;
      case 'chispa': Fx.chispa(a, b, '#fff'); break;
      case 'sdisparo': Sonido.disparoEnemigo(); break;
      case 'explosion': Fx.explosion(a, b, colorEn(c), d, e); Sonido.explosion(e); if (e) { Fx.destello('#ffffff', 0.25); } break;
      case 'texto': Fx.texto(a, b, '+' + Util.fmt(c), d, c >= 1000 ? 18 : 14); break;
      case 'multi': if (a === yo()) { Fx.texto(a.x, a.y - 34, 'x' + b, '#ffd23d', 20); Sonido.aviso(); } break;
      case 'graze': if (a === yo()) Sonido.graze(); break;
      case 'dano': if (a === yo()) { Sonido.dano(); Fx.sacudir(10); Fx.destello('#ff3040', 0.4); vibrar(1, 0.6, 260); } break;
      case 'escudoRoto': if (a === yo()) { Sonido.escudoRoto(); Fx.sacudir(5); vibrar(0.3, 0.6, 140); } break;
      case 'muerteNave': Fx.explosion(a.x, a.y, a.color, 20, true); Sonido.explosion(true); Fx.sacudir(16); if (a === yo()) { Sonido.dano(); vibrar(1, 1, 500); } break;
      case 'pickup': if (a === yo()) { Sonido.powerup(); Fx.texto(a.x, a.y - 26, LBL[b] || '', POWERUPS[b].color, 14); vibrar(0.15, 0.4, 80); } break;
      case 'moneda': if (a === yo()) Sonido.moneda(); break;
      case 'hab':
        if (b === 'dash') Sonido.dash(); else if (b === 'escudo') Sonido.escudoOn(); else if (b === 'bomba') { Sonido.bomba(); Fx.destello('#ffffff', 0.7); Fx.explosion(a.x, a.y, '#ffb02e', 30, true); }
        else if (b === 'rayo') Sonido.rayo(); else Sonido.drones();
        if (a === yo()) vibrar(0.5, 0.5, 160);
        break;
      case 'oleada': {
        const jefe = b, mundo = c;
        if (d) { Dibujo.fondoMundo(mundo); Musica.mundo(MUNDOS[mundo].transp, MUNDOS[mundo].tempo); }
        if (!jefe) { Hud.banner('OLEADA ' + a, d ? MUNDOS[mundo].nombre : '', '#ffffff'); Sonido.oleada(); }
        else Sonido.alarma();
        break;
      }
      case 'oleadaLista': if (b) Hud.toast('OLEADA PERFECTA', '#7dffb3', 'Bonus de puntos por no recibir daño'); Sonido.oleada(); break;
      case 'jefe': Hud.banner('¡' + a.toUpperCase() + '!', 'Jefe', '#ff6b9a', 2.8); Sonido.jefe(); Fx.sacudir(8); break;
      case 'fase': Hud.banner('FASE ' + a, '', '#ffd23d', 1.6); Sonido.fase(); Fx.destello('#ffffff', 0.5); vibrar(0.8, 0.8, 300); break;
      case 'jefeMuerto': Fx.destello('#ffffff', 0.9); Fx.explosion(b, c, a.color, 60, true); Fx.explosion(b, c, '#ffffff', 40, true); Sonido.victoria(); vibrar(1, 1, 600); break;
      case 'mundoCompleto': { const s = save(); s.camp.mundo = Math.max(s.camp.mundo, Math.min(6, a + 2)); Datos.guardarSave(); } Hud.banner('MUNDO COMPLETADO', MUNDOS[a].nombre, '#7dffb3', 3); break;
      case 'victoria': Sonido.victoria(); break;
      case 'sacudir': Fx.sacudir(a); break;
      case 'aviso': Sonido.aviso(); break;
      case 'carga': Sonido.carga(); break;
      case 'revive': Hud.toast(a + ' ha sido revivido', '#7dffb3'); Sonido.powerup(); break;
    }
  };
  Sim.ev = function (t, a, b, c, d, e) { J.evento(t, a, b, c, d, e); if (mpActivo && window.MP) MP.evento(t, a, b, c, d, e); };

  // ------------------------------------------------ Partida
  function configSim(cfg) {
    const s = save(), dia = J.diario(), perfil = Datos.perfil();
    const dcfg = cfg.modo === 'diario';
    const def = dcfg ? dia.nave : NAVES[cfg.nave];
    return { modo: cfg.modo, mundo: dcfg ? dia.mundo : cfg.mundo, jefe: cfg.jefe, semilla: dcfg ? dia.semilla : 0, dif: dcfg ? 'normal' : cfg.dif, mod: dcfg ? dia.mod : null,
      naves: [{ def, mejoras: dcfg ? { casco: 0, motor: 0, canon: 0, cadencia: 0, reactor: 0, iman: 0, botin: 0, blindaje: 0 } : s.mej, color: perfil.color }] };
  }
  function arrancar() {
    estado = 'jugando'; Entrada.juego = true; UI.cerrarTodo(); Entrada.reiniciarJuego(); Entrada.soltarTodo(); Entrada.limpiarEventos();
    Fx.limpiar(); Hud.limpiar(); fade = 1; hintI = 0; hintT = 0; lentoT = 0;
    Dibujo.fondoMundo(Sim.mundo); Musica.mundo(MUNDOS[Sim.mundo].transp, MUNDOS[Sim.mundo].tempo); Musica.animo('juego'); Musica.pausar(false);
    Sonido.inicio(); pedirWake();
  }
  J.comenzar = function (cfg) {
    ultimaCfg = cfg; mpActivo = false; Sim.yo = 0; Sim.espejo = false;
    const s = save(); s.ultimo = { modo: cfg.modo, mundo: cfg.mundo, jefe: cfg.jefe }; if (cfg.modo !== 'diario') s.naveSel = NAVES[cfg.nave].id; Datos.guardarSave();
    Sim.iniciar(configSim(cfg));
    Sim.naves[0].nombre = Datos.perfil().nombre;
    Sim.naves[0].ctl = Entrada.ctl(0);
    arrancar();
  };
  J.reiniciar = function () { if (ultimaCfg) J.comenzar(ultimaCfg); };
  J.pausar = function () {
    if (estado !== 'jugando') return;
    estado = 'pausa'; Entrada.juego = false; Entrada.soltarTodo(); Entrada.limpiarEventos();
    if (!mpActivo) Musica.pausar(true);
    UI.raiz(Pantallas.pausa()); Sonido.clic();
  };
  J.reanudar = function () {
    if (estado !== 'pausa') return;
    estado = 'jugando'; Entrada.juego = true; UI.cerrarTodo(); Entrada.reiniciarJuego(); Entrada.limpiarEventos(); Musica.pausar(false); Datos.guardarAj();
  };
  J.salirAlMenu = function () {
    if (mpActivo && window.MP) MP.salir(estado !== 'fin');
    mpActivo = false; Sim.yo = 0; Sim.espejo = false;
    estado = 'menu'; Entrada.juego = false; Sim.activo = false; Fx.limpiar(); Hud.limpiar(); soltarWake();
    Musica.pausar(false); Musica.mundo(0, 1); Musica.animo('menu');
    UI.raiz(Pantallas.principal()); fade = 1;
    J.aplicarNube();
  };
  // Si otro dispositivo subió progreso nuevo: se aplica sólo en el menú (nunca a mitad de partida).
  J.aplicarNube = function () {
    const N = window.NebulaCuenta; if (!N || !N.bajadaPendiente || estado !== 'menu') return;
    N.bajadaPendiente = false; Datos.recargar(); J.aplicarAjustes(); N.repasarLogros();
    Hud.toast('Progreso actualizado desde tu cuenta', '#7dffb3');
  };

  function finalizar() {
    const res = Sim.resumen(), s = save(), st = s.stats, est = Sim.est, modo = Sim.modo;
    estado = 'fin'; Entrada.juego = false; soltarWake();
    const extra = { modoNombre: MODOS.find((m) => m.id === modo).nombre + (mpActivo ? ' · Cooperativo' : ''), nuevoRecord: false };
    if (mpActivo && window.MP) MP.alFinalizar(res, extra);
    if (!res.victoria) st.muertes++;
    st.partidas++; st.tiempo += res.tiempo; st.kills += est.kills; st.jefes += est.jefes; st.creditosTotal += res.creditos; st.monedas += res.monedas;
    st.maxCombo = Math.max(st.maxCombo, est.maxRacha | 0); st.maxMult = Math.max(st.maxMult, est.maxMult); st.rozes += est.rozes; st.habilidades += est.habilidades;
    st.mejorOleada = Math.max(st.mejorOleada, res.oleada); st.mejorPuntos = Math.max(st.mejorPuntos, res.puntos); st.sinDano = Math.max(st.sinDano, est.sinDano);
    if (est.armasMax) st.armasMax = 1; if (modo === 'diario' && res.victoria) st.diarios++;
    s.creditos += res.creditos; s.record = Math.max(s.record, res.puntos);
    est.jefesIds.forEach((id) => { s.jefes[id] = true; });
    if (modo === 'campana') { const i = Math.min(5, Sim.mundo); s.camp.mejor[i] = Math.max(s.camp.mejor[i] || 0, res.puntos); if (res.victoria) { s.camp.completa = true; J.logro('campeon'); } }
    if (modo === 'diario') { const f = J.diario().fecha; s.diario[f] = Math.max(s.diario[f] || 0, res.puntos); }
    if (!s.tutorial) s.tutorial = true;
    Datos.guardarSave(); revisarLogros();
    if (window.NebulaCuenta) NebulaCuenta.partidaTerminada(res, modo, mpActivo, extra);
    Musica.animo('fin'); if (res.victoria) Sonido.victoria(); else Sonido.finJuego();
    const mostrar = () => { UI.raiz(Pantallas.fin(res, extra)); };
    const clave = modo, nave = Sim.naves[0].def.id;
    if (!mpActivo && Datos.entraEnTabla(clave, res.puntos)) {
      extra.nuevoRecord = Datos.tabla(clave).length === 0 || res.puntos > Datos.tabla(clave)[0].p;
      if (window.Cuenta && Cuenta.usuario) setTimeout(() => { Datos.anotarRecord(clave, res.puntos, Datos.perfil().nombre, nave); mostrar(); }, 900); // con cuenta: se usa su nombre, sin preguntar
      else setTimeout(() => UI.dialogo({ titulo: 'Entras en la tabla de récords. ¿Tu nombre?', valor: Datos.perfil().nombre, max: 14, boton: 'Guardar', alAceptar: (v) => { Datos.anotarRecord(clave, res.puntos, (v || '').trim().slice(0, 14) || 'Jugador', nave); mostrar(); }, alCancelar: () => { Datos.anotarRecord(clave, res.puntos, Datos.perfil().nombre, nave); mostrar(); } }), 1200);
    } else setTimeout(mostrar, 900);
  }
  J.finalizar = finalizar;

  // pistas del primer juego
  function pistas(dt) {
    if (save().tutorial || !aj().ayudas || mpActivo) return;
    const d = Entrada.dispositivo();
    const L = [
      [1, d === 'tactil' ? 'Arrastra el dedo para mover la nave. Dispara sola.' : d === 'mando' ? 'Stick izquierdo para moverte. Dispara sola.' : 'Muévete con WASD o flechas. Dispara sola.'],
      [8, 'Recoge los power-ups: ▲ sube el nivel del arma.'],
      [16, d === 'tactil' ? 'Toca el botón grande para usar tu habilidad.' : d === 'mando' ? 'X, LB o RB usan tu habilidad especial.' : 'Pulsa X para usar tu habilidad especial.'],
      [26, 'Rozar balas enemigas da puntos. Tu centro es el punto blanco.'],
    ];
    if (hintI < L.length && Sim.t >= L[hintI][0]) { Hud.hint(L[hintI][1]); hintT = 0; hintI++; }
    hintT += dt; if (hintT > 6) Hud.hint(null);
  }

  // ------------------------------------------------ Bucle
  function calidadAuto(dt) {
    fpsAcum += dt; fpsN++;
    if (fpsAcum >= 1) { fpsMostrado = Math.round(fpsN / fpsAcum); Hud.fps(fpsMostrado); fpsAcum = 0; fpsN = 0;
      const a = aj();
      if (estado === 'jugando' && a.autoCalidad && !document.hidden && fpsMostrado < 42 && (a.fpsLimite === 0 || a.fpsLimite > 45)) { lentoT++; } else lentoT = Math.max(0, lentoT - 1);
      if (lentoT >= 4) { lentoT = 0; const i = Datos.ORDEN_CAL.indexOf(a.calidad); if (i > 0) { Datos.aplicarPreset(Datos.ORDEN_CAL[i - 1]); J.aplicarAjustes(); Hud.toast('Calidad bajada a ' + Datos.ORDEN_CAL[i - 1].toUpperCase(), '#ffd23d', 'Para mantener la fluidez'); } }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const lim = aj().fpsLimite;
    if (lim && now - ultimo < 1000 / lim - 2) return;
    const dt = Math.min(0.05, (now - ultimo) / 1000); ultimo = now; tGlobal += dt;
    const lobby = (window.Lobby && Lobby.abierto) || !!document.querySelector('.cu-fondo'); // lobby o aviso/modal de la cuenta: el juego cede mando y teclado
    if (lobby) Entrada.limpiarEventos(); else { Mando.leer(); Entrada.actualizar(dt); }
    const escribiendo = UI.dialogoAbierto();
    if (!lobby && !escribiendo) {
      if (Entrada.pulso('KeyM')) Sonido.alternar();
      if (Entrada.pulso('KeyN')) Musica.alternar();
      if (Entrada.pulso('KeyF')) J.pantallaCompleta();
    }
    const S = Sim;
    // ---- lógica
    if (estado === 'jugando' || (estado === 'pausa' && mpActivo)) {
      const n = S.naves[S.yo | 0];
      if (n) n.ctl = estado === 'jugando' && !lobby && !(window.MP && MP.chatAbierto) ? Entrada.ctl(0) : ctlNulo;
      if (estado === 'jugando' && !lobby && Entrada.pausaPulsada && !(window.MP && MP.chatAbierto)) J.pausar();
      if (mpActivo && window.MP) MP.actualizar(dt, estado === 'jugando' && !lobby);
      else S.actualizar(dt);
      Fx.actualizar(dt); Hud.actualizar(dt); pistas(dt);
      if (S.activo === false && S.terminado && estado !== 'fin') finalizar();
      if (S.jefe && S.jefe.intro < 1.2) Musica.animo('jefe'); else if (S.activo) Musica.animo('juego');
      calidadAuto(dt);
    } else { Fx.actualizar(dt); Hud.actualizar(dt); if (estado === 'fin') { /* escena congelada */ } }
    if (estado === 'pausa' || estado === 'fin') { /* ok */ }
    // ---- dibujo
    g.setTransform(sx, 0, 0, sx, 0, 0);
    g.imageSmoothingEnabled = aj().suavizado;
    g.fillStyle = '#05030f'; g.fillRect(0, 0, W, H);
    if (estado === 'menu') { /* fondo lo pinta la pantalla */ }
    else {
      const frozen = (estado === 'pausa' && !mpActivo) || estado === 'fin';
      g.save();
      const sh = Fx.sacudida; if (sh > 0.2) g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
      Dibujo.escena(g, S, frozen ? 0 : dt, S.fondoT);
      if (Fx.flash > 0.01) { g.globalAlpha = Math.min(1, Fx.flash); g.fillStyle = Fx.flashC; g.fillRect(-20, -20, W + 40, H + 40); g.globalAlpha = 1; }
      g.restore();
      if (estado === 'jugando' || (estado === 'pausa' && mpActivo)) { Hud.dibujar(g, S, tGlobal, { mostrarFps: aj().mostrarFps }); if (mpActivo && window.MP) MP.dibujarHud(g, tGlobal); }
    }
    UI.dibujar(g, tGlobal, dt);
    if (!UI.abierto()) Entrada.limpiarEventos();
    if (estado === 'menu' && aj().mostrarFps) { Hud.txt(g, fpsMostrado + ' FPS', 14, H - 12, 11, '#7dffb3', 'left'); calidadFps(dt); }
    Hud.dibujarAvisos(g);
    if (fade > 0.01) { g.globalAlpha = fade; g.fillStyle = '#05030f'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; fade = Math.max(0, fade - dt * 2.5); }
    Entrada.finDeCuadro();
  }
  function calidadFps(dt) { fpsAcum += dt; fpsN++; if (fpsAcum >= 1) { fpsMostrado = Math.round(fpsN / fpsAcum); fpsAcum = 0; fpsN = 0; } }

  // ------------------------------------------------ Visibilidad
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (estado === 'jugando' && !mpActivo) J.pausar();
      if (aj().pausaOculta) Sonido.suspender(true);
      soltarWake();
    } else { if (aj().pausaOculta) Sonido.suspender(false); if (estado === 'jugando' || mpActivo) pedirWake(); }
  });
  window.addEventListener('blur', () => { if (estado === 'jugando' && !mpActivo) J.pausar(); });
  if (window.NebulaCuenta) NebulaCuenta.alBajar = () => { if (estado === 'menu' && !UI.dialogoAbierto()) J.aplicarNube(); };
  setInterval(() => { if (estado === 'menu') J.aplicarNube(); }, 2000);
  Mando.alConectar(() => Hud.toast('Mando conectado', '#7dffb3'));

  // ------------------------------------------------ Multijugador (puente)
  J.abrirLobby = () => { if (window.MP) MP.abrirLobby(); };
  J.iniciarMP = function () { mpActivo = true; arrancar(); };
  J.mpActivo = () => mpActivo;
  J.setEstado = (e) => { estado = e; };
  J.pantallas = () => Pantallas;

  // ------------------------------------------------ Arranque
  redimensionar(); Dibujo.construirSprites();
  Entrada.configurar(lienzo);
  Sonido.aplicarVolumenes && 0;
  UI.raiz(Pantallas.principal()); Musica.animo('menu');
  requestAnimationFrame(frame);
  window.NEBULA = J;
  return J;
})();
