// Arranque: menu, preparacion de mesa, pausa, ayuda, logros y bucle principal.
import { h, $ } from './dom.js';
import { A, D, aplicar, guardar, guardarYa as guardarAjustes, panelAjustes, suscribir as alCambiarAjustes, PRESETS } from './ajustes.js';
import { Sonido } from './sonido.js';
import { Progreso, LOGROS, partidaValida } from './progreso.js';
import { Sesion, guardarYa as guardarMesa } from './sesion.js';
import * as UI from './ui.js';
import { E as EntradaE, iniciarTeclado, cuadroMando, capaActiva } from './entrada.js';
import { NIVELES } from './bots.js';
import { CFG_BASE } from './reglas.js';
import { CLAVES, leer, escribir } from './almacen.js';
import * as Cu from './cuenta-colonos.js';

const Red = window.Red, Lobby = window.Lobby, Mando = window.Mando;
let pantalla = 'menu', capaPausa = null, capasAbiertas = [], wake = null;

const OPTS = {
  juego: 'Colonos de Isla', juegoId: 'colonos', maxJugadores: 4, minJugadores: 1,
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
  setTimeout(() => { const f = $('[data-f]:not([data-cerrar])', cuerpo) || $('[data-f]', cuerpo); if (f && document.body.classList.contains('usando-mando')) f.focus(); }, 40);
  return api;
}
function foco() { setTimeout(() => { const c = capaActiva(); const f = c && $('[data-f]', c); if (f && !c.contains(document.activeElement) && document.body.classList.contains('usando-mando')) f.focus(); }, 30); }
const cerrarTodas = () => capasAbiertas.slice().forEach((c) => c.cerrar());
const btn = (txt, fn, cls = '') => h('button', { type: 'button', cls: 'btn ' + cls, 'data-f': 1, txt, on: { click: fn } });

/* ---------- menu principal ---------- */
function pintarMenu() {
  const m = $('#listaMenu'); m.textContent = '';
  const g = Sesion.hayGuardada();
  if (g) m.appendChild(btn(`Continuar partida${g.multi ? ' multijugador' : ''} · turno ${Math.ceil(g.turno / g.n) || 1}`, continuar, 'grande'));
  m.appendChild(btn('Jugar contra bots', () => preparar(false), g ? '' : 'grande'));
  m.appendChild(btn('Multijugador (2-4 personas + bots)', menuMulti));
  m.appendChild(btn('Tutorial guiado', empezarTutorial, 'sec'));
  m.appendChild(btn('Logros', verLogros, 'sec'));
  m.appendChild(btn('Rankings', () => verRanking(), 'sec'));
  m.appendChild(btn('Estadísticas', verStats, 'sec'));
  m.appendChild(btn('Ajustes', () => abrirAjustes(), 'sec'));
  m.appendChild(btn('Cómo jugar', () => verAyuda(), 'sec'));
  const pd = Progreso.datos;
  m.appendChild(h('p', { cls: 'resumen', txt: `${pd.victorias} victorias · ${pd.partidas} partidas · mejor racha ${pd.mejorRacha} · ${pd.puntos} puntos` }));
  Cu.pintarChip($('#cuentaLinea'), verCuenta);
  setTimeout(() => { const f = $('[data-f]', m); if (f && !capaActiva()?.classList.contains('ventana') && document.body.classList.contains('usando-mando')) f.focus({ preventScroll: true }); }, 50);
}
function mostrar(p) {
  pantalla = p;
  const enMesa = p === 'mesa';
  document.body.classList.toggle('en-menu', !enMesa);
  $('#menu').hidden = enMesa; $('#mesa').hidden = !enMesa;
  $('#bChat').hidden = !enMesa; $('#bMenu').hidden = !enMesa;
  UI.mostrarMesa(enMesa);
  if (!enMesa) pintarMenu();
}

