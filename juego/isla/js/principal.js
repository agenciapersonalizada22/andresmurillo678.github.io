// Arranque de Isla Final: menus, bucle principal, ajustes, multijugador (Lobby), cuenta y ciclo de partida.
import { h, $ } from './dom.js';
import { G, enRed } from './estado.js';
import { cargarAjustes, guardarAjustes, cargarProgreso, esMovil, SKINS, CLAVES } from './almacen.js';
import { crearEscena, aplicarCalidad, redimensionar } from './escena.js';
import { crearHud } from './hud.js';
import { crearEntrada } from './entrada.js';
import { abrirAjustes } from './ajustes.js';
import { abrirCapa, cerrarCapa, tick as navTick, capaActiva } from './nav.js';
import * as Son from './sonido.js';
import { iniciarPartida, actualizarPartida, recibir, terminarSesion, guardarSP, hayPartidaGuardada, borrarGuardada, iniciarRepeticion, actualizarRepeticion, registrar, chequearFin, tiempoPartida } from './partida.js';
import { iniciarJugador, actualizarJugador, datosHud, cambiarSlot, reproducirEmote } from './jugador.js';
import { modal, hayModal, cerrarTodos, panelSetup, panelTienda, panelLogros, panelAyuda, panelRanking, panelResultados, figura } from './menus.js';
import * as PR from './progreso.js';
import * as CI from './cuenta-isla.js';

const canvas = $('#lienzo'), menu = $('#menu');
let enPartida = false, ajustesAbiertos = 0, esperaMP = null, cfgMP = null, wake = null, ultFrame = 0, fpsAcum = { n: 0, t: 0, v: 0, malos: 0 }, guardarT = 0, tutorial = false;
G.aj = cargarAjustes(); G.prog = cargarProgreso(); G.cuenta = PR;
const aj = G.aj;
const perfil = () => (window.Red && window.Red.perfil ? window.Red.perfil.obtener() : { nombre: 'Jugador', color: '#3df5ff' });

crearEscena(canvas, aj);
G.I = crearEntrada(aj, canvas, window.Mando);
G.hud = crearHud(document.body, {
  slot: (i) => cambiarSlot(i), material: (m) => { if (G.yo) G.yo.matSel = m; }, emote: (i) => reproducirEmote(i),
  abrirPanel: (r) => abrirCapa(r, () => { r.hidden = true; cerrarCapa(r); })
});
const bPausa = h('button', { type: 'button', id: 'bpausa', 'aria-label': 'Pausa', txt: '❚❚', hidden: true, on: { click: () => G.pausar() } }); document.body.appendChild(bPausa);
Son.configurar(aj);

/* ---------- ajustes ---------- */
let guardaT = 0;
function alCambiar(k) {
  Son.configurar(aj); document.body.classList.toggle('texto-grande', !!aj.textoGrande); document.body.dataset.dalt = aj.daltonico;
  if (['calidad', 'sombras', 'dist', 'pr', 'vegetacion'].includes(k)) aplicarCalidad(aj);
  if (G.ef) G.ef.reducir = !!aj.reducirMov; G.I.aplicarTactil();
  clearTimeout(guardaT); guardaT = setTimeout(() => guardarAjustes(aj), 300);
}
alCambiar('init');
function abrirAjustesUI() {
  ajustesAbiertos++; G.I.liberar();
  const r = abrirAjustes({ aj, alCambiar, cuenta: () => CI.bloqueNube(), datos: { exportar: PR.exportar, importar: PR.importar, borrarTodo: null, borrar: () => { PR.borrarTodo(); pintarMenu(); } }, cerrar: () => { ajustesAbiertos--; cerrarCapa(r); guardarAjustes(aj); } });
  abrirCapa(r, r.cerrar);
}
addEventListener('keydown', (e) => { if (e.key === 'Escape' && ajustesAbiertos) { const a = document.querySelector('.modal.ajustes'); if (a && a.cerrar) a.cerrar(); } }, true);

