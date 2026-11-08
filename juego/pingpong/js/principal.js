// Orquestador: une Motor (fisica/reglas/bots), Escena (3D), Entrada (gestos/teclado/mando), UI, progreso, Cuenta y Online.
import { h, $, lim } from './dom.js';
import * as Alm from './almacen.js';
import * as Aju from './ajustes.js';
import * as Son from './sonido.js';
import { Escena } from './escena.js';
import { Entrada } from './entrada.js';
import { UI } from './ui.js';
import { Motor } from './motor.js';
import { C, aterrizaje } from './fisica.js';
import { statsPaleta } from './economia.js';
import { ESTILOS } from './bots.js';
import { RIVALES, crearTorneo, rondaActual, registrar as registrarTorneo, premioTorneo, rivalDe } from './torneo.js';
import { registrar, LOGROS } from './progreso.js';
import { motivoTexto } from './reglas.js';
import * as CuentaPP from './cuenta-pp.js';
import { crearOnline } from './red-pp.js';

const MIN_TEXTO = { ganar: 'Ganaste', perder: 'Perdiste' };
const App = window.__pp = {
  aj: Aju.cargar(), prog: Alm.cargarProgreso(), sonido: Son, motor: null, visor: null, pausado: false, modoAct: null, ultimaTabAjustes: 'gr',
  partidoPend: null, ult: 0, fpsAc: 0, fpsN: 0, fpsT: 0, marca: null, tMarca: 0, vib: 0, bajadas: 0,
  perfil: () => ({ nombre: CuentaPP.nombreJugador(), color: CuentaPP.colorJugador() }),
  toast: (t) => App.ui.toast(t),
  guardarAjustes: () => Aju.guardar(App.aj), guardarProg: () => Alm.guardarProgreso(App.prog)
};
const M = () => window.Mando;
const lobbyAbierto = () => !!(window.Lobby && window.Lobby.abierto);

/* ---------- ajustes ---------- */
App.aplicarAjustes = (guardar = true) => {
  const a = App.aj, r = document.documentElement;
  if (guardar) Aju.guardar(a);
  r.classList.toggle('texto-grande', !!a.ac.textoGrande); r.classList.toggle('reducir', !!a.ac.reducir);
  r.style.setProperty('--tam-btn', a.ct.tam); r.style.setProperty('--op-btn', a.ct.opacidad); document.body.classList.toggle('zurdo', !!a.ct.zurdo);
  Son.ajustar(a.au); if (!a.au.mudo && a.au.musica > 0) Son.iniciarMusica(); else Son.pararMusica();
  if (App.escena) App.escena.setCalidad(a);
  if (App.motor) { const on = App.motor.modo === 'online'; App.motor.vel = on ? 1 : a.ac.velocidad; App.motor.ayuda = on ? 1 : a.ct.ayuda; }
  App.ui && App.ui.pintarChips();
  const f = $('#fps'); if (f) f.hidden = !a.gr.mostrarFps;
};
App.importar = (o) => { if (o.ajustes) { App.aj = Aju.normalizar(o.ajustes); App.ui.cerrarTodo(); } if (o.progreso) { App.prog = Alm.normalizarProgreso(o.progreso); App.guardarProg(); } App.aplicarAjustes(true); App.ui.mostrarMenu(); };
App.borrarTodo = () => { [Alm.K.prog, Alm.K.ajustes, Alm.K.partida, Alm.K.tutorial].forEach(Alm.borrar); location.reload(); };
App.alEquipar = () => { App.escena.setEquipo(App.prog.equipo); App.guardarProg(); if (!App.ui.menu.hidden) $('#monedas').textContent = App.prog.monedas + ' monedas'; };
App.alComprar = (it) => { Son.moneda(); App.guardarProg(); App.escena.setEquipo(App.prog.equipo); App.toast('Desbloqueado: ' + it.nombre); finLogros(registrar(App.prog, { modo: 'tienda' }).logros); App.guardarProg(); };

/* ---------- vibracion ---------- */
const vibrar = (f, s, ms) => { const c = App.aj.ct; if (!c.vibracion) return; M().vibrar(f * c.vibInt, s * c.vibInt, ms); if (navigator.vibrate && !M().conectado && matchMedia('(pointer: coarse)').matches) try { navigator.vibrate(Math.min(30, ms / 3)); } catch (e) { /* sin vibracion */ } };

