// Arranque: menu, preparacion de partida, pausa, tienda, ayuda, logros, ranking y bucle principal.
import { h, $ } from './dom.js';
import { A, D, aplicar, guardar, guardarYa as guardarAjustes, panelAjustes, suscribir as alCambiarAjustes, PRESETS } from './ajustes.js';
import { Sonido } from './sonido.js';
import { Progreso, LOGROS, MESAS, TACOS, registrarPartida } from './progreso.js';
import { Partida } from './partida.js';
import { Sesion } from './sesion.js';
import { Vista } from './vista.js';
import * as UI from './ui.js';
import { E as EntradaE, iniciarTeclado, iniciarPuntero, cuadro as cuadroEntrada, capaActiva, confirmarOTirar } from './entrada.js';
import { NIVELES } from './bots.js';
import { MODOS, esCarom, textoGrupo } from './reglas.js';
import { CLAVES, leer, escribir, borrar } from './almacen.js';
import * as Cu from './cuenta-billar.js';

const Red = window.Red, Lobby = window.Lobby, Mando = window.Mando;
let inicioJuego = 0, capasAbiertas = [], wake = null, resultadoFinal = null, enJuego = false, sinReducir = false;
const setup = { modo: A.juego.modo, nivel: A.juego.bots || 2, n: 2, local2: false, objetivo: A.juego.objetivo || 15 };
const OPTS = {
  juego: 'Billar', juegoId: 'billar', maxJugadores: 2, minJugadores: 1, modos: [{ id: 'bola8', nombre: 'Bola 8' }],
  alIniciar: (config, jugadores) => alIniciarLobby(config, jugadores), alCerrar: () => {}
};

const btn = (txt, fn, cls = '') => h('button', { type: 'button', cls: 'btn ' + cls, 'data-f': 1, txt, on: { click: fn } });
const nombreLocal = () => { try { const p = Red.perfil.obtener(); return (p && p.nombre) || 'Jugador'; } catch (e) { return 'Jugador'; } };
const colorLocal = () => { try { const p = Red.perfil.obtener(); return (p && p.color) || '#3df5ff'; } catch (e) { return '#3df5ff'; } };

/* ---------- capas ---------- */
function abrirCapa(titulo, construir, opts = {}) {
  const cuerpo = h('div', { cls: 'capa-cuerpo' });
  const cab = h('div', { cls: 'capa-cab' }, [h('h2', { txt: titulo }), h('button', { type: 'button', cls: 'icono', 'data-f': 1, 'data-cerrar': 1, 'aria-label': 'Cerrar', txt: '✕', on: { click: () => cerrar() } })]);
  const capa = h('div', { cls: 'capa ventana', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo }, [cab, cuerpo]);
  $('#app').appendChild(capa);
  const api = { capa, cuerpo, cerrar };
  function cerrar() {
    if (!capa.isConnected) return;
    capa.remove(); capasAbiertas = capasAbiertas.filter((x) => x !== api);
    opts.alCerrar && opts.alCerrar();
    foco();
  }
  capasAbiertas.push(api);
  construir(cuerpo, api);
  setTimeout(() => { const f = $('[data-f]', cuerpo); if (f) f.focus(); }, 40);
  return api;
}
function foco() { setTimeout(() => { const c = capaActiva(); const f = c && $('[data-f]', c); if (f && !c.contains(document.activeElement)) f.focus(); }, 30); }
const cerrarTodas = () => capasAbiertas.slice().forEach((c) => c.cerrar());

/* ---------- menu ---------- */
function guardada() {
  const g = leer(CLAVES.partida);
  return g && g.v === 1 && g.E && g.E.fase !== 'fin' && g.cfg && g.snap ? g : null;
}
function pintarMenu() {
  const m = $('#listaMenu'); m.textContent = '';
  const g = guardada();
  if (g) m.appendChild(btn(g.cfg.online ? `Continuar sala online · ${MODOS[g.cfg.modo].nombre}` : `Continuar partida · ${MODOS[g.cfg.modo].nombre}`, continuar, 'grande'));
  m.appendChild(btn('Jugar contra bots o en este dispositivo', () => prepararLocal(), g ? '' : 'grande'));
  m.appendChild(btn('Multijugador online (2-4 personas)', menuMulti));
  m.appendChild(btn('Tienda de mesas y tacos', () => verTienda(), 'sec'));
  m.appendChild(btn('Logros', verLogros, 'sec'));
  m.appendChild(btn('Rankings', () => verRanking(), 'sec'));
  m.appendChild(btn('Estadísticas', verStats, 'sec'));
  m.appendChild(btn('Ajustes', () => abrirAjustes(), 'sec'));
  m.appendChild(btn('Cómo jugar', () => verAyuda(), 'sec'));
  const pd = Progreso.datos;
  $('#monedasMenu').textContent = `${pd.monedas} monedas · ${pd.victorias} victorias · racha ${pd.racha}`;
  $('#resumen') && $('#resumen').remove();
  Cu.pintarChip($('#cuentaLinea'), verCuenta);
  setTimeout(() => { if (!enJuego && !capasAbiertas.length) { const f = $('[data-f]', $('#menu')); f && f.focus(); } }, 50);
}

