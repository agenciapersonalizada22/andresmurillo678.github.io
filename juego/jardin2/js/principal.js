// Flujo principal: arranque, partidas, resultados, progreso, logros y cuenta.
import { h, $, toast, fmt } from './dom.js';
import { P, MUNDOS, IDS_P, NIV_POR_MUNDO } from './datos.js';
import { AJ, PR, cargarAjustes, cargarProgreso, guardarProgreso, guardarPartida, leerPartida, borrarPartida, estrellasTotal, nHechos, plantasLibres, hechosMundo, estrellasMundo, guardarAjustes } from './almacen.js';
import { nivelPorId, nivelAventura, nivelDiario, nivelArena, nivelSinFin, arenaSemillas, diaDe, semanaDe, puntosArena, valorArena, MEJORAS_PISO } from './niveles.js';
import { iniciarPartida } from './juego.js';
import * as M from './motor.js';
import * as S from './sonido.js';
import * as CJ from './cuenta-jardin.js';
import { LOGROS, MAPA, evaluar } from './logros.js';
import { colCompleta } from './misiones.js';
import { recompensaNivel, estrellasNivel } from './economia.js';
import { App } from './app.js';
import * as U from './ui.js';
import * as U2 from './ui2.js';
import * as UA from './ui-ajustes.js';

cargarAjustes(); cargarProgreso();
S.Son.vol = { ...AJ.audio };
const aplicarCss = () => { document.documentElement.style.setProperty('--ts', String(AJ.accesibilidad.texto)); document.body.classList.toggle('contraste', !!AJ.accesibilidad.contraste); document.body.dataset.dalt = AJ.accesibilidad.dalt; };
aplicarCss(); U.iniciarUI(); U.iniciarNavMando();
let juego = null, meta = null, gen = 0;
App.ui2 = U2; App.ajustes = UA.ajustes;
App.aplicarAjustes = () => { S.Son.vol = { ...AJ.audio }; S.aplicar(); aplicarCss(); if (juego) juego.refrescar(); };
App.velocidad = () => { if (juego) juego.refrescar(); };
App.tras = () => { cargarProgreso(); U.refrescar(); };
App.preparaSinFin = () => U.preparar(nivelSinFin(1, 1), { modo: 'sinfin', alJugar: (sem) => empezarSinFin(sem) });
const menu = () => { U.cerrarTodo(); U.mostrar(U.menuPrincipal); };
function limpiar() { if (juego) { juego.destruir(); juego = null; } document.body.classList.remove('jugando'); $('#lienzo').style.display = 'none'; }

