// Arranque: menus, mesa de jugadores, modos (rapido, elegir, torneo, mejor de N), persistencia, tienda, logros y ranking.
import { h, $, $$ } from './dom.js';
import { D, guardar as guardarAj, guardarYa as guardarAjYa, aplicar, panelAjustes } from './ajustes.js';
import { CLAVES, leer, escribir, borrar } from './almacen.js';
import { Sonido } from './sonido.js';
import { P, LOGROS, guardar as guardarP, guardarYa as guardarPYa, recargar, colorLibre, formaLibre, comprar, marcarColeccion, registrarRonda, registrarTorneo } from './progreso.js';
import { COLORES, FORMAS, AVATARES, DALTONICO, ficha } from './marca.js';
import * as Torneo from './torneo.js';
import { simular } from './simular.js';
import { Motor } from './motor.js';
import { JUEGOS, porId, CATEGORIAS } from './juegos/index.js';
import * as Cu from './cuenta-mj.js';

const Mando = window.Mando;
const NIVELES = ['Fácil', 'Normal', 'Difícil'], NOM_BOT = ['Rayo', 'Nube', 'Pixel', 'Turbo'];
const MODOS = { rapido: 'Juego rápido', elegir: 'Partido de un juego', mejorde: 'Mejor de', torneo: 'Torneo de 10 juegos' };
let capas = [], T = null, wake = null, enCurso = false;

/* ---------- avisos y capas ---------- */
export function toast(txt, color) { const a = h('div', { cls: 'aviso', txt, style: color ? '--c:' + color : '' }); $('#avisos').appendChild(a); setTimeout(() => a.remove(), 2900); }
Motor.hooks.aviso = (t) => toast(t, '#ffd23d');
function abrirCapa(titulo, construir, opts = {}) {
  const cuerpo = h('div', { cls: 'capa-cuerpo' });
  const capa = h('div', { cls: 'ventana', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo }, [h('div', { cls: 'capa-cab' }, [h('h2', { txt: titulo }), h('button', { type: 'button', cls: 'icono', 'data-f': 1, 'data-cerrar': 1, 'aria-label': 'Cerrar', txt: '✕', on: { click: () => cerrar() } })]), cuerpo]);
  capa.style.zIndex = String(100 + capas.length * 5 + (Motor.activo() ? 60 : 0));
  $('#app').appendChild(capa);
  const api = { capa, cuerpo, cerrar, redibujar: () => { cuerpo.textContent = ''; construir(cuerpo, api); } };
  function cerrar() { if (!capa.isConnected) return; capa.remove(); capas = capas.filter((x) => x !== api); opts.alCerrar && opts.alCerrar(); }
  capas.push(api); construir(cuerpo, api);
  setTimeout(() => { const f = $('[data-f]:not([data-cerrar])', cuerpo) || $('[data-f]', capa); f && f.focus(); }, 40);
  return api;
}
const btn = (txt, fn, cls = '') => h('button', { type: 'button', cls: 'btn ' + cls, 'data-f': 1, txt, on: { click: () => { Sonido.fx('click'); fn(); } } });
const opciones = (valor, lista, fn) => { const g = h('div', { cls: 'aj-opc' }); lista.forEach(([v, n]) => g.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: n, 'aria-pressed': String(valor === v), on: { click: () => { fn(v); } } }))); return g; };

