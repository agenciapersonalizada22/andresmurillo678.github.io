// Arranque: menu, preparacion de mesa, pausa, tutorial, logros y bucle principal.
import { h, $ } from './dom.js';
import { A, D, aplicar, guardar, guardarYa as guardarAjustes, panelAjustes, suscribir as alCambiarAjustes, PRESETS } from './ajustes.js';
import { Sonido } from './sonido.js';
import { Progreso, LOGROS } from './progreso.js';
import { Sesion, guardarYa as guardarMesa } from './sesion.js';
import * as UI from './ui.js';
import { E as EntradaE, iniciarTeclado, cuadroMando, capaActiva } from './entrada.js';
import { NIVELES } from './bots.js';
import { MODOS, MAZO, T as TP } from './reglas.js';
import { svgTipo } from './cartas.js';
import { CLAVES, leer, escribir } from './almacen.js';
import * as Cu from './cuenta-gatos.js';

const Red = window.Red, Lobby = window.Lobby, Mando = window.Mando;
let pantalla = 'menu', capaPausa = null, capasAbiertas = [], wake = null;

const OPTS = {
  juego: 'Gatos Explosivos', juegoId: 'gatos', maxJugadores: 4, minJugadores: 1,
  alIniciar: (config, jugadores) => Sesion.alIniciar(config, jugadores),
  alCerrar: () => {}
};

/* ---------- capas (pantallas superpuestas navegables) ---------- */
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
    actualizarPausa(); foco();
  }
  capasAbiertas.push(api); actualizarPausa();
  construir(cuerpo, api);
  setTimeout(() => { const f = $('[data-f]', cuerpo); if (f) f.focus(); }, 40);
  return api;
}
function foco() {
  setTimeout(() => { const c = capaActiva(); const f = c && $(c.id === 'menu' ? '#listaMenu [data-f]' : '[data-f]', c); if (f && !c.contains(document.activeElement)) f.focus(); else if (f && c.id === 'menu' && document.activeElement && document.activeElement.closest('#cuentaLinea')) f.focus(); }, 30);
}
// en partida local cualquier ventana abierta (ajustes, ayuda, pausa) detiene a los bots
function actualizarPausa() { if (pantalla === 'mesa') Sesion.pausar(capasAbiertas.length > 0); }
const cerrarTodas = () => capasAbiertas.slice().forEach((c) => c.cerrar());
const btn = (txt, fn, cls = '') => h('button', { type: 'button', cls: 'btn ' + cls, 'data-f': 1, txt, on: { click: fn } });

/* ---------- menu principal ---------- */
function pintarMenu() {
  const m = $('#listaMenu'); m.textContent = '';
  $('#logo').innerHTML = [0, 1, 8].map((t) => `<i>${svgTipo(t, A.tema)}</i>`).join('');
  const g = Sesion.hayGuardada();
  if (g) m.appendChild(btn(`Continuar partida${g.multi ? ' multijugador' : ''} · ${MODOS[g.modo] ? MODOS[g.modo].nombre : 'Clásico'} · ronda ${g.ronda}`, continuar, 'grande'));
  m.appendChild(btn('Jugar contra bots', () => preparar(false), g ? '' : 'grande'));
  m.appendChild(btn('Multijugador (2-4 personas + bots)', menuMulti));
  m.appendChild(btn('Tutorial y reglas', () => verAyuda(), 'sec'));
  m.appendChild(btn('Logros', verLogros, 'sec'));
  m.appendChild(btn('Rankings', () => verRanking(), 'sec'));
  m.appendChild(btn('Estadísticas', verStats, 'sec'));
  m.appendChild(btn('Ajustes', () => abrirAjustes(), 'sec'));
  const pd = Progreso.datos;
  m.appendChild(h('p', { cls: 'resumen', txt: `${pd.victorias} partidas ganadas · mejor racha ${pd.mejorRacha} · ${pd.desactivadas} bombas desactivadas · ${pd.puntos} puntos` }));
  Cu.pintarChip($('#cuentaLinea'), verCuenta);
  setTimeout(() => { const f = $('[data-f]', m); if (f && !(capaActiva() && capaActiva().classList.contains('ventana'))) f.focus({ preventScroll: true }); }, 50);
}
function mostrar(p) {
  pantalla = p;
  const enMesa = p === 'mesa';
  document.body.classList.toggle('en-menu', !enMesa);
  $('#menu').hidden = enMesa; $('#mesa').hidden = !enMesa;
  $('#bChat').hidden = !enMesa; $('#bMenu').hidden = !enMesa; $('#bLog').hidden = !enMesa;
  if (!enMesa) pintarMenu();
}