/* ---------- configuracion del motor ---------- */
function cfgMotor(niv, semillas, op) {
  const dif = AJ.juego.dif, arena = op.modo === 'arena', tn = PR.tienda;
  const c = { niv, seed: op.seed || (Math.random() * 1e9) >>> 0, semillas: niv.cintaPool ? [] : semillas, dif, tienda: { energia1: tn.energia1 || 0, chispas: tn.chispas || 0, recarga: tn.recarga || 0, pulso: tn.pulso || 0 }, potenc: arena ? {} : { ...PR.potenc }, arena };
  if (arena) c.tienda = {}; if (AJ.juego.adaptativa && op.modo === 'aventura') c.hpMult = Math.max(0.7, 1 - 0.1 * (PR.derrotas[niv.id] || 0));
  if (op.run) Object.assign(c, op.run.buffs);
  if (AJ.accesibilidad.autoSol) c.auto = true;
  return c;
}
function lanzar(niv, semillas, op) {
  op = op || {}; limpiar(); gen++; const miGen = gen; U.cerrarTodo(); U.fondoMenu(false);
  meta = { niv, semillas, op: { modo: op.modo || 'aventura', run: op.run || null, seed: op.seed || null } };
  document.body.classList.add('jugando'); $('#lienzo').style.display = 'block'; S.iniciar(); S.aplicar();
  const cfg = op.restaurar ? null : cfgMotor(niv, semillas, meta.op);
  if (cfg && meta.op.modo === 'arena') { cfg.seed = semanaDe() * 7 + 1; meta.op.seed = cfg.seed; }
  juego = iniciarPartida(cfg, { modo: meta.op.modo, restaurar: op.restaurar, poderes: meta.op.modo !== 'arena' }, {
    alPausa: () => { if (!juego || juego.pausado || juego.s.fin) return; juego.pausar(true); U.mostrar(() => U.pausa({ titulo: niv.nombre })); },
    bloqueado: () => U.hayPantalla() || (window.Lobby && window.Lobby.abierto),
    guardar: (txt) => { if (miGen === gen) guardarPartida({ valida: true, nombre: niv.nombre, meta, estado: txt, t: Date.now() }); },
    alFin: (s) => { if (miGen === gen) fin(s); },
  });
}
App.jugar = lanzar;
App.continuar = () => { const pa = leerPartida(); if (!pa || !pa.estado || !pa.meta) { borrarPartida(); return; } U.cerrarTodo(); lanzar(pa.meta.niv, pa.meta.semillas, { ...pa.meta.op, restaurar: pa.estado, run: pa.meta.op.run }); };
App.reanudar = () => { if (juego) juego.reanudar(); };
App.reiniciar = () => { const m = meta; borrarPartida(); if (!m) return; const niv = nivelPorId(m.niv.id) || m.niv; lanzar(niv, m.semillas, { ...m.op }); };
App.salirAlMenu = () => { if (juego && !juego.s.fin) guardarPartida({ valida: true, nombre: meta.niv.nombre, meta, estado: juego.serializar(), t: Date.now() }); guardarProgreso(true); limpiar(); S.musica('menu'); U.fondoMenu(true); menu(); };

/* ---------- sin fin ---------- */
function empezarSinFin(semillas) { PR.sinfin.runs++; guardarProgreso(); const run = { seed: (Math.random() * 1e6) >>> 0, piso: 1, buffs: {}, semillas }; pisoSinFin(run); }
function pisoSinFin(run) { const niv = nivelSinFin(run.piso, run.seed); lanzar(niv, run.semillas, { modo: 'sinfin', run, seed: run.seed + run.piso }); }

