// =============================================================
//  ♚  PRINCIPAL
//  Une reglas, motor, 3D y pantallas: turnos, jugadas del usuario,
//  respuesta de la IA, reloj, deshacer/rehacer, fin de partida,
//  guardado y estadísticas.
// =============================================================
import { Partida } from './partida.js';
import { Posicion, FEN_INICIAL, BLANCAS, NEGRAS, movDesde, movHasta, movPromo, movBanderas, CAP, ENR_C, ENR_L, nombreCasilla, sanFigurada } from './reglas.js';
import { NIVELES, RELOJES, CONFIG } from './config.js';
import { Vista } from './vista.js';
import { Entrada } from './entrada.js';
import { Interfaz } from './interfaz.js';
import { iniciarControl } from './control.js';
import { IA } from './ia.js';
import { Reloj } from './reloj.js';
import * as Sonido from './sonido.js';
import { iniciarMusica, detenerMusica } from './musica.js';
import * as Guardado from './guardado.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
if (params.get('tactil') === '1' || (window.matchMedia && matchMedia('(pointer: coarse)').matches)) document.body.classList.add('tactil');

const opts = Guardado.cargarOpciones();
if (params.get('tema')) opts.tema = params.get('tema');
if (params.get('calidad')) opts.calidad = params.get('calidad');

const partida = new Partida();
const reloj = new Reloj();
const ia = new IA();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const juego = {
  modo: 'ia', humano: BLANCAS, nivel: 'medio', relojId: 'sin', girarAuto: false,
  tiempos: [[0, 0]], cursor: -1, sel: -1, selAntes: false, legales: [], idIA: 0, idPista: 0, pensando: false, ocupado: false,
  pista: null, vista: 'blancas', cerrada: false, hover: -1, est: { fin: null }, inicioTurno: BLANCAS,
};

const $ = (id) => document.getElementById(id);
const ui = new Interfaz({
  alNueva: (cfg) => nuevaDesdeUI(cfg),
  alReanudar: () => reanudar(),
  alAccion: (a) => accion(a),
  alNavegar: (n) => navegar(n),
  alAjuste: (k, v) => ajuste(k, v),
  alContinuarRevision: () => continuarDesdeAqui(),
  alRevancha: () => revancha(),
  alStats: () => ui.stats(Guardado.cargarStats()),
  alBorrarStats: () => { Guardado.borrarStats(); ui.stats({}); },
  alSonidoClic: () => Sonido.reproducir('clic'),
});
const vista = new Vista($('escena'), { calidad: opts.calidad, tema: opts.tema });
new Entrada($('escena'), vista, {
  alBajar: (sq) => alBajar(sq),
  alPulsar: (sq, bajo) => alPulsar(sq, bajo),
  alSoltar: (d, h) => alSoltar(d, h),
  alHover: (sq) => { if (sq !== juego.hover) { juego.hover = sq; if (puedeMover()) marcas(); } },
});

// ---------------------------------------------------------- utilidades
const turnoEnPly = (n) => (juego.inicioTurno + n) & 1;
const esIA = (color) => juego.modo === 'ia' && color !== juego.humano;
const nombreNivel = () => (NIVELES.find((n) => n.id === juego.nivel) || NIVELES[2]).nombre;
const copiaTablero = () => Int8Array.from(partida.pos.b);

function puedeMover() {
  return !ui.hayModal() && !juego.est.fin && !juego.ocupado && !juego.pensando
    && !esIA(partida.turno);
}

function legalesDesde(sq) { return juego.legales.filter((m) => movDesde(m) === sq); }

function actualizarLegales() { juego.legales = partida.legales(); }