/* ---------- preparacion de partida ---------- */
function prepararLocal(multi = false) {
  abrirCapa(multi ? 'Crear sala online' : 'Nueva partida', (c, api) => {
    const pintar = () => {
      c.textContent = '';
      const mode = MODOS[setup.modo];
      c.appendChild(h('h3', { txt: 'Modo de juego' }));
      const lista = h('div', { cls: 'rejilla-modos' });
      Object.values(MODOS).forEach((m) => lista.appendChild(h('button', { type: 'button', cls: 'modo' + (setup.modo === m.id ? ' on' : ''), 'data-f': 1, 'aria-pressed': String(setup.modo === m.id), on: { click: () => { setup.modo = m.id; setup.n = Math.min(setup.n, m.max); A.juego.modo = m.id; guardar(); pintar(); } } }, [h('b', { txt: m.nombre }), h('small', { txt: m.desc })])));
      c.appendChild(lista);
      if (setup.modo === 'bola9') {
        c.appendChild(h('h3', { txt: 'Jugadores (por turnos)' }));
        c.appendChild(opcionesFila([[2, '2'], [3, '3'], [4, '4']], setup.n, (v) => { setup.n = v; pintar(); }));
      }
      if (esCarom(setup.modo)) {
        c.appendChild(h('h3', { txt: 'Carambolas para ganar' }));
        c.appendChild(opcionesFila([[5, '5'], [10, '10'], [15, '15'], [20, '20'], [30, '30']], setup.objetivo, (v) => { setup.objetivo = v; A.juego.objetivo = v; guardar(); pintar(); }));
      }
      if (!multi) {
        c.appendChild(h('h3', { txt: 'Rival' }));
        c.appendChild(opcionesFila([[false, setup.modo === 'bola9' ? 'Bots' : 'Un bot'], [true, 'Otra persona aquí']], setup.local2, (v) => { setup.local2 = v; pintar(); }));
      }
      if (!setup.local2 || multi) {
        c.appendChild(h('h3', { txt: multi ? 'Nivel de los bots que completan la mesa' : 'Dificultad del bot' }));
        c.appendChild(opcionesFila(NIVELES.map((n) => [n.id, n.nombre]), setup.nivel, (v) => { setup.nivel = v; A.juego.bots = v; guardar(); pintar(); }));
        c.appendChild(h('p', { cls: 'nota', txt: NIVELES.find((n) => n.id === setup.nivel).desc + (setup.nivel === 1 ? ' Las victorias contra este nivel no cuentan para el ranking.' : '') }));
      }
      c.appendChild(h('div', { cls: 'botones' }, [btn(multi ? 'Abrir sala' : 'Empezar', () => { api.cerrar(); if (multi) abrirLobby(); else empezarLocal(); }, 'grande')]));
    };
    pintar();
  });
}
function opcionesFila(lista, valor, fn) {
  const g = h('div', { cls: 'aj-opc', role: 'group' });
  lista.forEach(([val, nom]) => g.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: nom, 'aria-pressed': String(val === valor), on: { click: () => fn(val) } })));
  return g;
}

function empezarLocal() {
  Sesion.salir();
  const m = MODOS[setup.modo];
  const n = setup.modo === 'bola9' ? setup.n : 2;
  const asientos = [{ tipo: 'local', nombre: nombreLocal(), color: colorLocal() }];
  const colores = ['#ff9f43', '#54a0ff', '#ff6b6b'];
  for (let i = 1; i < n; i++) asientos.push(setup.local2 ? { tipo: 'local', nombre: 'Jugador ' + (i + 1), color: colores[i - 1] } : { tipo: 'bot', nombre: 'Bot ' + (i), color: colores[i - 1], nivel: setup.nivel });
  borrar(CLAVES.partida);
  Partida.nueva({ modo: m.id, objetivo: setup.objetivo, online: false, anfitrion: true }, asientos);
  mostrarJuego();
}
function continuar() {
  const g = guardada(); if (!g) return;
  Sesion.salir();
  if (g.cfg.online) { Sesion.anfitrionRestaurado(g); setup.modo = g.cfg.modo; mostrarJuego(); setTimeout(() => abrirLobby(true), 400); return; }
  Partida.restaurar(g);
  mostrarJuego();
}