/* ---------- inicio de partidas ---------- */
const nombreCorto = (n) => (n || 'Jugador').slice(0, 12);
function colores(rival, dobles, extra) {
  const yo = App.perfil().color; return [yo, (rival && rival.color) || '#ff4fd8', dobles ? '#9aa9c9' : '#ffd23d', extra || '#ff9a5a'];
}
function empezar(op) {
  cerrarJuego(); App.modoAct = op; App.pausado = false; App.visor = null; App.escena.vista = 1;
  App.escena.setEquipo(App.prog.equipo); App.escena.setColores(op.cols || colores(op.rivalInfo, op.dobles));
  const online = op.motor.modo === 'online';
  App.motor = new Motor(Object.assign({ stats: statsPaleta(App.prog), ayuda: online ? 1 : App.aj.ct.ayuda, velocidad: online ? 1 : App.aj.ac.velocidad, onEvento: evt }, op.motor));
  App.ui.ocultarMenu(); App.ui.cerrarTodo(); App.ui.mostrarHud(true);
  App.ui.setNombres(op.nombres[0], op.nombres[1]); App.ui.hint(''); App.ui.info('');
  document.body.classList.toggle('modo-entreno', op.motor.modo === 'entreno' || op.motor.modo === 'reto');
  if (App.motor.partido) App.ui.setMarcador(App.motor.partido.estado(), textoJuego());
  else App.ui.setMarcador({ puntos: [0, 0], juegos: [0, 0] }, op.motor.modo === 'reto' ? 'Reto' : 'Entreno');
  App.ui.pintarChips(); pantallaWake(); Son.activar(); Son.iniciarMusica();
  App.motor.comenzar(); actualizarInfo();
  if (!Alm.leer(Alm.K.tutorial)) { Alm.escribir(Alm.K.tutorial, 1); App.pausado = true; App.ui.tutorial(() => { App.pausado = false; }); }
}
const textoJuego = () => { const p = App.motor.partido; return `Juego ${p.juegoNum}` + (p.enDeuce() ? ' · igualdad' : ''); };
const eligeRival = (estilo) => { const e = estilo === 'azar' || !ESTILOS[estilo] ? Object.keys(ESTILOS)[Math.floor(Math.random() * 5)] : estilo; const pool = RIVALES.filter((r) => r.estilo === e); return { rival: pool[Math.floor(Math.random() * pool.length)] || RIVALES[0], estilo: e }; };
App.iniciarLibre = (c) => {
  const { rival, estilo } = eligeRival(c.estilo), dobles = !!c.dobles, otro = eligeRival('azar').rival;
  empezar({ modo: 'libre', dif: c.dif, estilo, rivalInfo: rival, dobles, nombres: dobles ? ['Tú y compañero', rival.nombre + ' y ' + otro.nombre] : [nombreCorto(App.perfil().nombre), rival.nombre], cols: colores(rival, dobles, otro.color),
    motor: { modo: 'libre', cfg: { puntosJuego: c.puntos, mejorDe: c.mejorDe, dobles, inicio: Math.random() < 0.5 ? 0 : 1 }, rival: { dif: c.dif, estilo }, rivales: dobles ? { 2: { dif: 'normal', estilo: 'equilibrado' }, 3: { dif: c.dif, estilo: eligeRival('azar').estilo } } : undefined } });
};
App.nuevoTorneo = (tam, nivel) => { App.prog.torneo = crearTorneo(tam, nivel, Date.now()); App.guardarProg(); App.jugarRondaTorneo(); };
App.jugarRondaTorneo = () => {
  const t = App.prog.torneo, r = rondaActual(t); if (!r) return; const rival = rivalDe(r.rival);
  empezar({ modo: 'torneo', dif: r.dif, estilo: rival.estilo, rivalInfo: rival, dobles: false, torneo: true, nombres: [nombreCorto(App.perfil().nombre), rival.nombre],
    motor: { modo: 'torneo', cfg: { puntosJuego: 11, mejorDe: r.mejorDe, dobles: false, inicio: Math.random() < 0.5 ? 0 : 1 }, rival: { dif: r.dif, estilo: rival.estilo } } });
  App.ui.mensaje(r.nombre + ' vs ' + rival.nombre, '', 2200);
};
App.iniciarEntreno = (c) => empezar({ modo: 'entreno', nombres: [nombreCorto(App.perfil().nombre), 'Máquina'], motor: { modo: 'entreno', entreno: { cada: c.cada, velocidad: c.velocidad, efecto: c.efecto, lugar: c.lugar }, cfg: {} } });
App.iniciarReto = () => empezar({ modo: 'reto', rivalInfo: { color: '#ff6b4a' }, nombres: [nombreCorto(App.perfil().nombre), 'Robot'], motor: { modo: 'reto', rival: { dif: 'experto', estilo: 'equilibrado' }, vidas: 3, cfg: {} } });

