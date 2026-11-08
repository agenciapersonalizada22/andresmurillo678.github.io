// Arranque: menu, preparacion de partida, pausa, ayuda y tutorial, logros, ranking y bucle principal.
import { h, $ } from './dom.js';
import { A, D, aplicar, guardar, guardarYa as guardarAjustes, panelAjustes, suscribir as alCambiarAjustes, PRESETS } from './ajustes.js';
import { Sonido } from './sonido.js';
import { Progreso, LOGROS } from './progreso.js';
import { Sesion, guardarYa as guardarPartida } from './sesion.js';
import * as UI from './ui.js';
import { Mapa } from './mapaui.js';
import { E as EntradaE, iniciarTeclado, cuadroMando, capaActiva } from './entrada.js';
import { NIVELES } from './bots.js';
import { MODOS, META_RAPIDO, metaRapido } from './reglas.js';
import { CONTINENTES } from './mapa.js';
import * as Cu from './cuenta-conquista.js';

const Red = window.Red, Lobby = window.Lobby, Mando = window.Mando;
let pantalla = 'menu', capaPausa = null, capasAbiertas = [], wake = null;

const OPTS = {
  juego: 'Conquista Mundial', juegoId: 'conquista', maxJugadores: 4, minJugadores: 1,
  alIniciar: (config, jugadores) => Sesion.alIniciar(config, jugadores),
  alCerrar: () => {}
};

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
    if (opts.alCerrar) opts.alCerrar();
    foco();
  }
  capasAbiertas.push(api);
  construir(cuerpo, api);
  setTimeout(() => { const f = $('[data-f]', cuerpo); if (f) f.focus(); }, 40);
  return api;
}
function foco() { setTimeout(() => { const c = capaActiva(); const f = c && $('[data-f]', c); if (f && !c.contains(document.activeElement)) f.focus(); }, 30); }
const cerrarTodas = () => capasAbiertas.slice().forEach((c) => c.cerrar());
const btn = (txt, fn, cls = '') => h('button', { type: 'button', cls: 'btn ' + cls, 'data-f': 1, txt, on: { click: fn } });

/* ---------- menu ---------- */
function pintarMenu() {
  const m = $('#listaMenu'); m.textContent = '';
  const g = Sesion.hayGuardada();
  if (g) m.appendChild(btn(`Continuar partida${g.multi ? ' multijugador' : ''} · ronda ${g.ronda}`, continuar, 'grande'));
  m.appendChild(btn('Jugar contra bots', () => preparar(false), g ? '' : 'grande'));
  m.appendChild(btn('Multijugador (2-4 personas + bots)', menuMulti));
  m.appendChild(btn('Entrenamiento guiado', entrenar, 'sec'));
  m.appendChild(btn('Logros', verLogros, 'sec'));
  m.appendChild(btn('Rankings', () => verRanking(), 'sec'));
  m.appendChild(btn('Estadísticas', verStats, 'sec'));
  m.appendChild(btn('Ajustes', () => abrirAjustes(), 'sec'));
  m.appendChild(btn('Cómo jugar', () => verAyuda(), 'sec'));
  const pd = Progreso.datos;
  m.appendChild(h('p', { cls: 'resumen', txt: `${pd.victorias} victorias · ${pd.partidas} partidas · ${pd.conqTotal} territorios conquistados` }));
  Cu.pintarChip($('#cuentaLinea'), verCuenta);
  setTimeout(() => { const f = $('[data-f]', m); if (f && !(capaActiva() && capaActiva().classList.contains('ventana'))) f.focus({ preventScroll: true }); }, 50);
}
function mostrar(p) {
  pantalla = p;
  const enMesa = p === 'mesa';
  document.body.classList.toggle('en-menu', !enMesa);
  $('#menu').hidden = enMesa; $('#mesa').hidden = !enMesa; $('#bMenu').hidden = !enMesa;
  if (!enMesa) pintarMenu(); else setTimeout(() => Mapa.medir(), 30);
}