/* ---------- multijugador ---------- */
function menuMulti() {
  abrirCapa('Multijugador online', (c, api) => {
    c.appendChild(h('p', { cls: 'nota', txt: 'Sin servidor: el anfitrión envía un enlace de invitación y el amigo devuelve un código. Bola 8 y carambola son 2 jugadores; bola 9 admite hasta 4 por turnos (bots completan la mesa).' }));
    c.appendChild(btn('Crear sala (soy el anfitrión)', () => { api.cerrar(); prepararLocal(true); }, 'grande'));
    c.appendChild(btn('Unirme con un enlace o código', () => { api.cerrar(); OPTS.maxJugadores = 4; Lobby.abrir(OPTS); }));
    const g = leer(CLAVES.asiento);
    if (g && g.token) c.appendChild(h('p', { cls: 'nota', txt: 'Si te desconectaste de una partida, pide al anfitrión un enlace nuevo (menú Pausa > Invitar): recuperarás tu asiento automáticamente.' }));
  });
}
function abrirLobby(reconectar) {
  const m = MODOS[setup.modo];
  OPTS.maxJugadores = m.max; OPTS.modos = [{ id: m.id, nombre: m.nombre }];
  Sesion.setup = { modo: m.id, n: setup.modo === 'bola9' ? setup.n : 2, max: m.max, nivel: setup.nivel, objetivo: setup.objetivo };
  Sesion.rol = reconectar ? 'anfitrion' : Sesion.rol;
  Lobby.abrir(OPTS);
}
function alIniciarLobby(config, jugadores) {
  Sesion.conectar();
  if (Red.esAnfitrion) {
    const s = Sesion.setup || { modo: config.modo, n: 2, max: MODOS[config.modo].max, nivel: setup.nivel, objetivo: setup.objetivo };
    Sesion.anfitrionIniciar({ ...config, modo: config.modo || s.modo }, jugadores, s);
    borrar(CLAVES.asiento);
    mostrarJuego();
  } else {
    Sesion.clienteIniciar();
    UI.toast('Conectado. Esperando al anfitrión…', '#3df5ff');
  }
}
Sesion.alEstado = (q) => {
  if (q === 'inicio') { if (!enJuego) mostrarJuego(); else { resultadoFinal = null; $('#finPanel').hidden = true; cargarEscena(); refrescarTodo(); } }
  else if (q === 'revancha') UI.toast('El anfitrión empezó una revancha');
  UI.pintarJugadores(); UI.pintarEstado();
};
Sesion.alReiniciar = (msg) => { UI.toast(msg || 'Partida terminada', '#ff8a4a'); Partida.detener(); volverAlMenu(false); };

/* ---------- pantalla de juego ---------- */
function opcionesGraficas() { return { sombras: D.sombras, antialias: D.antialias, pixelRatio: D.pixelRatio, detalle: D.detalle, reflejos: D.reflejos, simple: D.calidad === 'baja' }; }
let vistaOk = false;
function mostrarJuego() {
  enJuego = true; resultadoFinal = null; sinReducir = false; inicioJuego = performance.now();
  $('#menu').hidden = true; $('#juego').hidden = false; $('#bMenu').hidden = false; $('#bVista').hidden = false;
  document.body.classList.remove('en-menu'); document.body.classList.add('en-juego');
  cerrarTodas(); $('#finPanel').hidden = true;
  if (!vistaOk) {
    vistaOk = Vista.init($('#lienzo'), opcionesGraficas());
    if (!vistaOk) { $('#lienzo').appendChild(h('p', { cls: 'sinwebgl', txt: 'Tu navegador o dispositivo no puede mostrar gráficos 3D (WebGL). Activa la aceleración por hardware o prueba otro navegador.' })); }
    iniciarPuntero($('#lienzo'), $('#potencia'), $('#efecto'));
  }
  Vista.setModo(A.juego.vista === 'cenital' ? 'cenital' : '3d');
  Partida.velocidad = A.juego.velocidad || 1;
  cargarEscena();
  refrescarTodo();
  Partida.gancho.guardar();
  pedirWake();
  tutorialInicial();
}
function cargarEscena() {
  if (!vistaOk) return;
  const tipo = MODOS[Partida.cfg.modo].tipo;
  Vista.cargar(Partida.S, tipo, Progreso.mesa(), Progreso.taco(), A.acc.daltonismo);
  Vista.encuadrar(); Vista.yaw = Partida.ap ? Partida.ap.ang : 0;
}
function refrescarTodo() { UI.pintarJugadores(); UI.pintarBandeja(); UI.pintarPotencia(); UI.pintarEstado(); }

function volverAlMenu(guardar = true) {
  if (guardar) Partida.gancho.guardar();
  Partida.detener(); Sesion.salir();
  enJuego = false;
  $('#juego').hidden = true; $('#finPanel').hidden = true; $('#menu').hidden = false; $('#bMenu').hidden = true; $('#bVista').hidden = true;
  document.body.classList.add('en-menu'); document.body.classList.remove('en-juego', 'mi-turno', 'colocando', 'rodando');
  cerrarTodas(); pintarMenu(); liberarWake();
}