/* ---------- guardado de partida en curso ---------- */
App.partidaGuardada = () => { const g = Alm.leer(Alm.K.partida); return g && g.partido && g.meta ? g : null; };
function guardarPartida() {
  const m = App.motor, op = App.modoAct; if (!m || !m.partido || m.fase === 'fin' || m.partido.fin || !op) return;
  Alm.escribir(Alm.K.partida, { modo: m.modo, online: m.modo === 'online', partido: m.partido.guardar(), t: Date.now(), meta: { dif: op.dif, estilo: op.estilo, rivalInfo: op.rivalInfo, dobles: op.dobles, torneo: !!op.torneo, nombres: op.nombres, cols: op.cols } });
}
App.estadoOnline = () => (App.motor && App.motor.partido ? App.motor.partido.guardar() : App.partidoPend);
App.continuar = () => {
  const g = App.partidaGuardada(); if (!g) return;
  if (g.online) { App.partidoPend = g.partido; App.ui.cerrarTodo(); App.abrirLobby(); App.toast('Invita a tu rival para continuar la partida online'); return; }
  const meta = g.meta, rv = meta.rivalInfo || RIVALES[0];
  empezar({ modo: g.modo, dif: meta.dif, estilo: meta.estilo, rivalInfo: rv, dobles: meta.dobles, torneo: meta.torneo, nombres: meta.nombres, cols: meta.cols,
    motor: { modo: g.modo, cfg: g.partido.cfg, partido: g.partido, rival: { dif: meta.dif, estilo: meta.estilo }, rivales: meta.dobles ? { 2: { dif: 'normal', estilo: 'equilibrado' }, 3: { dif: meta.dif, estilo: 'equilibrado' } } : undefined } });
  App.ui.mensaje('Partida reanudada', '', 1800);
};