/* ---------- preparar mesa ---------- */
const DESC_MODO = {
  clasico: 'Cada uno empieza con 4 cartas + 1 Ovillo. Gana el último que no explote.',
  rapido: 'Mazo a la mitad, 3 cartas, 15 s por turno y «¡Miau No!» de 2,5 s. Partidas de 3-5 minutos.',
  equipos: '2 contra 2 (siempre 4 asientos). Ganas con tu compañero: gana el último equipo con alguien vivo. No puedes pedir cartas a tu compañero.',
  torneo: 'Varias rondas seguidas: el primero en ganar la meta de rondas es el campeón del torneo.'
};
function preparar(multi) {
  const s = JSON.parse(JSON.stringify(A.setup));
  abrirCapa(multi ? 'Crear mesa multijugador' : 'Nueva partida', (c, api) => {
    const cont = h('div', { cls: 'form' });
    const sel = (obj, k, lista, despues) => { const g = h('div', { cls: 'aj-opc', role: 'group' }); lista.forEach(([val, nom]) => g.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: nom, 'aria-pressed': String(obj[k] === val), on: { click: () => { obj[k] = val; Array.from(g.children).forEach((b, i) => b.setAttribute('aria-pressed', String(lista[i][0] === val))); if (despues) despues(); } } }))); return g; };
    const fila = (t, ctl, ay) => h('div', { cls: 'aj-fila' }, [h('label', { cls: 'aj-etq' }, [t, ay ? h('small', { txt: ay }) : null]), ctl]);
    const desc = h('p', { cls: 'nota modo-desc' });
    const extra = h('div', { cls: 'form' });
    const nv = h('div', { cls: 'niveles' });
    const pinta = () => {
      desc.textContent = DESC_MODO[s.modo];
      extra.textContent = '';
      if (s.modo !== 'equipos') extra.appendChild(fila(multi ? 'Asientos (humanos + bots)' : 'Jugadores', sel(s, 'n', [2, 3, 4, 5].map((n) => [n, String(n)]), niveles)));
      if (s.modo === 'torneo') extra.appendChild(fila('Rondas para ganar el torneo', sel(s, 'meta', [[2, '2'], [3, '3'], [5, '5']])));
      niveles();
    };
    function niveles() {
      nv.textContent = '';
      const nb = (s.modo === 'equipos' ? 4 : s.n) - 1;
      for (let i = 0; i < nb; i++) {
        const etq = s.modo === 'equipos' ? (i === 1 ? 'Compañero bot' : i === 0 ? 'Rival 1' : 'Rival 2') : multi ? `Bot ${i + 1}` : `Rival ${i + 1}`;
        const g = h('div', { cls: 'nivel' }, [h('span', { txt: etq })]);
        const op = h('div', { cls: 'aj-opc', role: 'group' });
        NIVELES.forEach((n) => op.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: n.nombre, 'aria-pressed': String((s.niveles[i] ?? 1) === n.id), on: { click: () => { s.niveles[i] = n.id; Array.from(op.children).forEach((b, k) => b.setAttribute('aria-pressed', String(k === n.id))); } } })));
        g.appendChild(op); nv.appendChild(g);
      }
      if (multi) nv.appendChild(h('p', { cls: 'nota', txt: 'Cada amigo que se una ocupa un asiento y quita un bot (hasta 4 personas).' }));
    }
    cont.appendChild(fila('Modo de juego', sel(s, 'modo', Object.keys(MODOS).map((k) => [k, MODOS[k].nombre]), pinta)));
    cont.appendChild(desc); cont.appendChild(extra); cont.appendChild(nv);
    cont.appendChild(h('div', { cls: 'aj-sub', txt: 'Reglas de la casa' }));
    cont.appendChild(fila('Tiempo por turno', sel(s, 'tiempo', [[-1, 'Según modo'], [0, 'Sin límite'], [15000, '15 s'], [30000, '30 s'], [60000, '60 s']])));
    cont.appendChild(fila('Ventana de «¡Miau No!»', sel(s, 'nopeMs', [[-1, 'Según modo'], [2000, '2 s'], [4000, '4 s'], [6000, '6 s']]), 'Tiempo que hay para anular cada jugada.'));
    const sw = h('button', { type: 'button', cls: 'aj-sw', role: 'switch', 'data-f': 1, 'aria-checked': String(!!s.combos), on: { click: () => { s.combos = !s.combos; sw.setAttribute('aria-checked', String(s.combos)); } } }, [h('i')]);
    cont.appendChild(fila('Combos de gatos', sw, 'Pares, tríos y cinco distintos.'));
    cont.appendChild(h('div', { cls: 'botones' }, [
      btn(multi ? 'Crear mesa e invitar' : 'Empezar', () => {
        A.setup = JSON.parse(JSON.stringify(s)); guardar(); guardarAjustes();
        api.cerrar();
        if (multi) { Sesion.setupMulti = A.setup; Lobby.abrir(OPTS); } else empezarLocal(A.setup);
      }, 'grande'),
      btn('Atrás', () => api.cerrar(), 'sec')
    ]));
    c.appendChild(cont); pinta();
  });
}
function menuMulti() {
  abrirCapa('Multijugador', (c, api) => {
    c.appendChild(h('p', { cls: 'nota', txt: 'Hasta 4 personas por enlace (conexión directa entre dispositivos) y bots para completar la mesa de hasta 5. Si te desconectas, un bot juega por ti y recuperas tu asiento al volver.' }));
    c.appendChild(btn('Crear mesa (elegir modo y reglas)', () => { api.cerrar(); preparar(true); }, 'grande'));
    c.appendChild(btn('Unirme con un enlace', () => { api.cerrar(); Lobby.abrir(OPTS); }));
    c.appendChild(btn('Atrás', () => api.cerrar(), 'sec'));
  });
}
function empezarLocal(setup) { Sesion.setupMulti = null; Sesion.nuevaLocal(setup); primeraVez(); }
function continuar() {
  const r = Sesion.restaurar();
  if (r === 'local') { activarMesa(); return; }
  if (r === 'multi') {
    abrirCapa('Mesa restaurada', (c, api) => {
      c.appendChild(h('p', { cls: 'nota', txt: 'Tu mesa multijugador se guardó. Abre la sala, invita de nuevo a tus amigos (ellos recuperan su asiento con su token guardado) y pulsa Iniciar. Mientras no estén, un bot juega por ellos.' }));
      c.appendChild(btn('Abrir sala e invitar', () => { api.cerrar(); Lobby.abrir(OPTS); }, 'grande'));
      c.appendChild(btn('Seguir sin ellos (bots)', () => { api.cerrar(); Sesion.sinHumanosRemotos(); }, 'sec'));
      c.appendChild(btn('Cancelar', () => api.cerrar(), 'sec'));
    });
    return;
  }
  UI.aviso('No se pudo restaurar la partida', '#ff6b4a'); pintarMenu();
}
function activarMesa() { if (pantalla !== 'mesa') { mostrar('mesa'); pedirWake(); } }