/* ---------- ganchos de la partida ---------- */
const G = Partida.gancho;
G.evento = (e) => {
  if (e.k === 'bola') { Sonido.fx('bola', e.v); if (e.v > 2.5) vibrar(0.3, 0.6, 40); }
  else if (e.k === 'banda') Sonido.fx('banda', e.v);
  else if (e.k === 'tronera') { Sonido.fx('tronera'); vibrar(0.6, 0.3, 120); }
};
G.golpear = (t, cb) => {
  Sonido.despertar(); Sonido.fx('taco', t.pot); vibrar(0.2 + t.pot * 0.8, 0.3, 90 + t.pot * 100);
  Vista.golpe(cb, A.acc.reducirMov);
};
G.apunta = (ap) => Sesion.apunta(ap);
G.tiro = (t) => Sesion.tiro(t);
G.difundirRes = (m) => Sesion.resultado(m);
G.guardar = () => {
  if (!Partida.activa || !Partida.cfg || Sesion.rol === 'cliente') return;
  if (Partida.E.fase === 'fin') { borrar(CLAVES.partida); return; }
  escribir(CLAVES.partida, Partida.serializar());
};
G.fase = (f) => {
  Vista.rodando = f === 'rodando' || f === 'asentando' || f === 'fin' || f === 'esperaRes';
  if (f === 'apuntando' || f === 'colocando' || f === 'espera') { UI.pintarPotencia(); }
  UI.pintarEstado(); UI.pintarJugadores();
  if ((f === 'apuntando' || f === 'colocando') && Partida.turnoLocal()) { Sonido.fx('turno'); if (Partida.cfg.online) vibrar(0.2, 0.4, 80); }
};
G.resultado = (r) => {
  const { info, an } = r;
  UI.pintarJugadores(); UI.pintarBandeja();
  const nombre = (Partida.asientos[r.seat] || {}).nombre || 'Jugador';
  if (info.falta) { UI.mensaje(`Falta de ${nombre}: ${info.falta}`, 'falta'); Sonido.fx('error'); }
  else if (info.punto) UI.mensaje(`¡Carambola de ${nombre}! (${Partida.E.puntos[r.seat]})`, 'ok');
  else if (info.msg) UI.mensaje(info.msg);
  else if (info.continua) UI.mensaje(`${nombre} sigue tirando`, 'ok');
  if (!info.falta && info.msg && /Grupo/.test(info.msg)) UI.mensaje(`${nombre}: ${info.msg}`, 'ok');
  if (info.aviso) UI.toast(info.aviso, '#ffd23d');
  if (info.respot && info.respot.length) UI.toast('La bola ' + info.respot.join(', ') + ' vuelve a la mesa');
  if (an && an.embolsadas.length && !esCarom(Partida.cfg.modo)) UI.toast('Embolsadas: ' + an.embolsadas.join(', '), '#7cffb0');
  if (Vista.listo) Vista.sincronizar(false);
};
G.fin = () => finalizar();

function vibrar(f, s, ms) { if (D.vibracion && Mando && Mando.conectado) Mando.vibrar(f * D.vibInt, s * D.vibInt, ms); }

/* ---------- fin de partida ---------- */
function finalizar() {
  if (resultadoFinal) return;
  const E = Partida.E, yo = Partida.asientos.findIndex((a) => a.tipo === 'local');
  const humanos = Partida.asientos.filter((a) => a.tipo !== 'bot').length;
  const online = !!Partida.cfg.online, soloLocales = Partida.asientos.filter((a) => a.tipo === 'local').length > 1;
  const st = Partida.stats[yo] || {};
  const nivelMax = Math.max(0, ...Partida.asientos.filter((a) => a.tipo === 'bot').map((a) => a.nivel || 2));
  const otros = Partida.stats.filter((_, i) => i !== yo);
  let monedas = 0;
  const premia = yo >= 0 && !soloLocales && (online ? humanos > 1 : nivelMax > 0);
  if (premia) {
    monedas = registrarPartida({
      modo: E.modo, ganador: E.ganador, yo, n: Partida.asientos.length, nivelMax, online, humanos,
      tiros: st.tiros, embolsadas: st.embolsadas, faltasYo: st.faltas, carambolas: E.puntos[yo] || 0, serieMax: st.serieMax,
      bolasSaque: st.bolasSaque, tresSeguidas: st.tresSeguidas, bandasMax: st.bandasMax, combo: st.combo,
      apertura9: E.modo === 'bola9' && E.ganador === yo && otros.every((o) => !o.tiros)
    });
    Cu.enviarPuntajes(Progreso.datos);
    Cu.recompensaFin({ ganador: E.ganador, online }, yo);
    Progreso.tomarNuevos().forEach((id) => { Cu.logro(id); const l = LOGROS.find((x) => x.id === id); if (l) UI.toast('Logro: ' + l.nombre, '#ffd23d'); });
  }
  resultadoFinal = { monedas };
  borrar(CLAVES.partida);
  const gane = E.ganador === yo;
  Sonido.fx(gane ? 'gana' : 'pierde');
  if (monedas) Sonido.fx('moneda');
  vibrar(0.8, 0.6, 400);
  setTimeout(() => panelFin(monedas, gane, premia), 700);
}
function panelFin(monedas, gane, premia) {
  const E = Partida.E, p = $('#finPanel'); p.textContent = ''; p.hidden = false;
  const g = Partida.asientos[E.ganador] || {};
  const yoSeat = Partida.asientos.findIndex((a) => a.tipo === 'local');
  const hot = Partida.asientos.filter((a) => a.tipo === 'local').length > 1;
  p.appendChild(h('h2', { txt: hot ? `¡Gana ${g.nombre}!` : gane ? '¡Ganaste!' : `Gana ${g.nombre}` }));
  p.appendChild(h('p', { cls: 'sub', txt: `${MODOS[E.modo].nombre} · ${E.motivo || ''}` }));
  const tabla = h('table', { cls: 'tabla' });
  tabla.appendChild(h('tr', {}, [h('th', { txt: 'Jugador' }), h('th', { txt: 'Tiros' }), h('th', { txt: esCarom(E.modo) ? 'Carambolas' : 'Embolsadas' }), h('th', { txt: 'Faltas' })]));
  Partida.asientos.forEach((a, i) => {
    const s = Partida.stats[i] || {};
    tabla.appendChild(h('tr', { cls: i === E.ganador ? 'gana' : '', style: '--c:' + (a.color || '#fff') }, [h('td', { txt: a.nombre }), h('td', { txt: String(s.tiros || 0) }), h('td', { txt: String(esCarom(E.modo) ? E.puntos[i] : s.embolsadas || 0) }), h('td', { txt: String(s.faltas || 0) })]));
  });
  p.appendChild(tabla);
  if (premia && monedas) p.appendChild(h('p', { cls: 'monedas-fin', txt: `+${monedas} monedas · total ${Progreso.datos.monedas}` }));
  else if (!premia) p.appendChild(h('p', { cls: 'nota', txt: yoSeat < 0 || hot ? 'Partida entre jugadores del mismo dispositivo: no da monedas ni puntos de ranking.' : '' }));
  const botones = h('div', { cls: 'botones' });
  if (Sesion.rol !== 'cliente') botones.appendChild(btn('Revancha', revancha, 'grande'));
  else botones.appendChild(h('p', { cls: 'nota', txt: 'El anfitrión puede iniciar una revancha.' }));
  botones.appendChild(btn('Menú', () => volverAlMenu(false), 'sec'));
  p.appendChild(botones);
  setTimeout(() => { const f = $('[data-f]', p); f && f.focus(); }, 60);
}
function revancha() {
  $('#finPanel').hidden = true; resultadoFinal = null;
  const cfg = Partida.cfg, as = Partida.asientos.map((a) => ({ ...a }));
  if (cfg.online && Sesion.rol === 'anfitrion') {
    const nuevo = { modo: cfg.modo, objetivo: cfg.objetivo, online: true, anfitrion: true };
    as.reverse(); // quien perdio saca; cambia el orden de salida
    Partida.nueva(nuevo, as);
    as.forEach((a, i) => { if (a.tipo === 'remoto' && a.redId != null) Sesion._enviarInicio(a.redId, i); });
  } else Partida.nueva({ modo: cfg.modo, objetivo: cfg.objetivo, online: false, anfitrion: true }, as.map((a) => ({ ...a, ausente: false })));
  cargarEscena(); refrescarTodo(); Partida.gancho.guardar();
}