/* ---------- participantes ---------- */
const COLOR_BOT = () => (D.acc.daltonico ? DALTONICO : COLORES.filter((c) => c.p === 0).map((c) => c.c));
function armarPartes() {
  const m = P.mesa, hum = Math.max(1, Math.min(4, m.humanos));
  let bots = Math.max(0, Math.min(4 - hum, m.bots)); if (hum + bots < 2) bots = 2 - hum;
  const usados = [], partes = [];
  for (let i = 0; i < hum; i++) {
    const j = P.jugadores[i]; let col = j.color;
    if (usados.includes(col.toLowerCase())) col = COLOR_BOT().find((c) => !usados.includes(c.toLowerCase())) || col;
    usados.push(col.toLowerCase());
    partes.push({ slot: i, bot: false, nivel: null, nombre: j.nombre || 'Jugador ' + (i + 1), color: col, avatar: j.avatar, forma: formaLibre(j.forma) ? j.forma : 'circulo' });
  }
  for (let b = 0; b < bots; b++) {
    const col = COLOR_BOT().find((c) => !usados.includes(c.toLowerCase())) || '#cccccc'; usados.push(col.toLowerCase());
    partes.push({ slot: hum + b, bot: true, nivel: m.nivel, nombre: 'Bot ' + NOM_BOT[b], color: col, avatar: '🤖', forma: ['circulo', 'cuadrado', 'triangulo', 'rombo'][(hum + b) % 4] });
  }
  return partes;
}
const resumenMesa = () => { const p = armarPartes(), hm = p.filter((x) => !x.bot).length, bt = p.length - hm; return `${hm} ${hm === 1 ? 'humano' : 'humanos'}${bt ? ' + ' + bt + (bt === 1 ? ' bot' : ' bots') + ' (' + NIVELES[P.mesa.nivel] + ')' : ''}`; };

/* ---------- torneo en curso ---------- */
const guardarTorneo = () => { if (T && !T.fin) escribir(CLAVES.torneo, { v: 1, T, t: Date.now() }); else borrar(CLAVES.torneo); };
const hayGuardada = () => { const o = leer(CLAVES.torneo); return o && o.T && o.T.v === 1 && !o.T.fin && o.T.parts && o.T.juegos && porId(o.T.juegos[o.T.ronda]) ? o.T : null; };
const idsCat = () => JUEGOS.map((j) => j.id);
async function iniciarModo(modo, o = {}) {
  if (enCurso) return;
  const parts = armarPartes();
  T = Torneo.crear(modo, parts, { catalogo: idsCat(), N: o.N, juego: o.juego });
  guardarTorneo(); await bucleTorneo();
}
async function continuar() { const g = hayGuardada(); if (!g || enCurso) return; T = g; await bucleTorneo(); }

async function pedirWake(si) { try { if (si && navigator.wakeLock && !wake) wake = await navigator.wakeLock.request('screen'); else if (!si && wake) { wake.release(); wake = null; } } catch (e) { wake = null; } }
document.addEventListener('visibilitychange', () => { wake = null; if (document.visibilityState === 'visible' && enCurso) pedirWake(true); else if (document.visibilityState === 'hidden') { guardarPYa(); guardarAjYa(); } });
addEventListener('pagehide', () => { guardarPYa(); guardarAjYa(); });

const etiquetaRonda = () => (T.modo === 'torneo' ? `Ronda ${T.ronda + 1} de ${T.juegos.length}` : T.modo === 'rapido' ? 'Juego rápido' : `Ronda ${T.ronda + 1} · mejor de ${T.N} (gana quien llegue a ${Torneo.objetivoVictorias(T.N)})`);