/* ---------- fin de partida ---------- */
function plantasNuevasDespues(antes) { return plantasLibres().filter((id) => !antes.includes(id)); }
function contexto() { return { estrellas: estrellasTotal(), plantasN: plantasLibres().length, mundoCompleto: (m) => !!PR.llaves[m], colecciones: MUNDOS.filter((_, m) => colCompleta(PR.col, m)).length }; }
function darLogros() { const nuevos = evaluar(PR, contexto()).filter((id) => !PR.logros[id] && MAPA[id]); nuevos.forEach((id) => { PR.logros[id] = 1; CJ.logro(id); toast('🏆 ' + MAPA[id].nombre, 3000); }); return nuevos.map((id) => MAPA[id].nombre); }
function fin(s) {
  const niv = meta.niv, op = meta.op, ok = s.fin === 'victoria', st = s.st, run = op.run; borrarPartida();
  const antes = plantasLibres(); const lineas = [], botones = []; let titulo = '', estrellas = null, mon = s.bol.mon, gem = s.bol.gem;
  const S_ = PR.stats; S_.plantadas += st.plantadas; S_.matados += st.matados; S_.soles += st.soles; S_.energias += st.energias; S_.poderes += 0; S_.pinatas += st.pinatas; S_.tumbas += st.tumbas; S_.mejoras += st.mejoras; S_.brill += st.brill; S_.tiempo += Math.round(s.t);
  s.bol.col.forEach((c) => { if (!PR.col[c]) PR.col[c] = 1; }); if (s.bol.col.length) lineas.push('🪅 Piezas de colección: ' + s.bol.col.length);
  let xp = 6; const delta = { matados: st.matados, plantadas: st.plantadas, energias: st.energias, soles: st.soles, pinatas: st.pinatas, brill: st.brill, mejoras: st.mejoras, tumbas: st.tumbas, victorias: ok ? 1 : 0 };
  const jefe = niv.tipo === 'jefe' || (niv.olas || []).some((o) => o.z && s.zombis && false);
  if (op.modo === 'aventura') {
    if (ok) {
      S_.victorias++; const id = niv.id, prev = PR.hechos[id]; estrellas = estrellasNivel(st, st.pulsos); const r = recompensaNivel(niv, true, estrellas, !prev, AJ.juego.dif); mon += r.mon; gem += r.gem; PR.derrotas[id] = 0;
      PR.hechos[id] = { e: Math.max(prev ? prev.e : 0, estrellas), t: prev && prev.t ? Math.min(prev.t, Math.round(s.t)) : Math.round(s.t) };
      if (niv.tipo === 'jefe') { S_.jefes++; if (!PR.llaves[niv.mundo]) { PR.llaves[niv.mundo] = 1; lineas.push('🔑 ¡Llave del mundo conseguida!'); } }
      titulo = niv.tipo === 'jefe' ? '¡Jefe derrotado!' : '¡Nivel superado!'; xp = 15 + estrellas * 8; if (st.pulsos === 0) delta.sinPulso = 1;
      const sig = niv.n < NIV_POR_MUNDO ? nivelAventura(niv.mundo, niv.n + 1) : null;
      if (sig) botones.push({ txt: 'Siguiente nivel', fn: () => { U.cerrarTodo(); U.mostrar(() => U.preparar(sig, { modo: 'aventura' })); }, cls: 'grande verde' });
      else if (niv.mundo < MUNDOS.length - 1) botones.push({ txt: 'Siguiente época', fn: () => { U.cerrarTodo(); U.mostrar(U.mapa); }, cls: 'grande verde' });
    } else { S_.derrotas++; PR.derrotas[niv.id] = (PR.derrotas[niv.id] || 0) + 1; titulo = '¡Los zombis se comieron tu cerebro!'; mon = Math.round(mon * 0.6); }
    lineas.unshift(`Zombis derrotados: ${st.matados}`, `+${mon} 🪙${gem ? ' +' + gem + ' 💎' : ''}`);
    botones.push({ txt: ok ? 'Repetir' : 'Reintentar', fn: () => { U.cerrarTodo(); U.mostrar(() => U.preparar(nivelPorId(niv.id) || niv, { modo: 'aventura', semillas: meta.semillas })); }, cls: '' });
  } else if (op.modo === 'diario') {
    const dia = niv.diario; const primera = !(PR.diario.dia === dia && PR.diario.hecho);
    if (ok && primera) { PR.diario.racha = PR.diario.ultimo === dia - 1 ? PR.diario.racha + 1 : 1; PR.diario.ultimo = dia; PR.diario.dia = dia; PR.diario.hecho = true; mon += 150; gem += 3 + Math.min(5, PR.diario.racha) - 1; lineas.push(`🔥 Racha: ${PR.diario.racha} día(s)`); }
    titulo = ok ? '¡Evento diario completado!' : 'Evento fallido'; lineas.unshift(`Zombis derrotados: ${st.matados}`, `+${mon} 🪙${gem ? ' +' + gem + ' 💎' : ''}`); xp = ok ? 25 : 6;
    botones.push({ txt: 'Menú', fn: menu, cls: 'grande' });
  } else if (op.modo === 'arena') {
    const sem = niv.arena, vivas = s.plantas.length, pts = puntosArena(st, s.t, vivas, ok);
    if (PR.arena.semana !== sem) PR.arena = { semana: sem, mejor: 0, intentos: 0 }; PR.arena.intentos++; PR.arena.mejor = Math.max(PR.arena.mejor, pts);
    CJ.enviarPuntaje('arena', valorArena(sem, PR.arena.mejor), 99999999); mon += 40 + Math.round(pts / 20); titulo = ok ? '¡Arena superada!' : 'Arena terminada'; lineas.unshift(`Puntos: ${fmt(pts)}`, `Tu mejor de la semana: ${fmt(PR.arena.mejor)}`, `+${mon} 🪙`); xp = 20 + Math.round(pts / 200);
    botones.push({ txt: 'Intentar de nuevo', fn: () => { U.cerrarTodo(); U.mostrar(() => U2.arena()); }, cls: 'grande verde' }, { txt: 'Menú', fn: menu });
  } else if (op.modo === 'sinfin') {
    if (ok) {
      const piso = run.piso; PR.sinfin.mejor = Math.max(PR.sinfin.mejor, piso); mon += 15 + piso * 5; gem += (piso % 5 === 0 ? 2 : 0) + (piso % 10 === 0 ? 4 : 0); CJ.enviarPuntaje('sinfin', PR.sinfin.mejor, 100); xp = 10 + piso * 2;
      titulo = `¡Piso ${piso} superado!`; lineas.unshift(`Zombis derrotados: ${st.matados}`, `+${mon} 🪙${gem ? ' +' + gem + ' 💎' : ''}`);
      const opciones = [...MEJORAS_PISO].sort(() => Math.random() - 0.5).slice(0, 3);
      botones.push({ txt: 'Siguiente piso →', fn: () => { U.cerrarTodo(); U.mostrar(() => U2.eligeMejora(opciones, (o) => { o.f(run.buffs); run.piso++; pisoSinFin(run); }, `Piso ${piso} superado: elige una mejora`)); }, cls: 'grande verde' }, { txt: 'Retirarme con el botín', fn: menu });
    } else {
      mon = Math.round(mon * 0.5); titulo = `Caíste en el piso ${run.piso}`; lineas.unshift(`Mejor piso: ${PR.sinfin.mejor}`, `+${mon} 🪙`); xp = 8; botones.push({ txt: 'Nueva carrera', fn: () => { U.cerrarTodo(); U.mostrar(() => U2.sinfin()); }, cls: 'grande verde' }, { txt: 'Menú', fn: menu });
    }
  } else { botones.push({ txt: 'Menú', fn: menu }); }
  PR.monedas += mon; PR.ganadas += mon; PR.gemas += gem; U2.sumarProgreso(delta);
  const logros = darLogros(); const nuevas = plantasNuevasDespues(antes);
  CJ.enviarPuntaje('estrellas', estrellasTotal(), 360); CJ.xp(xp); guardarProgreso(true);
  limpiar(); U.fondoMenu(true); S.musica('menu'); void jefe;
  if (!botones.some((b) => b.txt === 'Menú' || b.txt === 'Retirarme con el botín')) botones.push({ txt: 'Menú', fn: menu });
  U.mostrar(() => U.resultado({ victoria: ok, titulo, lineas, estrellas, nuevas, logros, botones }));
}

/* ---------- arranque ---------- */
addEventListener('pointerdown', () => S.iniciar(), { once: true }); addEventListener('keydown', () => S.iniciar(), { once: true });
const bFS = $('#bPantalla'); if (bFS) bFS.addEventListener('click', () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { /* sin pantalla completa */ } });
const aviso = $('#avisoGiro'); if (aviso) aviso.querySelector('button').addEventListener('click', () => aviso.classList.add('cerrado'));
let wl = null; const pedirWL = () => { try { if (navigator.wakeLock && !document.hidden) navigator.wakeLock.request('screen').then((w) => { wl = w; }).catch(() => {}); } catch (e) { /* sin wake lock */ } }; pedirWL(); document.addEventListener('visibilitychange', () => { S.pausarAudio(document.hidden); if (!document.hidden) { S.aplicar(); if (!wl || wl.released) pedirWL(); } });
CJ.aplicarPerfil(); CJ.iniciarNube(() => { cargarProgreso(); if (!juego) U.refrescar(); });
window.__j2 = { M, juego: () => juego, PR: () => PR, AJ, App, U, S, lanzar, nivelAventura, nivelPorId };
U.mostrar(U.menuPrincipal);