/* ---------- pausa ---------- */
function pausar() {
  if (!enJuego || capasAbiertas.some((c) => c.pausa)) return;
  if (!Partida.cfg.online) Partida.pausada = true;
  const api = abrirCapa('Pausa', (c, api) => {
    c.appendChild(btn('Continuar', () => api.cerrar(), 'grande'));
    if (Partida.cfg.online && Sesion.rol === 'anfitrion') {
      c.appendChild(btn('Invitar / reconectar amigos', () => { api.cerrar(); abrirLobby(true); }));
      Partida.asientos.forEach((a, i) => { if (a.tipo === 'remoto') c.appendChild(btn(`Sustituir a ${a.nombre}${a.ausente ? ' (desconectado)' : ''} por un bot`, () => { Sesion.sustituirPorBot(i); api.cerrar(); }, 'sec')); });
    }
    c.appendChild(btn('Cambiar vista (3D / cenital)', () => { alternarVista(); }, 'sec'));
    c.appendChild(btn('Tienda de mesas y tacos', () => { api.cerrar(); verTienda(true); }, 'sec'));
    c.appendChild(btn('Ajustes', () => { api.cerrar(); abrirAjustes(null, true); }, 'sec'));
    c.appendChild(btn('Cómo jugar', () => { api.cerrar(); verAyuda(true); }, 'sec'));
    if (Sesion.rol !== 'cliente') c.appendChild(btn('Reiniciar partida', () => { if (confirm('¿Reiniciar la partida actual?')) { api.cerrar(); resultadoFinal = null; const cfg = Partida.cfg, as = Partida.asientos.map((a) => ({ ...a })); Partida.nueva({ ...cfg, semilla: 0 }, as); if (cfg.online) as.forEach((a, i) => { if (a.tipo === 'remoto' && a.redId != null) Sesion._enviarInicio(a.redId, i); }); cargarEscena(); refrescarTodo(); } }, 'sec'));
    c.appendChild(btn(Sesion.rol === 'cliente' ? 'Salir de la sala' : 'Guardar y salir al menú', () => { api.cerrar(); volverAlMenu(true); }, 'peligro'));
  }, { alCerrar: () => { Partida.pausada = false; } });
  api.pausa = true;
}
function alternarVista() {
  A.juego.vista = Vista.modo === '3d' ? 'cenital' : '3d';
  Vista.setModo(A.juego.vista); Vista.encuadrar(); guardar();
  UI.toast(A.juego.vista === 'cenital' ? 'Vista cenital' : 'Vista 3D');
}