/* ---------- menu de pausa ---------- */
function abrirPausa() {
  if (capaPausa) return;
  const solo = Sesion.rol === 'anfitrion' && !Sesion.multi;
  capaPausa = abrirCapa(solo ? 'Pausa' : 'Menú', (c, api) => {
    c.appendChild(btn('Continuar', () => api.cerrar(), 'grande'));
    if (Sesion.rol === 'anfitrion' && Sesion.multi) c.appendChild(btn('Invitar / reconectar amigos', () => { api.cerrar(); Lobby.abrir(OPTS); }));
    c.appendChild(btn('Ajustes', () => abrirAjustes()));
    c.appendChild(btn('Tutorial y reglas', () => verAyuda()));
    if (Sesion.rol === 'anfitrion') c.appendChild(btn('Guardar y salir al menú', () => { api.cerrar(); salirMenu(true); }, 'sec'));
    c.appendChild(btn(Sesion.rol === 'cliente' ? 'Salir de la mesa' : 'Abandonar partida', () => { if (confirm('¿Abandonar? Se perderá la partida en curso.')) { api.cerrar(); salirMenu(false); } }, 'peligro'));
    if (!solo) c.appendChild(h('p', { cls: 'nota', txt: 'En multijugador la partida no se detiene mientras miras el menú.' }));
  }, { alCerrar: () => { capaPausa = null; } });
}
function salirMenu(guardar) {
  if (guardar) { guardarMesa(); Sesion.cerrarMesa(); if (Red.conectado) { try { Red.salir(); } catch (e) { /* ya cerrada */ } } } else Sesion.abandonar();
  UI.ocultarTodo(); mostrar('menu');
}