/* ---------- preparar partida ---------- */
function preparar(multi) {
  const s = JSON.parse(JSON.stringify(A.setup));
  abrirCapa(multi ? 'Crear partida multijugador' : 'Nueva partida', (c, api) => {
    const cont = h('div', { cls: 'form' });
    const fila = (t, ctl, ay) => h('div', { cls: 'aj-fila' }, [h('label', { cls: 'aj-etq' }, [t, ay ? h('small', { txt: ay }) : null]), ctl]);
    const sel = (obj, k, lista, alElegir) => { const g = h('div', { cls: 'aj-opc', role: 'group' }); lista.forEach(([val, nom]) => g.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: nom, 'aria-pressed': String(obj[k] === val), on: { click: () => { obj[k] = val; Array.from(g.children).forEach((b, i) => b.setAttribute('aria-pressed', String(lista[i][0] === val))); if (alElegir) alElegir(); } } }))); return g; };
    const modoDesc = h('p', { cls: 'nota' });
    const zonaN = h('div'), nv = h('div', { cls: 'niveles' }), extra = h('div');
    const nota = () => { modoDesc.textContent = MODOS.find((m) => m.id === s.cfg.modo).desc + (s.cfg.modo === 'rapido' ? ` (${META_RAPIDO} territorios, ${metaRapido(2)} con 2 jugadores)` : ''); };
    const dibujarN = () => {
      zonaN.textContent = '';
      const opts = s.cfg.modo === 'equipos' ? [4, 6] : [2, 3, 4, 5, 6];
      if (!opts.includes(s.n)) s.n = s.cfg.modo === 'equipos' ? 4 : s.n;
      zonaN.appendChild(fila(multi ? 'Jugadores en la mesa (humanos + bots)' : 'Jugadores', sel(s, 'n', opts.map((n) => [n, String(n)]), niveles)));
      niveles();
    };
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
    const dibujarExtra = () => {
      extra.textContent = '';
      if (s.cfg.modo !== 'misiones' && s.cfg.modo !== 'equipos') {
        const b = h('button', { type: 'button', cls: 'aj-sw', role: 'switch', 'data-f': 1, 'aria-checked': String(!!s.cfg.objetivos), on: { click: () => { s.cfg.objetivos = !s.cfg.objetivos; b.setAttribute('aria-checked', String(s.cfg.objetivos)); } } }, [h('i')]);
        extra.appendChild(fila('Misiones secretas opcionales', b, 'Además de dominar, puedes ganar cumpliendo tu misión.'));
      }
      extra.appendChild(fila('Tiempo por turno', sel(s.cfg, 'tiempo', [[0, 'Sin límite'], [30000, '30 s'], [60000, '60 s'], [120000, '2 min']]), 'Si se agota, un bot termina tu turno.'));
      extra.appendChild(fila('Límite de rondas', sel(s.cfg, 'rondaMax', [[0, 'Sin límite'], [20, '20'], [40, '40']]), 'Al llegar, gana quien tenga más territorios.'));
    };
    cont.appendChild(fila('Modo de juego', sel(s.cfg, 'modo', MODOS.map((m) => [m.id, m.nombre]), () => { nota(); dibujarN(); dibujarExtra(); })));
    cont.appendChild(modoDesc); cont.appendChild(zonaN); cont.appendChild(nv); cont.appendChild(extra);
    nota(); dibujarN(); dibujarExtra();
    cont.appendChild(h('div', { cls: 'botones' }, [
      btn(multi ? 'Crear mesa e invitar' : 'Empezar', () => {
        if (s.cfg.modo === 'misiones') s.cfg.objetivos = true;
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
    c.appendChild(h('p', { cls: 'nota', txt: 'Hasta 4 personas por enlace (conexión directa entre dispositivos) y bots hasta completar un mundo de 6 jugadores.' }));
    c.appendChild(btn('Crear partida (configurar)', () => { api.cerrar(); preparar(true); }, 'grande'));
    c.appendChild(btn('Unirme con un enlace', () => { api.cerrar(); Lobby.abrir(OPTS); }));
    c.appendChild(btn('Atrás', () => api.cerrar(), 'sec'));
  });
}
function empezarLocal(setup, tutorial = false) {
  Sesion.setupMulti = null; Sesion.velocidad = D.velBots;
  UI.T.tutorial = tutorial;
  Sesion.nuevaLocal(setup);
  activarMesa();
}
function entrenar() {
  empezarLocal({ n: 2, niveles: [0], cfg: { modo: 'rapido', objetivos: false, tiempo: 0, rondaMax: 0, tutorial: true } }, true);
}
function continuar() {
  Sesion.velocidad = D.velBots;
  const r = Sesion.restaurar();
  if (r === 'local') { activarMesa(); return; }
  if (r === 'multi') {
    abrirCapa('Partida restaurada', (c, api) => {
      c.appendChild(h('p', { cls: 'nota', txt: 'Tu partida multijugador se guardó. Abre la sala, invita de nuevo a tus amigos (ellos recuperan su asiento con su token guardado) y pulsa Iniciar. Mientras no estén, un bot juega por ellos.' }));
      c.appendChild(btn('Abrir sala e invitar', () => { api.cerrar(); Lobby.abrir(OPTS); }, 'grande'));
      c.appendChild(btn('Seguir sin ellos (bots)', () => { api.cerrar(); Sesion.sinHumanosRemotos(); }, 'sec'));
      c.appendChild(btn('Cancelar', () => api.cerrar(), 'sec'));
    });
    return;
  }
  UI.aviso('No se pudo restaurar la partida', '#ff6b4a'); pintarMenu();
}
function activarMesa() { if (pantalla !== 'mesa') { mostrar('mesa'); pedirWake(); } }

/* ---------- pausa ---------- */
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
    c.appendChild(btn(Sesion.rol === 'cliente' ? 'Salir de la partida' : 'Abandonar partida', () => { if (confirm('¿Abandonar? Se perderá la partida en curso.')) { api.cerrar(); salirMenu(false); } }, 'peligro'));
    if (!solo) c.appendChild(h('p', { cls: 'nota', txt: 'En multijugador la partida no se detiene mientras miras el menú.' }));
  }, { alCerrar: () => { capaPausa = null; Sesion.pausar(false); } });
}
function salirMenu(guardar) {
  if (guardar) { guardarPartida(); Sesion.cerrarPartida(); if (Red.conectado) { try { Red.salir(); } catch (e) { /* ya cerrada */ } } } else Sesion.abandonar();
  UI.ocultarTodo(); hideBanner(); mostrar('menu');
}