// ---------------------------------------------------------- marcas del tablero
function marcas() {
  const destinos = [];
  if (juego.sel >= 0 && opts.ayuda) {
    const vistos = new Set();
    for (const m of legalesDesde(juego.sel)) {
      const h = movHasta(m);
      if (vistos.has(h)) continue;
      vistos.add(h);
      destinos.push({ sq: h, captura: (movBanderas(m) & CAP) !== 0 });
    }
  }
  const u = partida.ultima;
  vista.marcar({
    seleccion: juego.sel,
    destinos,
    ultima: u ? [movDesde(u.m), movHasta(u.m)] : null,
    jaque: juego.est.jaque ? partida.pos.rey[partida.turno] : -1,
    pista: juego.pista,
    cursor: juego.cursor,
    hover: juego.hover >= 0 && puedeMover() && partida.pos.b[juego.hover] && (partida.pos.b[juego.hover] >> 3) === partida.turno ? juego.hover : -1,
  });
}

function limpiarSeleccion() {
  juego.sel = -1;
  vista.piezas.elevar(-1);
}

function seleccionar(sq) {
  juego.sel = sq;
  juego.pista = null;
  vista.piezas.elevar(sq);
  Sonido.reproducir('clic');
  marcas();
}

// ---------------------------------------------------------- entrada del usuario
function alBajar(sq) {
  if (!puedeMover()) return false;
  const p = partida.pos.b[sq];
  if (!p || (p >> 3) !== partida.turno || !legalesDesde(sq).length) {
    if (p && (p >> 3) === partida.turno) { /* pieza sin jugadas: se puede mirar pero no arrastrar */ }
    return false;
  }
  juego.selAntes = juego.sel === sq;
  if (juego.sel !== sq) seleccionar(sq);
  return true;
}

function alPulsar(sq, bajoPieza) {
  if (!puedeMover()) return;
  if (bajoPieza) {
    if (juego.selAntes) { limpiarSeleccion(); marcas(); }
    return;
  }
  if (sq < 0) { if (juego.sel >= 0) { limpiarSeleccion(); marcas(); } return; }
  if (juego.sel >= 0 && legalesDesde(juego.sel).some((m) => movHasta(m) === sq)) { intentarMover(juego.sel, sq); return; }
  const p = partida.pos.b[sq];
  if (p && (p >> 3) === partida.turno && legalesDesde(sq).length) { seleccionar(sq); return; }
  if (juego.sel >= 0) {
    limpiarSeleccion(); marcas();
    if (sq >= 0) Sonido.reproducir('error');
  }
}

function alSoltar(desde, hasta) {
  if (hasta < 0 || hasta === desde) { vista.piezas.devolver(desde); return; }
  if (legalesDesde(desde).some((m) => movHasta(m) === hasta)) intentarMover(desde, hasta, true);
  else { vista.piezas.devolver(desde); Sonido.reproducir('error'); }
}

async function intentarMover(desde, hasta, arrastre = false) {
  const posibles = legalesDesde(desde).filter((m) => movHasta(m) === hasta);
  if (!posibles.length) return;
  let m = posibles[0];
  if (posibles.length > 1) {
    juego.ocupado = true;
    const t = await ui.elegirPromocion(partida.turno);
    juego.ocupado = false;
    if (!t) { if (arrastre) vista.piezas.devolver(desde); return; }
    m = posibles.find((x) => movPromo(x) === t) || posibles[0];
  }
  ejecutar(m);
}

// ---------------------------------------------------------- jugar una jugada
function sonidoDe(m, est) {
  const fl = movBanderas(m);
  if (est.fin === 'mate') return 'mate';
  if (est.jaque) return 'jaque';
  if (movPromo(m)) return 'coronar';
  if (fl & (ENR_C | ENR_L)) return 'enroque';
  if (fl & CAP) return 'capturar';
  return 'mover';
}