/* ---------- ajustes ---------- */
function abrirAjustes(pest, desdePausa) {
  let panel;
  abrirCapa('Ajustes', (c) => { panel = panelAjustes(c, { pest }); EntradaE.alPestana = (d) => panel.siguiente(d); }, { alCerrar: () => { EntradaE.alPestana = null; guardarAjustes(); aplicarGraficos(); if (desdePausa) pausar(); } });
}
let calidadAplicada = '';
function aplicarGraficos() {
  const k = JSON.stringify(opcionesGraficas());
  if (k === calidadAplicada) return;
  calidadAplicada = k;
  if (vistaOk) Vista.aplicarCalidad(opcionesGraficas());
}
let daltAnt = A.acc.daltonismo;
alCambiarAjustes(() => {
  aplicarGraficos(); Partida.velocidad = A.juego.velocidad || 1; $('#fps').hidden = !D.fps; Vista._rapida = A.acc.reducirMov;
  if (daltAnt !== A.acc.daltonismo) { daltAnt = A.acc.daltonismo; if (enJuego) { cargarEscena(); UI.pintarBandeja(); } }
});

/* ---------- tienda ---------- */
function verTienda(desdePausa) {
  abrirCapa('Tienda', (c) => {
    let pest = 'mesas';
    const cuerpo = h('div', { cls: 'tienda' }), saldo = h('p', { cls: 'monedas', 'aria-live': 'polite' });
    const msg = h('div', { cls: 'aj-msg', 'aria-live': 'polite' });
    const tabs = h('div', { cls: 'aj-tabs' }, [['mesas', 'Mesas'], ['tacos', 'Tacos']].map(([id, nom]) => h('button', { type: 'button', cls: 'aj-tab', 'data-f': 1, txt: nom, on: { click: () => { pest = id; pintar(); } } })));
    function pintar() {
      const pd = Progreso.datos;
      saldo.textContent = `Monedas: ${pd.monedas}`;
      Array.from(tabs.children).forEach((b, i) => b.classList.toggle('on', ['mesas', 'tacos'][i] === pest));
      cuerpo.textContent = '';
      (pest === 'mesas' ? MESAS : TACOS).forEach((it) => {
        const tengo = pd.poseidos[pest].includes(it.id), puesto = pd.equipo[pest === 'mesas' ? 'mesa' : 'taco'] === it.id;
        const muestra = pest === 'mesas' ? h('i', { cls: 'muestra mesa', style: `--t:${it.tela};--b:${it.borde}` }) : h('i', { cls: 'muestra taco', style: `--t:${it.color};--p:${it.punta}` });
        cuerpo.appendChild(h('div', { cls: 'articulo' + (puesto ? ' puesto' : '') }, [muestra, h('div', { cls: 'art-datos' }, [h('b', { txt: it.nombre }), h('small', { txt: tengo ? (puesto ? 'Equipado' : 'En tu colección') : it.precio + ' monedas' })]),
          tengo ? btn(puesto ? 'Equipado' : 'Equipar', () => { Progreso.equipar(pest, it.id); aplicarEquipo(); pintar(); }, 'peq' + (puesto ? ' sec' : '')) : btn('Comprar', () => { const r = Progreso.comprar(pest, it.id); msg.textContent = r.msg; if (r.ok) { Sonido.fx('moneda'); Progreso.equipar(pest, it.id); aplicarEquipo(); Progreso.tomarNuevos().forEach((id) => { Cu.logro(id); }); } pintar(); }, 'peq')]));
      });
    }
    c.appendChild(saldo); c.appendChild(tabs); c.appendChild(cuerpo); c.appendChild(msg);
    c.appendChild(h('p', { cls: 'nota', txt: 'Las monedas son virtuales: se ganan jugando y solo sirven para estos artículos cosméticos. No cambian la física ni el ranking.' }));
    pintar();
  }, { alCerrar: () => { pintarMenu(); if (desdePausa) pausar(); } });
}
function aplicarEquipo() { if (enJuego && vistaOk) { Vista.cargar(Partida.S, MODOS[Partida.cfg.modo].tipo, Progreso.mesa(), Progreso.taco(), A.acc.daltonismo); } }

