// Flujo principal: arranque, partidas, resultados, progreso, logros y cuenta.
import { h, $, toast, fmt } from './dom.js';
import { P, Z, DESBLOQUEO, IDS_P } from './datos.js';
import { AJ, PR, cargarAjustes, cargarProgreso, guardarProgreso, guardarPartida, leerPartida, borrarPartida, completados, estrellasTotal, guardarAjustes } from './almacen.js';
import { nivelPorId, nivelAventura, zombisDe } from './niveles.js';
import { iniciarPartida } from './juego.js';
import * as S from './sonido.js';
import * as CJ from './cuenta-jardin.js';
import { LOGROS, MAPA, evaluar } from './logros.js';
import { App } from './app.js';
import * as U from './ui.js';
import * as U2 from './ui2.js';
import * as UA from './ui-ajustes.js';

cargarAjustes(); cargarProgreso();
S.Son.vol = { ...AJ.audio };
document.documentElement.style.setProperty('--ts', AJ.accesibilidad.texto);
U.iniciarUI(); U.iniciarNavMando();
let juego = null, cfgActual = null, gen = 0;
const lienzo = $('#lienzo');

function aplicarAjustes() { S.Son.vol = { ...AJ.audio }; S.aplicar(); document.documentElement.style.setProperty('--ts', AJ.accesibilidad.texto); if (juego) juego.refrescar(); }
App.aplicarAjustes = aplicarAjustes;
App.velocidad = (v) => { if (juego) juego.setVel(v); };
App.tras = () => { U.refrescar(); };
App.ajustes = () => UA.ajustes(); App.tienda = () => U2.tienda(); App.almanaque = () => U2.almanaque(); App.misiones = () => U2.misiones(); App.ranking = () => U2.ranking(); App.zen = () => U2.zen();
App.esSurv = () => !!(cfgActual && cfgActual.nivel.infinito);
App.limpiarJuego = () => { if (juego) { juego.destruir(); juego = null; } document.body.classList.remove('jugando'); lienzo.style.display = 'none'; };
App.logroExtra = (id) => darLogro([id]);
App.juegoActivo = () => !!juego;

function darLogro(ids) {
  const nuevos = ids.filter((id) => !PR.logros[id] && MAPA[id]); nuevos.forEach((id) => { PR.logros[id] = 1; CJ.logro(id); toast('🏆 Logro: ' + MAPA[id].nombre, 3000); });
  if (nuevos.length) guardarProgreso(); return nuevos.map((id) => MAPA[id].nombre);
}
function evaluarLogros() { return darLogro(evaluar(PR, { estrellas: estrellasTotal(), plantasN: IDS_P.filter((id) => id === 'dispa' || Object.values(DESBLOQUEO).includes(id)).filter((id) => id === 'dispa' || [...completados()].some((i) => DESBLOQUEO[i] === id)).length, plantasTotal: IDS_P.length, dalt: AJ.accesibilidad.dalt })); }