async function ejecutar(m) {
  if (juego.ocupado && !juego.permitirEjecutar) return;
  juego.ocupado = true;
  cancelarPista();
  limpiarSeleccion();
  juego.pista = null;
  const bAntes = copiaTablero();
  const turnoAntes = partida.turno;
  partida.jugar(m, juego.legales);
  juego.tiempos.length = partida.cursor;      // descarta lo que había después (rehacer)
  if (reloj.habilitado) {
    if (partida.cursor === 1) reloj.iniciar(turnoAntes ^ 1); else reloj.movio(turnoAntes);
  }
  juego.tiempos[partida.cursor] = [reloj.restante[0], reloj.restante[1]];
  actualizarLegales();
  const est = partida.estado();
  juego.est = est;
  refrescar();
  setTimeout(() => Sonido.reproducir(sonidoDe(m, est)), 150);
  vibrarJugada(m, est);
  const anim = vista.jugar(m, bAntes);
  await Promise.race([anim, dormir(1800)]);
  juego.ocupado = false;
  guardar();
  if (est.fin) { finalizar(est); return; }
  if (juego.modo === 'dos' && juego.girarAuto && juego.vista !== 'cenital') cambiarVista(partida.turno === BLANCAS ? 'blancas' : 'negras');
  refrescar();
  if (esIA(partida.turno)) pedirIA();
}

// Vibración del mando (suave al mover; más fuerte con captura, jaque o mate)
function vibrarJugada(m, est) {
  const M = window.Mando;
  if (!M || !M.conectado) return;
  if (est.fin === 'mate') M.vibrar(1, 0.7, 450);
  else if (est.jaque) M.vibrar(0.6, 0.5, 260);
  else if (movBanderas(m) & CAP) M.vibrar(0.5, 0.4, 160);
  else M.vibrar(0.1, 0.25, 70);
}

// ---------------------------------------------------------- IA
function cancelarIA() {
  juego.idIA++;
  if (juego.pensando) { juego.pensando = false; ia.cancelar(); }
}

function cancelarPista() { juego.idPista++; }

async function pedirIA() {
  if (juego.est.fin || !partida.alFinal) return;
  const id = ++juego.idIA;
  juego.pensando = true;
  refrescar();
  const nivel = { ...NIVELES.find((n) => n.id === juego.nivel) || NIVELES[2] };
  if (reloj.habilitado) nivel.tiempo = Math.max(150, Math.min(nivel.tiempo, reloj.restante[partida.turno] / 25));
  const t0 = performance.now();
  let r = null;
  try {
    r = await ia.pedir({ fen: partida.fenInicial, movs: partida.uciHasta(), nivel });
  } catch (e) { console.warn('La IA falló:', e); }
  if (id !== juego.idIA) return;
  await dormir(Math.max(0, CONFIG.tiempoMinimoIA - (performance.now() - t0)));
  if (id !== juego.idIA) return;
  juego.pensando = false;
  let m = r && r.uci ? partida.pos.uciAMov(r.uci, juego.legales) : 0;
  if (!m) { // plan C: cualquier jugada legal
    console.warn('Jugada de la IA no válida; se elige una legal');
    m = juego.legales[Math.floor(Math.random() * juego.legales.length)];
  }
  if (m) ejecutar(m); else refrescar();
}