/* ---------- menu principal ---------- */
const nombreMostrar = () => { const u = CI.usuario(); return u ? u.nombre || u.usuario : perfil().nombre; };
function pintarMenu() {
  menu.textContent = '';
  const p = G.prog, g = hayPartidaGuardada(), btn = (txt, fn, cls) => h('button', { type: 'button', cls: 'btn ' + (cls || ''), 'data-f': 1, txt, on: { click: () => { Son.iniciar(); Son.sfx('ui', 0.5); fn(); } } });
  const chip = h('div', { cls: 'cuenta-linea' }); CI.pintarChip(chip, abrirCuenta);
  menu.append(h('div', { cls: 'logo', 'aria-hidden': 'true' }, [figura(SKINS.find((s) => s.id === p.skin) || SKINS[0], perfil().color)]),
    h('h1', { cls: 'gran', txt: 'ISLA FINAL' }), h('p', { cls: 'lema', txt: 'Salta del bus, construye y sé el último en pie.' }), chip,
    h('p', { cls: 'monedas', txt: nombreMostrar() + ' · ' + p.monedas + ' monedas · ' + p.stats.victorias + ' victorias' }),
    h('div', { cls: 'lista-menu' }, [
      g ? btn('Continuar partida (' + { solitario: 'solitario', duos: 'dúos', creativo: 'creativo' }[g.modo] + ')', continuar, 'grande inicial') : null,
      btn('Solitario', () => preparar('solitario'), g ? '' : 'grande inicial'), btn('Dúos', () => preparar('duos')), btn('Creativo / práctica', () => preparar('creativo')), btn('Multijugador (hasta 4 amigos)', () => preparar('solitario', true), 'sec'),
      h('div', { cls: 'fila-botones' }, [btn('Tienda', panelTienda, 'sec'), btn('Logros', panelLogros, 'sec'), btn('Rankings', panelRanking, 'sec')]),
      h('div', { cls: 'fila-botones' }, [btn('Ajustes', abrirAjustesUI, 'sec'), btn('Cómo jugar', panelAyuda, 'sec'), btn('Pantalla completa', pantallaCompleta, 'sec')]),
      h('a', { cls: 'btn sec', 'data-f': 1, href: '../', txt: 'Volver al portal' })]));
  if (!menu.hidden) setTimeout(() => { const f = menu.querySelector('.inicial'); if (f && !hayModal() && !ajustesAbiertos) f.focus(); }, 40);
}
function abrirCuenta() { const c = h('div', {}); const m = modal('Tu cuenta', [c]); CI.panelCuenta(c, m, { ranking: panelRanking, antesDeSalir: () => {} }); }
function pantallaCompleta() { const d = document, e = d.documentElement; if (d.fullscreenElement) d.exitFullscreen(); else if (e.requestFullscreen) e.requestFullscreen().catch(() => {}); }
function preparar(modo, mp) {
  const pref = G.prog.pref;
  panelSetup(modo, pref, () => { PR_guardar(); if (mp) { window.Lobby.abrir(OPTS); return; } iniciarSP(modo); }, mp);
  if (mp) { /* el modo se elige dentro del lobby */ }
}
const PR_guardar = () => { try { localStorage.setItem(CLAVES.progreso, JSON.stringify(G.prog)); } catch (e) { /* sin almacenamiento */ } };
function iniciarSP(modo, restaurar) {
  const pf = perfil(), pref = G.prog.pref;
  empezar({ modo, dif: pref.dif, total: pref.total, semilla: restaurar ? restaurar.semilla : (Math.random() * 1e6) | 0, jugadores: [{ id: 0, nombre: nombreMostrar(), color: pf.color, skin: G.prog.skin }], miId: 0, mp: false, restaurar });
}
function continuar() { const s = hayPartidaGuardada(); if (!s) return; G.prog.pref.dif = s.dif; iniciarSP(s.modo, s); }

