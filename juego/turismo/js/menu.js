// Pantalla de inicio, preparacion de partida, pausa, ayuda y logros.
import { X } from './contexto.js';
import { h, boton, $, abrirHoja, cerrarHojaId, cerrarTodas, confirmar, refrescarHojas, aviso } from './dom.js';
import { REGLAS_BASE, OPC_REGLAS, NIVELES, MODOS_JUEGO, reglasDeModo } from './datos.js';
import { setupBase, hayGuardada, iniciarSolo, continuar, abandonar, pausar, abrirSalaAnfitrion, opcionesLobby, S } from './sesion.js';
import { LOGROS, progreso } from './logros.js';
import { abrirAjustes } from './panel_ajustes.js';
import { esTactil } from './ajustes.js';
import { guardar, CLAVES } from './almacen.js';
import { pastillaCuenta, abrirRanking, usuario } from './nube.js';

const Lobby = window.Lobby, Red = window.Red;
let setup = null;

export function mostrarMenu(ver) { const m = $('menu'); m.hidden = !ver; document.body.classList.toggle('enMenu', ver); if (ver) { pintarInicio(); const b = m.querySelector('[data-pref]') || m.querySelector('[data-f]'); if (b) b.focus({ preventScroll: true }); } }
export function pintarInicio() {
  const m = $('menu'); m.textContent = '';
  const guard = hayGuardada();
  m.append(
    h('a', { cls: 'volver', href: '../', 'data-f': 1 }, '← Menú de juegos'),
    h('div', { cls: 'portada' }, h('h1', {}, 'TURISMO MUNDIAL'), h('p', {}, 'Colecciona destinos y sellos, toma vuelos, trenes y cruceros, y conviértete en el gran viajero.')),
    h('div', { cls: 'botonera' },
      guard ? boton('▶ Continuar partida', () => { if (continuar()) { mostrarMenu(false); aviso('Partida restaurada', '#6dff6d'); if (X.modo === 'anfitrion') dialogoReanudar(); } }, 'prim grande', { 'data-pref': 1 }) : null,
      boton('Jugar contra bots', () => preparar('solo'), guard ? 'sec grande' : 'prim grande', guard ? {} : { 'data-pref': 1 }),
      boton('Multijugador en línea', () => preparar('multi'), 'sec grande'),
      boton('🏆 Logros y estadísticas', () => abrirLogros(), 'sec'),
      usuario() ? boton('🥇 Ranking', () => abrirRanking(), 'sec') : null,
      boton('⚙ Ajustes', () => abrirAjustes(), 'sec'),
      boton('? Cómo se juega', () => abrirTutorial(), 'sec')),
    pastillaCuenta() || '',
    h('p', { cls: 'peq pie' }, esTactil() ? 'Toca un destino para ver sus detalles. Pellizca para acercar.' : 'Teclado, ratón o mando Xbox. Pulsa ? para ver los controles.'));
}