/* ---------- logros, estadisticas, ranking, cuenta, ayuda ---------- */
function verLogros() {
  abrirCapa('Logros', (c) => {
    const n = LOGROS.filter((l) => Progreso.datos.logros[l.id]).length;
    c.appendChild(h('p', { cls: 'nota', txt: `${n} de ${LOGROS.length} conseguidos` }));
    const ul = h('ul', { cls: 'logros' });
    LOGROS.forEach((l) => ul.appendChild(h('li', { cls: Progreso.datos.logros[l.id] ? 'ok' : '' }, [h('b', { txt: (Progreso.datos.logros[l.id] ? '★ ' : '☆ ') + l.nombre }), h('span', { txt: l.desc })])));
    c.appendChild(ul);
  });
}
function verStats() {
  abrirCapa('Estadísticas', (c) => {
    const d = Progreso.datos;
    const t = h('table', { cls: 'tabla' });
    [['Partidas jugadas', d.partidas], ['Victorias', d.victorias], ['Derrotas', d.derrotas], ['Racha actual', d.racha], ['Mejor racha', d.mejorRacha], ['Victorias online', d.mpVictorias], ['Bolas embolsadas', d.embolsadas], ['Carambolas', d.carambolas], ['Mejor serie de carambolas', d.mejorSerieCarom], ['Faltas', d.faltas], ['Tiros', d.tiros], ['Monedas', d.monedas]].forEach(([k, v]) => t.appendChild(h('tr', {}, [h('td', { txt: k }), h('td', { txt: String(v) })])));
    c.appendChild(t);
    const g = h('table', { cls: 'tabla' }); g.appendChild(h('tr', {}, [h('th', { txt: 'Victorias por modo' }), h('th', { txt: '' })]));
    Object.values(MODOS).forEach((m) => g.appendChild(h('tr', {}, [h('td', { txt: m.nombre }), h('td', { txt: String(d.ganadasPorModo[m.id] || 0) })])));
    c.appendChild(g);
  });
}
function verRanking(inicial) { abrirCapa('Rankings', (c) => Cu.panelRanking(c, inicial)); }
function verCuenta() { abrirCapa('Cuenta', (c, api) => Cu.panelCuenta(c, api, { ranking: () => verRanking(), antesDeSalir: () => { Progreso.guardar(); G.guardar(); } })); }
function verAyuda(desdePausa) {
  abrirCapa('Cómo jugar', (c) => {
    const tactil = matchMedia('(pointer: coarse)').matches, mando = Mando && Mando.conectado;
    const sec = (t, ps) => { c.appendChild(h('h3', { txt: t })); ps.forEach((p) => c.appendChild(h('p', { txt: p }))); };
    sec('Controles' + (mando ? ' (mando detectado)' : tactil ? ' (táctil)' : ''), [
      'Táctil: arrastra sobre la mesa para girar la dirección (con 2 dedos haces zoom). Desliza la barra de fuerza hacia abajo para cargar el golpe y suelta para tirar; si lo prefieres, desactiva «Tirar al soltar» en Ajustes y usa el botón TIRAR. Los botones ◀ ▶ giran muy poco a poco. Toca y arrastra sobre la bola del efecto para elegir dónde golpeas.',
      'Teclado y ratón: arrastra para apuntar, rueda del ratón o ↑↓ para la fuerza, ←→ para girar (Shift = fino), Espacio para tirar, W A S D para el efecto, V cambia 3D/cenital, Esc pausa. Clic derecho arrastrando mueve la cámara.',
      'Mando Xbox: stick izquierdo gira (LT = fino), stick derecho ↑↓ fuerza, cruceta efecto, A tirar o confirmar la blanca, X vista, Y efecto al centro, LB/RB zoom, MENÚ pausa.'
    ]);
    sec('Efecto', ['Arriba = seguir (la blanca avanza tras el choque), abajo = retroceso, izquierda/derecha = efecto lateral que cambia el rebote en banda. Más cerca del borde = más giro (hasta el 60% del radio para evitar el «pifie»).']);
    sec('Bola 8', ['Tras el saque la mesa está abierta; al embolsar una bola legal se te asigna lisas (1-7) o rayadas (9-15). Limpia tu grupo y embolsa la 8. Falta: blanca embolsada, no tocar nada, tocar primero una bola que no es tuya, o ninguna bola toca banda tras el contacto. Tras una falta el rival coloca la blanca donde quiera. Embolsar la 8 antes de tiempo o con falta pierde.']);
    sec('Bola 9', ['Toca siempre primero la bola más baja de la mesa. Cualquier bola embolsada te deja seguir; embolsar la 9 legalmente gana (también en combinada). Tres faltas seguidas pierden la partida. Hasta 4 jugadores por turnos.']);
    sec('Carambola', ['Cada jugador tiene su bola (blanca o amarilla). Punto si tu bola toca las dos bolas restantes; en 3 bandas debe tocar al menos 3 bandas antes de la segunda bola. Sin troneras.']);
    sec('Saque', ['En bola 8 y 9 el saque es con la blanca detrás de la línea de cabecera: embolsa una bola o lleva al menos 4 a banda; si no, es falta.']);
  }, { alCerrar: () => { if (desdePausa) pausar(); } });
}
let pistaDada = false;
function tutorialInicial() {
  if (!pistaDada && Partida.turnoLocal() && document.body.classList.contains('tactil')) { pistaDada = true; setTimeout(() => UI.mensaje('Arrastra sobre la mesa para apuntar · desliza la barra de fuerza hacia abajo y suelta para tirar'), 900); }
  if (leer(CLAVES.tutorial)) return;
  escribir(CLAVES.tutorial, { v: 1 });
  setTimeout(() => verAyuda(), 600);
}