/* ---------- eventos del motor ---------- */
function actualizarInfo() {
  const m = App.motor; if (!m) return;
  if (m.modo === 'entreno') App.ui.info(`Aciertos ${m.ent.aciertos} · Racha ${m.ent.racha} · Mejor ${m.ent.mejor}`);
  else if (m.modo === 'reto') App.ui.info(`Vidas ${'♥'.repeat(Math.max(0, m.reto.vidas))}${'♡'.repeat(Math.max(0, 3 - m.reto.vidas))} · Rally ${m.fase === 'juego' ? m.golpesPunto : 0} · Mejor ${m.reto.rallyMax}`);
  else App.ui.info(m.fase === 'juego' && m.golpesPunto >= 4 ? `Rally ${m.golpesPunto}` : '');
}
function evt(tipo, d) {
  const m = App.motor, e = App.escena, on = App.online;
  if (on.activo && on.host) enviarOnline(tipo, d);
  switch (tipo) {
    case 'golpe': Son.golpe(d.power == null ? 0.5 : d.power); e.anilloAire(m.bola.x, m.bola.y, m.bola.z, d.q > 0.75 ? '#7dff9a' : '#ffffff'); if (d.id === 0) { vibrar(0.3, 0.4, 70); App.ui.medidor(d.power == null ? 0.4 : d.power); } App.ui.hint(''); actualizarInfo(); break;
    case 'rebote': Son.bote(d.vy); e.anillo(d.x, d.z, '#ffffff'); break;
    case 'red': case 'cinta': Son.red(); break;
    case 'suelo': Son.suelo(); break;
    case 'let': App.ui.mensaje('Let: se repite el saque', '', 1500); break;
    case 'fallo': App.ui.mensaje('Fuera de alcance', 'mal', 700); break;
    case 'saque': {
      const eq = d.servidor % 2; App.ui.setSaca(eq);
      if (m.partido) App.ui.setMarcador(m.partido.estado(), textoJuego());
      if (m.servidorId === 0 || (on.activo && on.host && d.servidor === 0)) App.ui.hint(m.partido && m.partido.cfg.dobles ? 'Tu saque: desliza hacia arriba (en diagonal)' : 'Tu saque: desliza hacia arriba'); else App.ui.hint('');
      if (m.modo === 'entreno') App.ui.hint('');
      actualizarInfo(); break;
    }
    case 'maquina': actualizarInfo(); break;
    case 'punto': puntoEvt(d); break;
    case 'fin': if (d.modo === 'reto') finReto(); else finPartido(d); break;
  }
}
function puntoEvt(d) {
  const m = App.motor; actualizarInfo();
  if (m.modo === 'entreno') { App.ui.mensaje(d.acierto ? 'Bien' : 'Fallaste', d.acierto ? 'bien' : 'mal', 900); Son.punto(d.acierto); return; }
  if (m.modo === 'reto') { App.ui.mensaje(d.ladoGanador === 1 ? `Rally de ${d.golpes} golpes` : `Fallaste · ${d.golpes} golpes`, d.ladoGanador === 1 ? 'bien' : 'mal', 1400); Son.punto(d.ladoGanador === 1); if (d.ladoGanador === -1) vibrar(0.6, 0.3, 200); return; }
  const res = d.res, mia = res.equipo === 0;
  Son.punto(mia); if (!mia) vibrar(0.5, 0.2, 180);
  App.ui.setMarcador(m.partido.estado(), res.finJuego && !res.finPartido ? `Juego ${m.partido.juegoNum - 1} terminado` : textoJuego());
  let t = motivoTexto(res); if (res.golpes >= 12) t += ` · rally de ${res.golpes}`;
  if (res.finJuego && !res.finPartido) { t = `Juego ${mia ? 'tuyo' : 'rival'} · ${t}`; Son.juegoGanado(); }
  if (res.cambioLado) t += ' · cambio de lado';
  App.ui.mensaje(t, mia ? 'bien' : 'mal', 2100);
  guardarPartida();
}
function enviarOnline(tipo, d) {
  const o = App.online, m = App.motor;
  if (tipo === 'golpe') o.evento('golpe', { id: d.id, power: d.power, saque: d.saque });
  else if (tipo === 'rebote') o.evento('rebote', { x: d.x, z: d.z, vy: d.vy });
  else if (tipo === 'red' || tipo === 'cinta' || tipo === 'let') o.evento(tipo, {});
  else if (tipo === 'saque') o.evento('saque', { servidor: d.servidor, m: m.partido.estado() });
  else if (tipo === 'punto') o.evento('punto', { res: { equipo: d.res.equipo, motivo: d.res.motivo, golpes: d.res.golpes, ace: d.res.ace, finJuego: d.res.finJuego, finPartido: d.res.finPartido, cambioLado: d.res.cambioLado }, m: m.partido.estado() });
  else if (tipo === 'fin') o.evento('fin', { ganador: d.ganador, m: m.partido.estado(), pt: m.partido.puntosTotales, est: { rally: m.est.rallyMax } });
}