function lanzar(cfg) {
  App.limpiarJuego(); gen++; cfgActual = cfg; U.cerrarTodo(); U.fondoMenu(false);
  document.body.classList.add('jugando'); lienzo.style.display = 'block'; S.iniciar(); S.aplicar();
  const niv = cfg.nivel; S.musica(niv.tipo === 'jefe' ? 'jefe' : niv.fondo || 'dia');
  const miGen = gen;
  juego = iniciarPartida(lienzo, { nivel: niv, semillas: cfg.semillas, dif: cfg.dif || AJ.juego.dif, tienda: PR.tienda, tutorial: cfg.tutorial, restaurar: cfg.restaurar, seed: cfg.seed }, {
    pausar: () => { if (!juego || juego.pausada) return; juego.pausar(true); U.pantallaPausa(); },
    bloqueado: () => U.hayPantalla() || (window.Lobby && window.Lobby.abierto),
    guardar: (txt) => { if (miGen !== gen) return; guardarPartida({ id: niv.id, dif: cfg.dif || AJ.juego.dif, semillas: cfg.semillas, estado: txt, t: Date.now() }); },
    fin: (res) => { if (miGen === gen) procesarFin(res); },
    evento: (k) => { if (k === 'hipno') { PR.tut.hipno = 1; darLogro(['hipnosis']); } },
    ocultar: () => { if (juego && !juego.pausada && !juego.s.fin) { juego.pausar(true); U.pantallaPausa(); } },
    bajarCalidad: () => { const o = ['ultra', 'alta', 'media', 'baja']; const i = o.indexOf(AJ.graficos.calidad); if (i >= 0 && i < 3) { AJ.graficos.calidad = o[i + 1]; guardarAjustes(); juego.refrescar(); toast('Rendimiento bajo: calidad ' + o[i + 1]); } },
  });
  juego.setVel(AJ.juego.vel || 1);
}
App.jugar = lanzar;
App.continuar = () => { const pa = leerPartida(); if (!pa) return; const niv = nivelPorId(pa.id); if (!niv) { borrarPartida(); U.menuPrincipal(); return; } lanzar({ nivel: niv, semillas: pa.semillas || [], dif: pa.dif, restaurar: pa.estado }); };
App.reanudar = () => { U.cerrarTodo(); if (juego) juego.pausar(false); };
App.reiniciar = () => { const c = cfgActual; borrarPartida(); lanzar({ nivel: nivelPorId(c.nivel.id) || c.nivel, semillas: c.semillas, dif: c.dif, tutorial: false }); };
App.guardarYSalir = () => { if (juego && !juego.s.fin) guardarPartida({ id: cfgActual.nivel.id, dif: cfgActual.dif || AJ.juego.dif, semillas: cfgActual.semillas, estado: juego.serializar(), t: Date.now() }); S.pausarAudio(false); S.musica('menu'); App.limpiarJuego(); U.menuPrincipal(); };
App.terminarSurv = () => { U.cerrarTodo(); if (juego) { juego.pausar(false); juego.terminarAhora(); } };
App.menu = () => { App.limpiarJuego(); U.menuPrincipal(); };