/* ---------- partida ---------- */
async function empezar(o) {
  cerrarTodos(); G.pausado = false; terminarSesion();
  document.body.classList.add('en-partida'); menu.hidden = true;
  Son.iniciar(); Son.musica(false);
  try { iniciarPartida(o); iniciarJugador(); } catch (e) { console.error(e); salirAlMenu(); return; }
  G.hud.mostrar(true); G.hud.limpiarFeed(); bPausa.hidden = false; G.I.activa = true; enPartida = true; G.I.tipo = esMovil() ? 'tactil' : G.I.tipo;
  if (o.mp) { setTimeout(() => window.Red.difundir('hola', { skin: G.prog.skin }), 600); setTimeout(() => window.Red.difundir('hola', { skin: G.prog.skin }), 3000); }
  pedirWake(); mostrarTutorial(o);
  if (o.modo === 'creativo') G.creativoT0 = performance.now();
  if (!G.I.bloqueado && !esMovil()) G.hud.mensaje('Haz clic en la pantalla para capturar el ratón', 4000);
}
function mostrarTutorial(o) {
  if (G.prog.tutorial || o.restaurar) return; G.prog.tutorial = 1; PR_guardar();
  const L = esMovil() ? ['Usa el joystick izquierdo para moverte y arrastra a la derecha para mirar', 'Toca Salto para lanzarte del bus y otra vez para abrir el planeador', 'Toca el loot y pulsa Usar para recogerlo', 'Con el pico golpea árboles y rocas para obtener materiales', 'Construye con Construir y usa Editar para hacer puertas', 'Mantente dentro del círculo blanco del mapa']
    : ['WASD y ratón para moverte y mirar; Espacio para lanzarte del bus', 'Abre el planeador con Espacio; aterriza cerca de un edificio', 'E recoge armas y abre cofres; el pico (tecla 1) rompe árboles y rocas', 'Q F C V: pared, piso, rampa y techo; G edita (puertas y ventanas)', 'Mantente dentro del círculo blanco: la tormenta hace daño'];
  L.forEach((t, i) => setTimeout(() => { if (G.P && enPartida) G.hud.mensaje(t, 4200); }, 5000 + i * 9000));
}
async function pedirWake() { try { if (navigator.wakeLock && esMovil()) wake = await navigator.wakeLock.request('screen'); } catch (e) { wake = null; } }
function soltarWake() { try { if (wake) wake.release(); } catch (e) { /* ya liberado */ } wake = null; }
function salirAlMenu() {
  enPartida = false; G.pausado = false; cerrarTodos(); G.hud.mostrar(false); G.hud.toggleMapa(false); G.hud.ed.cerrar(); G.hud.cerrarEmotes(); bPausa.hidden = true; G.I.activa = false; G.I.construyendo = false; G.I.liberar();
  const P = G.P; if (P && P.modo === 'creativo' && G.creativoT0 && performance.now() - G.creativoT0 > 60000) PR.dar('aprendiz');
  if (P && !P.mp && P.contab) borrarGuardada();
  terminarSesion(); document.body.classList.remove('en-partida'); soltarWake(); menu.hidden = false; G.render.setClearColor(0x0b0820); pintarMenu(); Son.musica(true);
}
G.alTerminar = (res) => {
  const P = G.P, r = PR.registrarPartida(res); if (!P.mp) borrarGuardada(); Son.sfx(res.gano ? 'victoria' : 'derrota', 0.8);
  if (res.cohete && false) PR.dar('explosivo');
  setTimeout(() => { if (G.P !== P) return; G.I.liberar(); const fin = P.fase === 'fin'; panelResultados(res, { espectar: !fin && P.modo !== 'creativo' ? () => {} : null, repeticion: () => verRepeticion(P), otra: P.mp ? null : () => iniciarSP(P.modo), menu: salirAlMenu }); }, res.gano ? 1500 : 1200);
};
G.alFin = (P) => { setTimeout(() => { if (G.P !== P) return; cerrarTodos(); G.I.liberar(); const g = G.ents.find((e) => e.vivo && !e.inerte); const m = modal('Partida terminada', [h('p', { cls: 'gran', txt: g ? 'Ganó ' + G.ents.filter((e) => e.vivo && !e.inerte && e.equipo === g.equipo).map((e) => e.nombre).join(' y ') : 'Nadie sobrevivió' }), h('div', { cls: 'botones' }, [h('button', { type: 'button', cls: 'btn inicial', 'data-f': 1, txt: 'Ver repetición', on: { click: () => { m.cerrar(); verRepeticion(P); } } }), h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, txt: 'Menú principal', on: { click: () => { m.cerrar(); salirAlMenu(); } } })])], { sinCerrar: true, sinEsc: true }); }, 1500); };
let repeticionPrev = null;
function verRepeticion(P) {
  const g = G.ents.find((e) => e.vivo && !e.inerte), obj = g ? g.id : (P.miMuerte && P.miMuerte.killer) || G.yo.id;
  if (!iniciarRepeticion(obj)) { salirAlMenu(); return; }
  G.hud.mostrar(false); bPausa.hidden = true; G.I.activa = false; P.fase = 'replay';
  const b = h('div', { id: 'replay-barra' }, [h('b', { txt: 'REPETICIÓN' }), h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: 'Saltar', on: { click: () => { P.rep = null; } } })]); document.body.appendChild(b); repeticionPrev = { b, P };
  abrirCapa(b, () => { P.rep = null; });
}
function terminarRepeticion() {
  if (!repeticionPrev) { if (G.P) G.P.fase = 'fin'; return; }
  const { b, P } = repeticionPrev; P.fase = 'fin'; repeticionPrev = null; cerrarCapa(b); b.remove(); P.rep = null; G.hud.mostrar(true);
  const res = P.res; if (res) panelResultados(res, { repeticion: () => verRepeticion(P), menu: salirAlMenu, otra: P.mp ? null : () => iniciarSP(P.modo) }); else salirAlMenu();
}

