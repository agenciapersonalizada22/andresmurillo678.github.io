// =============================================================
//  ♚  PRINCIPAL
//  Une reglas, motor, 3D/2D y pantallas: turnos, jugadas del usuario,
//  respuesta de la IA, reloj, deshacer/rehacer, fin de partida,
//  análisis, rompecabezas, lecciones, biblioteca y ajustes.
//  TODA jugada (local, del motor, premovimiento, remota) entra por
//  ejecutar(m, origen); las remotas, por recibirJugada(uci, origen).
// =============================================================
import { Partida } from './partida.js';
import { Posicion, FEN_INICIAL, BLANCAS, NEGRAS, movDesde, movHasta, movPromo, movBanderas, CAP, ENR_C, ENR_L, nombreCasilla, sanFigurada, fen960, movAUci } from './reglas.js';
import { RELOJES, CONFIG, rivalPorId, relojPorId, calidadEfectiva, VENTAJAS, PRACTICA, CALIDADES } from './config.js';
import { Vista } from './vista.js';
import { Vista2D } from './vista2d.js';
import { Flechas } from './flechas.js';
import { Entrada } from './entrada.js';
import { Interfaz } from './interfaz.js';
import { InicioUI } from './ui_inicio.js';
import { iniciarControl } from './control.js';
import { IA } from './ia.js';
import { Reloj, formatoTiempo } from './reloj.js';
import * as Sonido from './sonido.js';
import { iniciarMusica, detenerMusica } from './musica.js';
import * as Guardado from './guardado.js';
import { nombreApertura, jugadaLibro } from './aperturas.js';
import { AnalisisVivo, revisarPartida, pvASan, textoEval, esMate, CLASE_POR_ID } from './analisis.js';
import * as Perfil from './perfil.js';
import * as Rompe from './rompecabezas.js';
import { LECCIONES, porId as leccionPorId } from './lecciones.js';
import { parsearPGN, juegoAUci } from './pgn.js';
import { revisionProgreso, pintarRevision, pintarAyuda } from './ui_extra.js';
import { cfgVib, vibrar } from './vibracion.js';
import { iniciarOnline } from './online.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
if (params.get('tactil') === '1' || (window.matchMedia && matchMedia('(pointer: coarse)').matches)) document.body.classList.add('tactil');

const opts = Guardado.cargarOpciones();
if (params.get('tema')) opts.tema = params.get('tema');
if (params.get('calidad')) opts.calidad = params.get('calidad');
if (params.get('render')) opts.render = params.get('render');
const yo = Guardado.perfilCompartido();

const partida = new Partida();
const reloj = new Reloj();
const ia = new IA();
let ia2 = null; // motor de análisis (otro worker, no estorba al rival)
const motorAnalisis = () => ia2 || (ia2 = new IA());
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const juego = {
  modo: 'ia', humano: BLANCAS, nivel: 'medio', relojId: 'sin', girarAuto: false, variante: 'estandar', rival: rivalPorId('medio'),
  tiempos: [[0, 0]], cursor: -1, sel: -1, selAntes: false, legales: [], idIA: 0, idPista: 0, pensando: false, ocupado: false,
  pista: null, vista: 'blancas', cerrada: false, hover: -1, est: { fin: null }, inicioTurno: BLANCAS, premov: null,
  ayudas: 0, deshechas: 0, notas: {}, tarea: null, revision: null, pausa: false, sinPuntuar: false, online: null, apertura: null, nombres: null,
};

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------- interfaz y vista
const ui = new Interfaz({
  alReanudar: () => reanudar(),
  alAccion: (a) => accion(a),
  alNavegar: (n) => navegar(n),
  alAjuste: (k, v, vivo) => ajuste(k, v, vivo),
  alClic: () => Sonido.reproducir('clic'),
  alContinuarRevision: () => continuarDesdeAqui(),
  alRevancha: () => revancha(),
  alStats: () => ui.stats(Guardado.cargarStats()),
  alBorrarStats: () => { Guardado.borrarStats(); ui.stats({}); },
  alAyuda: () => { pintarAyuda(document.body.classList.contains('tactil'), !!(window.Mando && window.Mando.conectado)); ui.mostrar('Ayuda'); },
  alPausa: () => pausar(),
  alPausaSeguir: () => seguir(),
  alPantallaCompleta: () => pantallaCompleta(),
  alOnline: () => online.abrir(),
  alNota: (t) => { const n = partida.cursor; if (n > 0) { if (t.trim()) juego.notas[n] = t.trim(); else delete juego.notas[n]; guardar(); } },
  alDatos: (d) => datos(d),
  alCerrarAjustes: () => { if (juego.pausa && !ui.hayModal()) { /* sigue en pausa */ } },
});
const inicio = new InicioUI({
  alClic: () => Sonido.reproducir('clic'),
  alNueva: (cfg) => nuevaDesdeUI(cfg),
  alPuzzle: (m) => iniciarPuzzle(m),
  alLeccion: (id) => iniciarLeccion(id),
  alAbrirBiblioteca: (id) => abrirBiblioteca(id),
  alBorrarBiblioteca: (id) => { Guardado.guardarBiblioteca(Guardado.cargarBiblioteca().filter((g) => g.id !== id)); },
  alImportarPGN: (t) => importarPGN(t),
  alExportarBiblioteca: () => exportarBiblioteca(),
  alStats: () => ui.stats(Guardado.cargarStats()),
});

let vista, flechas, entrada;
function crearVista() {
  const contenedor = $('escena');
  let usar2d = opts.render === '2d';
  if (opts.render === 'auto' && params.get('render') !== '3d') {
    try { const c = document.createElement('canvas'); if (!c.getContext('webgl2') && !c.getContext('webgl')) usar2d = true; } catch (e) { usar2d = true; }
  }
  const comun = { tema: opts.tema, daltonico: opts.daltonico, coordenadas: opts.coordenadas, reducir: opts.reducirMovimiento };
  if (!usar2d) {
    try {
      vista = new Vista(contenedor, { ...comun, calidad: calidadEfectiva(opts), set3d: opts.set3d, limiteFps: opts.limiteFps });
    } catch (e) { console.warn('3D no disponible, se usa 2D', e); usar2d = true; }
  }
  if (usar2d) vista = new Vista2D(contenedor, { ...comun, set2d: opts.set2d });
  document.body.classList.toggle('vista2d', usar2d);
  vista.es2d = usar2d;
  flechas = new Flechas(contenedor, vista);
  entrada = new Entrada(contenedor, vista, {
    alBajar: (sq) => alBajar(sq),
    alPulsar: (sq, bajo) => alPulsar(sq, bajo),
    alSoltar: (d, h) => alSoltar(d, h),
    alHover: (sq) => { if (sq !== juego.hover) { juego.hover = sq; if (puedeMover()) marcas(); } },
    alFlecha: opts.flechasDerecho ? (a, b) => { if (a >= 0) { flechas.alternar(a, b < 0 ? a : b); } } : null,
  });
  vista.alFps = (f) => autoCalidad(f);
}
crearVista();

// ---------------------------------------------------------- utilidades
const turnoEnPly = (n) => (juego.inicioTurno + n) & 1;
const esIA = (color) => (juego.modo === 'ia' || juego.modo === 'leccion') && color !== juego.humano;
const copiaTablero = () => Int8Array.from(partida.pos.b);
const nombreRival = () => juego.rival.nombre;

function puedeMover() {
  return !ui.hayModal() && !juego.est.fin && !juego.ocupado && !juego.pensando && !juego.pausa
    && juego.modo !== 'archivo' && partida.alFinal && partida.turno === juego.humano_ok() && !(juego.online && juego.online.espectador);
}
juego.humano_ok = () => (juego.modo === 'dos' ? partida.turno : juego.humano);
function puedePremover() {
  return opts.premov && !ui.hayModal() && !juego.est.fin && !juego.pausa && partida.alFinal
    && (juego.modo === 'ia' || (juego.modo === 'online' && juego.online && juego.online.jugando)) && partida.turno !== juego.humano && !juego.tarea && !(juego.online && juego.online.espectador);
}

function legalesDesde(sq) { return juego.legales.filter((m) => movDesde(m) === sq); }
function actualizarLegales() { juego.legales = partida.legales(); }
// en Chess960 también se puede pulsar la torre propia para enrocar
function coincide(m, hasta) {
  if (movHasta(m) === hasta) return true;
  const fl = movBanderas(m);
  return !!(fl & (ENR_C | ENR_L)) && partida.pos.es960 && partida.pos.tor[partida.turno][fl & ENR_C ? 1 : 0] === hasta;
}
const hastaVisible = (m) => { const fl = movBanderas(m); return (fl & (ENR_C | ENR_L)) && partida.pos.es960 ? partida.pos.tor[partida.turno][fl & ENR_C ? 1 : 0] : movHasta(m); };

// ---------------------------------------------------------- marcas del tablero
function marcas() {
  const destinos = [];
  if (juego.sel >= 0 && opts.ayuda && puedeMover()) {
    const vistos = new Set();
    for (const m of legalesDesde(juego.sel)) {
      const h = hastaVisible(m);
      if (vistos.has(h)) continue;
      vistos.add(h);
      destinos.push({ sq: h, captura: (movBanderas(m) & CAP) !== 0 });
    }
  }
  const u = partida.ultima;
  vista.marcar({
    seleccion: juego.sel, destinos, ultima: u ? [movDesde(u.m), movHasta(u.m)] : null,
    jaque: juego.est.jaque ? partida.pos.rey[partida.turno] : -1,
    pista: juego.pista, cursor: juego.cursor,
    hover: juego.hover >= 0 && puedeMover() && partida.pos.b[juego.hover] && (partida.pos.b[juego.hover] >> 3) === partida.turno ? juego.hover : -1,
  });
  flechasFijas();
}