/* ---------- ajustes, ayuda, logros, estadisticas ---------- */
function abrirAjustes(pest) {
  abrirCapa('Ajustes', (c) => { const p = panelAjustes(c, { pest }); EntradaE.alPestana = (d) => p.siguiente(d); },
    { alCerrar: () => { EntradaE.alPestana = null; guardarAjustes(); UI.refrescarTema(); if (Sesion.partida) Sesion.partida.ajustarVelocidad(D.velBots); } });
}
function verAyuda() {
  const tactil = matchMedia('(pointer: coarse)').matches;
  abrirCapa('Cómo jugar', (c) => {
    const sec = (t, txt) => { c.appendChild(h('h3', { txt: t })); c.appendChild(h('p', { html: txt })); };
    sec('Objetivo', 'Conquista el mundo: en <b>Dominación</b> elimina a todos los rivales. En <b>Misiones</b> cumple tu objetivo secreto (continentes, eliminar a un jugador o tener muchos territorios). En <b>Rápido</b> el despliegue es automático y gana quien controle ' + META_RAPIDO + ' territorios (' + metaRapido(2) + ' si son 2). En <b>Equipos</b> gana el bando que quede en pie.');
    sec('Turno', '<b>1. Refuerzo</b>: recibes ejércitos (1 por cada 3 territorios, mínimo 3) + el bono de los continentes que dominas (' + CONTINENTES.map((x) => x.nombre + ' +' + x.bono).join(', ') + ') + canjes de cartas. <b>2. Ataque</b>: elige un territorio tuyo con 2+ ejércitos y un vecino enemigo (también por rutas marítimas punteadas). <b>3. Fortificación</b>: mueve ejércitos entre dos territorios tuyos conectados y termina el turno.');
    sec('Dados', 'El atacante tira 1 a 3 dados (siempre queda 1 ejército atrás) y el defensor 1 a 2. Se comparan de mayor a menor: cada dado mayor del atacante elimina un ejército defensor; en empate gana el defensor. Al conquistar mueves al menos tantos ejércitos como dados lanzaste. «Hasta el final» repite el ataque hasta conquistar o quedarte sin ejércitos.');
    sec('Cartas', 'Si conquistas al menos un territorio en tu turno robas una carta (infantería, caballería, artillería, o comodín). Tres iguales, una de cada o un comodín + 2 cualquiera forman un conjunto que canjeas en tu refuerzo: 4, 6, 8, 10, 12, 15 ejércitos y luego +5 cada vez. Si poseías el territorio de una carta canjeada, +2 ejércitos en él. Con 5 cartas debes canjear. Al eliminar a un rival heredas sus cartas.');
    sec('Controles', tactil ? 'Arrastra con un dedo para mover el mapa, pellizca para acercar. Toca territorios para elegir; los botones inferiores cambian de fase.' : '<b>Ratón</b>: arrastra el mapa, rueda para zoom, clic para elegir. <b>Teclado</b>: flechas mueven el cursor, Enter elige, Mayús+flechas mueven el mapa, B ataca hasta el final, T siguiente fase, C cartas, O misión, M mundo, Q cantidad, +/− zoom, 0 ver todo, P o Esc menú. <b>Mando Xbox</b>: cruceta o stick izquierdo mueven el cursor, A elige, B atrás, X cantidad/hasta el final, Y siguiente fase, stick derecho mueve el mapa, LT/RT zoom, LB cartas, RB misión, VISTA mundo, MENÚ pausa.');
    sec('Multijugador', 'El anfitrión arbitra: nadie recibe las cartas ni la misión de otros. Si te desconectas, un bot juega por ti y recuperas tu asiento al volver con el enlace nuevo del anfitrión. Puedes completar hasta 6 jugadores con bots de 3 niveles (Recluta, Estratega, Maestro).');
    c.appendChild(btn('Empezar el entrenamiento guiado', () => { c.parentNode.querySelector('[data-cerrar]').click(); entrenar(); }, 'sec'));
  });
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
function verRanking(modo) { abrirCapa('Rankings', (c, api) => { Cu.panelRanking(c, { modo }); c.appendChild(btn('Cerrar', () => api.cerrar(), 'sec')); }); }
function verCuenta() { abrirCapa('Cuenta', (c, api) => Cu.panelCuenta(c, api, { ranking: () => verRanking(), antesDeSalir: () => { Progreso.guardar(); guardarPartida(); } })); }
function verStats() {
  const d = Progreso.datos;
  abrirCapa('Estadísticas', (c) => {
    const f = [['Partidas jugadas', d.partidas], ['Victorias', d.victorias], ['Derrotas', d.derrotas], ['Victorias multijugador', d.mpVictorias], ['Territorios conquistados', d.conqTotal], ['Territorios en partidas terminadas', d.territoriosFin], ['Rivales eliminados', d.elim], ['Batallas', d.batallas], ['Ejércitos destruidos', d.ejercitosDestruidos], ['Ejércitos perdidos al atacar', d.ejercitosPerdidos], ['Golpes perfectos (3 vs 2)', d.golpes], ['Conjuntos de cartas canjeados', d.canjes]];
    for (const m of MODOS) { const p = d.porModo[m.id]; if (p) f.push([m.nombre + ' (ganadas/jugadas)', p.g + ' / ' + p.j]); }
    const t = h('table', { cls: 'tabla' });
    f.forEach(([a, b]) => t.appendChild(h('tr', {}, [h('td', { txt: a }), h('td', { txt: String(b) })])));
    c.appendChild(t); c.appendChild(btn('Cerrar', () => c.parentNode.querySelector('[data-cerrar]').click(), 'sec'));
  });
}

/* ---------- conexion con la sesion ---------- */
UI.T.nuevaPartida = () => Progreso.nuevaPartida();
Sesion.alPaquete = (p) => {
  if (pantalla !== 'mesa') { mostrar('mesa'); pedirWake(); cerrarTodas(); }
  hideBanner();
  UI.recibir(p);
};
UI.T.enviar = (cmd) => { const r = Sesion.enviar(cmd); if (r && r.ok === false && r.error) { UI.aviso(r.error, '#ff6b4a'); Sonido.fx('error'); } return r; };
UI.T.alEvento = (e, v) => {
  Progreso.evento(e, { yo: v.yo, v, multi: Sesion.multi || Sesion.rol === 'cliente', tutorial: !!v.cfg.tutorial });
  if (e.t === 'fin') {
    const gano = v.cfg.modo === 'equipos' ? v.jug[v.yo].equipo === (v.ganador && v.ganador.equipo) : v.ganador && v.ganador.j === v.yo;
    Cu.recompensaFin(!!gano); Cu.enviarPuntajes(Progreso.datos);
  }
};
UI.T.alFin = {
  ranking: () => verRanking(),
  posicion: (slot) => { slot.textContent = 'Consultando tu posición en el ranking…'; Cu.posicion('victorias').then((p) => { slot.textContent = p && p.posicion ? `Ranking global de victorias: #${p.posicion} de ${p.total}` : ''; }); },
  revancha: () => { if (Sesion.rol === 'anfitrion') Sesion.revancha(); else UI.aviso('Solo el anfitrión puede pedir revancha', '#ffd23d'); },
  menu: () => salirMenu(false)
};
Sesion.alEstado = (e, extra) => {
  if (e === 'esperando') mostrarBanner('Conectando con la partida…');
  else if (e === 'sinasiento') { hideBanner(); UI.aviso('No tienes asiento en esa partida', '#ff6b4a'); mostrar('menu'); }
  else if (e === 'cerrado') { if (pantalla === 'mesa' && Sesion.rol === 'cliente') mostrarBanner('Se perdió la conexión con el anfitrión. Pídele un enlace nuevo: tu asiento queda guardado.', true); }
  else if (e === 'ausente') UI.aviso(`${UI.nombreJ(extra)} se desconectó: un bot juega por él`, '#ffd23d');
  else if (e === 'error') UI.aviso(extra || 'Orden rechazada', '#ff6b4a');
  else if (e === 'reanudada') pintarMenu();
};
Progreso.alLogro = (l) => { UI.aviso('★ Logro: ' + l.nombre, '#ffd23d'); Sonido.fx('gana'); Cu.logro(l.id); };
function mostrarBanner(txt, boton) {
  hideBanner();
  $('#app').appendChild(h('div', { cls: 'banner', id: 'banner', role: 'alert' }, [h('span', { txt }), boton ? btn('Salir al menú', () => salirMenu(false), 'peq sec') : null]));
}
function hideBanner() { const b = $('#banner'); if (b) b.remove(); }

/* ---------- barra superior ---------- */
$('#bPantalla').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); });
$('#bSonido').addEventListener('click', () => { Sonido.activo = !Sonido.activo; $('#bSonido').textContent = Sonido.activo ? '♪' : '✕'; $('#bSonido').setAttribute('aria-pressed', String(!Sonido.activo)); if (Sonido.activo) { Sonido.despertar(); Sonido.fx('click'); } });
$('#bMenu').addEventListener('click', () => abrirPausa());
$('#bAjustes').addEventListener('click', () => abrirAjustes());
$('#bAyuda').addEventListener('click', () => verAyuda());
EntradaE.alMenu = () => { if (capaPausa) capaPausa.cerrar(); else abrirPausa(); };
EntradaE.alAyuda = () => verAyuda();
EntradaE.alAtras = () => { const c = capasAbiertas[capasAbiertas.length - 1]; if (c) { c.cerrar(); return true; } return false; };
EntradaE.bloqueado = () => !!(Lobby && Lobby.abierto);
document.addEventListener('pointerdown', () => Sonido.despertar());
document.addEventListener('keydown', () => Sonido.despertar());