/* ---------- ajustes, tutorial, logros, estadisticas ---------- */
function abrirAjustes(pest) {
  abrirCapa('Ajustes', (c) => {
    const p = panelAjustes(c, { pest });
    EntradaE.alPestana = (d) => p.siguiente(d);
  }, { alCerrar: () => { EntradaE.alPestana = null; guardarAjustes(); UI.refrescarTema(); } });
}
function paginasAyuda() {
  const tactil = matchMedia('(pointer: coarse)').matches;
  const cs = (...ts) => `<div class="tu-cartas">${ts.map((t) => `<div>${svgTipo(t, A.tema)}</div>`).join('')}</div>`;
  return [
    ['Objetivo', cs(0, 1) + '<p>Sobrevive. El mazo esconde <b>Gatos Bomba</b>: si robas uno y no tienes un <b>Ovillo</b> para calmarlo, <b>explotas</b> y quedas fuera. Gana el último jugador en pie.</p><p>Al empezar tienes algunas cartas y <b>un Ovillo</b>. Guárdalo bien.</p>'],
    ['Tu turno', '<p><b>1.</b> Juega las cartas que quieras (o ninguna). <b>2.</b> Termina robando una carta del mazo.</p><p>Si robas un Gato Bomba y tienes Ovillo, lo desactivas y <b>decides en secreto dónde esconder la bomba</b> otra vez en el mazo: arriba para que le toque al siguiente, o al fondo.</p>'],
    ['Cartas de acción', cs(2, 3, 4, 5, 6) + '<p><b>Zarpazo</b>: terminas el turno sin robar y el siguiente juega un turno extra. <b>Siesta</b>: terminas sin robar. <b>Súplica</b>: un rival te da una carta que él elige. <b>Torbellino</b>: mezcla el mazo. <b>Vidente</b>: miras las 3 primeras cartas.</p>'],
    ['¡Miau No!', cs(7) + '<p>Tras cada jugada hay una <b>ventana de unos segundos</b>: cualquiera con un ¡Miau No! puede anularla. Y un ¡Miau No! se puede anular con otro ¡Miau No!, formando cadenas: <b>cantidad impar = anulada</b>, par = se cumple.</p><p>El panel central te dice si la jugada «se cumplirá» o «quedará anulada». No se puede anular un Ovillo ni una bomba.</p>'],
    ['Combos de gatos', cs(8, 9, 10, 11, 12) + '<p>Las cartas de gato no hacen nada solas, pero en combo sí:</p><p><b>Par</b> (2 iguales): robas una carta al azar a un rival. <b>Trío</b> (3 iguales): nombras una carta y, si el rival la tiene, es tuya. <b>Cinco distintas</b>: eliges una carta del descarte.</p><p>Toca varias cartas para seleccionarlas y pulsa Jugar.</p>'],
    ['Modos', '<p><b>Clásico</b>: 2-5 jugadores. <b>Rápido</b>: mazo reducido y turnos de 15 s. <b>Equipos 2v2</b>: gana el último equipo con alguien vivo y no se puede apuntar al compañero. <b>Torneo</b>: gana el primero en llegar a la meta de rondas.</p><p>Puedes jugar contra 3 niveles de bots: Gatito, Callejero y Maestro (mira el mazo y esconde bombas con picardía).</p>'],
    ['Controles', tactil ? '<p>Toca una carta para elegirla y tócala otra vez (o pulsa <b>Jugar</b>) para lanzarla; también puedes arrastrarla hacia el descarte. <b>Robar y terminar</b> acaba tu turno. El botón <b>¡Miau No!</b> se enciende cuando puedes anular.</p>' : '<p><b>Ratón</b>: clic para elegir y de nuevo para jugar, o arrastra al descarte. <b>Teclado</b>: ← → recorren la mano, Enter elige/juega, J juega la selección, D roba y termina, N ¡Miau No!, T chat, Esc menú. <b>Mando Xbox</b>: cruceta/stick, A elige/juega, Y juega la selección, X roba, B cancela, RT/LT ¡Miau No!, LB/RB chat, MENÚ pausa.</p>'],
    ['Con amigos', '<p>Hasta 4 personas por enlace de invitación y bots para completar. El anfitrión reparte y arbitra: nadie recibe tus cartas, solo cuántas tienes. Si te desconectas, un bot juega por ti y recuperas tu asiento al volver con el enlace nuevo. Toda la partida es amistosa: no hay dinero real.</p>']
  ];
}
function verAyuda() {
  abrirCapa('Tutorial y reglas', (c) => {
    const pag = paginasAyuda();
    let i = 0;
    const cont = h('div', { cls: 'tutorial' });
    const puntos = h('div', { cls: 'tu-puntos' });
    const prev = btn('← Anterior', () => ir(i - 1), 'sec'), sig = btn('Siguiente →', () => ir(i + 1));
    function ir(k) {
      i = Math.max(0, Math.min(pag.length - 1, k));
      cont.innerHTML = `<h3>${i + 1}. ${pag[i][0]}</h3>${pag[i][1]}`;
      puntos.textContent = ''; pag.forEach((_, n) => puntos.appendChild(h('i', { cls: n === i ? 'on' : '' })));
      prev.disabled = i === 0; sig.disabled = i === pag.length - 1;
    }
    c.appendChild(cont); c.appendChild(puntos); c.appendChild(h('div', { cls: 'botones' }, [prev, sig]));
    ir(0);
    EntradaE.alPestana = (d) => ir(i + d);
  }, { alCerrar: () => { EntradaE.alPestana = null; } });
}
function primeraVez() {
  activarMesa();
  if (!leer(CLAVES.tutorial)) { escribir(CLAVES.tutorial, { ts: Date.now(), pistas: {} }); setTimeout(() => verAyuda(), 1200); }
}
function pista(k, txt) {
  const g = leer(CLAVES.tutorial, { ts: 1, pistas: {} });
  g.pistas = g.pistas || {};
  if (g.pistas[k]) return;
  g.pistas[k] = 1; escribir(CLAVES.tutorial, g);
  setTimeout(() => UI.aviso('Pista: ' + txt, '#ff9d3d'), 600);
}
function pistas(e, v) {
  if (e.t === 'turno' && e.j === v.yo) pista('turno', 'toca cartas para jugarlas; al terminar, «Robar y terminar» cierra tu turno.');
  else if (e.t === 'jugar' && e.j !== v.yo && v.mano.some((c) => MAZO[c] === TP.NOPE)) pista('nope', 'tienes un ¡Miau No!: púlsalo antes de que se agote la barra para anular la jugada.');
  else if (e.t === 'desactiva' && e.j === v.yo) pista('bomba', 'esconde la bomba arriba del mazo para que le toque a un rival.');
  else if (e.t === 'robo' && e.j === v.yo && v.mano.length >= 6) pista('combo', 'selecciona 2 o 3 gatos iguales y pulsa Jugar para robar cartas a rivales.');
}
function verLogros() {
  abrirCapa('Logros', (c) => {
    const hechos = Object.keys(Progreso.datos.logros).length;
    c.appendChild(h('p', { cls: 'nota', txt: `${hechos} de ${LOGROS.length} desbloqueados` }));
    const l = h('ul', { cls: 'logros' });
    LOGROS.forEach((x) => { const t = Progreso.datos.logros[x.id]; l.appendChild(h('li', { cls: t ? 'ok' : '' }, [h('b', { txt: (t ? '★ ' : '☆ ') + x.nombre }), h('span', { txt: x.desc })])); });
    c.appendChild(l); c.appendChild(btn('Cerrar', () => c.parentNode.querySelector('[data-cerrar]').click(), 'sec'));
  });
}
function verRanking(modo) {
  abrirCapa('Rankings', (c, api) => {
    Cu.panelRanking(c, { modo });
    c.appendChild(btn('Cerrar', () => api.cerrar(), 'sec'));
  });
}
function verCuenta() {
  abrirCapa('Cuenta', (c, api) => Cu.panelCuenta(c, api, { ranking: () => verRanking(), antesDeSalir: () => { Progreso.guardar(); guardarMesa(); } }));
}
function verStats() {
  const d = Progreso.datos;
  abrirCapa('Estadísticas', (c) => {
    const f = [['Partidas jugadas', d.partidas], ['Partidas ganadas', d.victorias], ['Victorias multijugador', d.mpVictorias], ['Racha actual', d.racha], ['Mejor racha', d.mejorRacha], ['Puntos acumulados', d.puntos], ['Rondas jugadas / ganadas', d.rondas + ' / ' + d.rondasGanadas], ['Bombas desactivadas', d.desactivadas], ['Veces que explotaste', d.explosiones], ['¡Miau No! jugados', d.nopes], ['Pares / tríos / cincos', d.pares + ' / ' + d.trios + ' / ' + d.cincos], ['Zarpazos resueltos', d.ataques], ['Visiones del futuro', d.futuros]];
    const t = h('table', { cls: 'tabla' });
    f.forEach(([a, b]) => t.appendChild(h('tr', {}, [h('td', { txt: a }), h('td', { txt: String(b) })])));
    c.appendChild(t); c.appendChild(btn('Cerrar', () => c.parentNode.querySelector('[data-cerrar]').click(), 'sec'));
  });
}