/* ---------- fin de partido ---------- */
function finLogros(ids) { (ids || []).forEach((id) => { const l = LOGROS.find((x) => x.id === id); if (l) App.toast('Logro: ' + l.nombre); CuentaPP.logro(id); }); }
function cerrarResultados(r) {
  const res = registrar(App.prog, r); CuentaPP.enviarPuntajes(App.prog); App.guardarProg(); finLogros(res.logros);
  if (r.gano) CuentaPP.xp(r.modo === 'online' ? 30 : 12 + ({ facil: 0, normal: 6, dificil: 14, experto: 24 }[r.dif] || 0));
  if (res.monedas) Son.moneda();
  return res;
}
function finPartido(d) {
  const m = App.motor, p = m.partido, op = App.modoAct, gano = d.ganador === 0, online = m.modo === 'online';
  const mc = p.marcadores, r = { modo: m.modo, gano, dif: op.dif, dobles: !!op.dobles, mejorDe: p.cfg.mejorDe, puntosGanados: p.puntosTotales[0], puntosPerdidos: p.puntosTotales[1], aces: m.est.aces, rally: m.est.rallyMax, golpes: m.est.golpesHum,
    paliza: p.cfg.puntosJuego >= 11 && mc.some(([a, b]) => a >= 11 && b === 0), remontada: gano && mc.length > 1 && mc[0][0] < mc[0][1] };
  const marc = mc.map((x) => x.join('-')).join('  ');
  if (op.torneo) {
    const t = App.prog.torneo; registrarTorneo(t, gano, marc);
    if (t.estado === 'campeon') { r.torneoCampeon = true; r.premioTorneo = premioTorneo(t).monedas; }
  }
  const res = cerrarResultados(r);
  Alm.borrar(Alm.K.partida); App.partidoPend = null; Son.juegoGanado();
  const t = App.prog.torneo, botones = [];
  if (op.torneo && gano && t.estado === 'en_curso') botones.push(['Siguiente ronda', () => App.jugarRondaTorneo()]);
  else if (!op.torneo && !online) botones.push(['Revancha', () => rep(op)]);
  if (online && App.online.host) botones.push(['Revancha', () => { App.ui.cerrarTodo(); App.online.revancha(); }]);
  const filas = [['Marcador de juegos', `${p.juegos[0]} - ${p.juegos[1]}`], ['Parciales', marc || '-'], ['Puntos', `${r.puntosGanados} - ${r.puntosPerdidos}`], ['Rally más largo', r.rally], ['Aces', r.aces]];
  if (op.torneo) filas.push(['Torneo', t.estado === 'campeon' ? '¡Campeón!' : t.estado === 'eliminado' ? 'Eliminado' : 'Avanzas a ' + rondaActual(t).nombre]);
  setTimeout(() => App.ui.resultado({ titulo: gano ? '¡Victoria!' : 'Derrota', sub: gano ? MIN_TEXTO.ganar : MIN_TEXTO.perder, filas, monedas: res.monedas, logros: res.logros.map((id) => (LOGROS.find((l) => l.id === id) || {}).nombre), botones }), 300);
}
const rep = (op) => { if (op.torneo) return; const c = App.ui.configs.libre; App.iniciarLibre(Object.assign({}, c, { dif: op.dif, estilo: op.estilo, dobles: !!op.dobles, mejorDe: op.motor.cfg.mejorDe, puntos: op.motor.cfg.puntosJuego })); };
function finReto() {
  const m = App.motor, r = { modo: 'reto', rally: m.reto.rallyMax, golpes: m.est.golpesHum }, res = cerrarResultados(r);
  App.ui.resultado({ titulo: 'Reto terminado', sub: `Rally máximo: ${m.reto.rallyMax} golpes`, filas: [['Rallies jugados', m.reto.rallies], ['Golpes totales', m.reto.golpesTot], ['Tu récord', App.prog.stats.retoMax]], monedas: res.monedas, logros: res.logros.map((id) => (LOGROS.find((l) => l.id === id) || {}).nombre), botones: [['Reintentar', () => App.iniciarReto()]] });
}
App.terminarManual = () => {
  const m = App.motor; if (!m) return App.salirAlMenu();
  if (m.modo === 'entreno') {
    const r = { modo: 'entreno', aciertos: m.ent.aciertos, mejorRacha: m.ent.mejor, golpes: m.est.golpesHum }, res = cerrarResultados(r); const op = App.modoAct;
    App.ui.resultado({ titulo: 'Entrenamiento', sub: `${m.ent.aciertos} pelotas devueltas`, filas: [['Lanzadas', m.ent.lanzadas], ['Mejor racha', m.ent.mejor]], monedas: res.monedas, logros: res.logros.map((id) => (LOGROS.find((l) => l.id === id) || {}).nombre), botones: [['Otra sesión', () => empezar(op)]] });
  } else if (m.modo === 'reto') { finReto(); } else if (m.modo === 'online') { guardarPartida(); App.online.salir(); App.salirAlMenu(); } else { guardarPartida(); App.salirAlMenu(); }
};
function cerrarJuego() { App.motor = null; App.visor = null; if (App.escena) App.escena.vista = 1; document.body.classList.remove('modo-entreno'); }
App.salirAlMenu = () => {
  if (App.online.activo) App.online.salir();
  cerrarJuego(); App.ui.cerrarTodo(); App.pausado = false; App.ui.mostrarHud(false); App.ui.mostrarMenu(); Son.pararMusica();
};
App.pausar = () => {
  if (!App.motor && !App.visor) return; if (App.ui.hayModal) return;
  const online = !!App.online.activo; if (!online) App.pausado = true;
  App.ui.pausa();
};
App.reanudar = () => { App.pausado = false; };

