// Arranque: menu, preparacion de mesa, pausa, ayuda, tutorial, logros, apuestas virtuales y bucle principal.
import { h, $ } from './dom.js';
import { A, D, aplicar, guardar, guardarYa as guardarAjustes, panelAjustes, suscribir as alCambiarAjustes, PRESETS } from './ajustes.js';
import { Sonido } from './sonido.js';
import { Progreso, LOGROS } from './progreso.js';
import { Sesion, guardarYa as guardarMesa } from './sesion.js';
import * as UI from './ui.js';
import * as Esc from './escena.js';
import { E as EntradaE, iniciarTeclado, cuadroMando, capaActiva } from './entrada.js';
import { NIVELES } from './bots.js';
import { REGLAS_BASE, MODOS, limpiarReglas, esDoble } from './reglas.js';
import { CLAVES, leer, escribir, borrar } from './almacen.js';
import { PASOS } from './tutorial.js';
import * as Cu from './cuenta-domino.js';

const Red = window.Red, Lobby = window.Lobby, Mando = window.Mando;
let pantalla = 'menu', capaPausa = null, capasAbiertas = [], wake = null;
const CLAVE_APUESTA = 'domino_apuesta';

const OPTS = {
  juego: 'Dominó', juegoId: 'domino', maxJugadores: 4, minJugadores: 1,
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
  if (g) m.appendChild(btn(`Continuar partida${g.multi ? ' multijugador' : ''} · mano ${g.ronda}`, continuar, 'grande'));
  m.appendChild(btn('Jugar contra bots', () => preparar(false), g ? '' : 'grande'));
  m.appendChild(btn('Multijugador (2-4 personas + bots)', menuMulti));
  m.appendChild(btn('Tutorial', () => verTutorial(), 'sec'));
  m.appendChild(btn('Logros', verLogros, 'sec'));
  m.appendChild(btn('Rankings', () => verRanking(), 'sec'));
  m.appendChild(btn('Estadísticas', verStats, 'sec'));
  m.appendChild(btn('Ajustes', () => abrirAjustes(), 'sec'));
  m.appendChild(btn('Reglas y controles', () => verAyuda(), 'sec'));
  const pd = Progreso.datos;
  m.appendChild(h('p', { cls: 'resumen' }, [`${pd.victorias} partidas ganadas · ${pd.manosGanadas} manos · ${pd.capicuas} capicúas · `, h('span', { cls: 'fichas-virt', txt: `${pd.fichas} fichas virtuales` })]));
  Cu.pintarChip($('#cuentaLinea'), verCuenta);
  setTimeout(() => { const f = $('[data-f]', m); if (f && !(capaActiva() && capaActiva().classList.contains('ventana'))) f.focus({ preventScroll: true }); }, 50);
}
function mostrar(p) {
  pantalla = p;
  const enMesa = p === 'mesa';
  document.body.classList.toggle('en-menu', !enMesa);
  $('#menu').hidden = enMesa; $('#mesa').hidden = !enMesa;
  $('#bChat').hidden = !enMesa; $('#bMenu').hidden = !enMesa;
  if (enMesa) setTimeout(() => { Esc.ajustarTamano(); Esc.sucio(); }, 30);
  if (!enMesa) pintarMenu();
}