/* ---------- visibilidad, wake lock ---------- */
async function pedirWake() { try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; } }
function alOcultar() {
  guardarPartida(); Progreso.guardar(); guardarAjustes();
  if (D.sonido.pausaOculta) Sonido.suspender(true);
  if (Sesion.rol === 'anfitrion' && !Sesion.multi && pantalla === 'mesa' && !capaPausa) abrirPausa();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) alOcultar();
  else { Sonido.suspender(false); if (pantalla === 'mesa') pedirWake(); }
});
window.addEventListener('pagehide', () => { guardarPartida(); Progreso.guardar(); guardarAjustes(); try { if (Red.conectado) Red.salir(); } catch (e) { /* cierre */ } });

/* ---------- bucle ---------- */
let tPrev = 0, acum = 0, nCuadros = 0, tInicio = performance.now(), ultimoBajar = 0, tUltimoPintado = 0;
function bucle(t) {
  requestAnimationFrame(bucle);
  const dt = Math.min(100, t - (tPrev || t)); tPrev = t;
  if (D.limiteFps && t - tUltimoPintado < 1000 / D.limiteFps - 2) return;
  tUltimoPintado = t;
  if (!Lobby || !Lobby.abierto) cuadroMando(Mando, t, dt);
  if (pantalla === 'mesa') { Mapa.cuadro(dt); UI.cuadroUI(t); }
  acum += dt; nCuadros++;
  if (acum >= 1500) {
    const fps = Math.round((nCuadros * 1000) / acum);
    const f = $('#fps'); f.hidden = !D.fps; if (D.fps) f.textContent = fps + ' FPS · ' + D.calidad;
    if (D.autoBajada && pantalla === 'mesa' && !document.hidden && t - tInicio > 6000 && t - ultimoBajar > 8000 && fps < 24 && D.calidad !== 'baja' && !D.limiteFps) {
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
Sesion.velocidad = D.velBots;
Sesion.suscribir();
if (D.sonido.musicaOn) document.addEventListener('pointerdown', () => Sonido.musica(true), { once: true });
mostrar('menu');
requestAnimationFrame(bucle);
if (Lobby && Lobby.registrar) Lobby.registrar(OPTS);
if (Lobby && Lobby.hayEnlace()) Lobby.abrir(OPTS);
window.__cq = { Sesion, UI, Progreso, A, D, Mapa, abrirPausa, mostrar, empezarLocal, preparar };
