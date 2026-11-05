// Arranque: menu, preparacion de mesa, pausa, ayuda, logros y bucle principal.
import { h, $, $$ } from './dom.js';
import { A, D, aplicar, guardar, guardarYa as guardarAjustes, panelAjustes, suscribir as alCambiarAjustes, PRESETS, nombreTecla } from './ajustes.js';
import { Sonido } from './sonido.js';
import { Progreso, LOGROS } from './progreso.js';
import { Sesion, guardarYa as guardarMesa } from './sesion.js';
import * as UI from './ui.js';
import { E as EntradaE, iniciarTeclado, cuadroMando, capaActiva } from './entrada.js';
import { NIVELES } from './bots.js';
import { REGLAS_BASE } from './reglas.js';
import { CLAVES, leer, escribir } from './almacen.js';
import * as Cu from './cuenta-uno.js';

const Red = window.Red, Lobby = window.Lobby, Mando = window.Mando;
let pantalla = 'menu', capaPausa = null, capasAbiertas = [], wake = null, sinConexion = false;

const OPTS = {
  juego: 'UNO', juegoId: 'uno', maxJugadores: 4, minJugadores: 1,
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
    foco();
  }
  capasAbiertas.push(api);
  construir(cuerpo, api);
  setTimeout(() => { const f = $('[data-f]', cuerpo); if (f) f.focus(); }, 40);
  return api;
}
function foco() {
  setTimeout(() => { const c = capaActiva(); const f = c && $('[data-f]', c); if (f && !c.contains(document.activeElement)) f.focus(); }, 30);
}
const cerrarTodas = () => capasAbiertas.slice().forEach((c) => c.cerrar());

const btn = (txt, fn, cls = '') => h('button', { type: 'button', cls: 'btn ' + cls, 'data-f': 1, txt, on: { click: fn } });

/* ---------- menu principal ---------- */
function pintarMenu() {
  const m = $('#listaMenu'); m.textContent = '';
  const g = Sesion.hayGuardada();
  if (g) m.appendChild(btn(`Continuar partida${g.multi ? ' multijugador' : ''} · ronda ${g.ronda}`, continuar, 'grande'));
  m.appendChild(btn('Jugar contra bots', () => preparar(false), g ? '' : 'grande'));
  m.appendChild(btn('Multijugador (2-4 personas + bots)', menuMulti));
  m.appendChild(btn('Logros', verLogros, 'sec'));
  m.appendChild(btn('Rankings', () => verRanking(), 'sec'));
  m.appendChild(btn('Estadísticas', verStats, 'sec'));
  m.appendChild(btn('Ajustes', () => abrirAjustes(), 'sec'));
  m.appendChild(btn('Cómo jugar', () => verAyuda(), 'sec'));
  const pd = Progreso.datos;
  m.appendChild(h('p', { cls: 'resumen', txt: `${pd.victorias} partidas ganadas · ${pd.rondasGanadas} rondas · mejor racha ${pd.mejorRacha} · ${pd.puntos} puntos` }));
  Cu.pintarChip($('#cuentaLinea'), verCuenta);
  setTimeout(() => { const f = $('[data-f]', m); if (f && !capaActiva()?.classList.contains('ventana')) f.focus({ preventScroll: true }); }, 50);
}
function mostrar(p) {
  pantalla = p;
  const enMesa = p === 'mesa';
  document.body.classList.toggle('en-menu', !enMesa);
  $('#menu').hidden = enMesa; $('#mesa').hidden = !enMesa;
  $('#bChat').hidden = !enMesa; $('#bMenu').hidden = !enMesa;
  if (!enMesa) pintarMenu();
}