/* ---------- pantalla completa, wake lock, visibilidad ---------- */
async function pedirWake() { try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; } }
function liberarWake() { try { wake && wake.release(); } catch (e) { /* nada */ } wake = null; }
$('#bPantalla').addEventListener('click', () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) { /* sin pantalla completa */ } });
$('#bSonido').addEventListener('click', () => { Sonido.activo = !Sonido.activo; $('#bSonido').textContent = Sonido.activo ? '♪' : '✕'; Sonido.despertar(); UI.toast(Sonido.activo ? 'Sonido activado' : 'Sonido en silencio'); });
$('#bMenu').addEventListener('click', pausar);
$('#bAjustes').addEventListener('click', () => abrirAjustes());
$('#bAyuda').addEventListener('click', () => verAyuda());
$('#bVista').addEventListener('click', alternarVista);
$('#bTirar').addEventListener('click', confirmarOTirar);
$('#bConfirmar').addEventListener('click', () => { if (!Partida.confirmarBlanca()) UI.mensaje('No cabe ahí: la blanca toca otra bola', 'falta'); });
$('#bCentrar').addEventListener('click', () => { Partida.fijarEfecto(0, 0); });
document.addEventListener('visibilitychange', () => {
  if (A.sonido.pausaOculta) Sonido.suspender(document.hidden);
  if (document.hidden) { guardarTodo(); liberarWake(); } else if (enJuego) pedirWake();
});
function guardarTodo() { Progreso.guardar(); guardarAjustes(); G.guardar(); }
window.addEventListener('pagehide', () => { guardarTodo(); try { if (Red && Red.conectado && Sesion.rol !== 'local') Red.salir(); } catch (e) { /* cierre */ } });
window.addEventListener('pointerdown', () => Sonido.despertar(), { once: true });
window.addEventListener('keydown', () => Sonido.despertar(), { once: true });

EntradaE.alMenu = () => { if (enJuego) pausar(); };
EntradaE.alAyuda = () => verAyuda();
EntradaE.alVista = alternarVista;
EntradaE.bloqueado = () => !!(Lobby && Lobby.abierto);
EntradaE.alAtras = () => { if (enJuego && !capasAbiertas.length) { pausar(); return true; } return false; };
iniciarTeclado();

/* ---------- bucle principal ---------- */
let ultimo = performance.now(), fpsN = 0, fpsT = 0, fpsMal = 0, vistaFps = 0;
function bucle(t) {
  requestAnimationFrame(bucle);
  const lim = D.limiteFps;
  if (lim && t - ultimo < 1000 / lim - 2) return;
  const dt = Math.min(0.1, (t - ultimo) / 1000); ultimo = t;
  cuadroEntrada(Mando && !(Lobby && Lobby.abierto) ? Mando : null, t, dt);
  fpsN++; fpsT += dt;
  if (fpsT >= 1) { vistaFps = Math.round(fpsN / fpsT); if (D.fps) { const e = $('#fps'); e.hidden = false; e.textContent = vistaFps + ' FPS'; } controlarCalidad(vistaFps); fpsN = 0; fpsT = 0; }
  if (!enJuego || !vistaOk) return;
  const sim = Partida.pausada ? 0 : Partida.avanzar(dt);
  const f = Partida.fase, ap = Partida.ap;
  const visible = !!ap && (f === 'apuntando' || f === 'colocando' || f === 'espera' || f === 'golpeando');
  Vista.apuntar({ visible, id: Partida.idBlanca(), ang: ap ? ap.ang : 0, pot: ap ? ap.pot : 0, a: ap ? ap.a : 0, b: ap ? ap.b : 0, colocando: f === 'colocando', guia: Partida.turnoLocal() && f === 'apuntando' ? A.juego.guia : 'ninguna', rebote: A.juego.guiaRebote });
  Vista.actualizar(sim, dt);
  if (f === 'apuntando' || f === 'colocando') { UI.pintarPotencia(); if (Partida.turnoLocal()) UI.pintarEstado(); }
}
function controlarCalidad(f) {
  if (!D.autoBajada || !enJuego || document.hidden || f === 0 || performance.now() - inicioJuego < 8000) { fpsMal = 0; return; }
  if (f < 22) fpsMal++; else fpsMal = 0;
  if (fpsMal >= 3) {
    fpsMal = 0;
    const orden = ['ultra', 'alta', 'media', 'baja'], i = orden.indexOf(D.calidad);
    if (D.calidad === 'personalizada' || i < 0 ? D.calidad !== 'baja' : i < 3) {
      const nueva = D.calidad === 'personalizada' ? 'media' : orden[i + 1];
      D.calidad = nueva; Object.assign(D, PRESETS[nueva]); guardar();
      UI.toast('Rendimiento bajo: calidad ' + nueva, '#ffd23d');
    }
  }
}

/* ---------- cuenta y arranque ---------- */
function iniciarCuenta() {
  Cu.aplicarPerfil();
  Cu.iniciarNube(() => { Progreso.recargar(); pintarMenu(); });
  Cu.sincronizarLogros(Progreso.datos.logros);
  try { if (window.Cuenta && window.Cuenta.on) window.Cuenta.on('perfil', () => { Cu.aplicarPerfil(); if (!enJuego) pintarMenu(); }); } catch (e) { /* sin eventos */ }
}
aplicar();
if (!matchMedia('(pointer: fine)').matches) document.body.classList.add('tactil');
Sesion.conectar();
calidadAplicada = JSON.stringify(opcionesGraficas());
pintarMenu();
iniciarCuenta();
requestAnimationFrame(bucle);
if (Lobby && Lobby.registrar) Lobby.registrar(OPTS);
if (Lobby && Lobby.hayEnlace()) { OPTS.maxJugadores = 4; Lobby.abrir(OPTS); }
window.__billar = { Partida, Vista, Sesion, Progreso, UI, A, D, OPTS };
