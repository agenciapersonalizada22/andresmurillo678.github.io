// Pantalla de inicio, preparacion de partida, pausa, ayuda y logros.
import { X } from './contexto.js';
import { h, boton, $, abrirHoja, cerrarHojaId, cerrarTodas, confirmar, refrescarHojas, aviso } from './dom.js';
import { REGLAS_BASE, OPC_REGLAS, NIVELES } from './datos.js';
import { setupBase, hayGuardada, iniciarSolo, continuar, abandonar, pausar, abrirSalaAnfitrion, opcionesLobby, S } from './sesion.js';
import { LOGROS, progreso } from './logros.js';
import { abrirAjustes } from './panel_ajustes.js';
import { esTactil } from './ajustes.js';
import { guardar, CLAVES } from './almacen.js';

const Lobby = window.Lobby, Red = window.Red;
let setup = null;

export function mostrarMenu(ver) { const m = $('menu'); m.hidden = !ver; document.body.classList.toggle('enMenu', ver); if (ver) { pintarInicio(); const b = m.querySelector('[data-pref]') || m.querySelector('[data-f]'); if (b) b.focus({ preventScroll: true }); } }
export function pintarInicio() {
  const m = $('menu'); m.textContent = '';
  const guard = hayGuardada();
  m.append(
    h('a', { cls: 'volver', href: '../', 'data-f': 1 }, '← Menú de juegos'),
    h('div', { cls: 'portada' }, h('h1', {}, 'MAGNATE'), h('p', {}, 'Compra barrios, construye hoteles y arruina a tus rivales.')),
    h('div', { cls: 'botonera' },
      guard ? boton('▶ Continuar partida', () => { if (continuar()) { mostrarMenu(false); aviso('Partida restaurada', '#6dff6d'); if (X.modo === 'anfitrion') dialogoReanudar(); } }, 'prim grande', { 'data-pref': 1 }) : null,
      boton('Jugar contra bots', () => preparar('solo'), guard ? 'sec grande' : 'prim grande', guard ? {} : { 'data-pref': 1 }),
      boton('Multijugador en línea', () => preparar('multi'), 'sec grande'),
      boton('🏆 Logros y estadísticas', () => abrirLogros(), 'sec'),
      boton('⚙ Ajustes', () => abrirAjustes(), 'sec'),
      boton('? Cómo se juega', () => abrirAyuda(), 'sec')),
    h('p', { cls: 'peq pie' }, esTactil() ? 'Toca una casilla para ver sus detalles. Pellizca para acercar.' : 'Teclado, ratón o mando Xbox. Pulsa ? para ver los controles.'));
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
    c.appendChild(h('h3', {}, 'Reglas de la casa'));
    const f = (etq, ctl) => c.appendChild(h('div', { cls: 'ajuste' }, h('span', { cls: 'etq' }, etq), h('div', { cls: 'ctl' }, ctl)));
    f('Dinero inicial', sel(OPC_REGLAS.dineroInicial, r.dineroInicial, (v) => { r.dineroInicial = v; }, (v) => '$' + v));
    f('Parada libre con bote', si(r.bote, (v) => { r.bote = v; }));
    f('Subasta obligatoria si no compras', si(r.subastaObligatoria, (v) => { r.subastaObligatoria = v; }));
    f('Sin renta si el dueño está en la cárcel', si(r.sinRentaCarcel, (v) => { r.sinRentaCarcel = v; }));
    f('Bono por caer exacto en la Salida', si(r.bonoSalida, (v) => { r.bonoSalida = v; }));
    f('Construcción pareja', si(r.construccionPareja, (v) => { r.construccionPareja = v; }));
    f('Hipoteca por la mitad del precio', si(r.hipotecaMitad, (v) => { r.hipotecaMitad = v; }));
    f('Límite de tiempo (gana el patrimonio)', sel(OPC_REGLAS.limiteMin, r.limiteMin, (v) => { r.limiteMin = v; }, (v) => (v ? v + ' min' : 'Sin límite')));
    f('Temporizador de turno', sel(OPC_REGLAS.temporizador, r.temporizador, (v) => { r.temporizador = v; }, (v) => (v ? v + ' s' : 'Sin')));
    c.appendChild(h('div', { cls: 'fila' }, boton(modo === 'solo' ? '▶ Empezar' : 'Crear sala…', () => {
      guardar(CLAVES.setup, setup); cerrarHojaId('preparar');
      if (modo === 'solo') { mostrarMenu(false); iniciarSolo(setup); } else { X.setupPend = setup; abrirMulti(setup); }
    }, 'prim grande', { 'data-pref': 1 }), boton('Restablecer reglas', () => { setup.reglas = Object.assign({}, REGLAS_BASE); refrescarHojas(['preparar']); }, 'sec')));
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
      boton('Ajustes', () => abrirAjustes(), 'sec'), boton('Cómo se juega', () => abrirAyuda(), 'sec'), boton('Logros', () => abrirLogros(), 'sec'),
      boton('Salir al menú', () => confirmar(X.modo === 'cliente' ? 'Saldrás de la sala; podrás volver con un enlace nuevo.' : 'La partida queda guardada y podrás continuarla.', () => { X.alMenu(); }, 'Salir'), 'mal')));
    if (X.modo !== 'solo') c.appendChild(h('p', { cls: 'peq' }, 'En línea la partida no se detiene mientras tienes este menú abierto.'));
  } });
}