/* ---------- preparar mesa ---------- */
const REGLAS_DESC = [
  ['apilar', 'Acumular +2 y +4', 'Puedes responder con otro igual y el castigo se acumula.'],
  ['multiples', 'Varias cartas iguales a la vez', 'Mismo número o símbolo en una sola jugada.'],
  ['cero7', '0 rota las manos · 7 intercambia', 'El 7 te deja elegir con quién cambiar tu mano.'],
  ['atrapado', 'Saltar turno si estás atrapado', 'Sin jugada y sin cartas que robar, se salta tu turno solo.'],
  ['penaUno', 'Penalización por no gritar UNO', 'Te cazan y robas 2 si no gritas a tiempo.'],
  ['robarHasta', 'Robar hasta jugar', 'Robas cartas hasta que salga una jugable.'],
  ['comodinFinal', 'Comodín como última carta', 'Si se desactiva, no puedes ganar con un comodín.']
];
function preparar(multi) {
  const s = JSON.parse(JSON.stringify(A.setup));
  s.reglas = { ...REGLAS_BASE, ...s.reglas };
  abrirCapa(multi ? 'Crear mesa multijugador' : 'Nueva partida', (c, api) => {
    const cont = h('div', { cls: 'form' });
    const sel = (obj, k, lista, cls) => { const g = h('div', { cls: 'aj-opc ' + (cls || ''), role: 'group' }); lista.forEach(([val, nom]) => g.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: nom, 'aria-pressed': String(obj[k] === val), on: { click: () => { obj[k] = val; Array.from(g.children).forEach((b, i) => b.setAttribute('aria-pressed', String(lista[i][0] === val))); if (k === 'n') niveles(); } } }))); return g; };
    const fila = (t, ctl, ay) => h('div', { cls: 'aj-fila' }, [h('label', { cls: 'aj-etq' }, [t, ay ? h('small', { txt: ay }) : null]), ctl]);
    cont.appendChild(fila(multi ? 'Asientos en la mesa (humanos + bots)' : 'Jugadores', sel(s, 'n', [2, 3, 4, 5, 6].map((n) => [n, String(n)]))));
    const nv = h('div', { cls: 'niveles' });
    function niveles() {
      nv.textContent = '';
      for (let i = 0; i < s.n - 1; i++) {
        const g = h('div', { cls: 'nivel' }, [h('span', { txt: multi ? `Bot ${i + 1}` : `Rival ${i + 1}` })]);
        const op = h('div', { cls: 'aj-opc', role: 'group' });
        NIVELES.forEach((n) => op.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: n.nombre, 'aria-pressed': String((s.niveles[i] ?? 1) === n.id), on: { click: () => { s.niveles[i] = n.id; Array.from(op.children).forEach((b, k) => b.setAttribute('aria-pressed', String(k === n.id))); } } })));
        g.appendChild(op); nv.appendChild(g);
      }
      if (multi) nv.appendChild(h('p', { cls: 'nota', txt: 'Cada amigo que se una ocupa un asiento y quita un bot (hasta 4 personas).' }));
    }
    cont.appendChild(nv); niveles();
    cont.appendChild(h('div', { cls: 'aj-sub', txt: 'Reglas de la casa' }));
    REGLAS_DESC.forEach(([k, t, ay]) => {
      const b = h('button', { type: 'button', cls: 'aj-sw', role: 'switch', 'data-f': 1, 'aria-checked': String(!!s.reglas[k]), on: { click: () => { s.reglas[k] = !s.reglas[k]; b.setAttribute('aria-checked', String(s.reglas[k])); } } }, [h('i')]);
      cont.appendChild(fila(t, b, ay));
    });
    cont.appendChild(fila('Ventana para cazar un UNO olvidado', sel(s.reglas, 'ventanaUno', [[2000, '2 s'], [3000, '3 s'], [5000, '5 s']])));
    cont.appendChild(fila('Puntuación', sel(s.reglas, 'puntuacion', [['ronda', 'Por rondas'], ['unica', 'Partida única']])));
    cont.appendChild(fila('Meta de puntos', sel(s.reglas, 'meta', [[200, '200'], [300, '300'], [500, '500'], [1000, '1000']]), 'Solo con puntuación por rondas.'));
    cont.appendChild(fila('Tiempo por turno', sel(s.reglas, 'tiempo', [[0, 'Sin límite'], [30000, '30 s'], [10000, 'Rápido (10 s)']])));
    cont.appendChild(h('div', { cls: 'botones' }, [
      btn(multi ? 'Crear mesa e invitar' : 'Empezar', () => {
        A.setup = JSON.parse(JSON.stringify(s)); guardar(); guardarAjustes();
        api.cerrar();
        if (multi) { Sesion.setupMulti = A.setup; Lobby.abrir(OPTS); } else empezarLocal(A.setup);
      }, 'grande'),
      btn('Atrás', () => api.cerrar(), 'sec')
    ]));
    c.appendChild(cont);
  });
}
function menuMulti() {
  abrirCapa('Multijugador', (c, api) => {
    c.appendChild(h('p', { cls: 'nota', txt: 'Hasta 4 personas por enlace (conexión directa entre dispositivos) y bots para completar la mesa de hasta 6.' }));
    c.appendChild(btn('Crear mesa (configurar reglas)', () => { api.cerrar(); preparar(true); }, 'grande'));
    c.appendChild(btn('Unirme con un enlace', () => { api.cerrar(); Lobby.abrir(OPTS); }));
    c.appendChild(btn('Atrás', () => api.cerrar(), 'sec'));
  });
}