/* ---------- preparar mesa ---------- */
function preparar(multi) {
  const s = JSON.parse(JSON.stringify(A.setup));
  s.cfg = { ...CFG_BASE, ...s.cfg };
  abrirCapa(multi ? 'Crear mesa multijugador' : 'Nueva partida', (c, api) => {
    const cont = h('div', { cls: 'form' });
    const sel = (obj, k, lista) => { const g = h('div', { cls: 'aj-opc', role: 'group' }); lista.forEach(([val, nom]) => g.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: nom, 'aria-pressed': String(obj[k] === val), on: { click: () => { obj[k] = val; Array.from(g.children).forEach((b, i) => b.setAttribute('aria-pressed', String(lista[i][0] === val))); if (k === 'n') niveles(); } } }))); return g; };
    const fila = (t, ctl, ay) => h('div', { cls: 'aj-fila' }, [h('label', { cls: 'aj-etq' }, [t, ay ? h('small', { txt: ay }) : null]), ctl]);
    cont.appendChild(fila(multi ? 'Asientos (personas + bots)' : 'Jugadores', sel(s, 'n', [[2, '2'], [3, '3'], [4, '4']])));
    const nv = h('div', { cls: 'niveles' });
    function niveles() {
      nv.textContent = '';
      for (let i = 0; i < s.n - 1; i++) {
        const g = h('div', { cls: 'nivel' }, [h('span', { txt: multi ? `Bot ${i + 1}` : `Rival ${i + 1}` })]);
        const op = h('div', { cls: 'aj-opc', role: 'group' });
        NIVELES.forEach((n) => op.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: n.nombre, 'aria-pressed': String((s.niveles[i] ?? 1) === n.id), on: { click: () => { s.niveles[i] = n.id; Array.from(op.children).forEach((b, k) => b.setAttribute('aria-pressed', String(k === n.id))); } } })));
        g.appendChild(op); nv.appendChild(g);
      }
      if (multi) nv.appendChild(h('p', { cls: 'nota', txt: 'Cada amigo que se una ocupa un asiento y quita un bot (hasta 4 personas en total).' }));
    }
    cont.appendChild(nv); niveles();
    cont.appendChild(h('div', { cls: 'aj-sub', txt: 'Tablero y reglas' }));
    cont.appendChild(fila('Tablero', sel(s.cfg, 'tablero', [['equilibrado', 'Equilibrado'], ['aleatorio', 'Aleatorio']]), 'Equilibrado reparte recursos y números parejo; aleatorio es puro azar (los 6 y 8 nunca se tocan).'));
    cont.appendChild(fila('Tamaño de la isla', sel(s.cfg, 'radio', [[2, 'Estándar (19)'], [3, 'Grande (37)']])));
    const out = h('output', { txt: s.cfg.meta + ' PV' });
    const rg = h('input', { type: 'range', min: 5, max: 20, step: 1, value: s.cfg.meta, 'data-f': 1, on: { input: () => { s.cfg.meta = +rg.value; out.textContent = s.cfg.meta + ' PV'; } } });
    cont.appendChild(fila('Puntos de victoria', h('div', { cls: 'aj-rango' }, [rg, out]), 'Se gana al llegar a esta meta en tu turno (10 = clásico).'));
    cont.appendChild(fila('Tiempo por turno', sel(s.cfg, 'tiempo', [[0, 'Sin límite'], [120000, '2 min'], [60000, '1 min'], [30000, '30 s']]), 'Si se agota, el piloto automático juega por quien se demora.'));
    const sw = (k, t, ay) => { const b = h('button', { type: 'button', cls: 'aj-sw', role: 'switch', 'data-f': 1, 'aria-checked': String(!!s.cfg[k]), on: { click: () => { s.cfg[k] = !s.cfg[k]; b.setAttribute('aria-checked', String(s.cfg[k])); } } }, [h('i')]); cont.appendChild(fila(t, b, ay)); };
    sw('trato', 'Comercio entre jugadores', 'Si se apaga, solo hay banco y puertos.');
    sw('bancoLimitado', 'Banco limitado', 'Con 19 cartas por recurso; si falta, nadie recibe (o solo quien único).');
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
    c.appendChild(h('p', { cls: 'nota', txt: 'Hasta 4 personas por enlace (conexión directa entre dispositivos); los bots completan la mesa.' }));
    c.appendChild(btn('Crear mesa (configurar reglas)', () => { api.cerrar(); preparar(true); }, 'grande'));
    c.appendChild(btn('Unirme con un enlace', () => { api.cerrar(); Lobby.abrir(OPTS); }));
    c.appendChild(btn('Atrás', () => api.cerrar(), 'sec'));
  });
}
function empezarLocal(setup) { Sesion.setupMulti = null; Sesion.nuevaLocal(setup); activarMesa(); }
function empezarTutorial() {
  UI.reiniciarPistas(); A.ayudas.pistas = true; guardar();
  empezarLocal({ n: 3, niveles: [0, 0], cfg: { ...CFG_BASE, meta: 6, tablero: 'equilibrado' } });
  setTimeout(() => verAyuda(), 600);
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
    c.appendChild(btn('Probabilidades y estadísticas', () => { api.cerrar(); UI.verProbabilidades(); }));
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
    sec('Objetivo', 'Sé el primero en llegar a los <b>puntos de victoria (PV)</b> de la meta (10 por defecto) durante tu turno. Poblado = 1 PV, ciudad = 2 PV, <b>Camino más largo</b> = 2 PV, <b>Ejército mayor</b> = 2 PV y cada Reliquia (carta secreta) = 1 PV.');
    sec('Fundación', 'En orden de turno y luego a la inversa («serpiente»), cada jugador coloca un poblado y un camino pegado a él, dos veces. Los poblados necesitan <b>2 espacios libres</b> alrededor. Tu segundo poblado te da 1 recurso de cada hexágono que toca. Busca números probables (los puntitos bajo la ficha) y diversidad de recursos.');
    sec('Tu turno', '1) <b>Tira los dados</b>: los hexágonos con ese número dan 1 recurso por poblado y 2 por ciudad. 2) <b>Construye, compra y comercia</b> en el orden que quieras. 3) <b>Termina</b> el turno.');
    sec('Recursos y costos', 'Madera, Barro, Algodón, Maíz y Metal. <b>Camino</b>: madera + barro. <b>Poblado</b>: madera + barro + algodón + maíz. <b>Ciudad</b> (mejora un poblado): 2 maíz + 3 metal. <b>Carta de desarrollo</b>: algodón + maíz + metal. Los caminos deben conectar con los tuyos.');
    sec('El 7 y el bandido', 'Con un 7 nadie produce: quien tenga más de 7 cartas descarta la mitad (hacia abajo); luego el jugador del turno mueve al <b>bandido</b> a otro hexágono (bloquea su producción) y roba una carta al azar a un vecino de ese hexágono.');
    sec('Comercio', 'Con otros jugadores: ofrece cartas a todos o a uno y elige con quién cerrar el trato (solo en tu turno). Con el banco: <b>4:1</b>; con un puerto genérico <b>3:1</b>; con el puerto de un recurso <b>2:1</b> de ese recurso. Un poblado o ciudad en el puerto te da su tasa.');
    sec('Cartas de desarrollo', '<b>Guardia</b>: mueve al bandido y suma al Ejército mayor (3 o más, más que nadie). <b>Constructor de rutas</b>: 2 caminos gratis. <b>Cosecha</b>: 2 recursos del banco. <b>Acaparar</b>: eliges un recurso y todos te dan el que tengan. <b>Reliquia</b>: 1 PV oculto. Una carta por turno, y no la que acabas de comprar.');
    sec('Camino más largo', 'Necesitas una cadena continua de 5 o más caminos (sin repetir y un poblado rival la corta). Quien tenga la más larga la conserva en empates; si se corta y nadie es claramente más largo, queda sin dueño.');
    sec('Probabilidades', 'Los puntitos bajo cada número son sus 36avos de probabilidad: 6 y 8 (5/36 = 13.9%) son los mejores. Al fundar, el mapa de calor suma los puntitos de los 3 hexágonos. El botón % muestra el histograma de tus dados y la producción esperada de cada jugador.');
    sec('Controles', tactil ? 'Arrastra con un dedo para mover el tablero y pellizca para el zoom. Toca un lugar resaltado para elegirlo y confirma con ✓. Mantén pulsado un hexágono para ver su probabilidad.' : '<b>Ratón</b>: arrastra para mover, rueda para zoom, clic en un lugar resaltado (clic de nuevo o ✓ para confirmar). <b>Teclado</b>: flechas mueven la selección o el mapa, Enter confirma, D tirar, B construir, M comerciar, C cartas, E terminar, V mapa de probabilidades, +/− zoom, H centrar, P pausa. <b>Mando Xbox</b>: stick izq. selecciona, stick der. mueve el mapa, gatillos zoom, A confirmar/tirar, B cancelar, X comerciar, Y cartas, LB/RB elegir qué construir, VISTA terminar turno, MENÚ pausa.');
    sec('Multijugador', 'El anfitrión arbitra: nadie ve las cartas de los demás, solo cuántas tienen. Si te desconectas, un bot juega por ti y recuperas tu asiento al volver con el enlace nuevo del anfitrión.');
  });
}
function verLogros() {
  abrirCapa('Logros', (c, api) => {
    const hechos = Object.keys(Progreso.datos.logros).length;
    c.appendChild(h('p', { cls: 'nota', txt: `${hechos} de ${LOGROS.length} desbloqueados` }));
    const l = h('ul', { cls: 'logros' });
    LOGROS.forEach((x) => { const t = Progreso.datos.logros[x.id]; l.appendChild(h('li', { cls: t ? 'ok' : '' }, [h('b', { txt: (t ? '★ ' : '☆ ') + x.nombre }), h('span', { txt: x.desc })])); });
    c.appendChild(l); c.appendChild(btn('Cerrar', () => api.cerrar(), 'sec'));
  });
}
function verRanking(modo) {
  abrirCapa('Rankings', (c, api) => {
    c.appendChild(h('p', { cls: 'nota', txt: 'Solo cuentan partidas de 3 o más jugadores con meta de 8 PV o más.' }));
    Cu.panelRanking(c, { modo });
    c.appendChild(btn('Cerrar', () => api.cerrar(), 'sec'));
  });
}
function verCuenta() { abrirCapa('Cuenta', (c, api) => Cu.panelCuenta(c, api, { ranking: () => verRanking(), antesDeSalir: () => { Progreso.guardar(); guardarMesa(); } })); }
function verStats() {
  const d = Progreso.datos;
  abrirCapa('Estadísticas', (c, api) => {
    const f = [['Partidas jugadas', d.partidas], ['Partidas ganadas', d.victorias], ['Victorias con amigos', d.mpVictorias], ['Racha actual', d.racha], ['Mejor racha', d.mejorRacha], ['Puntos de ranking', d.rPuntos], ['Mejor puntaje en una partida (PV)', d.mejorPV], ['Tratos cerrados', d.tratos], ['Ciudades construidas', d.ciudades], ['Veces que moviste al bandido', d.ladrones], ['Guardias jugados', d.guardias], ['Veces con el camino más largo', d.caminosLargos]];
    const t = h('table', { cls: 'tabla' });
    f.forEach(([a, b]) => t.appendChild(h('tr', {}, [h('td', { txt: a }), h('td', { txt: String(b) })])));
    c.appendChild(t); c.appendChild(btn('Cerrar', () => api.cerrar(), 'sec'));
  });
}