function flechasFijas() {
  const f = [];
  if (juego.pista && juego.pista.length === 2) f.push({ de: juego.pista[0], a: juego.pista[1], color: '#3ddc84', ancho: 0.2 });
  if (juego.premov) f.push({ de: juego.premov.desde, a: juego.premov.hasta, color: '#ff9a3d' });
  if (juego.confirmando) f.push({ de: movDesde(juego.confirmando), a: movHasta(juego.confirmando), color: '#6ab7ff' });
  if (analisisOn() && opts.flechaMejor && juego.mejorFlecha && partida.alFinal) f.push({ de: juego.mejorFlecha[0], a: juego.mejorFlecha[1], color: '#4aa3ff', ancho: 0.14, alfa: 0.7 });
  if (juego.revision && juego.revision.cls[partida.cursor - 1]) {
    const c = juego.revision.cls[partida.cursor - 1];
    if (!['mejor', 'excelente', 'bueno', 'libro', 'brillante', 'genial'].includes(c.id) && c.mejor) f.push({ de: sqDeUci(c.mejor, 0), a: sqDeUci(c.mejor, 2), color: '#7fcf4a', alfa: 0.85 });
  }
  flechas.fijar(f);
}
const sqDeUci = (u, i) => 'abcdefgh'.indexOf(u[i]) + 8 * (parseInt(u[i + 1], 10) - 1);

function limpiarSeleccion() { juego.sel = -1; vista.piezas.elevar(-1); }

function seleccionar(sq) {
  juego.sel = sq; juego.pista = null;
  vista.piezas.elevar(sq);
  Sonido.reproducir('clic');
  marcas();
}

// ---------------------------------------------------------- entrada del usuario
function alBajar(sq) {
  flechas.limpiarUsuario();
  const p = partida.pos.b[sq];
  if (!puedeMover()) {
    if (puedePremover() && p && (p >> 3) === juego.humano) { juego.selAntes = juego.sel === sq; if (juego.sel !== sq) seleccionar(sq); return true; }
    return false;
  }
  if (!p || (p >> 3) !== partida.turno || !legalesDesde(sq).length) return false;
  juego.selAntes = juego.sel === sq;
  if (juego.sel !== sq) seleccionar(sq);
  return true;
}

function alPulsar(sq, bajoPieza) {
  if (!puedeMover()) { if (puedePremover()) premovPulsar(sq, bajoPieza); return; }
  if (bajoPieza) { if (juego.selAntes) { limpiarSeleccion(); marcas(); } return; }
  if (sq < 0) { if (juego.sel >= 0) { limpiarSeleccion(); marcas(); } return; }
  if (juego.sel >= 0 && legalesDesde(juego.sel).some((m) => coincide(m, sq))) { intentarMover(juego.sel, sq); return; }
  const p = partida.pos.b[sq];
  if (p && (p >> 3) === partida.turno && legalesDesde(sq).length) { seleccionar(sq); return; }
  if (juego.sel >= 0) { limpiarSeleccion(); marcas(); if (sq >= 0) Sonido.reproducir('error'); }
}

function alSoltar(desde, hasta) {
  if (!puedeMover()) {
    vista.piezas.devolver(desde);
    if (puedePremover() && hasta >= 0 && hasta !== desde) fijarPremov(desde, hasta);
    return;
  }
  if (hasta < 0 || hasta === desde) { vista.piezas.devolver(desde); return; }
  if (legalesDesde(desde).some((m) => coincide(m, hasta))) intentarMover(desde, hasta, true);
  else { vista.piezas.devolver(desde); Sonido.reproducir('error'); }
}

function premovPulsar(sq, bajo) {
  const p = partida.pos.b[sq];
  if (bajo) { if (juego.selAntes) { limpiarSeleccion(); marcas(); } return; }
  if (juego.sel >= 0 && sq !== juego.sel && sq >= 0 && !(p && (p >> 3) === juego.humano)) { fijarPremov(juego.sel, sq); return; }
  if (p && (p >> 3) === juego.humano && !bajo) { seleccionar(sq); return; }
  if (juego.premov) { juego.premov = null; ui.toast('Premovimiento cancelado'); }
  limpiarSeleccion(); marcas();
}
function fijarPremov(desde, hasta) { juego.premov = { desde, hasta }; limpiarSeleccion(); Sonido.reproducir('clic'); marcas(); }

async function intentarMover(desde, hasta, arrastre = false) {
  const posibles = legalesDesde(desde).filter((m) => coincide(m, hasta));
  if (!posibles.length) return;
  let m = posibles[0];
  if (posibles.length > 1) {
    juego.ocupado = true;
    const t = await ui.elegirPromocion(partida.turno);
    juego.ocupado = false;
    if (!t) { if (arrastre) vista.piezas.devolver(desde); return; }
    m = posibles.find((x) => movPromo(x) === t) || posibles[0];
  }
  const tarea = juego.tarea;
  if (tarea && tarea.tipo !== 'final') {
    if (!(await validarTarea(m))) { vista.piezas.devolver(desde); return; }
  }
  if (opts.confirmarMov && document.body.classList.contains('tactil') && !juego.online) {
    juego.confirmando = m; juego.ocupado = true; vista.piezas.devolver(desde); marcas();
    const ok = await ui.confirmarJugada(partida.pos.san(m, juego.legales));
    juego.confirmando = null; juego.ocupado = false;
    if (!ok) { limpiarSeleccion(); marcas(); return; }
  }
  ejecutar(m, 'local');
}

// ---------------------------------------------------------- jugar una jugada (única puerta de entrada)
function sonidoDe(m, est) {
  const fl = movBanderas(m);
  if (est.fin === 'mate') return 'mate';
  if (est.jaque) return 'jaque';
  if (movPromo(m)) return 'coronar';
  if (fl & (ENR_C | ENR_L)) return 'enroque';
  if (fl & CAP) return 'capturar';
  return 'mover';
}

// Jugada de otro jugador (red): valida contra las reglas y la juega. Devuelve false si es ilegal.
function recibirJugada(uci, origen = 'remoto') {
  const m = partida.pos.uciAMov(uci, juego.legales);
  if (!m || !partida.alFinal || juego.est.fin) return false;
  ejecutar(m, origen);
  return true;
}

async function ejecutar(m, origen = 'local') {
  if (juego.ocupado && !juego.permitirEjecutar && origen === 'local') return;
  juego.ocupado = true;
  cancelarPista(); limpiarSeleccion(); juego.pista = null; juego.pistaPaso = 0; juego.pistaMov = null; juego.mejorFlecha = null;
  ui.cancelarConfirmarJugada();
  const bAntes = copiaTablero();
  const turnoAntes = partida.turno;
  const uci = movAUci(m, partida.pos);
  const san = partida.pos.san(m, juego.legales);
  partida.jugar(m, juego.legales);
  juego.tiempos.length = partida.cursor;
  if (reloj.habilitado) { if (partida.cursor === 1) reloj.iniciar(turnoAntes ^ 1); else reloj.movio(turnoAntes); }
  juego.tiempos[partida.cursor] = [reloj.restante[0], reloj.restante[1]];
  actualizarLegales();
  const est = partida.estado();
  juego.est = est;
  if (juego.revision) juego.revision = null;
  refrescar();
  setTimeout(() => Sonido.reproducir(sonidoDe(m, est)), 150);
  vibrarJugada(m, est);
  if ((movBanderas(m) & CAP) || est.fin === 'mate') vista.sacudir && vista.sacudir(est.fin === 'mate' ? 0.22 : 0.07);
  hablar(san, turnoAntes);
  if (movBanderas(m) & (ENR_C | ENR_L) && turnoAntes === juego.humano) Perfil.otorgar('enroque') && logro('enroque');
  if (movPromo(m) && turnoAntes === juego.humano) logro('corona');
  online.alJugar && online.alJugar({ m, uci, san, origen, est, turnoAntes });
  const anim = vista.jugar(m, bAntes);
  await Promise.race([anim, dormir(1800)]);
  juego.ocupado = false;
  guardar();
  if (juego.tarea) { refrescar(); await tareaDespues(m, origen); return; }
  if (est.fin) { finalizar(est); return; }
  if (juego.modo === 'dos' && juego.girarAuto && juego.vista !== 'cenital') cambiarVista(partida.turno === BLANCAS ? 'blancas' : 'negras');
  refrescar();
  if (esIA(partida.turno)) pedirIA();
  else if (juego.premov && partida.turno === juego.humano && origen !== 'premov') ejecutarPremov();
}

function ejecutarPremov() {
  const pm = juego.premov; juego.premov = null;
  const c = juego.legales.filter((m) => movDesde(m) === pm.desde && coincide(m, pm.hasta));
  if (!c.length) { ui.toast('El premovimiento ya no es legal'); marcas(); return; }
  const m = c.find((x) => movPromo(x) === 5) || c[0];
  setTimeout(() => { if (partida.alFinal && !juego.est.fin && !juego.ocupado && partida.turno === juego.humano) ejecutar(m, 'premov'); }, 120);
}

function vibrarJugada(m, est) {
  if (est.fin === 'mate') vibrar(1, 0.7, 450);
  else if (est.jaque) vibrar(0.6, 0.5, 260);
  else if (movBanderas(m) & CAP) vibrar(0.5, 0.4, 160);
  else vibrar(0.1, 0.25, 70);
}

const NOM_PIEZA_HABLADA = { N: 'Caballo', B: 'Alfil', R: 'Torre', Q: 'Dama', K: 'Rey' };
function hablar(san, turnoAntes) {
  if (!opts.leerJugadas) return;
  let t = san.replace('O-O-O', 'enroque largo').replace('O-O', 'enroque corto').replace(/^[NBRQK]/, (c) => NOM_PIEZA_HABLADA[c] + ' ').replace('x', ' captura ').replace('+', ', jaque').replace('#', ', jaque mate').replace('=', ' corona a ');
  t = (turnoAntes ? 'Negras: ' : 'Blancas: ') + t;
  ui.anunciar(t);
  try { if (window.speechSynthesis) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'es-ES'; speechSynthesis.speak(u); } } catch (e) { /* nada */ }
}

// ---------------------------------------------------------- IA
function cancelarIA() {
  juego.idIA++;
  if (juego.pensando) { juego.pensando = false; ia.cancelar(); }
}
function cancelarPista() { juego.idPista++; }