function empezarLocal(setup) {
  Sesion.setupMulti = null;
  Sesion.nuevaLocal(setup);
  primeraVez();
}
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
  Sesion.pausar(true);
  const solo = Sesion.rol === 'anfitrion' && !Sesion.multi;
  capaPausa = abrirCapa(solo ? 'Pausa' : 'Menú', (c, api) => {
    c.appendChild(btn('Continuar', () => api.cerrar(), 'grande'));
    if (Sesion.rol === 'anfitrion' && Sesion.multi) c.appendChild(btn('Invitar / reconectar amigos', () => { api.cerrar(); Lobby.abrir(OPTS); }));
    c.appendChild(btn('Ajustes', () => abrirAjustes()));
    c.appendChild(btn('Cómo jugar', () => verAyuda()));
    if (Sesion.rol === 'anfitrion') c.appendChild(btn('Guardar y salir al menú', () => { api.cerrar(); salirMenu(true); }, 'sec'));
    c.appendChild(btn(Sesion.rol === 'cliente' ? 'Salir de la mesa' : 'Abandonar partida', () => { if (confirm('¿Abandonar? Se perderá la partida en curso.')) { api.cerrar(); salirMenu(false); } }, 'peligro'));
    if (!solo) c.appendChild(h('p', { cls: 'nota', txt: 'En multijugador la partida no se detiene mientras miras el menú.' }));
  }, { alCerrar: () => { capaPausa = null; Sesion.pausar(false); } });
}
function salirMenu(guardar) {
  if (guardar) { guardarMesa(); Sesion.cerrarMesa(); if (Red.conectado) { try { Red.salir(); } catch (e) { /* ya cerrada */ } } } else Sesion.abandonar();
  UI.ocultarTodo(); mostrar('menu');
}

/* ---------- ajustes, ayuda, logros, estadisticas ---------- */
function abrirAjustes(pest) {
  abrirCapa('Ajustes', (c) => {
    const p = panelAjustes(c, { pest });
    EntradaE.alPestana = (d) => p.siguiente(d);
  }, { alCerrar: () => { EntradaE.alPestana = null; guardarAjustes(); UI.refrescarTema(); } });
}
function verAyuda() {
  const tactil = matchMedia('(pointer: coarse)').matches;
  abrirCapa('Cómo jugar', (c) => {
    const sec = (t, txt) => { c.appendChild(h('h3', { txt: t })); c.appendChild(h('p', { html: txt })); };
    sec('Objetivo', 'Quédate sin cartas. Juega una carta que coincida en <b>color</b>, <b>número</b> o <b>símbolo</b> con la de arriba del descarte. Si no puedes, roba.');
    sec('Cartas especiales', '<b>Salto</b>: el siguiente pierde el turno. <b>Reversa</b>: cambia el sentido. <b>+2</b>: el siguiente roba 2. <b>Comodín</b>: eliges color. <b>Comodín +4</b>: eliges color y el siguiente roba 4; solo debería jugarse sin cartas del color actual: el afectado puede <b>desafiar</b> (si hubo trampa roba el infractor 4; si no, robas 6).');
    sec('UNO', 'Al quedarte con una carta pulsa <b>UNO</b> (puedes hacerlo con 2 cartas, antes de jugar). Si no lo dices, cualquiera puede <b>cazarte</b> en unos segundos y robas 2.');
    sec('Controles', tactil ? 'Toca una carta para elegirla y tócala otra vez para jugarla, o arrástrala hasta el descarte. Botones grandes: Robar, UNO, Pasar y Desafiar.' : '<b>Ratón</b>: clic para elegir y de nuevo para jugar, o arrastra al descarte. <b>Teclado</b>: ← → recorren la mano, Enter juega, U = UNO / cazar, D = robar, P = pasar, C = desafiar, T = chat, Esc = menú. <b>Mando Xbox</b>: cruceta o stick recorren la mano, A juega, X roba, Y UNO / cazar, B pasa, LT/RT desafía, LB/RB chat, MENÚ pausa.');
    sec('Reglas de la casa', 'Antes de crear la mesa puedes activar: acumular +2/+4, jugar varias cartas iguales, 0 rota / 7 intercambia, robar hasta jugar, comodín final, penalización de UNO, puntuación por rondas o partida única y turnos de 10 s.');
    sec('Multijugador', 'El anfitrión reparte y arbitra: nadie recibe las cartas de otros, solo cuántas tienen. Si te desconectas, un bot juega por ti y recuperas tu asiento al volver con el enlace nuevo del anfitrión.');
  });
}
function primeraVez() {
  activarMesa();
  if (!leer(CLAVES.tutorial)) { escribir(CLAVES.tutorial, { ts: Date.now() }); setTimeout(() => verAyuda(), 1200); }
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
    const f = [['Partidas jugadas', d.partidas], ['Partidas ganadas', d.victorias], ['Victorias multijugador', d.mpVictorias], ['Rondas jugadas', d.rondas], ['Rondas ganadas', d.rondasGanadas], ['Racha actual', d.racha], ['Mejor racha', d.mejorRacha], ['Puntos acumulados', d.puntos], ['Mejor partida (pts)', d.mejorPartida], ['UNO gritados', d.uno], ['Rivales cazados', d.cazados], ['Desafíos ganados / perdidos', d.desafiosOk + ' / ' + d.desafiosMal], ['Cartas jugadas', d.jugadas], ['Cartas robadas', d.robos]];
    const t = h('table', { cls: 'tabla' });
    f.forEach(([a, b]) => t.appendChild(h('tr', {}, [h('td', { txt: a }), h('td', { txt: String(b) })])));
    c.appendChild(t); c.appendChild(btn('Cerrar', () => c.parentNode.querySelector('[data-cerrar]').click(), 'sec'));
  });
}