/* ---------- conexion con la sesion ---------- */
const ctxLogro = () => ({ yo: UI.T.v ? UI.T.v.yo : 0, v: UI.T.v, tipos: UI.T.meta.tipos, multi: Sesion.multi || Sesion.rol === 'cliente' });
Sesion.alPaquete = (p) => {
  if (pantalla !== 'mesa') { mostrar('mesa'); pedirWake(); cerrarTodas(); }
  hideBanner();
  UI.recibir(p);
};
UI.T.enviar = (cmd) => Sesion.enviar(cmd);
UI.T.alEvento = (e, v) => {
  Progreso.evento(e, ctxLogro());
  pistas(e, v);
  if (e.t === 'fin' && e.partida) { Cu.recompensaFin(e, v.yo); Cu.enviarPuntajes(Progreso.datos); }
  if (D.vibracion && Mando && Mando.conectado) {
    if (e.t === 'explota' && e.j === v.yo) Mando.vibrar(1, 0.8, 600);
    else if (e.t === 'explota') Mando.vibrar(0.4, 0.2, 200);
    else if (e.t === 'ataque' && e.a === v.yo) Mando.vibrar(0.8, 0.5, 300);
    else if (e.t === 'desactiva' && e.j === v.yo) Mando.vibrar(0.2, 0.5, 250);
    else if (e.t === 'jugar' && e.j !== v.yo && e.obj === v.yo) Mando.vibrar(0.5, 0.3, 200);
    else if (e.t === 'nope') Mando.vibrar(0.3, 0.6, 120);
  }
};
UI.T.alFin = {
  ranking: () => verRanking(),
  posicion: (slot) => {
    slot.textContent = 'Consultando tu posición en el ranking…';
    Cu.posicion('puntos').then((p) => { slot.textContent = p && p.posicion ? `Ranking global de puntos: #${p.posicion} de ${p.total}` : ''; });
  },
  revancha: () => { if (Sesion.rol === 'anfitrion') Sesion.revancha(); else UI.aviso('Solo el anfitrión puede pedir revancha', '#ffd23d'); },
  menu: () => salirMenu(false)
};
Sesion.alEstado = (e, extra) => {
  if (e === 'esperando') { mostrarBanner('Conectando con la mesa…'); }
  else if (e === 'sinasiento') { hideBanner(); UI.aviso('No tienes asiento en esa mesa', '#ff6b4a'); mostrar('menu'); }
  else if (e === 'cerrado') {
    if (pantalla === 'mesa' && Sesion.rol === 'cliente') mostrarBanner('Se perdió la conexión con el anfitrión. Pídele un enlace nuevo: tu asiento queda guardado.', true);
  } else if (e === 'ausente') UI.aviso(`${UI.T.meta.nombres[extra] || 'Un jugador'} se desconectó: un bot juega por él`, '#ffd23d');
  else if (e === 'reanudada') pintarMenu();
};
Progreso.alLogro = (l) => { UI.aviso('★ Logro: ' + l.nombre, '#ffd23d'); Sonido.fx('gana'); Cu.logro(l.id); };
function mostrarBanner(txt, boton) {
  hideBanner();
  const b = h('div', { cls: 'banner', id: 'banner', role: 'alert' }, [h('span', { txt }), boton ? btn('Salir al menú', () => salirMenu(false), 'peq sec') : null]);
  $('#app').appendChild(b);
}
function hideBanner() { const b = $('#banner'); if (b) b.remove(); }