function sel(opts, valor, fn, fmt) {
  return h('div', { cls: 'chips' }, opts.map((o) => boton(fmt ? fmt(o) : String(o), () => { fn(o); refrescarHojas(['preparar']); }, 'chip' + (o === valor ? ' on' : ''), { 'aria-pressed': o === valor })));
}
function si(v, fn) { return boton(v ? 'Sí' : 'No', () => { fn(!v); refrescarHojas(['preparar']); }, 'chip' + (v ? ' on' : ''), { 'aria-pressed': !!v }); }
function preparar(modo) {
  setup = setupBase();
  abrirHoja({ id: 'preparar', titulo: modo === 'solo' ? 'Nueva partida' : 'Partida en línea', ancha: true, render: (c) => {
    const r = setup.reglas, maxBots = modo === 'solo' ? 5 : 5;
    c.appendChild(h('h3', {}, modo === 'solo' ? 'Bots rivales (' + setup.bots.length + ')' : 'Bots que se suman a los jugadores humanos (hasta 6 en total)'));
    setup.bots.forEach((n, i) => c.appendChild(h('div', { cls: 'ajuste' }, h('span', { cls: 'etq' }, 'Bot ' + (i + 1)), h('div', { cls: 'ctl' },
      NIVELES.map((t, k) => boton(t, () => { setup.bots[i] = k; refrescarHojas(['preparar']); }, 'chip' + (n === k ? ' on' : ''), { 'aria-pressed': n === k })), boton('✕', () => { setup.bots.splice(i, 1); refrescarHojas(['preparar']); }, 'sec peq', { 'aria-label': 'Quitar bot' })))));
    if (setup.bots.length < maxBots) c.appendChild(boton('+ Añadir bot', () => { setup.bots.push(1); refrescarHojas(['preparar']); }, 'sec'));
    c.appendChild(h('h3', {}, 'Modo de juego'));
    c.appendChild(h('div', { cls: 'chips' }, Object.keys(MODOS_JUEGO).map((m) => boton(MODOS_JUEGO[m].nombre, () => { Object.assign(r, MODOS_JUEGO[m].reglas, { modo: m }); refrescarHojas(['preparar']); }, 'chip' + (r.modo === m ? ' on' : ''), { 'aria-pressed': r.modo === m, 'data-k': 'm' + m }))));
    c.appendChild(h('p', { cls: 'peq' }, MODOS_JUEGO[r.modo] ? MODOS_JUEGO[r.modo].desc : ''));
    c.appendChild(h('h3', {}, 'Reglas de la casa'));
    const f = (etq, ctl) => c.appendChild(h('div', { cls: 'ajuste' }, h('span', { cls: 'etq' }, etq), h('div', { cls: 'ctl' }, ctl)));
    f('Dinero inicial', sel(OPC_REGLAS.dineroInicial, r.dineroInicial, (v) => { r.dineroInicial = v; }, (v) => '$' + v));
    f('Meta de sellos (0 = sin meta)', sel(OPC_REGLAS.metaSellos, r.metaSellos, (v) => { r.metaSellos = v; }, (v) => (v ? '🛂' + v : 'Sin meta')));
    f('Eventos mundiales cada', sel(OPC_REGLAS.eventos, r.eventos, (v) => { r.eventos = v; }, (v) => (v ? v + ' rondas' : 'Nunca')));
    f('Destinos para construir', sel(OPC_REGLAS.dominio, r.dominio, (v) => { r.dominio = v; }, (v) => v + ' de 4'));
    f('Bote en la zona franca', si(r.bote, (v) => { r.bote = v; }));
    f('Subasta obligatoria si no compras', si(r.subastaObligatoria, (v) => { r.subastaObligatoria = v; }));
    f('Visa continental (−25% renta)', si(r.visaDescuento, (v) => { r.visaDescuento = v; }));
    f('Construcción pareja', si(r.construccionPareja, (v) => { r.construccionPareja = v; }));
    f('Hipoteca por la mitad del precio', si(r.hipotecaMitad, (v) => { r.hipotecaMitad = v; }));
    f('Límite de tiempo (gana patrimonio y sellos)', sel([0].concat(OPC_REGLAS.limiteMin), r.limiteMin, (v) => { r.limiteMin = v; }, (v) => (v ? v + ' min' : 'Sin límite')));
    f('Temporizador de turno', sel(OPC_REGLAS.temporizador, r.temporizador, (v) => { r.temporizador = v; }, (v) => (v ? v + ' s' : 'Sin')));
    c.appendChild(h('div', { cls: 'fila' }, boton(modo === 'solo' ? '▶ Empezar' : 'Crear sala…', () => {
      guardar(CLAVES.setup, setup); cerrarHojaId('preparar');
      if (modo === 'solo') { mostrarMenu(false); iniciarSolo(setup); } else { X.setupPend = setup; abrirMulti(setup); }
    }, 'prim grande', { 'data-pref': 1 }), boton('Restablecer reglas', () => { setup.reglas = reglasDeModo('completo'); refrescarHojas(['preparar']); }, 'sec')));
  } });
}
function abrirMulti(s) {
  S.setup = s; mostrarMenu(false); Lobby.abrir(opcionesLobby()); X.lobbyAbierto = true;
}

function dialogoReanudar() {
  abrirHoja({ id: 'reanudar', titulo: 'Partida en línea guardada', sinCerrar: true, render: (c) => {
    c.append(h('p', {}, 'Esta partida tenía más jugadores. Abre una sala nueva para que se reconecten a su asiento con un enlace nuevo, o continúa ahora y un piloto automático jugará por ellos.'),
      h('div', { cls: 'fila' }, boton('Abrir sala para reconectar', () => { cerrarHojaId('reanudar'); abrirSalaAnfitrion(); }, 'prim', { 'data-pref': 1 }),
        boton('Continuar ahora', () => { cerrarHojaId('reanudar'); S.huerfano = false; pausar(false); }, 'sec')));
  } });
}