/* ---------- online ---------- */
App.abrirLobby = () => { if (window.Lobby) { Son.activar(); window.Lobby.abrir(App.online.opts); } else App.toast('El multijugador no está disponible'); };
App.empezarOnlineHost = (o) => {
  const pend = o.nuevo ? null : (App.estadoOnline() || null), inv = o.nombreInv || 'Rival', cols = [App.perfil().color, o.colorInv || '#ff4fd8', '#ffd23d', '#ff9a5a'];
  empezar({ modo: 'online', nombres: [nombreCorto(App.perfil().nombre), nombreCorto(inv)], cols, rivalInfo: { color: cols[1] }, dif: 'online',
    motor: { modo: 'online', humanos: [0, 1], cfg: pend ? pend.cfg : { puntosJuego: 11, mejorDe: 3, dobles: false, inicio: Math.random() < 0.5 ? 0 : 1 }, partido: pend || undefined } });
  App.partidoPend = null; guardarPartida();
};
App.empezarOnlineInvitado = () => {
  cerrarJuego(); App.modoAct = { modo: 'online-inv' }; App.visor = { yo: 1, est: { puntos: [0, 0], juegos: [0, 0] } }; App.pausado = false; App.escena.vista = -1;
  App.ui.ocultarMenu(); App.ui.cerrarTodo(); App.ui.mostrarHud(true); App.ui.setNombres('Tú', 'Anfitrión'); App.ui.setMarcador(App.visor.est, 'Conectando…'); App.ui.info(''); App.ui.pintarChips(); Son.activar(); Son.iniciarMusica(); pantallaWake();
  App.escena.setColores([App.perfil().color, '#ff4fd8', '#ffd23d', '#ff9a5a']);
};
App.visorConfig = (d) => {
  if (!App.visor) return;
  App.escena.setEquipo({ mesa: d.mesa, paleta: d.paleta, sala: d.sala }); App.escena.setColores([d.color, App.perfil().color, '#ffd23d', '#ff9a5a']);
  App.ui.setNombres('Tú', nombreCorto(d.nombre)); if (d.estado) visorMarcador(d.estado);
};
const swap = (e) => ({ puntos: [e.puntos[1], e.puntos[0]], juegos: [e.juegos[1], e.juegos[0]] });
function visorMarcador(e) { App.visor.est = swap(e); App.ui.setMarcador(App.visor.est, 'Juego ' + e.juegoNum + (e.deuce ? ' · igualdad' : '')); }
App.visorEvento = (k, d) => {
  const e = App.escena, b = App.visor && App.online.visor();
  if (k === 'golpe') { Son.golpe(d.power == null ? 0.5 : d.power); if (b) e.anilloAire(b.b[0], b.b[1], b.b[2], '#fff'); if (d.id === 1) { vibrar(0.3, 0.4, 70); App.ui.hint(''); } }
  else if (k === 'rebote') { Son.bote(d.vy); e.anillo(d.x, d.z, '#ffffff'); }
  else if (k === 'red' || k === 'cinta') Son.red();
  else if (k === 'let') App.ui.mensaje('Let: se repite el saque', '', 1500);
  else if (k === 'saque') { visorMarcador(d.m); App.ui.setSaca(d.servidor % 2 === 1 ? 0 : 1); App.ui.hint(d.servidor === 1 ? 'Tu saque: desliza hacia arriba' : ''); }
  else if (k === 'punto') { const mia = d.res.equipo === 1; Son.punto(mia); if (!mia) vibrar(0.5, 0.2, 180); visorMarcador(d.m); let t = motivoTexto(d.res, 1); if (d.res.finJuego && !d.res.finPartido) { t = 'Juego ' + (mia ? 'tuyo' : 'rival') + ' · ' + t; Son.juegoGanado(); } App.ui.mensaje(t, mia ? 'bien' : 'mal', 2100); }
  else if (k === 'fin') {
    const gano = d.ganador === 1, r = { modo: 'online', gano, puntosGanados: d.pt[1], puntosPerdidos: d.pt[0], rally: d.est.rally, golpes: 0 }, res = cerrarResultados(r); Son.juegoGanado();
    setTimeout(() => App.ui.resultado({ titulo: gano ? '¡Victoria!' : 'Derrota', filas: [['Juegos', `${d.m.juegos[1]} - ${d.m.juegos[0]}`], ['Puntos', `${d.pt[1]} - ${d.pt[0]}`]], monedas: res.monedas, logros: res.logros.map((id) => (LOGROS.find((l) => l.id === id) || {}).nombre), botones: [] }), 300);
  }
};
App.onlineDesconexion = (voluntaria) => {
  if (!App.online.activo) return;
  if (App.visor) { App.online.activo = false; App.ui.modal('Conexión perdida', (c, api) => { c.appendChild(h('p', { txt: voluntaria ? 'El anfitrión salió de la partida.' : 'Se perdió la conexión con el anfitrión.' })); c.appendChild(h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Volver al menú', on: { click: () => { api.cerrar(); App.salirAlMenu(); } } })); }, { sinCerrar: true }); return; }
  guardarPartida(); App.pausado = true;
  App.ui.modal('Rival desconectado', (c, api) => {
    c.appendChild(h('p', { txt: 'Tu rival salió o se cayó la conexión. La partida queda guardada: puedes invitarlo de nuevo y continuar con el mismo marcador.' }));
    c.appendChild(h('button', { type: 'button', cls: 'btn', 'data-f': 1, txt: 'Invitar de nuevo', on: { click: () => { api.cerrar(); App.partidoPend = App.motor ? App.motor.partido.guardar() : App.partidoPend; App.online.activo = false; App.abrirLobby(); } } }));
    c.appendChild(h('button', { type: 'button', cls: 'btn sec', 'data-f': 1, 'data-atras': 1, txt: 'Salir al menú', on: { click: () => { api.cerrar(); App.partidoPend = App.motor ? App.motor.partido.guardar() : null; App.online.activo = false; App.salirAlMenu(); } } }));
  }, { sinCerrar: true });
};

/* ---------- golpes locales ---------- */
function golpeLocal(cmd) {
  Son.activar(); App.ui.medidor(cmd.power);
  if (App.visor) { App.online.enviarGolpe(cmd); return; }
  if (App.motor && !App.pausado) App.motor.golpeHumano(0, cmd);
}

/* ---------- bucle ---------- */
const OTROS = ['alta', 'media', 'baja'];
function autoCalidad(fps) {
  const a = App.aj, g = a.gr; if (!g.auto || !App.motor && !App.visor) return;
  const meta = g.fps ? Math.min(60, g.fps) : 60; if (fps >= meta * 0.62 || g.preset === 'baja') return;
  const sig = g.preset === 'ultra' ? 'alta' : g.preset === 'alta' ? 'media' : 'baja';
  if (Date.now() - App.bajadas < 8000) return; App.bajadas = Date.now();
  Aju.aplicarPreset(a, sig); App.aplicarAjustes(true); App.toast('Rendimiento bajo: calidad ajustada a ' + sig.toUpperCase());
}
function estadoEscena(dt) {
  const m = App.motor;
  if (App.visor) {
    const s = App.online.visor(); if (s) { const b = s.b; return { bola: { x: b[0], y: b[1], z: b[2], wx: b[6], wy: b[7], wz: b[8] }, jug: [0, 1].map((i) => ({ px: s.px[i], lado: i === 0 ? 1 : -1, swing: s.sw[i], activo: true })), marca: null }; }
  }
  if (m) {
    const t = performance.now(), b = m.bola; let marca = null;
    if (t > App.tMarca) { App.tMarca = t + 120; App.marca = null; const r = m.rally;
      if (b.vivo && m.fase === 'juego' && r && r.fase !== 'bote' && r.fase !== 'saque0' && r.fase !== 'fin' && b.vz > 0) { const a = aterrizaje(b, { red: false }); if (a.ok && a.rebota && a.z > 0) App.marca = { x: a.x, z: a.z }; } }
    marca = App.marca; if (!b.vivo && m.fase !== 'pausa') marca = null;
    return { bola: b, jug: m.jug.map((j) => ({ px: j.px, lado: j.lado, swing: j.swing, activo: m.modo === 'entreno' || m.modo === 'reto' ? j.id < 2 : true })), marca, vivo: b.vivo || m.fase === 'pausa' };
  }
  return { bola: { x: 0, y: C.H + 0.3 + Math.sin(performance.now() / 700) * 0.02, z: 0, wx: 0, wy: 6, wz: 0 }, jug: [], marca: null };
}
function bucle(ts) {
  requestAnimationFrame(bucle);
  const lim_ = App.aj.gr.fps; if (lim_ && ts - App.ult < 1000 / lim_ - 2) return;
  const dt = Math.min(0.05, (ts - App.ult) / 1000 || 0.016); App.ult = ts;
  const Mm = M(); if (!lobbyAbierto()) Mm.leer();
  const modal = App.ui.hayModal, menuVisible = !App.ui.menu.hidden;
  if ((App.motor || App.visor) && !App.pausado && !modal && !lobbyAbierto()) {
    App.entrada.actualizar(dt, Mm);
    if (App.motor) {
      App.motor.avanzar(dt); if (App.online.activo && App.online.host) App.online.snapshot(dt);
      const f = App.motor.fase; if (f === 'juego' && App.motor.modo === 'reto') actualizarInfo();
    }
  } else if (!lobbyAbierto()) { if (modal || menuVisible) App.ui.navegar(Mm, dt); App.entrada.actualizar(dt, null); }
  try { App.escena.actualizar(estadoEscena(dt), dt); App.escena.dibujar(); } catch (e) { console.error(e); }
  App.fpsAc += dt; App.fpsN++; if (App.fpsAc >= 2) { const fps = App.fpsN / App.fpsAc; App.fpsAc = 0; App.fpsN = 0; const f = $('#fps'); if (f) f.textContent = Math.round(fps) + ' FPS'; if (!modal && (App.motor || App.visor)) autoCalidad(fps); }
}

/* ---------- pantalla completa, wake lock, visibilidad ---------- */
App.pantallaCompleta = () => { const d = document; if (d.fullscreenElement) d.exitFullscreen && d.exitFullscreen(); else (d.documentElement.requestFullscreen || (() => Promise.reject())).call(d.documentElement).catch(() => App.toast('Pantalla completa no disponible')); };
let wake = null;
async function pantallaWake() { try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; } }
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { guardarPartida(); Son.suspender(true); if (App.motor && App.motor.modo !== 'online' && !App.pausado && !App.ui.hayModal) App.pausar(); }
  else { Son.suspender(false); if (App.motor || App.visor) pantallaWake(); }
});
addEventListener('pagehide', guardarPartida);
addEventListener('resize', () => App.escena && App.escena.redimensionar());

/* ---------- arranque ---------- */
function iniciar() {
  try { App.escena = new Escena($('#escena'), App.aj, App.prog.equipo); } catch (e) { console.error(e); $('#error3d').hidden = false; }
  if (!App.escena) return;
  App.online = crearOnline(App); App.ui = new UI(App);
  App.entrada = new Entrada({ zona: $('#gesto'), trail: $('#trazo'), ajustes: () => App.aj, vista: () => (App.visor ? -1 : 1), alGolpe: golpeLocal, alPausa: () => { if (App.ui.hayModal) { const u = App.ui.pila[App.ui.pila.length - 1]; if (u && !u.op.sinCerrar) u.cerrar(); } else App.pausar(); }, activo: () => (!!App.motor || !!App.visor) && !App.pausado && !App.ui.hayModal && !lobbyAbierto() });
  CuentaPP.aplicarPerfil(); CuentaPP.iniciarNube(() => { App.prog = Alm.cargarProgreso(); App.escena.setEquipo(App.prog.equipo); if (!App.motor) App.ui.mostrarMenu(); });
  CuentaPP.sincronizarLogros(App.prog.logros); CuentaPP.enviarPuntajes(App.prog);
  App.aplicarAjustes(false); App.ui.mostrarMenu();
  if (window.Lobby && window.Red) { window.Lobby.registrar(App.online.opts); App.online.enganchar(); if (window.Lobby.hayEnlace()) window.Lobby.abrir(App.online.opts); }
  const act = () => { Son.activar(); removeEventListener('pointerdown', act); removeEventListener('keydown', act); }; addEventListener('pointerdown', act); addEventListener('keydown', act);
  requestAnimationFrame(bucle);
}
iniciar();
export default App;