async function pedirIA() {
  if (juego.est.fin || !partida.alFinal || juego.pausa) return;
  const id = ++juego.idIA;
  juego.pensando = true;
  refrescar();
  const nivel = { ...juego.rival.motor };
  if (reloj.habilitado) nivel.tiempo = Math.max(150, Math.min(nivel.tiempo, reloj.restante[partida.turno] / 25));
  const t0 = performance.now();
  let r = null;
  let libro = '';
  if (nivel.libro && !partida.pos.es960 && partida.fenInicial === FEN_INICIAL && partida.cursor < 14 && Math.random() < 0.9) {
    const m = jugadaLibro(partida.pos); if (m) libro = m;
  }
  if (!libro) {
    try { r = await ia.pedir({ fen: partida.fenInicial, movs: partida.uciHasta(), nivel }); } catch (e) { console.warn('La IA falló:', e); }
  }
  if (id !== juego.idIA) return;
  const espera = juego.modo === 'leccion' ? 350 : CONFIG.tiempoMinimoIA + (libro ? 250 + Math.random() * 500 : 0);
  await dormir(Math.max(0, espera - (performance.now() - t0)));
  if (id !== juego.idIA) return;
  juego.pensando = false;
  let m = libro ? partida.pos.uciAMov(libro, juego.legales) : (r && r.uci ? partida.pos.uciAMov(r.uci, juego.legales) : 0);
  if (!m) { console.warn('Jugada de la IA no válida; se elige una legal'); m = juego.legales[Math.floor(Math.random() * juego.legales.length)]; }
  if (m) ejecutar(m, 'ia'); else refrescar();
}

// Pista graduada: 1) la pieza, 2) el destino, 3) la jugada escrita
async function pedirPista() {
  if (!puedeMover()) return;
  juego.ayudas++;
  const t = juego.tarea;
  if (t && t.tipo === 'final') { ui.toast(t.leccion.pista); }
  let uci = null;
  if (t && t.sol) uci = t.sol[t.paso];
  else if (t && t.tipo === 'final' && juego.pistaPaso === 0 && t.leccion.pista) { ui.toast(t.leccion.pista); }
  if (!uci) {
    if (juego.pistaMov && juego.pistaFen === partida.pos.aFen()) uci = juego.pistaMov;
    else {
      const id = ++juego.idPista;
      ui.estado('Calculando pista', 'pensando');
      let r = null;
      try { r = await ia.pedir({ fen: partida.fenInicial, movs: partida.uciHasta(), nivel: { prof: 14, tiempo: 1500, ruido: 0, azar: 0, apertura: 0 } }); } catch (e) { /* nada */ }
      if (id !== juego.idPista) return;
      if (!r || !r.uci) { refrescar(); return; }
      uci = r.uci; juego.pistaMov = uci; juego.pistaFen = partida.pos.aFen();
    }
  }
  const m = partida.pos.uciAMov(uci, juego.legales);
  if (!m) { refrescar(); return; }
  juego.pistaPaso = Math.min(3, (juego.pistaPaso || 0) + 1);
  limpiarSeleccion();
  const d = movDesde(m), h = hastaVisible(m);
  if (juego.pistaPaso === 1) { juego.pista = [d]; ui.toast('Pista: mueve esta pieza (pulsa otra vez para ver el destino)'); }
  else if (juego.pistaPaso === 2) { juego.pista = [d, h]; ui.toast('Pista: este es el destino (otra vez para ver la jugada)'); }
  else { juego.pista = [d, h]; ui.toast('Pista: ' + sanFigurada(partida.pos.san(m, juego.legales))); }
  refrescar();
}

// ---------------------------------------------------------- vista
function cambiarVista(nombre, inmediato = false) {
  juego.vista = nombre;
  vista.fijarVista(nombre, inmediato);
  refrescar();
}
function ladoInferior() {
  const c = vista.camara;
  return c.vista === 'negras' || (c.vista === 'cenital' && Math.abs(c.baseYaw - Math.PI) < 0.1) ? NEGRAS : BLANCAS;
}

// ---------------------------------------------------------- refrescar interfaz
function nombresJugadores() {
  const n = ['', ''], s = ['', ''];
  if (juego.nombres) return juego.nombres;
  for (const c of [0, 1]) {
    if (juego.modo === 'ia' || juego.modo === 'leccion') {
      n[c] = c === juego.humano ? yo.nombre.toUpperCase() : (juego.rival.bot ? juego.rival.nombre.toUpperCase() : 'MOTOR');
      s[c] = c === juego.humano ? (c ? 'Negras' : 'Blancas') : `${juego.rival.nombre}${juego.rival.bot ? '' : ''} · ${juego.rival.elo}`;
    } else if (juego.modo === 'puzzle') { n[c] = c === juego.humano ? yo.nombre.toUpperCase() : 'RIVAL'; s[c] = c ? 'Negras' : 'Blancas'; }
    else { n[c] = c ? 'NEGRAS' : 'BLANCAS'; s[c] = 'Jugador ' + (c + 1); }
  }
  return [n, s];
}

function refrescar() {
  const est = juego.est;
  const conReloj = reloj.habilitado;
  const [nombres, subs] = Array.isArray(nombresJugadores()[0]) ? nombresJugadores() : nombresJugadores();
  const mat = partida.material();
  ui.jugadores({
    arriba: ladoInferior() ^ 1, nombres, subs, capt: partida.capturadas(), ventaja: mat, turno: partida.turno,
    relojes: reloj.restante, conReloj, corre: reloj.activo, fin: !!est.fin, colores: juego.online ? juego.online.colores : null, extra: juego.online ? juego.online.extra : null,
  });
  if (!analisisOn()) ui.ventaja(mat); else ui.evaluacion(juego.evalActual !== undefined ? juego.evalActual : 0);
  ui.jugadas(partida.jugadas, partida.cursor, juego.inicioTurno === NEGRAS, juego.revision ? juego.revision.cls : null);
  const final = partida.alFinal;
  const miTurno = !est.fin && partida.turno === juego.humano_ok() && !juego.pensando && juego.modo !== 'archivo';
  ui.botones({
    deshacer: !juego.ocupado && puedeDeshacerA() >= 0 && !juego.tarea && juego.modo !== 'online',
    rehacer: !juego.ocupado && puedeRehacerA() >= 0 && !juego.tarea && juego.modo !== 'online',
    pista: miTurno && !juego.ocupado && juego.modo !== 'dos' && juego.modo !== 'online',
    tablas: !est.fin && final && partida.cursor > 0 && !juego.tarea && juego.modo !== 'archivo',
    rendirse: !est.fin && final && partida.cursor > 0 && !juego.tarea && juego.modo !== 'archivo',
    girar: true,
    analisis: { activo: opts.analisisVivo, permitido: analisisPermitido() },
    revisar: partida.jugadas.length >= 2 && analisisPermitido(),
    guardar: partida.jugadas.length > 0 && !juego.tarea,
  });
  ui.revision(final || juego.modo === 'archivo' ? '' : `REVISIÓN ${partida.cursor}/${partida.jugadas.length}`);
  let txt = '', clase = '';
  if (est.fin) { txt = textoFin(est).corto; clase = 'fin'; }
  else if (juego.pensando) { txt = 'PENSANDO'; clase = 'pensando'; }
  else if (est.jaque) { txt = '¡JAQUE!'; clase = 'jaque'; }
  else if (!final || juego.modo === 'archivo') txt = '';
  else if (juego.modo === 'ia' || juego.modo === 'leccion' || juego.modo === 'puzzle') txt = partida.turno === juego.humano ? (juego.tarea ? '' : 'TU TURNO') : '';
  else if (juego.modo === 'online') txt = juego.online ? juego.online.estadoTxt() : '';
  else txt = 'TURNO: ' + (partida.turno ? 'NEGRAS' : 'BLANCAS');
  ui.estado(txt, clase);
  // apertura
  const ap = (juego.tarea || !opts.mostrarApertura) ? null : nombreApertura(partida);
  juego.apertura = ap;
  ui.aperturaTxt(ap ? `${ap.eco} · ${ap.nombre}` : '');
  ui.nota(juego.modo === 'archivo' || (est.fin && !juego.tarea) || (juego.revision && true), juego.notas[partida.cursor] || '');
  marcas();
  vista.pedir();
  actualizarAnalisis();
}

// ---------------------------------------------------------- análisis en vivo
const analisisPermitido = () => !juego.tarea && !(juego.online && juego.online.jugando) && !(juego.modo === 'puzzle');
const analisisOn = () => opts.analisisVivo && analisisPermitido();
let vivo = null;
function actualizarAnalisis() {
  if (!analisisOn()) { if (vivo) vivo.cancelar(); ui.panelAnalisis(null); juego.mejorFlecha = null; return; }
  if (!vivo) vivo = new AnalisisVivo(motorAnalisis(), resultadoAnalisis);
  if (juego.est.fin) { vivo.cancelar(); ui.panelAnalisis(null); const g = juego.est.ganador; ui.evaluacion(0, g === 0 ? 'b' : g === 1 ? 'n' : 't'); return; }
  ui.panelAnalisis([]);
  vivo.pedir(partida.fenInicial, partida.uciHasta(), { multi: opts.multiPV, prof: 16, tiempo: 1500 });
}
function resultadoAnalisis(r) {
  if (!analisisOn() || r.fen !== partida.fenInicial || r.movs.join() !== partida.uciHasta().join()) return;
  const signo = r.turno === 0 ? 1 : -1;
  const lineas = r.lineas.map((l) => {
    const cpB = l.puntuacion * signo;
    return { eval: textoEval(cpB), cls: cpB >= 0 ? 'b' : 'n', txt: pvASan(r.fen, r.movs, l.pv, 6).join(' ') };
  });
  ui.panelAnalisis(lineas);
  if (r.lineas[0]) {
    juego.evalActual = r.lineas[0].puntuacion * signo;
    ui.evaluacion(juego.evalActual);
    const m = partida.pos.uciAMov(r.lineas[0].uci, juego.legales);
    juego.mejorFlecha = m ? [movDesde(m), movHasta(m)] : null;
    flechasFijas();
  }
}

// ---------------------------------------------------------- deshacer / rehacer / navegar
function puedeDeshacerA() {
  if (partida.cursor === 0 || juego.modo === 'archivo') return -1;
  if (juego.modo === 'dos') return partida.cursor - 1;
  for (let t = partida.cursor - 1; t >= 0; t--) if (turnoEnPly(t) === juego.humano) return t;
  return -1;
}
function puedeRehacerA() {
  const len = partida.jugadas.length;
  if (partida.cursor >= len || juego.modo === 'archivo') return -1;
  if (juego.modo === 'dos') return partida.cursor + 1;
  for (let t = partida.cursor + 1; t <= len; t++) if (turnoEnPly(t) === juego.humano) return t;
  return len;
}