export function abrirPausa() {
  if (!X.E) return;
  if (X.modo === 'solo') pausar(true);
  abrirHoja({ id: 'pausa', titulo: X.modo === 'solo' ? 'Pausa' : 'Menú', sinCerrar: false, alCerrar: () => { if (X.modo === 'solo') pausar(false); }, render: (c) => {
    c.append(h('div', { cls: 'botonera' },
      boton('Continuar', () => cerrarHojaId('pausa'), 'prim grande', { 'data-pref': 1 }),
      X.modo === 'anfitrion' ? boton('Invitar / reconectar jugadores', () => { cerrarHojaId('pausa'); abrirSalaAnfitrion(); }, 'sec') : null,
      X.modo === 'cliente' && X.desconectado ? boton('Reconectar (necesitas un enlace nuevo)', () => { cerrarHojaId('pausa'); X.lobbyAbierto = true; Lobby.abrir(opcionesLobby()); }, 'sec') : null,
      boton('Ajustes', () => abrirAjustes(), 'sec'), boton('Cómo se juega', () => abrirTutorial(), 'sec'), boton('Logros', () => abrirLogros(), 'sec'),
      boton('Salir al menú', () => confirmar(X.modo === 'cliente' ? 'Saldrás de la sala; podrás volver con un enlace nuevo.' : 'La partida queda guardada y podrás continuarla.', () => { X.alMenu(); }, 'Salir'), 'mal')));
    if (X.modo !== 'solo') c.appendChild(h('p', { cls: 'peq' }, 'En línea la partida no se detiene mientras tienes este menú abierto.'));
  } });
}

export function abrirLogros() {
  abrirHoja({ id: 'logros', titulo: 'Logros y estadísticas', ancha: true, render: (c) => {
    const s = progreso.stats, n = Object.keys(progreso.logros).length;
    c.appendChild(h('p', {}, 'Partidas ' + s.partidas + ' · Victorias ' + s.victorias + ' · Bancarrotas ' + s.quiebras + ' · Sellos ' + s.sellosTotales + ' · Vuelos ' + s.vuelos + ' · Mejor patrimonio $' + s.mejorPatrimonio + ' · Logros ' + n + '/' + LOGROS.length));
    c.appendChild(h('ul', { cls: 'logros' }, LOGROS.map((l) => h('li', { cls: progreso.logros[l.id] ? 'ok' : '' }, h('b', {}, (progreso.logros[l.id] ? '✔ ' : '○ ') + l.nombre), h('small', {}, l.desc)))));
  } });
}