/* ---------- barra superior ---------- */
$('#bPantalla').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); });
$('#bSonido').addEventListener('click', () => { Sonido.activo = !Sonido.activo; $('#bSonido').textContent = Sonido.activo ? '♪' : '✕'; $('#bSonido').setAttribute('aria-pressed', String(!Sonido.activo)); if (Sonido.activo) { Sonido.despertar(); Sonido.fx('click'); } });
$('#bChat').addEventListener('click', () => UI.alternarChat());
$('#bLog').addEventListener('click', () => UI.alternarLog());
$('#bMenu').addEventListener('click', () => abrirPausa());
$('#bAjustes').addEventListener('click', () => abrirAjustes());
$('#bAyuda').addEventListener('click', () => verAyuda());
EntradaE.alMenu = () => { if (capaPausa) capaPausa.cerrar(); else abrirPausa(); };
EntradaE.alAyuda = () => verAyuda();
EntradaE.alAtras = () => { const c = capasAbiertas[capasAbiertas.length - 1]; if (c) { c.cerrar(); return true; } return false; };
EntradaE.bloqueado = () => !!(Lobby && Lobby.abierto);
document.addEventListener('pointerdown', () => Sonido.despertar());
document.addEventListener('keydown', () => Sonido.despertar());

/* ---------- visibilidad, wake lock, pantalla ---------- */
async function pedirWake() { try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; } }
function alOcultar() {
  guardarMesa(); Progreso.guardar(); guardarAjustes();
  if (A.sonido.pausaOculta) Sonido.suspender(true);
  if (Sesion.rol === 'anfitrion' && !Sesion.multi && pantalla === 'mesa' && !capaPausa) abrirPausa();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) alOcultar();
  else { Sonido.suspender(false); if (pantalla === 'mesa') pedirWake(); }
});
window.addEventListener('pagehide', () => { guardarMesa(); Progreso.guardar(); guardarAjustes(); try { if (Red.conectado) Red.salir(); } catch (e) { /* cierre */ } });