function procesarFin(res) {
  const niv = cfgActual.nivel, st = PR.stats, ok = res.fin === 'victoria';
  borrarPartida();
  st.plantadas += res.stats.plantadas; st.matados += res.stats.matados; st.soles += res.stats.soles; st.tiempo += Math.round(res.t); st.jarrones += res.stats.jarrones;
  zombisDe(niv).forEach((z) => { PR.vistosZ[z] = 1; });
  const gan = Math.round(res.monedas); PR.monedas += gan; PR.ganadas += gan;
  const lineas = [], botones = []; let titulo = '', estrellas = null, planta = null, victoria = ok; let xp = 8;
  if (niv.tipo === 'versus') {
    const g = res.fin === 'plantas' ? 0 : 1; PR.versus[g]++; st.versus++; victoria = true; titulo = g === 0 ? '¡Ganan las plantas! (Jugador 1)' : '¡Ganan los zombis! (Jugador 2)'; lineas.push('Marcador: ' + PR.versus[0] + ' - ' + PR.versus[1]);
    botones.push(['Revancha', () => lanzar({ nivel: nivelPorId('versus'), semillas: [], dif: 'normal' }), 'primario', 'revancha'], ['Menú', () => App.menu(), '', 'menu']);
  } else if (niv.infinito) {
    const sc = res.puntajeSurv; const id = niv.id; PR.surv[id] = Math.max(PR.surv[id] || 0, sc); st.mejorSurv = Math.max(st.mejorSurv, sc); if (niv.duro) PR.mejorDuro = Math.max(PR.mejorDuro | 0, sc);
    const mon = sc * 4; PR.monedas += mon; PR.ganadas += mon; victoria = false; titulo = 'Aguantaste ' + sc + ' oleadas'; lineas.push('Mejor en este escenario: ' + PR.surv[id], '+' + (mon + gan) + ' monedas'); xp = 10 + sc * 2;
    CJ.enviarPuntaje(niv.duro ? 'oleadas_duro' : 'oleadas', sc, 500);
    botones.push(['Otra vez', () => lanzar({ nivel: nivelPorId(id), semillas: cfgActual.semillas, dif: cfgActual.dif }), 'primario', 'otra'], ['Menú', () => App.menu(), '', 'menu']);
  } else if (ok) {
    st.victorias++; const id = niv.id; let bonus = 0;
    if (niv.tipo === 'puzzle') { PR.puzzle[id] = 1; bonus = 25; st.minis++; titulo = '¡Rompecabezas resuelto!'; }
    else if (niv.tipo === 'jarros' && !/^\d/.test(id)) { PR.jarros[id] = 1; bonus = 25; st.minis++; titulo = '¡Jarrones rotos!'; }
    else {
      const prev = PR.hechos[id]; estrellas = 1 + (res.cortadoras === 0 ? 1 : 0) + (res.perdidas <= 4 ? 1 : 0); bonus = prev ? 10 : 30 + niv.i; if ((cfgActual.dif || AJ.juego.dif) === 'desafiante') bonus = Math.round(bonus * 1.5);
      PR.hechos[id] = { e: Math.max(prev ? prev.e : 0, estrellas), t: prev && prev.t ? Math.min(prev.t, Math.round(res.t)) : Math.round(res.t) };
      if (res.cortadoras === 0) st.sinCort++; if (['cinta', 'bolera', 'tumbas', 'carrera', 'jarros'].includes(niv.mini)) st.minis++;
      const nuevo = DESBLOQUEO[niv.i]; if (nuevo && !prev) planta = nuevo;
      titulo = niv.mini === 'jefe' && niv.mundo === 5 ? '¡Doctor Moho derrotado!' : '¡Nivel superado!'; xp = 15 + estrellas * 8;
    }
    PR.monedas += bonus; PR.ganadas += bonus; lineas.push('Zombis derrotados: ' + res.stats.matados, '+' + (bonus + gan) + ' monedas');
    const sig = niv.mundo && niv.num ? (niv.num < 10 ? nivelAventura(niv.mundo, niv.num + 1) : niv.mundo < 5 ? nivelAventura(niv.mundo + 1, 1) : null) : null;
    if (sig) botones.push(['Siguiente nivel', () => U.previo(sig), 'primario', 'siguiente']);
    botones.push(['Repetir', () => U.previo(nivelPorId(id) || niv), '', 'repetir'], ['Menú', () => App.menu(), '', 'menu']);
  } else {
    st.derrotas++; titulo = '¡Los zombis se comieron tu cerebro!'; lineas.push('Zombis derrotados: ' + res.stats.matados + (gan ? ' · +' + gan + ' monedas' : ''));
    botones.push(['Reintentar', () => lanzar({ nivel: nivelPorId(niv.id) || niv, semillas: cfgActual.semillas, dif: cfgActual.dif }), 'primario', 'reintentar'], ['Menú', () => App.menu(), '', 'menu']);
  }
  const logros = evaluarLogros();
  CJ.enviarPuntaje('estrellas', estrellasTotal(), 400); CJ.enviarPuntaje('monedas', PR.ganadas, 1000000); CJ.xp(xp);
  guardarProgreso(true);
  U.fondoMenu(true); S.musica('menu');
  U.pantallaFin({ victoria, titulo, lineas, estrellas, planta, logros, botones });
}

/* ---------- arranque ---------- */
addEventListener('pointerdown', () => S.iniciar(), { once: true });
addEventListener('keydown', () => S.iniciar(), { once: true });
document.addEventListener('visibilitychange', () => { S.pausarAudio(document.hidden); if (!document.hidden) S.aplicar(); });
const bFS = $('#bPantalla'); if (bFS) bFS.addEventListener('click', () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { /* sin pantalla completa */ } });
const aviso = $('#avisoGiro'); if (aviso) aviso.querySelector('button').addEventListener('click', () => aviso.classList.add('cerrado'));
CJ.aplicarPerfil();
CJ.iniciarNube(() => { cargarProgreso(); if (!juego) U.refrescar(); });
window.__j1 = { juego: () => juego, PR: () => PR, AJ, App, U, S };
U.menuPrincipal();