const PASOS = [
  ['Objetivo', () => [h('p', {}, 'Recorre el tablero circular comprando destinos reales de 6 continentes, cobrando alojamiento a tus rivales y sellando tu pasaporte.'), h('p', {}, 'Modo Completo: gana el último viajero en pie. Rápido: gana quien junte 10 sellos primero. Por tiempo: al acabar gana el mayor patrimonio más sellos.')]],
  ['Tu turno', () => [h('ol', {}, h('li', {}, 'Tira los dados y avanza (el sentido es horario).'), h('li', {}, 'Un destino libre se puede comprar; si no lo compras sale a subasta.'), h('li', {}, 'En destino ajeno pagas alojamiento.'), h('li', {}, 'Dobles dan otro turno; tres dobles seguidos te dejan retenido en la aduana (sales con dobles, fianza o un pase).'))]],
  ['Destinos y edificios', () => [h('p', {}, 'Los destinos se agrupan por continente (4 por continente). Con 3 de los 4 tienes el dominio: puedes construir museos, parques temáticos, estadios y un hotel resort, y la renta base se duplica.'), h('p', {}, 'Puedes hipotecar destinos para conseguir efectivo; si no alcanzas a pagar una deuda, quedas en bancarrota.')]],
  ['Rutas: vuelo, tren y crucero', () => [h('p', {}, 'Si caes (o compras) un aeropuerto, estación o puerto, puedes tomar una ruta pagando pasaje.'), h('ul', {}, h('li', {}, '✈ Vuelo: a cualquier destino o estación (150; 75 si eres dueño).'), h('li', {}, '🚆 Tren: hasta 12 casillas adelante (40; gratis si eres dueño).'), h('li', {}, '🚢 Crucero: al otro puerto (30; gratis si eres dueño).')), h('p', {}, 'Un pase de viaje cubre el pasaje.')]],
  ['Pasaporte y visas', () => [h('p', {}, 'Cada destino al que llegas por primera vez estampa un sello (+$' + REGLAS_BASE.bonoSello + '). Reúne los 4 sellos de un continente para ganar un bono y una visa que reduce un 25% la renta que pagas allí.'), h('p', {}, 'Abre tu pasaporte con el botón 🛂 (tecla T, X en el mando).')]],
  ['Cartas y eventos mundiales', () => [h('p', {}, 'Las casillas Viaje, Aduana y Suerte dan cartas: saltos, tasas, retenciones y pases.'), h('p', {}, 'Cada pocas rondas ocurre un evento: temporada alta (rentas ×2 en un continente), temporada baja, huelga de vuelos y trenes, tormenta que cancela cruceros, ofertón de vuelos o festival mundial. Se ven resaltados en el tablero.')]],
  ['Dinero virtual', () => [h('p', {}, 'Todo el dinero es virtual y solo existe dentro de la partida. No hay compras ni apuestas reales.')]],
  ['Controles', () => [h('p', {}, h('b', {}, 'Táctil: '), 'toca un destino para ver detalles, arrastra para mover la cámara y pellizca para acercar y girar.'), h('p', {}, h('b', {}, 'Teclado y ratón: '), 'Espacio acción principal, P destinos, T pasaporte, L historial, C chat, V vista cenital, Q/E girar, flechas para elegir casilla, Esc pausa. Rueda: zoom; arrastrar: mover; clic derecho: girar.'), h('p', {}, h('b', {}, 'Mando Xbox: '), 'cruceta/stick mueve el foco o las casillas, A confirma, B cancela, X pasaporte, Y destinos, LB/RB cambia de jugador o destino, stick derecho gira y acerca, VISTA alterna acciones y casillas, MENÚ pausa.'), h('p', {}, h('b', {}, 'En línea: '), 'el anfitrión tira los dados y valida cada acción. Si te desconectas, un piloto automático juega por ti; vuelves con un enlace nuevo del anfitrión y recuperas tu asiento.')]]
];
let paso = 0;
export function abrirTutorial(i) {
  if (i != null) paso = i;
  abrirHoja({ id: 'tutorial', titulo: 'Cómo se juega', ancha: true, render: (c) => {
    c.appendChild(h('h3', {}, (paso + 1) + '/' + PASOS.length + ' · ' + PASOS[paso][0]));
    PASOS[paso][1]().forEach((n) => c.appendChild(n));
    c.appendChild(h('div', { cls: 'fila' },
      boton('◀ Anterior', () => { paso = Math.max(0, paso - 1); refrescarHojas(['tutorial']); }, 'sec', { disabled: paso === 0, 'data-k': 'ant' }),
      paso < PASOS.length - 1 ? boton('Siguiente ▶', () => { paso++; refrescarHojas(['tutorial']); }, 'prim', { 'data-pref': 1, 'data-k': 'sig' }) : boton('¡Entendido!', () => cerrarHojaId('tutorial'), 'prim', { 'data-pref': 1, 'data-k': 'sig' })));
  } });
}
export const abrirAyuda = () => abrirTutorial(0);
export function primeraVez() {
  if (progreso.visto) return;
  progreso.visto = 1; guardar(CLAVES.progreso, progreso);
  abrirHoja({ id: 'bienvenida', titulo: 'Bienvenido a Turismo Mundial', render: (c) => {
    c.append(h('ol', {}, h('li', {}, 'Pulsa «Tirar dados» en tu turno.'), h('li', {}, 'Toca cualquier destino para ver precio y rentas.'), h('li', {}, 'Llega a un aeropuerto, tren o puerto para viajar.'), h('li', {}, 'Colecciona sellos en 🛂 Pasaporte.')),
      h('div', { cls: 'fila' }, boton('¡A jugar!', () => cerrarHojaId('bienvenida'), 'prim grande', { 'data-pref': 1 }), boton('Ver tutorial', () => { cerrarHojaId('bienvenida'); abrirTutorial(0); }, 'sec')));
  } });
}
export { cerrarTodas, abandonar, Red };