/* ---------- conexion con la sesion ---------- */
let ctxLogro = () => ({ yo: UI.T.v ? UI.T.v.yo : 0, v: UI.T.v, tipos: UI.T.meta.tipos, multi: Sesion.multi || Sesion.rol === 'cliente' });
Sesion.alPaquete = (p) => {
  if (pantalla !== 'mesa') { mostrar('mesa'); pedirWake(); cerrarTodas(); }
  hideBanner();
  UI.recibir(p);
};
UI.T.enviar = (cmd) => Sesion.enviar(cmd);
UI.T.alEvento = (e, v) => {
  Progreso.evento(e, ctxLogro());
  if (e.t === 'fin') { Cu.recompensaFin(e, v.yo); Cu.enviarPuntajes(Progreso.datos); }
  if (D.vibracion && Mando && Mando.conectado) {
    if (e.t === 'robo' && e.j === v.yo && e.motivo !== 'voluntario') Mando.vibrar(0.6, 0.4, 220);
    else if (e.t === 'cazado' && e.j === v.yo) Mando.vibrar(0.8, 0.5, 300);
    else if (e.t === 'fin') Mando.vibrar(0.5, 0.8, 400);
    else if (e.t === 'jugar' && e.j === v.yo) Mando.vibrar(0.1, 0.3, 60);
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
$('#bMenu').addEventListener('click', () => abrirPausa());
$('#bAjustes').addEventListener('click', () => abrirAjustes());
$('#bAyuda').addEventListener('click', () => verAyuda());
EntradaE.alMenu = () => { if (capaPausa) capaPausa.cerrar(); else abrirPausa(); };
EntradaE.alAyuda = () => verAyuda();
EntradaE.alAtras = () => { const c = capasAbiertas[capasAbiertas.length - 1]; if (c) { c.cerrar(); return true; } return false; };
EntradaE.bloqueado = () => !!(Lobby && Lobby.abierto);
document.addEventListener('pointerdown', () => Sonido.despertar(), { once: false });
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
let tPrev = 0, acum = 0, nCuadros = 0, tInicio = performance.now(), ultimoBajar = 0;
function bucle(t) {
  requestAnimationFrame(bucle);
  const dt = t - (tPrev || t); tPrev = t;
  if (!Lobby || !Lobby.abierto) cuadroMando(Mando, t);
  if (pantalla === 'mesa') UI.cuadro(t);
  acum += dt; nCuadros++;
  if (acum >= 1500) {
    const fps = Math.round((nCuadros * 1000) / acum);
    const f = $('#fps'); f.hidden = !D.fps; if (D.fps) f.textContent = fps + ' FPS · ' + D.calidad;
    if (D.autoBajada && pantalla === 'mesa' && !document.hidden && t - tInicio > 6000 && t - ultimoBajar > 8000 && fps < 24 && D.calidad !== 'baja') {
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
window.__uno = { Sesion, UI, Progreso, A, D, abrirPausa, sinConexion };