/* ---------- conexion con la sesion ---------- */
Sesion.alPaquete = (p) => {
  if (pantalla !== 'mesa') { mostrar('mesa'); pedirWake(); cerrarTodas(); }
  hideBanner();
  UI.recibir(p);
};
UI.T.enviar = (cmd) => Sesion.enviar(cmd);
UI.T.alEvento = (e, v) => {
  Progreso.evento(e, { yo: v.yo, v, tipos: UI.T.meta.tipos, multi: UI.T.meta.tipos.filter((t) => t === 'humano').length > 1 });
  if (e.t === 'fin') {
    Cu.recompensaFin(e, v.yo, partidaValida(v.n, v.cfg));
    Cu.enviarPuntajes(Progreso.datos);
    guardarMesa();
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
  if (e === 'esperando') mostrarBanner('Conectando con la mesa…');
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
EntradaE.enMesa = () => pantalla === 'mesa';
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
let tPrev = 0, acum = 0, nCuadros = 0, tInicio = performance.now(), ultimoBajar = 0;
function bucle(t) {
  requestAnimationFrame(bucle);
  const dt = t - (tPrev || t); tPrev = t;
  if (!Lobby || !Lobby.abierto) cuadroMando(Mando, t, dt);
  if (pantalla === 'mesa') UI.cuadro(t);
  acum += dt; nCuadros++;
  if (acum >= 1500) {
    const fps = Math.round((nCuadros * 1000) / acum);
    const f = $('#fps'); f.hidden = !D.fps; if (D.fps) f.textContent = fps + ' FPS · ' + D.calidad;
    if (D.autoBajada && pantalla === 'mesa' && !document.hidden && t - tInicio > 6000 && t - ultimoBajar > 8000 && fps < 24 && D.calidad !== 'baja') {
      const orden = ['ultra', 'alta', 'media', 'baja'], nuevo = orden[orden.indexOf(D.calidad) + 1];
      D.calidad = nuevo; Object.assign(D, PRESETS[nuevo]); guardar(); ultimoBajar = t;
      UI.refrescarTema(); UI.aviso('Rendimiento bajo: calidad ' + nuevo, '#ffd23d');
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
alCambiarAjustes(() => { if (pantalla === 'mesa') UI.refrescarTema(); });
UI.iniciar();
iniciarTeclado();
Sesion.suscribir();
if (A.sonido.musicaOn) document.addEventListener('pointerdown', () => Sonido.musica(true), { once: true });
mostrar('menu');
requestAnimationFrame(bucle);
if (Lobby && Lobby.registrar) Lobby.registrar(OPTS);
if (Lobby && Lobby.hayEnlace()) Lobby.abrir(OPTS);
window.__colonos = { Sesion, UI, Progreso, A, D, abrirPausa };