export function abrirLogros() {
  abrirHoja({ id: 'logros', titulo: 'Logros y estadísticas', ancha: true, render: (c) => {
    const s = progreso.stats, n = Object.keys(progreso.logros).length;
    c.appendChild(h('p', {}, 'Partidas ' + s.partidas + ' · Victorias ' + s.victorias + ' · Bancarrotas ' + s.quiebras + ' · Mejor patrimonio $' + s.mejorPatrimonio + ' · Logros ' + n + '/' + LOGROS.length));
    c.appendChild(h('ul', { cls: 'logros' }, LOGROS.map((l) => h('li', { cls: progreso.logros[l.id] ? 'ok' : '' }, h('b', {}, (progreso.logros[l.id] ? '✔ ' : '○ ') + l.nombre), h('small', {}, l.desc)))));
  } });
}

export function abrirAyuda() {
  abrirHoja({ id: 'ayuda', titulo: 'Cómo se juega', ancha: true, render: (c) => {
    c.append(
      h('h3', {}, 'Objetivo'), h('p', {}, 'Compra propiedades, cobra rentas y deja sin dinero a los demás. Gana el último jugador en pie (o quien tenga más patrimonio al acabar el tiempo, si hay límite).'),
      h('h3', {}, 'Tu turno'), h('ol', {}, h('li', {}, 'Tira los dados y tu ficha avanza.'), h('li', {}, 'Si caes en una casilla libre puedes comprarla; si no, sale a subasta.'), h('li', {}, 'Con todo un barrio puedes construir casas (parejo) y hoteles.'), h('li', {}, 'Tres dobles seguidos mandan a la cárcel. Sales con dobles, pagando o con una tarjeta.'), h('li', {}, 'Hipoteca propiedades si necesitas efectivo. Negocia intercambios con otros jugadores.')),
      h('h3', {}, 'Táctil'), h('p', {}, 'Toca una casilla para ver detalles. Arrastra para mover la cámara, pellizca para acercar y girar. Botones grandes abajo para cada acción.'),
      h('h3', {}, 'Ratón y teclado'), h('p', {}, 'Clic en casillas y fichas de jugadores. Rueda: zoom. Arrastra: mover. Clic derecho o Mayús+arrastrar: girar. Espacio: acción principal. P propiedades, T intercambios, L historial, C chat, V vista cenital, Q/E girar, flechas: mover cursor de casilla, O abrir casilla, Esc pausa. Las teclas se pueden cambiar en Ajustes.'),
      h('h3', {}, 'Mando Xbox'), h('p', {}, 'Cruceta o stick izquierdo: mover el foco (o el cursor de casillas). A confirma, B cancela, X intercambios, Y propiedades/construir, LB/RB cambia de jugador o de propiedad, stick derecho gira y acerca la cámara, VISTA alterna acciones/casillas, MENÚ pausa.'),
      h('h3', {}, 'En línea'), h('p', {}, 'El anfitrión tira los dados y valida cada acción. Si te desconectas, un piloto automático juega por ti; vuelve con un enlace nuevo del anfitrión y recuperas tu asiento. Si el anfitrión recarga la página, la partida se restaura y abre una sala nueva.'));
  } });
}
export function primeraVez() {
  if (progreso.visto) return;
  progreso.visto = 1; guardar(CLAVES.progreso, progreso);
  abrirHoja({ id: 'bienvenida', titulo: 'Bienvenido a Magnate', render: (c) => {
    c.append(h('ol', {}, h('li', {}, 'Pulsa «Tirar dados» en tu turno.'), h('li', {}, 'Toca cualquier casilla para ver precio y rentas.'), h('li', {}, 'Usa 🏠 Propiedades para construir e hipotecar y 🤝 Tratos para negociar.'), h('li', {}, 'La ayuda completa está en el menú de pausa.')),
      boton('¡A jugar!', () => cerrarHojaId('bienvenida'), 'prim grande', { 'data-pref': 1 }));
  } });
}
export { cerrarTodas, abandonar, Red };