function irAPly(n, animar = false) {
  cancelarIA(); cancelarPista(); ui.cancelarConfirmarJugada();
  limpiarSeleccion(); juego.pista = null; juego.pistaPaso = 0; juego.premov = null; juego.mejorFlecha = null;
  const antes = partida.cursor;
  const bAntes = copiaTablero();
  partida.irA(n);
  actualizarLegales();
  juego.est = partida.estado();
  if (animar && partida.cursor === antes + 1) vista.jugar(partida.ultima.m, bAntes);
  else vista.sincronizar(partida.pos.b, false);
  if (!juego.online) {
    reloj.detener();
    if (reloj.habilitado) reloj.fijar(juego.tiempos[partida.cursor] || reloj.restante);
    if (partida.alFinal && !juego.est.fin && reloj.habilitado && partida.cursor >= 1 && !juego.pausa) reloj.iniciar(partida.turno);
  }
  refrescar();
  guardar();
  if (partida.alFinal && !juego.est.fin && esIA(partida.turno) && juego.modo !== 'archivo') pedirIA();
}
function deshacer() { const t = puedeDeshacerA(); if (t >= 0 && !juego.tarea) { juego.deshechas++; Sonido.reproducir('clic'); irAPly(t); } }
function rehacer() { const t = puedeRehacerA(); if (t >= 0 && !juego.tarea) { Sonido.reproducir('clic'); irAPly(t, t === partida.cursor + 1); } }

function navegar(x) {
  const len = partida.jugadas.length;
  let n = partida.cursor;
  if (x === 'ini') n = 0; else if (x === 'atras') n--; else if (x === 'adelante') n++; else if (x === 'fin') n = len; else if (typeof x === 'number') n = x;
  n = Math.max(0, Math.min(len, n));
  if (n !== partida.cursor) irAPly(n, n === partida.cursor + 1);
}

function continuarDesdeAqui() {
  partida.jugadas.length = partida.cursor;
  juego.tiempos.length = partida.cursor + 1;
  juego.est = partida.estado();
  if (reloj.habilitado && partida.cursor >= 1 && !juego.est.fin) reloj.iniciar(partida.turno);
  refrescar();
  guardar();
  if (!juego.est.fin && esIA(partida.turno)) pedirIA();
}

function truncarA(n) {
  cancelarIA(); limpiarSeleccion();
  partida.irA(n); partida.jugadas.length = n; juego.tiempos.length = n + 1;
  actualizarLegales(); juego.est = partida.estado();
  vista.sincronizar(partida.pos.b, false);
  refrescar();
}

// ---------------------------------------------------------- fin de partida
function nombreGanador(c) {
  if (juego.modo === 'ia' || juego.modo === 'leccion') return c === juego.humano ? 'Ganas tú' : 'Gana ' + (juego.rival.bot ? juego.rival.nombre : 'el motor');
  if (juego.modo === 'online' && juego.online) return juego.online.espectador ? 'Ganan las ' + (c === BLANCAS ? 'blancas' : 'negras') + ' (' + juego.online.nombres[c] + ')' : (c === juego.humano ? 'Ganas tú' : 'Gana ' + juego.online.rival);
  return c === BLANCAS ? 'Ganan las blancas' : 'Ganan las negras';
}
function textoFin(est) {
  const quien = nombreGanador;
  switch (est.fin) {
    case 'mate': return { titulo: 'JAQUE MATE', texto: quien(est.ganador), corto: 'JAQUE MATE', res: est.ganador };
    case 'ahogado': return { titulo: 'TABLAS', texto: 'Rey ahogado: el bando que mueve no tiene jugadas legales.', corto: 'TABLAS · AHOGADO', res: -1 };
    case 'repeticion': return { titulo: 'TABLAS', texto: 'Triple repetición de la posición.', corto: 'TABLAS · REPETICIÓN', res: -1 };
    case 'cincuenta': return { titulo: 'TABLAS', texto: 'Regla de los 50 movimientos sin capturas ni peones.', corto: 'TABLAS · 50 MOV.', res: -1 };
    case 'material': return { titulo: 'TABLAS', texto: 'Material insuficiente para dar mate.', corto: 'TABLAS · MATERIAL', res: -1 };
    case 'acuerdo': return { titulo: 'TABLAS', texto: 'Tablas por acuerdo.', corto: 'TABLAS · ACUERDO', res: -1 };
    case 'rendicion': return { titulo: 'RENDICIÓN', texto: quien(est.ganador), corto: 'RENDICIÓN', res: est.ganador };
    case 'tiempo': return { titulo: 'TIEMPO AGOTADO', texto: quien(est.ganador), corto: 'TIEMPO AGOTADO', res: est.ganador };
    case 'abandono': return { titulo: 'ABANDONO', texto: quien(est.ganador) + ' (el rival se desconectó)', corto: 'ABANDONO', res: est.ganador };
    default: return { titulo: 'FIN', texto: '', corto: 'FIN', res: -1 };
  }
}

function logro(id) {
  const d = Perfil.otorgar(id);
  if (d) { ui.toast('Logro: ' + d.nombre, 3200); Sonido.reproducir('coronar'); }
}

function finalizar(est) {
  if (juego.cerrada) return;
  juego.cerrada = true;
  reloj.detener();
  cancelarIA();
  if (vivo) vivo.cancelar();
  const t = textoFin(est);
  const res = t.res < 0 ? 't' : (t.res === juego.humano ? 'v' : 'd');
  let sonido = 'tablas';
  if (t.res >= 0) sonido = (juego.modo === 'ia' || juego.modo === 'leccion' || juego.modo === 'online') ? (t.res === juego.humano ? 'victoria' : 'derrota') : 'victoria';
  let eloTxt = '';
  if (juego.modo === 'tarea') return;
  if (juego.modo === 'ia') {
    Guardado.sumarStat(juego.nivel, res);
    const puntua = !juego.sinPuntuar && !juego.deshechas && !juego.ayudas && !partida.fenInicial.includes('x') && (juego.variante === 'estandar' || juego.variante === '960') && partida.fenInicial.length > 0 && (juego.variante === '960' || partida.fenInicial === FEN_INICIAL) && partida.jugadas.length >= 4;
    const ap = juego.apertura;
    const r = Perfil.registrarPartida({ res, rival: juego.rival.nombre, eloRival: juego.rival.elo, eco: ap ? ap.eco : '', apertura: ap ? ap.nombre : '', puntua, modo: 'ia' });
    eloTxt = puntua ? `Elo ${r.elo} (${r.delta >= 0 ? '+' : ''}${r.delta})` : 'Partida no puntuada (con ayudas, ventaja o deshacer).';
    if (res === 'v') {
      logro('primera');
      if (est.fin === 'mate') logro('mate');
      if (Math.ceil(partida.jugadas.length / 2) <= 20) logro('rapido');
      if (puntua && juego.rival.elo >= 1800) logro('bot2000');
      if (puntua && juego.rival.elo >= 1900) logro('sinDeshacer');
    }
    if (est.fin === 'mate' && t.res === juego.humano) logro('mate');
    if (r.elo >= 1500) logro('elo1500');
  } else if (juego.modo === 'online' && online.alFin) eloTxt = online.alFin(est, t, res) || '';
  if (juego.modo === 'ia' || juego.modo === 'dos' || juego.modo === 'online') autoguardarBiblioteca(est);
  Guardado.borrarPartida();
  refrescar();
  setTimeout(() => Sonido.reproducir(sonido), est.fin === 'mate' ? 900 : 200);
  setTimeout(() => ui.fin(t.titulo, t.texto, { revancha: juego.modo !== 'online' || !!(online.puedeRevancha && online.puedeRevancha()), elo: eloTxt }), est.fin === 'mate' ? 1500 : 700);
  if (juego.modo === 'online' && online.finDeJuego) online.finDeJuego(est, t);
}

// ---------------------------------------------------------- acciones de botones
async function accion(a) {
  Sonido.reproducir('clic');
  switch (a) {
    case 'deshacer': if (!(juego.online && juego.online.jugando)) deshacer(); else online.pedirDeshacer && online.pedirDeshacer(); break;
    case 'rehacer': rehacer(); break;
    case 'pista': pedirPista(); break;
    case 'vista': cambiarVista({ blancas: 'negras', negras: 'cenital', cenital: 'blancas' }[juego.vista] || 'blancas'); break;
    case 'girar': cambiarVista(juego.vista === 'negras' ? 'blancas' : 'negras'); break;
    case 'nueva': abrirMenuInicio(); break;
    case 'tablas': ofrecerTablas(); break;
    case 'rendirse': rendirse(); break;
    case 'pgn': mostrarPGN(); break;
    case 'fen': mostrarFEN(); break;
    case 'analisis': if (analisisPermitido()) ajuste('analisisVivo', !opts.analisisVivo); break;
    case 'revisar': revisar(); break;
    case 'guardar': guardarBiblioteca(); break;
    default: break;
  }
}

async function ofrecerTablas() {
  if (juego.est.fin || !partida.alFinal) return;
  if (juego.modo === 'online') { online.ofrecerTablas && online.ofrecerTablas(); return; }
  if (juego.modo === 'dos') {
    const si = await ui.confirmar('OFERTA DE TABLAS', `${partida.turno ? 'Las negras' : 'Las blancas'} ofrecen tablas. ¿Aceptan?`, 'ACEPTAR', 'RECHAZAR');
    if (si) { partida.terminar('acuerdo', -1); juego.est = partida.estado(); finalizar(juego.est); } else ui.toast('Tablas rechazadas');
    return;
  }
  if (!puedeMover()) return;
  ui.estado('El motor lo piensa', 'pensando');
  let r = null;
  try { r = await ia.pedir({ fen: partida.fenInicial, movs: partida.uciHasta(), nivel: { prof: 10, tiempo: 900, ruido: 0, azar: 0, apertura: 0 } }); } catch (e) { /* nada */ }
  refrescar();
  if (!r || r.cancelado) return;
  if (partida.cursor >= 16 && r.puntuacion >= -25) { partida.terminar('acuerdo', -1); juego.est = partida.estado(); finalizar(juego.est); }
  else ui.toast(partida.cursor < 16 ? 'El motor rechaza: es muy pronto para tablas' : 'El motor rechaza las tablas');
}

async function rendirse() {
  if (juego.est.fin || !partida.alFinal) return;
  const si = await ui.confirmar('RENDIRSE', '¿Seguro que quieres rendirte?');
  if (!si) return;
  const perdedor = juego.modo === 'dos' ? partida.turno : juego.humano;
  if (juego.modo === 'online') { online.rendirse && online.rendirse(); return; }
  cancelarIA();
  partida.terminar('rendicion', perdedor ^ 1);
  juego.est = partida.estado();
  finalizar(juego.est);
}