/* ---------- pausa ---------- */
G.pausar = () => {
  if (!enPartida || hayModal() || ajustesAbiertos || (window.Lobby && window.Lobby.abierto)) return;
  const P = G.P; if (!P.mp) { G.pausado = true; guardarSP(); } G.I.liberar();
  const b = (t, f, c) => h('button', { type: 'button', cls: 'btn ' + (c || ''), 'data-f': 1, txt: t, on: { click: f } });
  const m = modal('Pausa', [P.mp ? h('p', { cls: 'nota', txt: 'En multijugador la partida sigue mientras el menú está abierto.' }) : null, h('div', { cls: 'lista-menu' }, [
    b('Continuar', () => m.cerrar(), 'grande inicial'), b('Ajustes', abrirAjustesUI, 'sec'), b('Cómo jugar', panelAyuda, 'sec'), b('Pantalla completa', pantallaCompleta, 'sec'),
    P.modo === 'creativo' ? b('Borrar todas las construcciones', () => { G.W.constr.limpiar(); m.cerrar(); }, 'sec') : null,
    b('Abandonar partida', () => { if (confirm('¿Abandonar la partida?')) { m.cerrar(); if (!P.mp && !P.contab && P.modo !== 'creativo') { P.est.elims; } salirAlMenu(); } }, 'peligro')])], { alCerrar: () => { G.pausado = false; } });
};
G.I.alSoltarPuntero = () => { if (enPartida && !G.hud.ed.abierta && !hayModal() && !G.I.sinBloqueo) { if (G.hud.emotesAbiertos || G.hud.mapaAbierto) return; setTimeout(() => { if (!document.pointerLockElement && enPartida && !hayModal() && G.I.tipo === 'teclado') G.pausar(); }, 60); } };

/* ---------- multijugador ---------- */
const OPTS = {
  juego: 'Isla Final', maxJugadores: 4, modos: [{ id: 'solitario', nombre: 'Solitario (todos contra todos)' }, { id: 'duos', nombre: 'Dúos (equipos de 2)' }, { id: 'creativo', nombre: 'Creativo (construir juntos)' }],
  alIniciar(config, jug) {
    const R = window.Red;
    if (R.esAnfitrion) { const c = { dif: G.prog.pref.dif, total: G.prog.pref.total, t0: R.reloj() + 4500 }; R.difundir('cfg', c); arrancarMP(config, jug, c); }
    else { esperaMP = { config, jug }; if (cfgMP) { arrancarMP(config, jug, cfgMP); } }
  }
};
function arrancarMP(config, jug, c) {
  esperaMP = null; cfgMP = null;
  empezar({ modo: config.modo, dif: c.dif, total: c.total, semilla: config.semilla, jugadores: jug.map((j) => ({ id: j.id, nombre: j.nombre, color: j.color })), miId: window.Red.miId, mp: true, t0: c.t0 });
}
if (window.Red) {
  window.Red.on('mensaje', (tipo, d, de) => { if (tipo === 'cfg') { if (esperaMP) arrancarMP(esperaMP.config, esperaMP.jug, d); else cfgMP = d; } else if (G.P && G.P.mp) recibir(tipo, d, de); });
  window.Red.on('jugadorSalio', (id) => { const e = G.porId && G.porId['h' + id]; if (G.P && G.P.mp && e && e.vivo) { e.vivo = false; G.hud.baja(e.nombre + ' se desconectó'); chequearFin(); } });
  window.Red.on('cerrado', () => { if (G.P && G.P.mp && enPartida) { PR.aviso('Se cerró la sala'); salirAlMenu(); } });
}
if (window.Lobby && window.Lobby.registrar) window.Lobby.registrar(OPTS);