/* ---------- preparar mesa ---------- */
function preparar(multi) {
  const s = JSON.parse(JSON.stringify(A.setup));
  s.reglas = limpiarReglas({ ...REGLAS_BASE, ...s.reglas });
  if (!s.niveles) s.niveles = [1, 1, 1];
  abrirCapa(multi ? 'Crear mesa multijugador' : 'Nueva partida', (c, api) => {
    const cont = h('div', { cls: 'form' });
    const sel = (obj, k, lista, extra) => {
      const g = h('div', { cls: 'aj-opc', role: 'group' });
      lista.forEach(([val, nom]) => g.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: nom, 'aria-pressed': String(obj[k] === val), on: { click: () => { obj[k] = val; Array.from(g.children).forEach((b, i) => b.setAttribute('aria-pressed', String(lista[i][0] === val))); if (extra) extra(); } } })));
      return g;
    };
    const fila = (t, ctl, ay) => h('div', { cls: 'aj-fila' }, [h('label', { cls: 'aj-etq' }, [t, ay ? h('small', { txt: ay }) : null]), ctl]);
    const slotN = h('div'), niv = h('div', { cls: 'niveles' });
    const asientos = () => (s.reglas.modo === 'parejas' ? 4 : s.reglas.modo === 'duelo' ? 2 : s.reglas.n);
    function modoCambio() {
      const mo = MODOS[s.reglas.modo];
      if (!mo.n.includes(s.reglas.n)) s.reglas.n = mo.n[0];
      slotN.textContent = '';
      if (mo.n.length > 1) slotN.appendChild(fila('Jugadores', sel(s.reglas, 'n', mo.n.map((n) => [n, String(n)]), niveles)));
      niveles(); ayudaJuntos();
    }
    function niveles() {
      niv.textContent = '';
      const nb = asientos() - 1;
      for (let i = 0; i < nb; i++) {
        const g = h('div', { cls: 'nivel' }, [h('span', { txt: s.reglas.modo === 'parejas' ? (i === 1 ? 'Compañero (bot)' : `Rival ${i === 0 ? 1 : 2} (bot)`) : `Bot ${i + 1}` })]);
        const op = h('div', { cls: 'aj-opc', role: 'group' });
        NIVELES.forEach((n) => op.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: n.nombre, 'aria-pressed': String((s.niveles[i] ?? 1) === n.id), on: { click: () => { s.niveles[i] = n.id; Array.from(op.children).forEach((b, k) => b.setAttribute('aria-pressed', String(k === n.id))); } } })));
        g.appendChild(op); niv.appendChild(g);
      }
      if (multi) niv.appendChild(h('p', { cls: 'nota', txt: `Cada amigo que se una ocupa un asiento y quita un bot (hasta ${Math.min(4, asientos())} personas).` }));
    }
    const juntosFila = h('div');
    function ayudaJuntos() {
      juntosFila.textContent = '';
      if (multi && s.reglas.modo === 'parejas') {
        const b = h('button', { type: 'button', cls: 'aj-sw', role: 'switch', 'data-f': 1, 'aria-checked': String(s.juntos !== false), on: { click: () => { s.juntos = s.juntos === false; b.setAttribute('aria-checked', String(s.juntos)); } } }, [h('i')]);
        juntosFila.appendChild(fila('Los amigos juegan en la misma pareja', b, 'Si son 2 humanos se sientan frente a frente.'));
      }
    }
    cont.appendChild(fila('Modo', sel(s.reglas, 'modo', Object.keys(MODOS).map((k) => [k, MODOS[k].nombre]), modoCambio)));
    cont.appendChild(slotN); cont.appendChild(juntosFila);
    const METAS = [[50, '50'], [100, '100'], [150, '150'], [200, '200'], [300, '300']];
    const metaG = sel(s.reglas, 'meta', METAS);
    const metaAuto = () => { s.reglas.meta = { 6: 100, 9: 200, 12: 300 }[s.reglas.variante]; Array.from(metaG.children).forEach((b, i) => b.setAttribute('aria-pressed', String(METAS[i][0] === s.reglas.meta))); };
    cont.appendChild(fila('Variante', sel(s.reglas, 'variante', [[6, 'Doble 6'], [9, 'Doble 9'], [12, 'Doble 12']], metaAuto), '28, 55 o 91 fichas; 7, 10 o 12 por jugador. Ajusta la meta (100/200/300).'));
    cont.appendChild(niv); modoCambio();
    cont.appendChild(h('div', { cls: 'aj-sub', txt: 'Reglas' }));
    cont.appendChild(fila('Meta de puntos', metaG, 'La partida termina al llegar a la meta.'));
    cont.appendChild(fila('Capicúa', sel(s.reglas, 'capicua', [[0, 'Sin bono'], [25, '+25'], [50, '+50']]), 'Cerrar con una ficha que cabe en los dos extremos.'));
    cont.appendChild(fila('Puntos por mano', sel(s.reglas, 'puntuacion', [['todas', 'Todas las fichas'], ['rivales', 'Solo rivales']]), 'Suma de las fichas que quedan: de toda la mesa o solo de los rivales.'));
    cont.appendChild(fila('Tiempo por turno', sel(s.reglas, 'tiempo', [[0, 'Sin límite'], [40000, '40 s'], [20000, '20 s']])));
    cont.appendChild(fila(`Apuesta (fichas virtuales: tienes ${Progreso.datos.fichas})`, sel(s.reglas, 'apuesta', [[0, 'Sin apuesta'], [10, '10'], [50, '50'], [100, '100']]), 'Solo fichas del juego, sin valor real. Cada humano apuesta y el bote es para el ganador.'));
    cont.appendChild(h('div', { cls: 'botones' }, [
      btn(multi ? 'Crear mesa e invitar' : 'Empezar', () => {
        s.reglas = limpiarReglas(s.reglas);
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
    c.appendChild(h('p', { cls: 'nota', txt: 'Hasta 4 personas por enlace (conexión directa entre dispositivos) y bots para completar la mesa.' }));
    c.appendChild(btn('Crear mesa (configurar reglas)', () => { api.cerrar(); preparar(true); }, 'grande'));
    c.appendChild(btn('Unirme con un enlace', () => { api.cerrar(); Lobby.abrir(OPTS); }));
    c.appendChild(btn('Atrás', () => api.cerrar(), 'sec'));
  });
}
function empezarLocal(setup) {
  Sesion.setupMulti = null;
  const s = JSON.parse(JSON.stringify(setup));
  s.reglas = limpiarReglas(s.reglas);
  if (s.reglas.apuesta && Progreso.datos.fichas < s.reglas.apuesta) {
    Progreso.recargaSiVacio();
    if (Progreso.datos.fichas < s.reglas.apuesta) { s.reglas.apuesta = 0; setTimeout(() => UI.aviso('Fichas virtuales insuficientes: jugamos sin apuesta', '#ffd23d'), 400); }
  }
  Sesion.nuevaLocal(s);
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

/* ---------- apuestas con fichas virtuales ---------- */
const apuestaGuardada = () => leer(CLAVE_APUESTA, null);
function alPaqueteApuesta(p) {
  const v = p.v;
  if (!p.mesa || !v.cfg.apuesta) return;
  const g = apuestaGuardada();
  if (g && g.mesa === p.mesa) return;
  if (v.ronda !== 1 || v.fin) { escribir(CLAVE_APUESTA, { mesa: p.mesa, monto: 0, estado: 'libre' }); return; }
  let monto = v.cfg.apuesta;
  Progreso.recargaSiVacio();
  if (!Progreso.pagarApuesta(monto)) { monto = 0; UI.aviso('Fichas insuficientes: juegas esta partida sin apostar', '#ffd23d'); }
  else UI.aviso(`Apuestas ${monto} fichas virtuales`, '#ffd23d');
  escribir(CLAVE_APUESTA, { mesa: p.mesa, monto, estado: 'pagada', n: v.n, modo: v.cfg.modo });
}
function liquidar(f, v, mesa) {
  const g = apuestaGuardada();
  if (!g || g.mesa !== mesa || g.estado !== 'pagada' || !g.monto) return;
  const mi = v.cfg.modo === 'parejas' ? v.yo % 2 : v.yo;
  g.estado = 'cobrada';
  if (f.campeon === mi) {
    const premio = Math.round(g.monto * g.n / (v.cfg.modo === 'parejas' ? 2 : 1));
    Progreso.cobrarApuesta(premio); g.premio = premio;
  } else g.premio = 0;
  escribir(CLAVE_APUESTA, g);
}
UI.T.apuestaTexto = (f) => {
  const g = apuestaGuardada();
  if (!g || !g.monto || !f.partida) return g && g.monto ? `Bote en juego: ${g.monto * g.n} fichas virtuales` : '';
  return g.premio ? `Ganaste ${g.premio} fichas virtuales (apostaste ${g.monto}). Total: ${Progreso.datos.fichas}` : `Perdiste ${g.monto} fichas virtuales. Te quedan ${Progreso.datos.fichas}`;
};

/* ---------- menu de pausa ---------- */
function abrirPausa() {
  if (capaPausa) return;
  Sesion.pausar(true);
  const solo = Sesion.rol === 'anfitrion' && !Sesion.multi;
  capaPausa = abrirCapa(solo ? 'Pausa' : 'Menú', (c, api) => {
    c.appendChild(btn('Continuar', () => api.cerrar(), 'grande'));
    c.appendChild(btn('Ajustar la vista del tablero', () => { Esc.ajustar(); api.cerrar(); }, 'sec'));
    if (Sesion.rol === 'anfitrion' && Sesion.multi) c.appendChild(btn('Invitar / reconectar amigos', () => { api.cerrar(); Lobby.abrir(OPTS); }));
    c.appendChild(btn('Ajustes', () => abrirAjustes()));
    c.appendChild(btn('Reglas y controles', () => verAyuda()));
    if (Sesion.rol === 'anfitrion') c.appendChild(btn('Guardar y salir al menú', () => { api.cerrar(); salirMenu(true); }, 'sec'));
    c.appendChild(btn(Sesion.rol === 'cliente' ? 'Salir de la mesa' : 'Abandonar partida', () => { if (confirm('¿Abandonar? Se perderá la partida en curso.')) { api.cerrar(); salirMenu(false); } }, 'peligro'));
    if (!solo) c.appendChild(h('p', { cls: 'nota', txt: 'En multijugador la partida no se detiene mientras miras el menú.' }));
  }, { alCerrar: () => { capaPausa = null; Sesion.pausar(false); } });
}
function salirMenu(guardar) {
  if (guardar) { guardarMesa(); Sesion.cerrarMesa(); if (Red.conectado) { try { Red.salir(); } catch (e) { /* ya cerrada */ } } } else { Sesion.abandonar(); }
  UI.ocultarTodo(); mostrar('menu');
}

/* ---------- ajustes, ayuda, tutorial, logros, estadisticas ---------- */
function abrirAjustes(pest) {
  abrirCapa('Ajustes', (c) => {
    const p = panelAjustes(c, { pest });
    EntradaE.alPestana = (d) => p.siguiente(d);
  }, { alCerrar: () => { EntradaE.alPestana = null; guardarAjustes(); refrescarTema(); } });
}
function refrescarTema() { Esc.ajustarTamano(); Esc.sucio(); UI.refrescar(); }
function verAyuda() {
  const tactil = matchMedia('(pointer: coarse)').matches;
  abrirCapa('Reglas y controles', (c) => {
    const sec = (t, txt) => { c.appendChild(h('h3', { txt: t })); c.appendChild(h('p', { html: txt })); };
    sec('Objetivo', 'Quédate sin fichas antes que los demás. Cada ficha se coloca en un extremo de la cadena con el <b>mismo número</b>. Si no tienes, <b>pasas</b> (en el duelo robas del pozo; no se pueden robar las dos últimas fichas).');
    sec('Cierre y tranque', 'La mano termina cuando alguien se queda sin fichas o cuando <b>todos pasan seguidos</b> (tranque): gana quien sume menos puntos en sus fichas (en parejas cuenta la suma de la pareja). Si hay empate nadie anota y sale el siguiente jugador.');
    sec('Puntos', 'El ganador de la mano anota la suma de los puntos de las fichas que quedan (de todos, o solo de los rivales según la regla). <b>Capicúa</b>: si cierras con una ficha que podía ir en ambos extremos, ganas un bono configurable. La partida es a una meta (50, 100, 150, 200 o 300).');
    sec('Quién sale', 'En la primera mano sale quien tenga el <b>doble más alto</b>. Después sale quien ganó la mano anterior.');
    sec('Modos', '<b>Parejas</b>: 4 jugadores, tu compañero está frente a ti. <b>Todos contra todos</b>: 3 o 4. <b>Duelo</b>: 2 con pozo. Variantes doble 6, doble 9 y doble 12.');
    sec('Controles', tactil ? 'Toca una ficha para elegirla y tócala otra vez para jugarla (o toca el extremo resaltado, o arrástrala a la cadena). Pellizca con dos dedos para acercar y arrastra el fondo para mover el tablero; los botones +, − y ⤢ ajustan la vista.' : '<b>Ratón</b>: clic para elegir y de nuevo para jugar, o arrastra la ficha a la cadena; rueda para acercar, arrastra el fondo para mover, doble clic para ajustar. <b>Teclado</b>: ← → eligen ficha, ↑ ↓ o Tab cambian de extremo, Enter juega, P pasa, R roba, +/− zoom, 0 ajusta, T chat, Esc menú. <b>Mando Xbox</b>: cruceta o stick izquierdo recorren la mano, A juega, LB/RB cambian de extremo, X roba, Y pasa, stick derecho mueve el tablero, LT/RT zoom, L3 ajusta, ARRIBA chat, MENÚ pausa.');
    sec('Bots', 'Novato juega casi al azar. Medio recuerda las fichas jugadas y los números que cada rival no tiene (por sus pases). Experto además deduce las manos posibles y simula cientos de manos para elegir.');
    sec('Apuestas', 'Solo con <b>fichas virtuales</b> del juego (nunca dinero real). Cada humano apuesta al empezar y el bote es para el ganador de la partida.');
    sec('Multijugador', 'El anfitrión reparte y arbitra: nadie recibe las fichas de otros. Si te desconectas, un bot juega por ti y recuperas tu asiento al volver con el enlace nuevo del anfitrión.');
    c.appendChild(btn('Ver el tutorial', () => verTutorial(), 'sec'));
  });
}
function verTutorial(practica) {
  let i = 0;
  abrirCapa('Tutorial', (c, api) => {
    const cuerpo = h('div', { cls: 'form' });
    c.appendChild(cuerpo);
    function pinta() {
      const p = PASOS[i];
      cuerpo.textContent = '';
      cuerpo.appendChild(h('p', { cls: 'tuto-pasos', txt: `Paso ${i + 1} de ${PASOS.length}` }));
      cuerpo.appendChild(h('h3', { txt: p.t }));
      if (p.fig) cuerpo.appendChild(p.fig());
      cuerpo.appendChild(h('p', { html: p.html }));
      const bs = h('div', { cls: 'botones' });
      if (i > 0) bs.appendChild(btn('Anterior', () => { i--; pinta(); }, 'sec'));
      if (i < PASOS.length - 1) bs.appendChild(btn('Siguiente', () => { i++; pinta(); }, 'grande'));
      else {
        bs.appendChild(btn('Practicar una mano', () => { terminarTutorial(); api.cerrar(); cerrarTodas(); practicar ? practicar() : empezarPractica(); }, 'grande'));
        bs.appendChild(btn('Listo', () => { terminarTutorial(); api.cerrar(); }, 'sec'));
      }
      cuerpo.appendChild(bs);
      const f = $('[data-f]', bs); if (f) f.focus({ preventScroll: true });
    }
    pinta();
  }, { alCerrar: () => { if (!leer(CLAVES.tutorial)) escribir(CLAVES.tutorial, { ts: Date.now(), visto: 1 }); } });
}
function terminarTutorial() { escribir(CLAVES.tutorial, { ts: Date.now(), completo: 1 }); Progreso.dar('tutorial'); }
function empezarPractica() {
  const setup = { reglas: { modo: 'duelo', variante: 6, meta: 50, capicua: 25, apuesta: 0 }, niveles: [0], juntos: true };
  empezarLocal(setup);
}
window.addEventListener('domino-tutorial', () => verTutorial());
function primeraVez() {
  activarMesa();
  if (!leer(CLAVES.tutorial)) { escribir(CLAVES.tutorial, { ts: Date.now() }); setTimeout(() => verTutorial(), 1200); }
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
    const f = [['Partidas jugadas', d.partidas], ['Partidas ganadas', d.victorias], ['Victorias multijugador', d.mpVictorias], ['Victorias doble 6 / 9 / 12', `${d.v6} / ${d.v9} / ${d.v12}`], ['Manos jugadas', d.manos], ['Manos ganadas', d.manosGanadas], ['Racha actual', d.racha], ['Mejor racha', d.mejorRacha], ['Puntos anotados', d.puntos], ['Mejor partida (pts)', d.mejorPartida], ['Capicúas', d.capicuas], ['Tranques ganados', d.tranques], ['Veces que pasaste', d.pases], ['Fichas robadas', d.robos], ['Fichas jugadas', d.jugadas], ['Fichas virtuales', d.fichas], ['Máximo de fichas virtuales', d.mejorFichas]];
    const t = h('table', { cls: 'tabla' });
    f.forEach(([a, b]) => t.appendChild(h('tr', {}, [h('td', { txt: a }), h('td', { txt: String(b) })])));
    c.appendChild(t);
    c.appendChild(h('p', { cls: 'aj-nota', txt: 'Las fichas virtuales son solo del juego y no cuentan para los rankings.' }));
    c.appendChild(btn('Cerrar', () => c.parentNode.querySelector('[data-cerrar]').click(), 'sec'));
  });
}

/* ---------- conexion con la sesion ---------- */
const miUnidad = (v) => (v.cfg.modo === 'parejas' ? v.yo % 2 : v.yo);
const ctxLogro = () => { const v = UI.T.v; const a = apuestaGuardada(); return { yo: v ? v.yo : 0, unidad: v ? miUnidad(v) : 0, v, tipos: UI.T.meta.tipos, multi: Sesion.multi || Sesion.rol === 'cliente', cfg: v ? v.cfg : {}, apostado: a ? a.monto : 0, esDoble: (id) => v && esDoble(v.max, id) }; };
Sesion.alPaquete = (p) => {
  if (pantalla !== 'mesa') { mostrar('mesa'); pedirWake(); cerrarTodas(); }
  hideBanner();
  alPaqueteApuesta(p);
  UI.recibir(p);
};
UI.T.enviar = (cmd) => Sesion.enviar(cmd);
UI.T.pistasOn = () => A.juego.pistas && Progreso.datos.manos < 6;
UI.T.alEvento = (e, v) => {
  const ctx = ctxLogro();
  Progreso.evento(e, ctx);
  if (e.t === 'fin') {
    Cu.recompensaFin(e, ctx.unidad); Cu.enviarPuntajes(Progreso.datos);
    if (e.partida && UI.T.ultimo) liquidar(e, v, UI.T.ultimo.mesa);
  }
};
UI.T.alFin = {
  ranking: () => verRanking(),
  posicion: (slot) => {
    slot.textContent = 'Consultando tu posición en el ranking…';
    Cu.posicion('victorias').then((p) => { slot.textContent = p && p.posicion ? `Ranking global de victorias: #${p.posicion} de ${p.total}` : ''; });
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
window.addEventListener('resize', () => { if (pantalla === 'mesa') { Esc.ajustarTamano(); } });

/* ---------- bucle ---------- */
let tPrev = 0, acum = 0, nCuadros = 0, tInicio = performance.now(), ultimoBajar = 0;
function bucle(t) {
  requestAnimationFrame(bucle);
  if (D.fpsMax && tPrev && t - tPrev < 1000 / D.fpsMax - 2) return;
  const dt = Math.min(100, t - (tPrev || t)); tPrev = t;
  if (!Lobby || !Lobby.abierto) cuadroMando(Mando, t);
  if (pantalla === 'mesa') UI.cuadro(t, dt);
  acum += dt; nCuadros++;
  if (acum >= 1500) {
    const fps = Math.round((nCuadros * 1000) / acum);
    const f = $('#fps'); f.hidden = !D.fps; if (D.fps) f.textContent = fps + ' FPS · ' + D.calidad;
    if (D.autoBajada && pantalla === 'mesa' && !document.hidden && t - tInicio > 6000 && t - ultimoBajar > 8000 && fps < 24 && D.calidad !== 'baja') {
      const orden = ['ultra', 'alta', 'media', 'baja'], nuevo = orden[orden.indexOf(D.calidad) + 1];
      D.calidad = nuevo; Object.assign(D, PRESETS[nuevo]); guardar(); ultimoBajar = t; refrescarTema();
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
alCambiarAjustes(() => { refrescarTema(); });
UI.iniciar();
iniciarTeclado();
Sesion.suscribir();
if (A.sonido.musicaOn) document.addEventListener('pointerdown', () => Sonido.musica(true), { once: true });
mostrar('menu');
requestAnimationFrame(bucle);
if (Lobby && Lobby.registrar) Lobby.registrar(OPTS);
if (Lobby && Lobby.hayEnlace()) Lobby.abrir(OPTS);
window.__domino = { Sesion, UI, Esc, Progreso, A, D, abrirPausa, borrar };