function copiar(texto, avisar) {
  const fin = (ok) => avisar(ok ? 'Copiado al portapapeles' : 'Selecciona el texto y cópialo');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(() => fin(true), () => fin(copiarViejo()));
  else fin(copiarViejo());
}
function copiarViejo() { const a = $('textoArea'); a.focus(); a.select(); try { return document.execCommand('copy'); } catch (e) { return false; } }
function descargar(texto, nombre) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain' }));
  const a = document.createElement('a'); a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function metaPGN() {
  const [n] = nombresJugadores();
  const meta = juego.modo === 'ia' || juego.modo === 'leccion'
    ? { White: juego.humano === BLANCAS ? yo.nombre : juego.rival.nombre, Black: juego.humano === NEGRAS ? yo.nombre : juego.rival.nombre }
    : { White: juego.online ? juego.online.nombres[0] : 'Jugador 1', Black: juego.online ? juego.online.nombres[1] : 'Jugador 2' };
  void n;
  if (juego.apertura) { meta.ECO = juego.apertura.eco; meta.Opening = juego.apertura.nombre; }
  if (juego.relojId !== 'sin') meta.TimeControl = (() => { const r = relojPorId(juego.relojId); return `${r.min * 60}+${r.inc}`; })();
  return meta;
}
function mostrarPGN() {
  ui.texto({ titulo: 'PGN', texto: partida.pgn(juego.pgnMeta || metaPGN(), juego.notas), info: 'Incluye tus anotaciones. Pégalo en cualquier programa de ajedrez.', acciones: [{ texto: 'COPIAR', fn: (t, av) => copiar(t, av) }, { texto: 'DESCARGAR', fn: (t) => descargar(t, 'partida.pgn') }] });
}
function mostrarFEN() {
  ui.texto({
    titulo: 'POSICIÓN (FEN)', texto: partida.pos.aFen(), editable: true, info: 'Copia el FEN o pega otro y pulsa CARGAR para empezar una partida desde esa posición.',
    acciones: [
      { texto: 'CARGAR', fn: (t, av) => { const e = nuevaDesdeUI({ ...inicio.sel, modo: juego.modo === 'archivo' ? 'ia' : juego.modo, fen: t.trim(), variante: 'estandar' }); if (e) av(e); else ui.ocultar('Texto'); } },
      { texto: 'COPIAR', fn: (t, av) => copiar(t, av) },
    ],
  });
}

// ---------------------------------------------------------- biblioteca
function resultadoTexto() { const e = juego.est; if (!e.fin) return '*'; return e.ganador === 0 ? '1-0' : e.ganador === 1 ? '0-1' : '1/2-1/2'; }
function registroBiblioteca() {
  const meta = juego.pgnMeta || metaPGN();
  const ap = juego.apertura;
  return { id: 'g' + Date.now().toString(36) + Math.floor(Math.random() * 999), t: Date.now(), titulo: `${meta.White} - ${meta.Black}`, blancas: meta.White, negras: meta.Black, res: resultadoTexto(), apertura: ap ? ap.nombre : '', pgn: partida.pgn(meta, juego.notas), ply: partida.jugadas.length };
}
function guardarBiblioteca(auto = false) {
  const B = Guardado.cargarBiblioteca();
  const r = registroBiblioteca();
  if (juego.idBiblioteca) { const i = B.findIndex((g) => g.id === juego.idBiblioteca); if (i >= 0) { r.id = juego.idBiblioteca; B[i] = r; } else B.push(r); } else { B.push(r); juego.idBiblioteca = r.id; }
  while (B.length > 80) B.shift();
  Guardado.guardarBiblioteca(B);
  if (!auto) ui.toast('Partida guardada en la biblioteca');
}
function autoguardarBiblioteca() { if (partida.jugadas.length >= 2) guardarBiblioteca(true); }

function abrirBiblioteca(id) {
  const g = Guardado.cargarBiblioteca().find((x) => x.id === id);
  if (!g) return;
  const e = cargarPGNEnTablero(g.pgn, g.titulo);
  if (e) ui.toast(e); else juego.idBiblioteca = id;
}
function cargarPGNEnTablero(texto, titulo) {
  const juegos = parsearPGN(texto);
  if (!juegos.length) return 'No se encontró ninguna partida';
  const g = juegos[0], r = juegoAUci(g);
  if (r.error) return r.error;
  iniciarPartida({ fen: r.fen, modo: 'archivo', nivel: 'medio', relojId: 'sin', girarAuto: false, humano: BLANCAS, jugadas: r.ucis, notas: g.notas, pgnMeta: g.cab, variante: 'estandar' });
  juego.est = partida.estado();
  ui.toast(titulo ? 'Abierta: ' + titulo : 'Partida cargada');
  return null;
}
function importarPGN(texto) {
  const juegos = parsearPGN(texto);
  if (!juegos.length) return 'No se encontró ninguna partida en el texto.';
  const B = Guardado.cargarBiblioteca();
  let n = 0, mal = 0;
  for (const g of juegos) {
    const r = juegoAUci(g);
    if (r.error || !r.ucis.length) { mal++; continue; }
    B.push({ id: 'i' + Date.now().toString(36) + n + Math.floor(Math.random() * 999), t: Date.now(), titulo: `${g.cab.White || 'Blancas'} - ${g.cab.Black || 'Negras'}`, blancas: g.cab.White || '', negras: g.cab.Black || '', res: g.res, apertura: g.cab.Opening || '', pgn: texto.length < 400000 && juegos.length === 1 ? texto : reconstruirPGN(g, r), ply: r.ucis.length });
    n++;
  }
  while (B.length > 80) B.shift();
  Guardado.guardarBiblioteca(B);
  return `Importadas ${n} partida(s)${mal ? `, ${mal} con errores` : ''}.`;
}
function reconstruirPGN(g, r) {
  const p = new Partida(r.fen);
  for (const u of r.ucis) p.jugar(p.pos.uciAMov(u));
  return p.pgn({ ...g.cab }, g.notas);
}
function exportarBiblioteca() {
  const B = Guardado.cargarBiblioteca();
  const t = B.map((g) => g.pgn).join('\n\n');
  ui.texto({ titulo: 'BIBLIOTECA (PGN)', texto: t || '(vacía)', info: `${B.length} partidas.`, acciones: [{ texto: 'COPIAR', fn: (x, av) => copiar(x, av) }, { texto: 'DESCARGAR', fn: (x) => descargar(x, 'biblioteca.pgn') }] });
}

// ---------------------------------------------------------- revisión de la partida
let cancelRev = false;
async function revisar() {
  if (partida.jugadas.length < 2) return;
  ui.mostrar('Revision');
  revisionProgreso(0, partida.jugadas.length);
  cancelRev = false;
  $('btnRevCancelar') && ($('btnRevCancelar').onclick = () => { cancelRev = true; ui.ocultar('Revision'); });
  const ucis = partida.jugadas.map((j) => j.uci);
  const res = await revisarPartida(motorAnalisis(), { fenInicial: partida.fenInicial, ucis }, {
    tiempo: 300, prof: 14, cancelado: () => cancelRev,
    alProgreso: (i, n) => { revisionProgreso(i, n); $('btnRevCancelar') && ($('btnRevCancelar').onclick = () => { cancelRev = true; ui.ocultar('Revision'); }); },
  });
  if (!res) return;
  juego.revision = res;
  logro('revision');
  const [n] = nombresJugadores();
  pintarRevision(res, [n[0], n[1]], (ply) => { ui.ocultar('Revision'); navegar(ply); });
  refrescar();
}

// ---------------------------------------------------------- nueva partida / reanudar
function fenHandicap(quitar, lado) {
  const p = Posicion.desdeFen(FEN_INICIAL);
  const f = lado ? 7 : 0, fila = lado * 56;
  for (const q of quitar) {
    if (q === 'q') p.b[fila + 3] = 0;
    else if (q === 'a') { p.b[fila] = 0; p.enroque &= ~(lado ? 8 : 2); }
    else if (q === 'b') p.b[fila + 1] = 0;
    else if (q === 'c') p.b[fila + 2] = 0;
    else if (q === 'pf') p.b[(lado ? 6 : 1) * 8 + 5] = 0;
    else if (q === 'pg') p.b[(lado ? 6 : 1) * 8 + 6] = 0;
  }
  void f;
  return p.aFen();
}

function nuevaDesdeUI(cfg) {
  let fen = cfg.fen || FEN_INICIAL;
  const humano = cfg.color === 'azar' ? (Math.random() < 0.5 ? BLANCAS : NEGRAS) : (cfg.color === 'negras' ? NEGRAS : BLANCAS);
  let variante = cfg.variante || 'estandar';
  let humanoF = humano;
  if (!cfg.fen) {
    if (variante === '960') { const n = cfg.num960 >= 0 ? cfg.num960 : Math.floor(Math.random() * 960); fen = fen960(n); inicio.sel.num960 = n; }
    else if (variante === 'handicap') { const v = VENTAJAS.find((x) => x.id === cfg.ventaja) || VENTAJAS[0]; const humanoRecibe = cfg.ventajaLado === 'tu'; fen = fenHandicap(v.quitar, humanoRecibe ? humano ^ 1 : humano); }
    else if (variante === 'practica') { const p = PRACTICA[cfg.practica] || PRACTICA[0]; fen = p[1]; humanoF = p[2] === 'b' ? NEGRAS : BLANCAS; }
  } else variante = 'personalizada';
  try { Posicion.desdeFen(fen); } catch (e) { return 'FEN no válido: ' + e.message; }
  for (const k of ['modo', 'color', 'nivel', 'reloj', 'girarAuto', 'variante', 'ventaja', 'ventajaLado', 'practica']) if (cfg[k] !== undefined) opts[k] = cfg[k];
  Guardado.guardarOpciones(opts);
  iniciarPartida({ fen, modo: cfg.modo, nivel: cfg.nivel, relojId: cfg.reloj, girarAuto: cfg.girarAuto, humano: humanoF, variante, sinPuntuar: variante === 'handicap' || variante === 'practica' || variante === 'personalizada' });
  return null;
}

function revancha() {
  ui.ocultar('Fin');
  if (juego.modo === 'online') { online.revancha && online.revancha(); return; }
  iniciarPartida({ fen: juego.variante === '960' ? partida.fenInicial : FEN_INICIAL, modo: juego.modo, nivel: juego.nivel, relojId: juego.relojId, girarAuto: juego.girarAuto, humano: juego.modo === 'ia' ? juego.humano ^ 1 : BLANCAS, variante: juego.variante, sinPuntuar: juego.sinPuntuar });
}