function registrarEnTorneo(juego, places, inst) {
  const pr = Torneo.registrar(T, places);
  const ex = Object.assign({ totalJuegos: JUEGOS.length }, Motor.extras(), inst && inst.logroExtra ? inst.logroExtra() : {});
  delete ex.inst;
  const rr = registrarRonda({ juego: juego.id, parts: T.parts, places, practica: false, extra: ex });
  let nuevos = rr.logros.slice(), bonus = 0;
  if (T.fin) { const rt = registrarTorneo(T, T.parts); nuevos = nuevos.concat(rt.logros); bonus = rt.monedas; Cu.recompensaFin(T.campeones.some((i) => i === T.parts.findIndex((p) => p.slot === 0 && !p.bot)), true); }
  else Cu.recompensaFin(places[T.parts.findIndex((p) => p.slot === 0 && !p.bot)] === 1, false);
  guardarTorneo(); Cu.enviarPuntajes();
  nuevos.forEach((id, i) => { const l = LOGROS.find((x) => x.id === id); setTimeout(() => { toast('★ Logro: ' + (l ? l.nombre : id), '#ffd23d'); Sonido.fx('coin'); }, 600 + i * 900); Cu.logro(id); });
  const extra = T.parts.map((p, i) => `+${pr[i]} pts · total ${T.pts[i]}${rr.monedas[i] ? ' · 🪙+' + rr.monedas[i] : ''}${T.fin && T.campeones.includes(i) && !p.bot && bonus ? ' · 🏆 +20' : ''}`);
  return { extra, nota: T.fin ? '¡Fin de la partida!' : Torneo.juegoActual(T) ? 'Siguiente: ' + porId(Torneo.juegoActual(T)).nombre : '' };
}
async function jugarRonda(juego, parts, opc) {
  await pedirWake(true);
  try { return await Motor.ronda(juego, parts, opc); } finally { pedirWake(false); }
}
async function rondaDuelos(juego) {
  let abandono = false;
  const places = await Torneo.porDuelos(T.parts.length, async (a, b) => {
    if (abandono) return [0, 0];
    const sub = [T.parts[a], T.parts[b]];
    if (sub.every((p) => p.bot)) return simular(juego, sub).pts;
    const r = await jugarRonda(juego, sub, { etiqueta: `${etiquetaRonda()} · duelo ${sub[0].nombre} contra ${sub[1].nombre}`, continuar: 'Siguiente' });
    if (r.abandono) { abandono = true; return [0, 0]; }
    return r.pts;
  });
  return abandono ? null : places;
}
async function bucleTorneo() {
  enCurso = true;
  try {
    while (T && !T.fin) {
      const juego = porId(Torneo.juegoActual(T)); guardarTorneo();
      if (T.parts.length > juego.max) {
        const pl = await rondaDuelos(juego); if (!pl) { T = T; break; }
        const info = registrarEnTorneo(juego, pl, null);
        await marcador(info, pl); continue;
      }
      const r = await jugarRonda(juego, T.parts, { etiqueta: etiquetaRonda(), alTerminar: (pts, pl, inst) => registrarEnTorneo(juego, pl, inst), continuar: 'Continuar' });
      if (r.abandono) break;
    }
  } finally { enCurso = false; }
  if (T && T.fin) { const t = T; guardarTorneo(); await pantallaFin(t); T = null; }
  pintarMenu();
}
function marcador(info, places) {
  return new Promise((res) => { abrirCapa('Resultado de la ronda', (c, api) => {
    c.appendChild(h('div', { cls: 'res-lista' }, T.parts.map((p, i) => h('div', { cls: 'res-fila p' + places[i], style: '--c:' + p.color }, [h('b', { cls: 'res-pos', txt: '#' + places[i] }), h('span', { cls: 'res-av', txt: p.avatar }), h('span', { cls: 'res-nom', txt: p.nombre }), h('span', { cls: 'res-pts', txt: '' }), h('small', { cls: 'res-ex', txt: info.extra[i] })]))));
    c.appendChild(btn('Continuar', () => api.cerrar(), 'grande'));
  }, { alCerrar: res }); });
}
function pantallaFin(t) {
  Sonido.fx('gana');
  return new Promise((res) => { abrirCapa('Fin de la partida', (c, api) => {
    const camp = t.campeones.map((i) => t.parts[i]);
    c.appendChild(h('div', { cls: 'campeon', txt: camp.length > 1 ? '🏆 Empate: ' + camp.map((p) => p.avatar + ' ' + p.nombre).join(' y ') : '🏆 ' + camp[0].avatar + ' ' + camp[0].nombre }));
    const tabla = h('table', { cls: 'tabla' }, [h('tr', {}, [h('th', { txt: 'Jugador' }), h('th', { txt: 'Rondas ganadas' }), h('th', { txt: 'Puntos' })])]);
    Torneo.clasificacion(t).forEach((f) => { const p = t.parts[f.i]; tabla.appendChild(h('tr', {}, [h('td', { txt: p.avatar + ' ' + p.nombre }), h('td', { txt: String(f.vic) }), h('td', { txt: String(f.pts) })])); });
    c.appendChild(tabla);
    c.appendChild(h('p', { cls: 'nota', txt: t.hist.map((x) => porId(x.juego).icono).join(' ') }));
    c.appendChild(btn('Jugar otra vez', () => { api.cerrar(); setTimeout(() => iniciarModo(t.modo, { N: t.N, juego: t.modo === 'elegir' ? t.juegos[0] : undefined }), 50); }, 'grande'));
    c.appendChild(btn('Menú', () => api.cerrar(), 'sec'));
  }, { alCerrar: res }); });
}