/* ---------- bucle ---------- */
let tPrev = 0, tUlt = 0, acum = 0, nCuadros = 0, tInicio = performance.now(), ultimoBajar = 0;
function bucle(t) {
  requestAnimationFrame(bucle);
  if (D.limiteFps && t - tUlt < 1000 / D.limiteFps - 3) return;
  tUlt = t;
  const dt = t - (tPrev || t); tPrev = t;
  if (!Lobby || !Lobby.abierto) cuadroMando(Mando, t);
  if (pantalla === 'mesa') UI.cuadro(t);
  acum += dt; nCuadros++;
  if (acum >= 1500) {
    const fps = Math.round((nCuadros * 1000) / acum);
    const f = $('#fps'); f.hidden = !D.fps; if (D.fps) f.textContent = fps + ' FPS · ' + D.calidad;
    const piso = D.limiteFps && D.limiteFps < 60 ? D.limiteFps * 0.8 : 24;
    if (D.autoBajada && pantalla === 'mesa' && !document.hidden && t - tInicio > 6000 && t - ultimoBajar > 8000 && fps < piso && D.calidad !== 'baja') {
      const orden = ['ultra', 'alta', 'media', 'baja'], nuevo = orden[orden.indexOf(D.calidad) + 1];
      D.calidad = nuevo; Object.assign(D, PRESETS[nuevo]); guardar(); ultimoBajar = t;
      UI.aviso('Rendimiento bajo: calidad ' + nuevo, '#ffd23d');
    }
    acum = 0; nCuadros = 0;
  }
}

/* ---------- arranque ---------- */
Progreso.cargar();
Cu.aplicarPerfil();
if (window.Cuenta && window.Cuenta.alCambiar) { try { window.Cuenta.on('perfil', () => { Cu.aplicarPerfil(); if (pantalla === 'menu') pintarMenu(); }); } catch (e) { /* sin eventos */ } }
Cu.iniciarNube(() => { Progreso.cargar(); if (pantalla === 'menu') pintarMenu(); UI.aviso('Progreso actualizado desde tu cuenta', '#6dff6d'); });
Cu.enviarPuntajes(Progreso.datos);
Cu.sincronizarLogros(Progreso.datos.logros);
aplicar();
alCambiarAjustes(() => { UI.refrescarTema(); });
UI.iniciar();
iniciarTeclado();
Sesion.suscribir();
if (A.sonido.musicaOn) document.addEventListener('pointerdown', () => Sonido.musica(true), { once: true });
mostrar('menu');
requestAnimationFrame(bucle);
if (Lobby && Lobby.registrar) Lobby.registrar(OPTS);
if (Lobby && Lobby.hayEnlace()) Lobby.abrir(OPTS);
window.__gatos = { Sesion, UI, Progreso, A, D, abrirPausa };