function iniciarPartida(c) {
  cancelarIA(); cancelarPista();
  ia.cancelar(); ia.nuevaPartida();
  if (vivo) vivo.cancelar();
  reloj.detener();
  partida.reiniciar(c.fen);
  Object.assign(juego, {
    modo: c.modo, humano: c.humano, nivel: c.nivel, relojId: c.relojId, girarAuto: c.girarAuto, variante: c.variante || 'estandar', rival: rivalPorId(c.rival || c.nivel),
    sel: -1, pista: null, pistaPaso: 0, cerrada: false, ocupado: false, pensando: false, inicioTurno: partida.pos.turno, cargada: true, pausaMenu: false, pausa: false,
    premov: null, ayudas: 0, deshechas: 0, notas: c.notas || {}, tarea: c.tarea || null, revision: null, sinPuntuar: !!c.sinPuntuar, idBiblioteca: null, pgnMeta: c.pgnMeta || null,
    nombres: c.nombres || null, online: c.online || null, evalActual: 0, mejorFlecha: null, confirmando: null,
  });
  if (c.jugadas) for (const u of c.jugadas) partida.jugar(partida.pos.uciAMov(u));
  const rel = relojPorId(c.relojId);
  reloj.configurar(rel.min, rel.inc);
  juego.tiempos = Array.from({ length: partida.jugadas.length + 1 }, () => [reloj.restante[0], reloj.restante[1]]);
  actualizarLegales();
  juego.est = partida.estado();
  ui.ocultar('Inicio'); ui.ocultar('Fin'); ui.ocultar('Pausa');
  if (control) control.reiniciarCursor();
  flechas.limpiarUsuario();
  cambiarVista(c.vistaInicial || ((c.modo === 'ia' || c.modo === 'leccion' || c.modo === 'puzzle' || c.modo === 'online') && c.humano === NEGRAS ? 'negras' : 'blancas'), true);
  vista.sincronizar(partida.pos.b, true);
  panelTareaActualizar();
  refrescar();
  guardar();
  pedirWakeLock();
  if (c.modo === 'archivo') { partida.irA(0); irAPly(0); return; }
  if (!juego.est.fin && esIA(partida.turno) && !juego.tarea) pedirIA();
  else if (juego.tarea && esIA(partida.turno) && juego.tarea.tipo === 'final') pedirIA();
}

function guardar() {
  if (juego.est.fin || juego.tarea || juego.modo === 'archivo' || juego.modo === 'online') return;
  Guardado.guardarPartida({
    fenInicial: partida.fenInicial, movs: partida.jugadas.map((j) => j.uci), cursor: partida.cursor,
    modo: juego.modo, humano: juego.humano, nivel: juego.nivel, relojId: juego.relojId, girarAuto: juego.girarAuto,
    tiempos: juego.tiempos, vista: juego.vista, variante: juego.variante, notas: juego.notas, sinPuntuar: juego.sinPuntuar, ayudas: juego.ayudas, deshechas: juego.deshechas,
  });
}

function infoGuardada() {
  const d = Guardado.cargarPartida();
  if (!d) { ui.inicioConPartida(null); return; }
  const n = Math.ceil(d.movs.length / 2);
  ui.inicioConPartida(`${d.modo === 'dos' ? '2 jugadores' : 'Vs computadora'} · ${n} jugada${n === 1 ? '' : 's'}`);
}

function abrirMenuInicio() {
  const enCurso = juego.cargada && !juego.est.fin && !juego.tarea && juego.modo !== 'archivo';
  if (juego.online && juego.online.jugando) { ui.toast('Estás en una partida online: el reloj sigue corriendo'); online.menu && online.menu(); return; }
  if (enCurso) {
    cancelarIA(); cancelarPista();
    reloj.detener();
    juego.pausaMenu = true;
    const n = Math.ceil(partida.jugadas.length / 2);
    ui.inicioConPartida(`${juego.modo === 'dos' ? '2 jugadores' : 'Vs computadora'} · ${n} jugada${n === 1 ? '' : 's'}`, true);
  } else { infoGuardada(); }
  inicio.actualizarOpciones(opts);
  ui.mostrar('Inicio');
}

function reanudar() {
  if (juego.cargada && juego.pausaMenu && !juego.est.fin) {
    juego.pausaMenu = false;
    ui.ocultar('Inicio');
    if (reloj.habilitado && partida.alFinal && partida.cursor >= 1) reloj.iniciar(partida.turno);
    refrescar();
    if (partida.alFinal && esIA(partida.turno)) pedirIA();
    return;
  }
  const d = Guardado.cargarPartida();
  if (!d) { ui.ocultar('Inicio'); return; }
  try {
    reloj.detener(); cancelarIA();
    partida.reiniciar(d.fenInicial);
    for (const u of d.movs) {
      const m = partida.pos.uciAMov(u);
      if (!m) throw new Error('jugada ilegal guardada ' + u);
      partida.jugar(m);
    }
    partida.irA(d.cursor);
    Object.assign(juego, {
      modo: d.modo === 'dos' ? 'dos' : 'ia', humano: d.humano === NEGRAS ? NEGRAS : BLANCAS, nivel: d.nivel || 'medio', rival: rivalPorId(d.nivel || 'medio'),
      relojId: d.relojId, girarAuto: !!d.girarAuto, sel: -1, pista: null, cerrada: false, ocupado: false, pensando: false, pausa: false, premov: null,
      inicioTurno: Posicion.desdeFen(d.fenInicial).turno, cargada: true, pausaMenu: false, variante: d.variante || 'estandar', notas: d.notas || {},
      ayudas: d.ayudas || 0, deshechas: d.deshechas || 0, sinPuntuar: !!d.sinPuntuar, tarea: null, revision: null, online: null, nombres: null, idBiblioteca: null, pgnMeta: null,
    });
    const rel = relojPorId(d.relojId);
    reloj.configurar(rel.min, rel.inc);
    juego.tiempos = Array.isArray(d.tiempos) && d.tiempos.length === d.movs.length + 1 ? d.tiempos : Array.from({ length: d.movs.length + 1 }, () => [reloj.restante[0], reloj.restante[1]]);
    if (reloj.habilitado) reloj.fijar(juego.tiempos[partida.cursor]);
    actualizarLegales();
    juego.est = partida.estado();
    ui.ocultar('Inicio');
    if (control) control.reiniciarCursor();
    cambiarVista(d.vista || 'blancas', true);
    vista.sincronizar(partida.pos.b, true);
    panelTareaActualizar();
    if (reloj.habilitado && partida.alFinal && partida.cursor >= 1 && !juego.est.fin) reloj.iniciar(partida.turno);
    refrescar();
    if (juego.est.fin) finalizar(juego.est);
    else if (partida.alFinal && esIA(partida.turno)) pedirIA();
  } catch (e) {
    console.warn('No se pudo reanudar la partida:', e);
    Guardado.borrarPartida();
    ui.inicioConPartida(null);
    ui.toast('La partida guardada estaba dañada');
  }
}