/* ---------- bucle ---------- */
function frame(now) {
  requestAnimationFrame(frame);
  const lim = aj.fps > 0 ? 1000 / aj.fps - 1.5 : 0, dtms = now - ultFrame; if (lim && dtms < lim) return; ultFrame = now;
  const dt = Math.min(0.05, dtms / 1000), M = window.Mando, lobby = window.Lobby && window.Lobby.abierto;
  if (!lobby && M) M.leer();
  const modalAbierto = hayModal() || ajustesAbiertos > 0 || lobby || !!capaActiva() || menu.hidden === false;
  if (!lobby && M && capaActiva()) navTick(M);
  if (enPartida && G.P) {
    const P = G.P;
    if (P.fase === 'replay' && P.rep) { if (M && (M.pulsado('A') || M.pulsado('B'))) P.rep = null; const fin = actualizarRepeticion(dt); if (fin) P.rep = null; }
    else if (P.fase === 'replay') terminarRepeticion();
    else if (!G.pausado) {
      G.I.activa = !modalAbierto;
      G.I.leer(dt); actualizarJugador(dt); actualizarPartida(dt);
      G.pers.dibujar(G.ents, G.camara.position, Math.min(aj.dist, 420), now / 1000);
      if (P.tormEst && P.tormEst.fase >= 4 && G.yo.vivo) PR.dar('ultimo_circulo');
      G.hud.actualizar(datosHud(aj.verFps ? Math.round(fpsAcum.v) + ' FPS' : ''));
    } else { G.pers.dibujar(G.ents, G.camara.position, Math.min(aj.dist, 420), now / 1000); }
  }
  if (enPartida || !menu.hidden) G.render.render(G.escena, G.camara);
  /* fps y bajada automatica */
  fpsAcum.n++; fpsAcum.t += dtms; if (fpsAcum.t >= 1000) { fpsAcum.v = fpsAcum.n * 1000 / fpsAcum.t; fpsAcum.n = 0; fpsAcum.t = 0; if (enPartida && !G.pausado && aj.autoBajar && !document.hidden) { if (fpsAcum.v < 26) { if (++fpsAcum.malos >= 3) { fpsAcum.malos = 0; bajarCalidad(); } } else fpsAcum.malos = 0; } }
}
function bajarCalidad() {
  if (aj.pr > 0.55) aj.pr = Math.max(0.5, +(aj.pr - 0.15).toFixed(2)); else if (aj.sombras > 0) aj.sombras = 0; else if (aj.dist > 200) aj.dist = Math.max(150, aj.dist - 60); else return;
  aj.calidad = 'personalizado'; aplicarCalidad(aj); guardarAjustes(aj); if (G.hud) G.hud.mensaje('Calidad reducida automáticamente para mantener la fluidez', 2500);
}
addEventListener('resize', redimensionar); addEventListener('orientationchange', () => setTimeout(redimensionar, 200));
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (G.P && !G.P.mp) guardarSP(); } else if (enPartida) pedirWake(); });
addEventListener('pagehide', () => { if (G.P && !G.P.mp) guardarSP(); try { if (window.Red && window.Red.conectado) window.Red.salir(); } catch (e) { /* sin red */ } });
document.addEventListener('pointerdown', () => Son.iniciar(), { once: true });
document.addEventListener('keydown', () => Son.iniciar(), { once: true });

/* ---------- arranque ---------- */
(async function arrancar() {
  const C = window.Cuenta;
  if (C && C.requerir) { try { await C.requerir(); } catch (e) { /* sin plataforma: jugamos como invitado */ } }
  CI.aplicarPerfil(); CI.iniciarNube(() => { G.prog = Object.assign(G.prog, cargarProgreso()); pintarMenu(); });
  PR_guardar(); CI.sincronizarLogros(G.prog.logros);
  abrirCapa(menu, null); redimensionar(); pintarMenu(); menu.hidden = false; requestAnimationFrame(frame);
  if (window.Lobby && window.Lobby.hayEnlace && window.Lobby.hayEnlace()) window.Lobby.abrir(OPTS);
})();
window.__isla = { G, empezar, iniciarSP, actualizarPartida, actualizarJugador, datosHud, salirAlMenu };