/* ---------- practica ---------- */
async function practica(juego) {
  if (enCurso) return; enCurso = true;
  try {
    const parts = armarPartes().slice(0, Math.max(2, juego.max));
    let rep = true, primera = true;
    while (rep) {
      const r = await jugarRonda(juego, parts, { practica: true, alTerminar: () => { const rr = registrarRonda({ juego: juego.id, parts, places: [], practica: true }); rr.logros.forEach((id) => { const l = LOGROS.find((x) => x.id === id); toast('★ Logro: ' + l.nombre, '#ffd23d'); Cu.logro(id); }); return { nota: 'Práctica: no suma puntos ni monedas.' }; } });
      rep = !!r.repetir; primera = false;
    }
  } finally { enCurso = false; }
  pintarMenu();
}

/* ---------- pantallas ---------- */
function verMesa() {
  abrirCapa('Mesa de jugadores', function pintar(c, api) {
    const m = P.mesa, cambiar = (k, v) => { m[k] = v; if (m.humanos + m.bots > 4) m.bots = 4 - m.humanos; guardarP(); api.redibujar(); pintarMenu(); };
    c.appendChild(h('div', { cls: 'aj-sub', txt: 'Jugadores humanos' })); c.appendChild(opciones(m.humanos, [[1, '1'], [2, '2'], [3, '3'], [4, '4']], (v) => cambiar('humanos', v)));
    c.appendChild(h('div', { cls: 'aj-sub', txt: 'Bots que completan la mesa' })); c.appendChild(opciones(m.bots, [0, 1, 2, 3].filter((b) => b + m.humanos <= 4).map((b) => [b, String(b)]), (v) => cambiar('bots', v)));
    c.appendChild(h('div', { cls: 'aj-sub', txt: 'Nivel de los bots' })); c.appendChild(opciones(m.nivel, NIVELES.map((n, i) => [i, n]), (v) => cambiar('nivel', v)));
    c.appendChild(h('p', { cls: 'nota', txt: 'Con un solo humano se añade al menos un bot. En cada partida: ' + resumenMesa() + '.' }));
    for (let i = 0; i < m.humanos; i++) {
      const j = P.jugadores[i], pal = D.acc.daltonico ? DALTONICO.map((c2) => ({ c: c2, id: c2, p: 0 })) : COLORES;
      const nom = h('input', { type: 'text', value: j.nombre, maxlength: 14, 'data-f': 1, 'aria-label': 'Nombre del jugador ' + (i + 1), on: { input: () => { j.nombre = nom.value.trim() || 'Jugador ' + (i + 1); guardarP(); } } });
      const cols = h('div', { cls: 'sw-lista' }, pal.map((co) => { const ok = D.acc.daltonico || colorLibre(co.id); return h('button', { type: 'button', cls: 'sw' + (ok ? '' : ' bloq'), style: '--c:' + co.c, 'data-f': 1, 'aria-label': 'Color ' + co.id, 'aria-pressed': String(j.color.toLowerCase() === co.c.toLowerCase()), txt: ok ? '' : '🔒', on: { click: () => { if (!ok) return toast(`Desbloquéalo en la tienda (${co.p} 🪙)`); j.color = co.c; guardarP(); api.redibujar(); } } }); }));
      const avs = h('div', { cls: 'sw-lista' }, AVATARES.map((a) => h('button', { type: 'button', cls: 'sw av', 'data-f': 1, 'aria-label': 'Avatar ' + a, 'aria-pressed': String(j.avatar === a), txt: a, on: { click: () => { j.avatar = a; guardarP(); api.redibujar(); } } })));
      const fms = h('div', { cls: 'sw-lista' }, FORMAS.map((f) => { const ok = formaLibre(f.id); const cv = h('canvas', { width: 48, height: 48 }); ficha(cv.getContext('2d'), f.id, 24, 24, 15, j.color); return h('button', { type: 'button', cls: 'sw forma av' + (ok ? '' : ' bloq'), 'data-f': 1, 'aria-label': f.n, 'aria-pressed': String(j.forma === f.id), on: { click: () => { if (!ok) return toast(`Desbloquéala en la tienda (${f.p} 🪙)`); j.forma = f.id; guardarP(); api.redibujar(); } } }, [cv]); }));
      c.appendChild(h('div', { cls: 'pj', style: '--c:' + j.color }, [h('b', { txt: 'Jugador ' + (i + 1) }), nom, cols, avs, fms]));
    }
  });
}
function verTienda() {
  abrirCapa('Tienda de skins', function pintar(c, api) {
    c.appendChild(h('p', { cls: 'monedas', txt: '🪙 ' + P.monedas + ' monedas (virtuales, se ganan jugando)' }));
    const seccion = (tit, lista, tipo, libre, dibujo) => {
      c.appendChild(h('h3', { txt: tit }));
      c.appendChild(h('div', { cls: 'tienda' }, lista.map((it) => {
        const tengo = libre(it.id), cv = h('canvas', { width: 80, height: 80 }); dibujo(cv.getContext('2d'), it);
        return h('div', { cls: 'item' + (tengo ? ' tengo' : '') }, [cv, h('small', { txt: it.n || it.id }), tengo ? h('small', { txt: '✓ tuyo' }) : btn(it.p + ' 🪙', () => { if (comprar(tipo, it.id)) { Sonido.fx('coin'); toast('Desbloqueado: ' + (it.n || it.id), '#6dff6d'); const nu = marcarColeccion(); nu.forEach((id) => { toast('★ Logro: ' + LOGROS.find((x) => x.id === id).nombre, '#ffd23d'); Cu.logro(id); }); api.redibujar(); } else toast('Te faltan monedas', '#ff6b4a'); }, 'peq')]);
      })));
    };
    seccion('Colores', COLORES, 'color', colorLibre, (g, it) => ficha(g, 'circulo', 40, 40, 24, it.c));
    seccion('Formas', FORMAS, 'forma', formaLibre, (g, it) => ficha(g, it.id, 40, 40, 24, P.jugadores[0].color));
    c.appendChild(h('p', { cls: 'nota', txt: 'Equipa colores y formas en «Mesa de jugadores».' }));
  });
}
function verLogros() {
  abrirCapa('Logros', (c) => { const n = LOGROS.filter((l) => P.logros[l.id]).length; c.appendChild(h('p', { cls: 'nota', txt: `${n} de ${LOGROS.length} conseguidos` })); c.appendChild(h('ul', { cls: 'logros' }, LOGROS.map((l) => h('li', { cls: P.logros[l.id] ? 'ok' : '' }, [h('b', { txt: (P.logros[l.id] ? '★ ' : '☆ ') + l.nombre }), h('span', { txt: l.desc })])))); });
}
function verStats() {
  abrirCapa('Estadísticas', (c) => {
    const S = P.stats, f = (a, b) => h('tr', {}, [h('td', { txt: a }), h('td', { txt: String(b) })]);
    c.appendChild(h('table', { cls: 'tabla' }, [f('Rondas jugadas', S.rondas), f('Rondas ganadas', S.victorias), f('Mejor racha', S.mejorRacha), f('Partidas completas', S.torneos), f('Campeonatos ganados', S.campeon), f('Puntos de torneo (J1)', S.puntos), f('Monedas', P.monedas), f('Monedas ganadas en total', P.ganadas), f('Rondas de práctica', S.practica)]));
    c.appendChild(h('h3', { txt: 'Por juego' }));
    c.appendChild(h('table', { cls: 'tabla' }, [h('tr', {}, [h('th', { txt: 'Juego' }), h('th', { txt: 'Jugadas' }), h('th', { txt: 'Ganadas' })])].concat(JUEGOS.map((j) => { const r = P.juegos[j.id] || { j: 0, v: 0 }; return h('tr', {}, [h('td', { txt: j.icono + ' ' + j.nombre }), h('td', { txt: String(r.j) }), h('td', { txt: String(r.v) })]); }))));
  });
}
function verRanking(modo) { abrirCapa('Rankings', (c) => Cu.panelRanking(c, { modo })); }
function verCuenta() { abrirCapa('Cuenta', (c, api) => Cu.panelCuenta(c, api, { ranking: () => verRanking(), antesDeSalir: () => guardarPYa() })); }
function verAjustes(pest) { abrirCapa('Ajustes', (c) => { c._aj = panelAjustes(c, { pest }); }); }
function verAyuda() {
  abrirCapa('Cómo se juega', (c) => {
    c.appendChild(h('p', { txt: 'Mesa de Minijuegos reúne 24 juegos cortos para 1 a 4 jugadores en un mismo dispositivo. Cada jugador usa su zona de la pantalla (los de enfrente quedan boca abajo para que todos lean bien).' }));
    [['👆 Táctil', 'Cada dedo cuenta: hasta 4 personas a la vez. Toca tu zona; en los juegos de movimiento arrastra a la izquierda (palanca) y usa los botones de la derecha.'], ['⌨️ Teclado', 'Se comparte por zonas: J1 WASD + Q/E, J2 flechas + . y /, J3 IJKL + U/O, J4 teclado numérico 8456 + 7/9. Se pueden cambiar en Ajustes.'], ['🎮 Mando', 'Hasta 4 mandos Xbox: el primero es el jugador 1 humano, y así. Palanca o cruceta + A/B. MENÚ pausa.'], ['🤖 Bots', 'Si faltan jugadores, los bots completan la mesa (Fácil, Normal o Difícil).'], ['🏆 Modos', 'Juego rápido, elegir juego (1, 3 o 5 rondas), mejor de N con juegos al azar y torneo de 10 juegos: 3 puntos al ganar la ronda.'], ['🪙 Monedas', 'Ganas monedas virtuales jugando y las usas en skins de color y forma. Nunca es dinero real.']].forEach(([t, d]) => c.appendChild(h('div', {}, [h('b', { txt: t }), h('p', { cls: 'nota', style: 'text-align:left', txt: d })])));
  });
}
function elegirJuego(titulo, accion) {
  abrirCapa(titulo, (c, api) => {
    CATEGORIAS.forEach((cat) => {
      const lista = JUEGOS.filter((j) => j.cat === cat); if (!lista.length) return;
      c.appendChild(h('h3', { txt: cat }));
      c.appendChild(h('div', { cls: 'rejilla-j' }, lista.map((j) => h('button', { type: 'button', cls: 'tarjeta-j', 'data-f': 1, on: { click: () => { Sonido.fx('click'); accion(j, api); } } }, [h('span', { cls: 'ic', txt: j.icono }), h('b', { txt: j.nombre }), h('small', { txt: `${j.min === j.max ? j.min : j.min + '-' + j.max} jugadores · ${j.dur} s` })]))));
    });
  });
}
function menuElegir() {
  elegirJuego('Elegir juego', (j, api) => {
    abrirCapa(j.nombre, (c, api2) => {
      c.appendChild(h('div', { style: 'font-size:3rem;text-align:center', txt: j.icono }));
      c.appendChild(h('ul', { cls: 'instr-lista' }, j.instr.map((t) => h('li', { txt: t }))));
      c.appendChild(h('p', { cls: 'nota', txt: 'Mesa: ' + resumenMesa() }));
      [[1, 'Una ronda'], [3, 'Mejor de 3'], [5, 'Mejor de 5']].forEach(([N, t]) => c.appendChild(btn(t, () => { api2.cerrar(); api.cerrar(); iniciarModo('elegir', { juego: j.id, N }); }, N === 1 ? 'grande' : '')));
      c.appendChild(btn('Practicar (sin puntos)', () => { api2.cerrar(); api.cerrar(); practica(j); }, 'sec'));
    });
  });
}
function menuPractica() { elegirJuego('Práctica: elige un juego', (j, api) => { api.cerrar(); practica(j); }); }
function menuMejor() {
  abrirCapa('Mejor de N', (c, api) => { c.appendChild(h('p', { cls: 'nota', txt: 'Juegos al azar; gana quien llegue primero a la mayoría de rondas.' })); [3, 5, 7].forEach((N) => c.appendChild(btn(`Mejor de ${N} (gana con ${Torneo.objetivoVictorias(N)})`, () => { api.cerrar(); iniciarModo('mejorde', { N }); }, N === 3 ? 'grande' : ''))); });
}
function pintarMenu() {
  const m = $('#listaMenu'); m.textContent = '';
  const g = hayGuardada();
  m.appendChild(h('button', { type: 'button', cls: 'mesa-resumen', 'data-f': 1, 'aria-label': 'Cambiar la mesa', on: { click: verMesa } }, [h('span', { cls: 'ch', txt: '🪑 ' + resumenMesa() }), h('span', { cls: 'monedas', txt: '🪙 ' + P.monedas }), h('small', { txt: 'Cambiar' })]));
  if (g) m.appendChild(btn(`Continuar · ${MODOS[g.modo]}${g.modo === 'mejorde' || g.modo === 'elegir' ? ' ' + g.N : ''} · ronda ${g.ronda + 1}`, continuar, 'grande'));
  m.appendChild(btn('Juego rápido', () => iniciarModo('rapido'), g ? '' : 'grande'));
  m.appendChild(btn('Elegir juego', menuElegir));
  m.appendChild(btn('Torneo de 10 juegos', () => iniciarModo('torneo')));
  m.appendChild(btn('Mejor de N rondas', menuMejor));
  m.appendChild(btn('Práctica', menuPractica, 'sec'));
  m.appendChild(h('div', { cls: 'fila2' }, [btn('Tienda', verTienda, 'sec'), btn('Logros', verLogros, 'sec')]));
  m.appendChild(h('div', { cls: 'fila2' }, [btn('Estadísticas', verStats, 'sec'), btn('Rankings', () => verRanking(), 'sec')]));
  m.appendChild(h('div', { cls: 'fila2' }, [btn('Ajustes', () => verAjustes(), 'sec'), btn('Cómo jugar', verAyuda, 'sec')]));
  Cu.pintarChip($('#cuentaLinea'), verCuenta);
}