// ---------------------------------------------------------- pausa, pantalla completa, wake lock
function pausar() {
  if (ui.hayModal() || !juego.cargada || juego.est.fin) return;
  if (juego.online && juego.online.jugando) { ui.toast('Online: la partida no se pausa'); return; }
  juego.pausa = true;
  cancelarIA(); reloj.detener();
  ui.mostrar('Pausa');
}
function seguir() {
  ui.ocultar('Pausa');
  if (!juego.pausa) return;
  juego.pausa = false;
  if (reloj.habilitado && partida.alFinal && partida.cursor >= 1 && !juego.est.fin) reloj.iniciar(partida.turno);
  if (partida.alFinal && esIA(partida.turno) && !juego.est.fin) pedirIA();
  refrescar();
}
function pantallaCompleta() {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement);
  } catch (e) { ui.toast('Pantalla completa no disponible'); }
}
let wake = null;
async function pedirWakeLock() {
  try { if (navigator.wakeLock && !wake && document.body.classList.contains('tactil')) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { /* nada */ }
}

// ---------------------------------------------------------- rompecabezas y lecciones
let rompe = Guardado.cargarRompe();
let sesionRacha = null;
function panelTareaActualizar() {
  const t = juego.tarea;
  if (!t) { ui.panelTarea(null); return; }
  const tr = (txt, clase) => ({ texto: txt, clase });
  if (t.tipo === 'puzzle') {
    const p = t.p;
    const pts = t.modo === 'racha' ? `Racha ${sesionRacha ? sesionRacha.aciertos : 0} · vidas ${'♥'.repeat(Math.max(0, 3 - (sesionRacha ? sesionRacha.fallos : 0)))}` : '';
    ui.panelTarea({
      titulo: `${Rompe.TIPOS[p.tipo]} · dificultad ${p.r}`, ...tr(t.msg || `Juegan ${partida.turno === juego.humano ? (juego.humano ? 'negras' : 'blancas') : ''}: encuentra la mejor jugada.`, t.clase), puntos: pts,
      botones: t.fin ? [{ id: 'siguiente', txt: 'SIGUIENTE' }, { id: 'salir', txt: 'SALIR' }] : [{ id: 'pista', txt: 'PISTA' }, { id: 'solucion', txt: 'SOLUCIÓN' }, { id: 'saltar', txt: 'SALTAR' }, { id: 'salir', txt: 'SALIR' }],
    }, botonTarea);
  } else {
    const l = t.leccion;
    ui.panelTarea({
      titulo: l.titulo, ...tr(t.msg || l.texto.join(' '), t.clase),
      botones: t.fin ? [{ id: t.ok ? 'siguiente' : 'reintentar', txt: t.ok ? 'SIGUIENTE' : 'REINTENTAR' }, { id: 'salir', txt: 'SALIR' }] : [{ id: 'pista', txt: 'PISTA' }, { id: 'reintentar', txt: 'REINICIAR' }, { id: 'salir', txt: 'SALIR' }],
    }, botonTarea);
  }
}

function botonTarea(id) {
  const t = juego.tarea; if (!t) return;
  Sonido.reproducir('clic');
  if (id === 'salir') { juego.tarea = null; ui.panelTarea(null); juego.modo = 'dos'; juego.est = { fin: 'x' }; abrirMenuInicio(); return; }
  if (id === 'pista') { pedirPista(); return; }
  if (t.tipo === 'puzzle') {
    if (id === 'solucion') { t.sol = t.p.sol; t.fallido = true; mostrarSolucion(); }
    else if (id === 'saltar') { if (!t.fin) resolverPuzzle(false, true); iniciarPuzzle(t.modo, null, t.p.id); }
    else if (id === 'siguiente') iniciarPuzzle(t.modo, null, t.p.id);
  } else if (id === 'reintentar') iniciarLeccion(t.leccion.id);
  else if (id === 'siguiente') { const i = LECCIONES.findIndex((x) => x.id === t.leccion.id); const n = LECCIONES[i + 1]; if (n) iniciarLeccion(n.id); else { juego.tarea = null; abrirMenuInicio(); } }
}

async function mostrarSolucion() {
  const t = juego.tarea;
  juego.pistaPaso = 3;
  const u = t.p.sol[t.paso];
  const m = u && partida.pos.uciAMov(u, juego.legales);
  if (m) { juego.pista = [movDesde(m), movHasta(m)]; ui.toast('Solución: ' + sanFigurada(partida.pos.san(m, juego.legales))); }
  t.pistas = 9; refrescar();
}

function turnoDeFen(fen) { return fen.split(' ')[1] === 'b' ? NEGRAS : BLANCAS; }

function iniciarPuzzle(modo, p = null, excluir = -1) {
  rompe = Guardado.cargarRompe();
  if (modo === 'racha' && (!sesionRacha || excluir < 0)) { sesionRacha = { aciertos: 0, fallos: 0 }; rompe.rachaActual = 0; }
  if (modo === 'racha') rompe.rachaActual = sesionRacha.aciertos;
  p = p || Rompe.elegir(modo, rompe, excluir);
  if (!p) { ui.toast('No hay puzzles disponibles'); return; }
  const humano = turnoDeFen(p.fen);
  iniciarPartida({ fen: p.fen, modo: 'puzzle', nivel: 'medio', relojId: 'sin', girarAuto: false, humano, tarea: { tipo: 'puzzle', p, modo, paso: 0, errores: 0, pistas: 0, fin: false, msg: '', clase: '' }, sinPuntuar: true, variante: 'estandar' });
}

async function validarTarea(m) {
  const t = juego.tarea;
  if (t.fin) return false;
  const uci = movAUci(m, partida.pos);
  const p = t.p || { sol: t.leccion.sol, tipo: 'x', alt: [] };
  const sol = t.sol || p.sol;
  let ok = false;
  const esperada = sol[t.paso];
  if (esperada === uci || (t.paso === 0 && p.alt && p.alt.includes(uci))) ok = true;
  else if (p.tipo !== 'x' || t.leccion) {
    // mate inmediato en el último paso
    partida.pos.hacer(m); const mate = partida.pos.enJaque() && !partida.pos.tieneLegales(); partida.pos.deshacer();
    if (mate && t.paso >= sol.length - 1 && p.tipo !== 'x') ok = true;
  }
  if (!ok && t.paso > 0 && p.tipo !== 'x' || (!ok && t.paso > 0 && p.tipo === 'x')) ok = await equivalente(uci);
  if (ok) return true;
  t.errores++;
  Sonido.reproducir('error'); vibrar(0.6, 0.3, 200);
  t.msg = '✖ No es esa. Inténtalo de nuevo.'; t.clase = 'mal';
  if (t.p) {
    if (t.modo === 'racha' && sesionRacha) { sesionRacha.fallos++; if (sesionRacha.fallos >= 3) { resolverPuzzle(false); t.msg = `Fin de la racha: ${sesionRacha.aciertos} puzzles.`; t.fin = true; sesionRacha = null; } }
    else if (t.errores === 1) { /* un fallo no cierra el puzzle, pero ya no puntúa */ }
  }
  panelTareaActualizar();
  return false;
}

// ¿la jugada es tan buena como la de la solución? (el motor lo comprueba)
async function equivalente(uci) {
  try {
    const r = await motorAnalisis().pedir({ tipo: 'analizar', fen: partida.fenInicial, movs: partida.uciHasta(), multi: 4, prof: 10, tiempo: 700 });
    const L = r && r.lineas; if (!L || !L.length) return false;
    const mi = L.find((l) => l.uci === uci), mejor = L[0];
    if (!mi) return false;
    if (esMate(mejor.puntuacion)) return esMate(mi.puntuacion) && mi.puntuacion >= mejor.puntuacion - 2;
    return mi.puntuacion >= mejor.puntuacion - 40;
  } catch (e) { return false; }
}

function resolverPuzzle(ok, salto = false) {
  const t = juego.tarea; if (!t || !t.p || t.contado) return 0;
  t.contado = true;
  const bien = ok && t.errores === 0 && t.pistas === 0 && !t.fallido;
  rompe = Guardado.cargarRompe();
  const d = Rompe.registrar(rompe, t.p, bien, t.modo);
  void salto;
  if (rompe.aciertos >= 10) logro('p10');
  if (rompe.aciertos >= 50) logro('p50');
  if (rompe.racha >= 5) logro('racha5');
  return d;
}

async function tareaDespues(m, origen) {
  const t = juego.tarea;
  if (t.tipo === 'final') return leccionFinalDespues(m, origen);
  if (origen === 'tarea') { t.paso++; refrescar(); return; }
  // jugada del usuario correcta
  t.paso++;
  const sol = t.sol || (t.p ? t.p.sol : t.leccion.sol);
  const est = juego.est;
  if (t.paso >= sol.length || est.fin === 'mate') { terminarTarea(true); return; }
  Sonido.reproducir('clic');
  t.msg = '✔ ¡Bien! Sigue…'; t.clase = 'bien'; panelTareaActualizar();
  await dormir(550);
  let u = sol[t.paso];
  let rm = u ? partida.pos.uciAMov(u, juego.legales) : 0;
  if (!rm) { // respuesta libre: la mejor defensa según el motor
    try { const r = await ia.pedir({ fen: partida.fenInicial, movs: partida.uciHasta(), nivel: { prof: 8, tiempo: 500, ruido: 0, azar: 0, apertura: 0 } }); rm = r && r.uci ? partida.pos.uciAMov(r.uci, juego.legales) : 0; } catch (e) { /* nada */ }
    if (!rm) rm = juego.legales[0];
  }
  juego.permitirEjecutar = false;
  ejecutar(rm, 'tarea');
}

function terminarTarea(ok) {
  const t = juego.tarea;
  t.fin = true; t.ok = ok;
  if (t.tipo === 'puzzle') {
    const bien = ok && t.errores === 0 && t.pistas === 0 && !t.fallido;
    const d = resolverPuzzle(ok);
    if (t.modo === 'racha' && sesionRacha && ok) sesionRacha.aciertos++;
    t.msg = bien ? `¡Resuelto! ${d >= 0 ? '+' : ''}${d} de nivel (${Guardado.cargarRompe().elo})` : (ok ? `Resuelto con ayuda o fallos: ${d} de nivel.` : 'No resuelto.');
    t.clase = bien ? 'bien' : 'mal';
    Sonido.reproducir(bien ? 'victoria' : 'tablas');
  } else {
    t.msg = ok ? '¡Lección completada!' : 'Lo intentaremos otra vez.'; t.clase = ok ? 'bien' : 'mal';
    if (ok) { const L = Guardado.cargarLecciones(); L[t.leccion.id] = 1; Guardado.guardarLecciones(L); if (Object.keys(L).length >= 3) logro('lecciones'); Sonido.reproducir('victoria'); }
  }
  juego.est = { fin: 'tarea' };
  panelTareaActualizar();
}

function iniciarLeccion(id) {
  const l = leccionPorId(id); if (!l) return;
  const humano = turnoDeFen(l.fen);
  if (l.tipo === 'tactica') {
    iniciarPartida({ fen: l.fen, modo: 'leccion', nivel: 'maestro', relojId: 'sin', girarAuto: false, humano, tarea: { tipo: 'tactica', leccion: l, sol: l.sol, paso: 0, errores: 0, pistas: 0, fin: false, msg: l.texto.join(' ') }, sinPuntuar: true });
  } else {
    iniciarPartida({ fen: l.fen, modo: 'leccion', nivel: 'maestro', relojId: 'sin', girarAuto: false, humano, rival: 'leccion', tarea: { tipo: 'final', leccion: l, paso: 0, errores: 0, pistas: 0, fin: false, msg: l.texto.join(' ') }, sinPuntuar: true });
  }
  juego.rival = { id: 'leccion', nombre: 'Motor', elo: 2000, bot: null, motor: { prof: 8, tiempo: 350, ruido: 0, azar: 0, apertura: 0, libro: false } };
  if (juego.tarea.tipo === 'final' && esIA(partida.turno)) pedirIA();
}

function leccionFinalDespues(m, origen) {
  const t = juego.tarea, l = t.leccion, est = juego.est;
  if (origen !== 'ia' && partida.cursor > 0) t.mov = (t.mov || 0) + 1;
  if (origen === 'local' && movPromo(m) && l.meta === 'coronar') { terminarTarea(true); return; }
  if (est.fin === 'mate') { terminarTarea(est.ganador === juego.humano); return; }
  if (est.fin) { t.msg = est.fin === 'ahogado' ? '¡Ahogado! Es tablas: deja siempre una jugada al rival.' : 'La partida terminó en tablas.'; t.clase = 'mal'; terminarTarea(false); t.msg = est.fin === 'ahogado' ? '¡Ahogado! Es tablas: deja siempre una jugada al rival.' : t.msg; panelTareaActualizar(); return; }
  if ((t.mov || 0) >= l.max) { t.msg = `Superaste el límite de ${l.max} jugadas.`; terminarTarea(false); t.msg = `Superaste el límite de ${l.max} jugadas.`; panelTareaActualizar(); return; }
  t.msg = `${l.texto[0]} (jugada ${t.mov || 0}/${l.max})`; panelTareaActualizar();
  if (esIA(partida.turno)) pedirIA();
}

// ---------------------------------------------------------- ajustes
function aplicarGraficos() {
  if (vista.es2d) { vista.fijarOpciones({ set2d: opts.set2d, daltonico: opts.daltonico, coordenadas: opts.coordenadas, reducir: opts.reducirMovimiento }); vista.fijarTema(opts.tema); }
  else { vista.fijarCalidad(calidadEfectiva(opts)); vista.fijarOpciones({ set3d: opts.set3d, daltonico: opts.daltonico, limiteFps: opts.limiteFps, reducir: opts.reducirMovimiento, coordenadas: opts.coordenadas }); vista.fijarTema(opts.tema); }
  CONFIG.animacion.mover = opts.reducirMovimiento ? 0.01 : 0.38;
  marcas();
}
function ajuste(k, v, vivoCambio = false) {
  if (k === 'teclas' && v === null) v = { ...Guardado.TECLAS_BASE };
  opts[k] = v;
  Guardado.guardarOpciones(opts);
  switch (k) {
    case 'tema': case 'set3d': case 'set2d': case 'daltonico': case 'calidad': case 'sombras': case 'antialias': case 'particulas': case 'limiteFps': case 'coordenadas': case 'reducirMovimiento':
      if (k === 'calidad') { opts.sombras = 'auto'; opts.antialias = 'auto'; opts.particulas = 'auto'; }
      if (!vivoCambio || k !== 'resolucion') aplicarGraficos(); break;
    case 'resolucion': if (!vivoCambio) aplicarGraficos(); break;
    case 'render': ui.toast('Recargando para cambiar el modo de dibujo…'); setTimeout(() => location.reload(), 600); break;
    case 'sonido': Sonido.iniciar(); Sonido.fijarSilencio(!v); if (v) Sonido.reproducir('clic'); break;
    case 'musica': if (v) { Sonido.iniciar(); iniciarMusica(); } else detenerMusica(); break;
    case 'volumen': Sonido.fijarVolumen(v); break;
    case 'volMusica': case 'volEfectos': Sonido.fijarVolumenes(opts.volMusica, opts.volEfectos); break;
    case 'ayuda': marcas(); break;
    case 'girarAuto': juego.girarAuto = v; break;
    case 'vibracion': cfgVib.activa = v; break;
    case 'vibIntensidad': cfgVib.k = v; break;
    case 'flechasDerecho': ui.toast('Recarga la página para aplicar este cambio de clic derecho'); break;
    case 'analisisVivo': if (v && !analisisPermitido()) { opts.analisisVivo = false; ui.toast('Análisis no disponible ahora'); } else if (v) juego.ayudas += (juego.modo === 'ia' && !juego.est.fin && !juego.analisisAviso) ? 1 : 0; juego.analisisAviso = true; refrescar(); break;
    case 'multiPV': case 'flechaMejor': refrescar(); break;
    case 'mostrarFps': if (!v) ui.fps(''); break;
    case 'mostrarApertura': refrescar(); break;
    default: break;
  }
  ui.aplicarOpciones(opts);
  if (k === 'tamBotones' || k === 'opBotones') vista.pedir();
}

function datos(d) {
  if (d === 'exportar') {
    ui.texto({ titulo: 'EXPORTAR GUARDADO', texto: Guardado.exportarTodo(), info: 'Copia este texto y pégalo en «Importar» en otro dispositivo.', acciones: [{ texto: 'COPIAR', fn: (t, av) => copiar(t, av) }, { texto: 'DESCARGAR', fn: (t) => descargar(t, 'ajedrez-guardado.txt') }] });
  } else if (d === 'importar') {
    ui.texto({ titulo: 'IMPORTAR GUARDADO', texto: '', editable: true, info: 'Pega el texto exportado y pulsa IMPORTAR (reemplaza tu progreso actual).', acciones: [{ texto: 'IMPORTAR', fn: (t, av) => { const e = Guardado.importarTodo(t); if (e) av(e); else location.reload(); } }] });
  } else if (d === 'borrar') {
    ui.confirmar('BORRAR TODO', 'Se borrarán ajustes, partidas, perfil, biblioteca y progreso. ¿Seguro?', 'BORRAR', 'CANCELAR').then((si) => { if (si) { Guardado.borrarTodo(); location.reload(); } });
  }
}

let ultimaBaja = 0, lentos = 0;
function autoCalidad(fps) {
  if (!opts.autoCalidad || vista.es2d) return;
  const ahora = performance.now();
  if (fps < 22) lentos++; else lentos = Math.max(0, lentos - 2);
  if (lentos > 90 && ahora - ultimaBaja > 8000) {
    lentos = 0; ultimaBaja = ahora;
    const orden = ['ultra', 'alta', 'media', 'baja'];
    const i = orden.indexOf(opts.calidad);
    if (i >= 0 && i < orden.length - 1) { ajuste('calidad', orden[i + 1]); ui.toast('Pocos FPS: calidad bajada a ' + orden[i + 1].toUpperCase()); }
    else if (i === orden.length - 1 && !opts.avisado2d) { opts.avisado2d = true; ui.toast('Muy lento: prueba el modo 2D ligero en Ajustes > Gráficos', 4500); }
  }
}
setInterval(() => { ui.fps(opts.mostrarFps ? `${Math.round(vista.fpsMedia || 60)} FPS` : ''); }, 500);

// ---------------------------------------------------------- audio y pestaña
let audioListo = false;
function arrancarAudio() {
  Sonido.iniciar();
  if (audioListo) return;
  audioListo = true;
  Sonido.fijarVolumen(opts.volumen);
  Sonido.fijarVolumenes(opts.volMusica, opts.volEfectos);
  Sonido.fijarSilencio(!opts.sonido);
  if (opts.musica) iniciarMusica();
}
['pointerdown', 'pointerup', 'keydown', 'touchend', 'click'].forEach((e) => window.addEventListener(e, arrancarAudio, { once: false, passive: true }));

let relojPausadoPorOculta = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (opts.pausaOculta) Sonido.pausar();
    if (reloj.activo && !(juego.online && juego.online.jugando)) { reloj.detener(); relojPausadoPorOculta = true; }
  } else {
    Sonido.reanudar();
    if (relojPausadoPorOculta) { relojPausadoPorOculta = false; if (!juego.est.fin && partida.alFinal && !juego.pausa) reloj.iniciar(partida.turno); }
    vista.pedir(); pedirWakeLock();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input, textarea, select')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase(), T = opts.teclas;
  if (ui.hayModal()) return;
  if (k === T.pausa) { if (juego.pausa) seguir(); else pausar(); }
  else if (k === T.deshacer) accion('deshacer');
  else if (k === T.rehacer) rehacer();
  else if (k === T.atras) navegar('atras');
  else if (k === T.adelante) navegar('adelante');
  else if (k === T.vista) accion('vista');
  else if (k === T.girar) accion('girar');
  else if (k === T.pista) accion('pista');
  else if (k === T.analisis) accion('analisis');
  else if (k === T.pantalla) pantallaCompleta();
});