async function pedirPista() {
  if (!puedeMover()) return;
  const id = ++juego.idPista;
  ui.estado('Calculando pista', 'pensando');
  let r = null;
  try {
    r = await ia.pedir({ fen: partida.fenInicial, movs: partida.uciHasta(), nivel: { prof: 14, tiempo: 1500, ruido: 0, azar: 0, apertura: 0 } });
  } catch (e) { /* nada */ }
  if (id !== juego.idPista) return;
  if (!r || !r.uci) { refrescar(); return; }
  const m = partida.pos.uciAMov(r.uci, juego.legales);
  if (!m) { refrescar(); return; }
  juego.pista = [movDesde(m), movHasta(m)];
  limpiarSeleccion();
  refrescar();
  ui.toast('Pista: ' + sanFigurada(partida.pos.san(m, juego.legales)));
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
function refrescar() {
  const est = juego.est;
  const conReloj = reloj.habilitado;
  const nombres = ['', ''], subs = ['', ''];
  for (const c of [0, 1]) {
    if (juego.modo === 'ia') { nombres[c] = c === juego.humano ? 'TÚ' : 'MOTOR'; subs[c] = c === juego.humano ? (c ? 'Negras' : 'Blancas') : nombreNivel() + (c ? ' · Negras' : ' · Blancas'); }
    else { nombres[c] = c ? 'NEGRAS' : 'BLANCAS'; subs[c] = 'Jugador ' + (c + 1); }
  }
  const mat = partida.material();
  ui.jugadores({
    arriba: ladoInferior() ^ 1, nombres, subs, capt: partida.capturadas(), ventaja: mat, turno: partida.turno,
    relojes: reloj.restante, conReloj, corre: reloj.activo, fin: !!est.fin,
  });
  ui.ventaja(mat);
  ui.jugadas(partida.jugadas, partida.cursor, juego.inicioTurno === NEGRAS);
  const final = partida.alFinal;
  const miTurno = !est.fin && !esIA(partida.turno) && !juego.pensando;
  ui.botones({
    deshacer: !juego.ocupado && puedeDeshacerA() >= 0,
    rehacer: !juego.ocupado && puedeRehacerA() >= 0,
    pista: miTurno && !juego.ocupado,
    tablas: !est.fin && final && partida.cursor > 0,
    rendirse: !est.fin && final && partida.cursor > 0,
    girar: true,
  });
  ui.revision(final ? '' : `REVISIÓN ${partida.cursor}/${partida.jugadas.length}`);
  let txt = '', clase = '';
  if (est.fin) { txt = textoFin(est).corto; clase = 'fin'; }
  else if (juego.pensando) { txt = 'PENSANDO'; clase = 'pensando'; }
  else if (est.jaque) { txt = '¡JAQUE!'; clase = 'jaque'; }
  else if (!final) txt = '';
  else if (juego.modo === 'ia') txt = partida.turno === juego.humano ? 'TU TURNO' : '';
  else txt = 'TURNO: ' + (partida.turno ? 'NEGRAS' : 'BLANCAS');
  ui.estado(txt, clase);
  marcas();
  vista.pedir();
}

// ---------------------------------------------------------- deshacer / rehacer / navegar
function puedeDeshacerA() {
  if (partida.cursor === 0) return -1;
  if (juego.modo === 'dos') return partida.cursor - 1;
  for (let t = partida.cursor - 1; t >= 0; t--) if (turnoEnPly(t) === juego.humano) return t;
  return -1;
}
function puedeRehacerA() {
  const len = partida.jugadas.length;
  if (partida.cursor >= len) return -1;
  if (juego.modo === 'dos') return partida.cursor + 1;
  for (let t = partida.cursor + 1; t <= len; t++) if (turnoEnPly(t) === juego.humano) return t;
  return len; // al final, aunque le toque a la IA
}

function irAPly(n, animar = false) {
  cancelarIA(); cancelarPista();
  limpiarSeleccion();
  juego.pista = null;
  const antes = partida.cursor;
  const bAntes = copiaTablero();
  partida.irA(n);
  actualizarLegales();
  juego.est = partida.estado();
  if (animar && partida.cursor === antes + 1) vista.jugar(partida.ultima.m, bAntes);
  else vista.sincronizar(partida.pos.b, false);
  // reloj: en revisión se detiene; al volver al final sigue
  reloj.detener();
  if (reloj.habilitado) reloj.fijar(juego.tiempos[partida.cursor] || reloj.restante);
  if (partida.alFinal && !juego.est.fin && reloj.habilitado && partida.cursor >= 1) reloj.iniciar(partida.turno);
  refrescar();
  guardar();
  if (partida.alFinal && !juego.est.fin && esIA(partida.turno)) pedirIA();
}

function deshacer() { const t = puedeDeshacerA(); if (t >= 0) { Sonido.reproducir('clic'); irAPly(t); } }
function rehacer() { const t = puedeRehacerA(); if (t >= 0) { Sonido.reproducir('clic'); irAPly(t, t === partida.cursor + 1); } }

function navegar(x) {
  const len = partida.jugadas.length;
  let n = partida.cursor;
  if (x === 'ini') n = 0;
  else if (x === 'atras') n = n - 1;
  else if (x === 'adelante') n = n + 1;
  else if (x === 'fin') n = len;
  else if (typeof x === 'number') n = x;
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

// ---------------------------------------------------------- fin de partida
function textoFin(est) {
  const quien = (c) => (juego.modo === 'ia' ? (c === juego.humano ? 'Ganas tú' : 'Gana el motor') : (c === BLANCAS ? 'Ganan las blancas' : 'Ganan las negras'));
  switch (est.fin) {
    case 'mate': return { titulo: 'JAQUE MATE', texto: quien(est.ganador), corto: 'JAQUE MATE', res: est.ganador };
    case 'ahogado': return { titulo: 'TABLAS', texto: 'Rey ahogado: el bando que mueve no tiene jugadas legales.', corto: 'TABLAS · AHOGADO', res: -1 };
    case 'repeticion': return { titulo: 'TABLAS', texto: 'Triple repetición de la posición.', corto: 'TABLAS · REPETICIÓN', res: -1 };
    case 'cincuenta': return { titulo: 'TABLAS', texto: 'Regla de los 50 movimientos sin capturas ni peones.', corto: 'TABLAS · 50 MOV.', res: -1 };
    case 'material': return { titulo: 'TABLAS', texto: 'Material insuficiente para dar mate.', corto: 'TABLAS · MATERIAL', res: -1 };
    case 'acuerdo': return { titulo: 'TABLAS', texto: 'Tablas por acuerdo.', corto: 'TABLAS · ACUERDO', res: -1 };
    case 'rendicion': return { titulo: 'RENDICIÓN', texto: quien(est.ganador), corto: 'RENDICIÓN', res: est.ganador };
    case 'tiempo': return { titulo: 'TIEMPO AGOTADO', texto: quien(est.ganador), corto: 'TIEMPO AGOTADO', res: est.ganador };
    default: return { titulo: 'FIN', texto: '', corto: 'FIN', res: -1 };
  }
}

function finalizar(est) {
  if (juego.cerrada) return;
  juego.cerrada = true;
  reloj.detener();
  cancelarIA();
  const t = textoFin(est);
  let sonido = 'tablas';
  if (t.res >= 0) sonido = juego.modo === 'ia' ? (t.res === juego.humano ? 'victoria' : 'derrota') : 'victoria';
  if (juego.modo === 'ia') {
    const r = t.res < 0 ? 't' : (t.res === juego.humano ? 'v' : 'd');
    Guardado.sumarStat(juego.nivel, r);
  }
  Guardado.borrarPartida();
  refrescar();
  setTimeout(() => Sonido.reproducir(sonido), est.fin === 'mate' ? 900 : 200);
  setTimeout(() => ui.fin(t.titulo, t.texto), est.fin === 'mate' ? 1500 : 700);
}

// ---------------------------------------------------------- acciones de botones
async function accion(a) {
  Sonido.reproducir('clic');
  switch (a) {
    case 'deshacer': deshacer(); break;
    case 'rehacer': rehacer(); break;
    case 'pista': pedirPista(); break;
    case 'vista': cambiarVista({ blancas: 'negras', negras: 'cenital', cenital: 'blancas' }[juego.vista] || 'blancas'); break;
    case 'girar': cambiarVista(juego.vista === 'negras' ? 'blancas' : 'negras'); break;
    case 'nueva': abrirMenuInicio(); break;
    case 'tablas': ofrecerTablas(); break;
    case 'rendirse': rendirse(); break;
    case 'pgn': mostrarPGN(); break;
    case 'fen': mostrarFEN(); break;
    default: break;
  }
}

async function ofrecerTablas() {
  if (juego.est.fin || !partida.alFinal) return;
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
  const humanoPuntos = r.puntuacion; // desde el punto de vista de quien mueve (el usuario)
  if (partida.cursor >= 16 && humanoPuntos >= -25) {
    partida.terminar('acuerdo', -1); juego.est = partida.estado(); finalizar(juego.est);
  } else ui.toast(partida.cursor < 16 ? 'El motor rechaza: es muy pronto para tablas' : 'El motor rechaza las tablas');
}

async function rendirse() {
  if (juego.est.fin || !partida.alFinal) return;
  const si = await ui.confirmar('RENDIRSE', '¿Seguro que quieres rendirte?');
  if (!si) return;
  const perdedor = juego.modo === 'ia' ? juego.humano : partida.turno;
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
function copiarViejo() {
  const a = $('textoArea');
  a.focus(); a.select();
  try { return document.execCommand('copy'); } catch (e) { return false; }
}

function mostrarPGN() {
  const meta = juego.modo === 'ia'
    ? { White: juego.humano === BLANCAS ? 'Jugador' : `Motor (${nombreNivel()})`, Black: juego.humano === NEGRAS ? 'Jugador' : `Motor (${nombreNivel()})` }
    : { White: 'Jugador 1', Black: 'Jugador 2' };
  const pgn = partida.pgn(meta);
  ui.texto({
    titulo: 'PGN', texto: pgn, info: 'Pégalo en cualquier programa de ajedrez.',
    acciones: [
      { texto: 'COPIAR', fn: (t, av) => copiar(t, av) },
      { texto: 'DESCARGAR', fn: (t) => descargar(t, 'partida.pgn') },
    ],
  });
}

function descargar(texto, nombre) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function mostrarFEN() {
  ui.texto({
    titulo: 'POSICIÓN (FEN)', texto: partida.pos.aFen(), editable: true,
    info: 'Copia el FEN o pega otro y pulsa CARGAR para empezar una partida desde esa posición.',
    acciones: [
      { texto: 'CARGAR', fn: (t, av) => { const e = nuevaDesdeUI({ modo: juego.modo, color: juego.humano ? 'negras' : 'blancas', nivel: juego.nivel, reloj: juego.relojId, girarAuto: juego.girarAuto, fen: t.trim() }); if (e) av(e); else ui.ocultar('Texto'); } },
      { texto: 'COPIAR', fn: (t, av) => copiar(t, av) },
    ],
  });
}

// ---------------------------------------------------------- nueva partida / reanudar
function nuevaDesdeUI(cfg) {
  const fen = cfg.fen || FEN_INICIAL;
  try { Posicion.desdeFen(fen); } catch (e) { return 'FEN no válido: ' + e.message; }
  opts.modo = cfg.modo; opts.color = cfg.color; opts.nivel = cfg.nivel; opts.reloj = cfg.reloj; opts.girarAuto = cfg.girarAuto;
  Guardado.guardarOpciones(opts);
  ui.aplicarOpciones(opts, true);
  iniciarPartida({
    fen, modo: cfg.modo, nivel: cfg.nivel, relojId: cfg.reloj, girarAuto: cfg.girarAuto,
    humano: cfg.color === 'azar' ? (Math.random() < 0.5 ? BLANCAS : NEGRAS) : (cfg.color === 'negras' ? NEGRAS : BLANCAS),
  });
  return null;
}

function revancha() {
  ui.ocultar('Fin');
  iniciarPartida({
    fen: FEN_INICIAL, modo: juego.modo, nivel: juego.nivel, relojId: juego.relojId, girarAuto: juego.girarAuto,
    humano: juego.modo === 'ia' ? juego.humano ^ 1 : BLANCAS,
  });
}

function iniciarPartida(c) {
  cancelarIA(); cancelarPista();
  ia.cancelar(); ia.nuevaPartida();
  reloj.detener();
  partida.reiniciar(c.fen);
  Object.assign(juego, {
    modo: c.modo, humano: c.humano, nivel: c.nivel, relojId: c.relojId, girarAuto: c.girarAuto,
    sel: -1, pista: null, cerrada: false, ocupado: false, pensando: false, inicioTurno: partida.pos.turno, cargada: true, pausaMenu: false,
  });
  const rel = RELOJES.find((r) => r.id === c.relojId) || RELOJES[0];
  reloj.configurar(rel.min, rel.inc);
  juego.tiempos = [[reloj.restante[0], reloj.restante[1]]];
  actualizarLegales();
  juego.est = partida.estado();
  ui.ocultar('Inicio'); ui.ocultar('Fin');
  if (control) control.reiniciarCursor();
  cambiarVista(c.modo === 'ia' && c.humano === NEGRAS ? 'negras' : 'blancas', true);
  vista.sincronizar(partida.pos.b, true);
  refrescar();
  guardar();
  if (!juego.est.fin && esIA(partida.turno)) pedirIA();
}

function guardar() {
  if (juego.est.fin) return;
  Guardado.guardarPartida({
    fenInicial: partida.fenInicial, movs: partida.jugadas.map((j) => j.uci), cursor: partida.cursor,
    modo: juego.modo, humano: juego.humano, nivel: juego.nivel, relojId: juego.relojId, girarAuto: juego.girarAuto,
    tiempos: juego.tiempos, vista: juego.vista,
  });
}

function infoGuardada() {
  const d = Guardado.cargarPartida();
  if (!d) { ui.inicioConPartida(null); return; }
  const n = Math.ceil(d.movs.length / 2);
  ui.inicioConPartida(`${d.modo === 'dos' ? '2 jugadores' : 'Vs computadora'} · ${n} jugada${n === 1 ? '' : 's'}`);
}

// Abre el menú principal sin perder la partida: se pausan el reloj y la IA
function abrirMenuInicio() {
  const enCurso = juego.cargada && !juego.est.fin;
  if (enCurso) {
    cancelarIA(); cancelarPista();
    reloj.detener();
    juego.pausaMenu = true;
    const n = Math.ceil(partida.jugadas.length / 2);
    ui.inicioConPartida(`${juego.modo === 'dos' ? '2 jugadores' : 'Vs computadora'} · ${n} jugada${n === 1 ? '' : 's'}`, true);
  } else infoGuardada();
  ui.mostrar('Inicio');
}

function reanudar() {
  if (juego.cargada && juego.pausaMenu && !juego.est.fin) { // vuelve a la partida abierta
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
    reloj.detener();
    cancelarIA();
    partida.reiniciar(d.fenInicial);
    for (const u of d.movs) {
      const m = partida.pos.uciAMov(u);
      if (!m) throw new Error('jugada ilegal guardada ' + u);
      partida.jugar(m);
    }
    partida.irA(d.cursor);
    Object.assign(juego, {
      modo: d.modo === 'dos' ? 'dos' : 'ia', humano: d.humano === NEGRAS ? NEGRAS : BLANCAS, nivel: NIVELES.some((n) => n.id === d.nivel) ? d.nivel : 'medio',
      relojId: d.relojId, girarAuto: !!d.girarAuto, sel: -1, pista: null, cerrada: false, ocupado: false, pensando: false,
      inicioTurno: Posicion.desdeFen(d.fenInicial).turno, cargada: true, pausaMenu: false,
    });
    const rel = RELOJES.find((r) => r.id === d.relojId) || RELOJES[0];
    reloj.configurar(rel.min, rel.inc);
    juego.tiempos = Array.isArray(d.tiempos) && d.tiempos.length === d.movs.length + 1 ? d.tiempos : Array.from({ length: d.movs.length + 1 }, () => [reloj.restante[0], reloj.restante[1]]);
    if (reloj.habilitado) reloj.fijar(juego.tiempos[partida.cursor]);
    actualizarLegales();
    juego.est = partida.estado();
    ui.ocultar('Inicio');
    if (control) control.reiniciarCursor();
    cambiarVista(d.vista || 'blancas', true);
    vista.sincronizar(partida.pos.b, true);
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

// ---------------------------------------------------------- ajustes
function ajuste(k, v) {
  opts[k] = v;
  Guardado.guardarOpciones(opts);
  switch (k) {
    case 'tema': vista.fijarTema(v); marcas(); break;
    case 'calidad': vista.fijarCalidad(v); break;
    case 'sonido': Sonido.iniciar(); Sonido.fijarSilencio(!v); if (v) Sonido.reproducir('clic'); break;
    case 'musica':
      if (v) { Sonido.iniciar(); iniciarMusica(); } else detenerMusica();
      break;
    case 'volumen': Sonido.fijarVolumen(v); break;
    case 'ayuda': marcas(); break;
    case 'girarAuto': juego.girarAuto = v; break;
    default: break;
  }
  ui.aplicarOpciones(opts);
}

// ---------------------------------------------------------- audio y pestaña
let audioListo = false;
function arrancarAudio() {
  Sonido.iniciar(); // en iOS hay que reanudar dentro de cada gesto hasta que suene
  if (audioListo) return;
  audioListo = true;
  Sonido.fijarVolumen(opts.volumen);
  Sonido.fijarSilencio(!opts.sonido);
  if (opts.musica) iniciarMusica();
}
['pointerdown', 'pointerup', 'keydown', 'touchend', 'click'].forEach((e) => window.addEventListener(e, arrancarAudio, { once: false, passive: true }));

let relojPausadoPorOculta = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    Sonido.pausar();
    if (reloj.activo) { reloj.detener(); relojPausadoPorOculta = true; }
  } else {
    Sonido.reanudar();
    if (relojPausadoPorOculta) {
      relojPausadoPorOculta = false;
      if (!juego.est.fin && partida.alFinal) reloj.iniciar(partida.turno);
    }
    vista.pedir();
  }
});

document.addEventListener('keydown', (e) => {
  if (ui.hayModal() || e.target.closest('input, textarea, select')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'z' || e.key === 'Z') deshacer();
  else if (e.key === 'y' || e.key === 'Y') rehacer();
  else if (e.key === 'ArrowLeft') navegar('atras');
  else if (e.key === 'ArrowRight') navegar('adelante');
  else if (e.key === 'v' || e.key === 'V') accion('vista');
});

reloj.alCambiar = (r) => ui.relojes(r, reloj.turno, reloj.activo);
reloj.alAgotar = (color) => {
  if (juego.est.fin) return;
  partida.terminar('tiempo', color ^ 1);
  juego.est = partida.estado();
  finalizar(juego.est);
};

// ---------------------------------------------------------- mando Xbox
const control = iniciarControl({
  juego, vista, ui,
  accion, navegar, cambiarVista, ladoInferior, marcas, limpiarSeleccion,
  deshacer: () => { if (puedeDeshacerA() >= 0 && !juego.ocupado) deshacer(); },
  alPulsar: (sq, bajo) => alPulsar(sq, bajo),
});

// ---------------------------------------------------------- arranque
ui.aplicarOpciones(opts, true);
vista.sincronizar(partida.pos.b, false);
actualizarLegales();
refrescar();
infoGuardada();
ui.mostrar('Inicio');
window.addEventListener('pagehide', () => { if (!juego.est.fin) guardar(); });

if (DEBUG) {
  window.__aj = {
    partida, vista, juego, ia, reloj, ui, opts,
    jugar: (uci) => { const m = partida.pos.uciAMov(uci, juego.legales); if (!m) throw new Error('ilegal ' + uci); return ejecutar(m); },
    casilla: (sq) => { // coordenadas de pantalla del centro de una casilla (para clics reales)
      const x = (sq & 7) - 3.5, z = 3.5 - (sq >> 3);
      const v = new vista.camara3.position.constructor(x, partida.pos.b[sq] ? 0.8 : 0, z).project(vista.camara3);
      const r = vista.lienzo.getBoundingClientRect();
      return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
    },
    nombreCasilla,
    refrescar, iniciarPartida, finalizar, accion, marcas, Sonido,
  };
}
window.ajedrezListo = true;