/* ---------- barra, teclado y mando en menus ---------- */
$('#bAjustes').addEventListener('click', () => verAjustes());
$('#bAyuda').addEventListener('click', verAyuda);
$('#bSonido').addEventListener('click', () => { const s = D.sonido; if (s.maestro > 0) { s._prev = s.maestro; s.maestro = 0; } else s.maestro = s._prev || 0.8; guardarAj(); toast(s.maestro ? 'Sonido activado' : 'Sonido silenciado'); });
$('#bPantalla').addEventListener('click', () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* sin pantalla completa */ } });
Motor.hooks.ajustes = () => verAjustes();
Motor.hooks.ayuda = verAyuda;
addEventListener('keydown', (e) => {
  Sonido.despertar();
  if (e.key === 'Escape') { if (capas.length) capas[capas.length - 1].cerrar(); else if (Motor.activo() && ['juego', 'cuenta', 'pausa'].includes(Motor.M.estado)) Motor.pausar(); else return; e.preventDefault(); e.stopPropagation(); return; }
  document.body.classList.remove('usando-mando');
}, true);
addEventListener('pointerdown', () => { Sonido.despertar(); document.body.classList.remove('usando-mando'); }, true);

function contenedorNav() {
  if (capas.length) return capas[capas.length - 1].capa;
  if (Motor.activo()) { const e = $('#capaRonda'); return e.hidden ? null : e; }
  return $('#menu');
}
function mover(dx, dy) {
  const c = contenedorNav(); if (!c) return;
  const lista = $$('[data-f]', c).filter((e) => e.offsetParent !== null && !e.disabled);
  const act = document.activeElement && lista.includes(document.activeElement) ? document.activeElement : null;
  if (!act) { lista[0] && lista[0].focus(); return; }
  const r = act.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let mejor = null, mp = 1e18;
  lista.forEach((e) => { if (e === act) return; const q = e.getBoundingClientRect(), vx = q.left + q.width / 2 - cx, vy = q.top + q.height / 2 - cy; const along = vx * dx + vy * dy; if (along <= 2) return; const perp = Math.abs(vx * dy) + Math.abs(vy * dx); const p = along + perp * 2.5; if (p < mp) { mp = p; mejor = e; } });
  if (mejor) { mejor.focus(); mejor.scrollIntoView({ block: 'nearest' }); }
}
let ultimoPad = 0;
function bucleMando() {
  requestAnimationFrame(bucleMando);
  if (!Mando) return;
  Mando.leer();
  const est = Motor.activo() ? Motor.M.estado : 'idle';
  if (['juego', 'cuenta', 'cierre'].includes(est)) return;
  if (Mando.activo && Mando.conectado) document.body.classList.add('usando-mando');
  if (Mando.pulsado('ARRIBA')) mover(0, -1); else if (Mando.pulsado('ABAJO')) mover(0, 1); else if (Mando.pulsado('IZQ')) mover(-1, 0); else if (Mando.pulsado('DER')) mover(1, 0);
  const sy = Mando.ejes.izq.y, sx = Mando.ejes.izq.x, ahora = performance.now();
  if (ahora - ultimoPad > 260 && Math.hypot(sx, sy) > 0.6) { ultimoPad = ahora; Math.abs(sx) > Math.abs(sy) ? mover(Math.sign(sx), 0) : mover(0, Math.sign(sy)); }
  const c = contenedorNav();
  if (Mando.pulsado('A')) { const f = document.activeElement; if (f && c && c.contains(f) && f.matches('[data-f]')) f.click(); }
  if (Mando.pulsado('B') && capas.length) capas[capas.length - 1].cerrar();
  if ((Mando.pulsado('LB') || Mando.pulsado('RB')) && capas.length) { const tabs = $$('.aj-tab', capas[capas.length - 1].capa); const i = tabs.findIndex((t) => t.classList.contains('on')); if (tabs.length) tabs[(i + (Mando.pulsado('RB') ? 1 : -1) + tabs.length) % tabs.length].click(); }
}

/* ---------- inicio ---------- */
aplicar();
{ const u = window.Cuenta && window.Cuenta.usuario; if (u && P.jugadores[0].nombre === 'Jugador 1') { P.jugadores[0].nombre = (u.nombre || u.usuario || 'Jugador 1').slice(0, 14); guardarP(); } }
Cu.iniciarNube(() => { recargar(); pintarMenu(); toast('Progreso actualizado desde tu cuenta', '#6dff6d'); });
Cu.sincronizarLogros(P.logros); Cu.enviarPuntajes();
pintarMenu(); bucleMando();
if (!D.tutorialVisto) { D.tutorialVisto = true; guardarAj(); setTimeout(verAyuda, 400); }
window.__mj = { Motor, P, D, iniciarModo, practica, JUEGOS };