let ultSeg = -1;
reloj.alCambiar = (r) => {
  ui.relojes(r, reloj.turno, reloj.activo);
  if (opts.sonidoReloj && reloj.activo && reloj.turno === juego.humano_ok() && r[reloj.turno] < 10000) { const s = Math.ceil(r[reloj.turno] / 1000); if (s !== ultSeg) { ultSeg = s; Sonido.reproducir('reloj'); } }
};
reloj.alAgotar = (color) => {
  if (juego.est.fin) return;
  if (juego.modo === 'online') { online.tiempoAgotado && online.tiempoAgotado(color); return; }
  partida.terminar('tiempo', color ^ 1);
  juego.est = partida.estado();
  finalizar(juego.est);
};

// ---------------------------------------------------------- mando Xbox
const control = iniciarControl({
  juego, get vista() { return vista; }, ui, opts, flechas: () => flechas,
  accion, navegar, cambiarVista, ladoInferior, marcas, limpiarSeleccion,
  deshacer: () => { if (puedeDeshacerA() >= 0 && !juego.ocupado) deshacer(); },
  alPulsar: (sq, bajo) => alPulsar(sq, bajo),
  pausar: () => (juego.pausa ? seguir() : pausar()),
  marcaFlecha: (a, b) => flechas.alternar(a, b),
  cambiarPestanaAjustes: (d) => ui.ajustes.cambiarPestana(d),
});

// ---------------------------------------------------------- online
const online = iniciarOnline({
  juego, partida, reloj, opts, ui, yo, recibirJugada, iniciarPartida, finalizar, refrescar, ejecutar, cambiarVista, textoFin, flechas: () => flechas,
  puedeMover, marcas, vista: () => vista, irAPly, truncarA, partidaEnJuego: () => juego.est, Sonido, Perfil, logro, guardarBiblioteca, abrirMenuInicio, relojPorId, FEN_INICIAL, fen960,
});

// ---------------------------------------------------------- arranque
cfgVib.activa = opts.vibracion; cfgVib.k = opts.vibIntensidad;
aplicarGraficos();
ui.aplicarOpciones(opts);
inicio.actualizarOpciones(opts);
vista.sincronizar(partida.pos.b, false);
actualizarLegales();
refrescar();
infoGuardada();
ui.mostrar('Inicio');
window.addEventListener('pagehide', () => { if (juego.cargada && !juego.est.fin) guardar(); });
if (!opts.tutorialVisto) { opts.tutorialVisto = true; Guardado.guardarOpciones(opts); setTimeout(() => { if (!ui.hayModal()) return; ui.toast('Consejo: toca JUGAR, elige rival y reloj; el botón ? explica los controles.', 4500); }, 1500); }
if (window.Lobby && window.Lobby.hayEnlace && window.Lobby.hayEnlace()) online.abrir();

if (DEBUG) {
  window.__aj = {
    partida, get vista() { return vista; }, juego, ia, reloj, ui, opts, online, inicio,
    jugar: (uci) => { const m = partida.pos.uciAMov(uci, juego.legales); if (!m) throw new Error('ilegal ' + uci); return ejecutar(m); },
    casilla: (sq) => {
      if (vista.es2d) { const r = vista.lienzo.getBoundingClientRect(), p = vista._pos(sq); return { x: r.left + p.x, y: r.top + p.y }; }
      const x = (sq & 7) - 3.5, z = 3.5 - (sq >> 3);
      const v = new vista.camara3.position.constructor(x, partida.pos.b[sq] ? 0.8 : 0, z).project(vista.camara3);
      const r = vista.lienzo.getBoundingClientRect();
      return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
    },
    nombreCasilla, refrescar, iniciarPartida, finalizar, accion, marcas, Sonido, recibirJugada, iniciarPuzzle, iniciarLeccion, revisar, ajuste, nuevaDesdeUI, importarPGN, abrirBiblioteca, pedirIA, sesion: () => sesionRacha,
  };
}
window.ajedrezListo = true;
export { recibirJugada };
