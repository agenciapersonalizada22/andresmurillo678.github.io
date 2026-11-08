// Interfaz de la mesa: HUD, hojas (construir, comerciar, cartas, descarte...), banner de estado, eventos y puente con el tablero.
import { h, $, limitar } from './dom.js';
import { geo, pips } from './geometria.js';
import { RES, NOMBRE_RES, NOMBRE_TERRENO, COSTO, CARTAS, total, puedePagar, lugaresPoblado, lugaresCiudad, lugaresCamino, tasaBanco, puertosDe, cartasJugables, expectativa } from './reglas.js';
import { Tablero } from './tablero.js';
import { iconoURL, cartaURL, colorJug, COL_RES } from './iconos.js';
import { FRASES, EMOJIS } from './mesa.js';
import { NIVELES } from './bots.js';
import { Sonido } from './sonido.js';
import { A, D, reducirMov, pedirConfirmacion, guardar } from './ajustes.js';
import { CLAVES, leer, escribir } from './almacen.js';

export const T = {
  v: null, meta: { nombres: [], colores: [], tipos: [] }, modo: null, pend: null, enviar: null, alEvento: null, alFin: null,
  hoja: null, calor: true, lim: null, limT0: 0, log: [], dado: null, pistaId: '', ultimoAviso: 0, tab: null, seqVisto: -1, ofertaId: -1, descAbierto: false, vic: null
};
let tab = null, el = {}, tipTimer = 0;
const yo = () => (T.v ? T.v.yo : 0);
const nombre = (i) => (i === yo() ? 'Tú' : T.meta.nombres[i] || 'Jugador ' + (i + 1));
const nombreCap = (i) => (i === yo() ? 'Tú' : nombre(i));
const colJ = (i) => colorJug(i, A.acc.daltonico);
const miTurno = () => !!T.v && T.v.turno === T.v.yo && !T.v.fin;
const btn = (txt, fn, cls = '') => h('button', { type: 'button', cls: 'btn ' + cls, 'data-f': 1, txt, on: { click: fn } });
const costoChips = (c, ext) => h('span', { cls: 'costo' }, RES.filter((r) => c[r]).map((r) => h('span', { cls: 'cc' }, [h('img', { src: iconoURL(r, 32), alt: NOMBRE_RES[r], width: 18, height: 18 }), h('b', { txt: ext && ext(r) != null ? ext(r) : 'x' + c[r] })])));
const chipsRes = (m) => h('span', { cls: 'costo' }, RES.filter((r) => m[r]).map((r) => h('span', { cls: 'cc' }, [h('img', { src: iconoURL(r, 32), alt: NOMBRE_RES[r], width: 20, height: 20 }), h('b', { txt: 'x' + m[r] })])));

export function aviso(txt, color) {
  const cont = $('#toasts'); if (!cont) return;
  const d = h('div', { cls: 'aviso', style: color ? '--c:' + color : '' , txt });
  cont.appendChild(d);
  while (cont.children.length > 3) cont.firstChild.remove();
  setTimeout(() => d.remove(), 3200);
}
const anunciar = (txt) => { if (A.acc.anuncios) { const a = $('#aria'); if (a) a.textContent = txt; } };
const vibrar = (a, b, ms) => { try { if (D.vibracion && window.Mando && window.Mando.conectado) window.Mando.vibrar(a * D.vibInt, b * D.vibInt, ms); else if (D.vibracion && navigator.vibrate && ms >= 150) navigator.vibrate(Math.round(ms * 0.4 * D.vibInt)); } catch (e) { /* sin vibracion */ } };

/* ---------- inicio ---------- */
export function iniciar() {
  el = { jug: $('#jugadores'), mano: $('#mano'), acc: $('#acciones'), estado: $('#estado'), pista: $('#pista'), dados: $('#dados'), herr: $('#herramientas'), tip: $('#tip'), conf: $('#confirmaBar'), tiempo: $('#tiempo'), chat: $('#chatPanel'), fin: $('#finPanel'), lienzo: $('#lienzo') };
  T.calor = A.ayudas.calor;
  tab = new Tablero(el.lienzo, { opts: () => ({ D, A }), toque: alToque, info: alInfo, infoMover: (x, y) => posTip(x, y) });
  T.tab = tab;
  RES.forEach((r) => {
    el.mano.appendChild(h('button', { type: 'button', cls: 'rt', 'data-res': r, 'data-f': 1, 'aria-label': NOMBRE_RES[r], on: { click: () => accion('comerciar') } }, [h('img', { src: iconoURL(r, 56), alt: '', width: 30, height: 30 }), h('b', { cls: 'rn', txt: '0' }), h('small', { txt: NOMBRE_RES[r] })]));
  });
  const bt = (id, txt, fn, etq) => h('button', { type: 'button', cls: 'btn acc', id, 'data-f': 1, 'aria-label': etq || txt, txt, on: { click: fn } });
  el.acc.append(bt('bTirar', 'Tirar dados', () => accion('tirar')), bt('bConstruir', 'Construir', () => accion('construir')), bt('bComerciar', 'Comerciar', () => accion('comerciar')), bt('bCartas', 'Cartas', () => accion('cartas')), bt('bTerminar', 'Terminar', () => accion('terminar')));
  const hb = (txt, fn, etq, id) => h('button', { type: 'button', cls: 'icono herr', 'data-f': 1, id, 'aria-label': etq, title: etq, txt, on: { click: fn } });
  el.herr.append(hb('+', () => tab.zoomPor(1.35), 'Acercar'), hb('−', () => tab.zoomPor(1 / 1.35), 'Alejar'), hb('◎', () => tab.centrar(), 'Centrar tablero'), hb('▦', () => alternarCalor(), 'Mapa de probabilidades', 'bCalor'), hb('%', () => verProbabilidades(), 'Probabilidades y estadísticas'), hb('☰', () => verRegistro(), 'Registro de jugadas'));
}
export const tablero = () => tab;
export function refrescarTema() { if (tab) { tab.limpiarSprites(); tab.resize(); tab.invalidar(); } if (T.v) refrescar(); }
export function cuadro(t) { if (tab) tab.cuadro(t); tick(t); }
export function mostrarMesa(b) { if (b && tab) setTimeout(() => { tab.resize(); tab.centrar(); }, 30); }

/* ---------- recepcion de paquetes ---------- */
export function recibir(p) {
  const primero = !T.v || p.resync || (T.v && T.v.n !== p.v.n);
  if (p.resync || primero) { T.log = []; T.dado = null; T.pistaId = ''; if (p.v.dado) T.dado = { d: p.v.dado, j: p.v.turno, anim: 0 }; }
  T.v = p.v; T.meta = { nombres: p.nombres, colores: p.colores, tipos: p.tipos };
  T.lim = p.lim; T.limT0 = performance.now();
  tab.setVista(p.v);
  if (primero) { tab.resize(); tab.centrar(); T.pend = null; T.modo = null; cerrarHoja(); el.fin.hidden = true; T.finMostrado = false; }
  if (!p.resync) p.ev.forEach((e) => evento(e, p.v));
  else p.ev.forEach((e) => { if (e.t === 'chat') evento(e, p.v); });
  refrescar();
}
function evento(e, v) {
  const y = v.yo, linea = textoEv(e, v);
  if (linea) { T.log.push(linea); if (T.log.length > 200) T.log.shift(); if (e.t !== 'chat') anunciar(linea); }
  switch (e.t) {
    case 'tirada': {
      T.dado = { d: e.d, j: e.j, anim: performance.now() };
      Sonido.fx('dados'); animarDados();
      const s = e.d[0] + e.d[1];
      setTimeout(() => { if (T.v) { tab.destacarNumero(s); if (s === 7) { aviso('¡Sale el 7! Se mueve el bandido', '#ff6b4a'); Sonido.fx('ladron'); } } }, reducirMov() ? 0 : 1000);
      break;
    }
    case 'prod': case 'inicial': {
      const g = e.t === 'prod' ? e.g[y] : e.j === y ? e.g : null;
      if (g && Object.keys(g).length) { setTimeout(() => ganancia(g), e.t === 'prod' && !reducirMov() ? 1000 : 0); Sonido.fx('prod'); vibrar(0.1, 0.3, 80); }
      else if (e.t === 'prod' && !e.hubo && e.num !== 7) setTimeout(() => aviso('Nadie produce con este número', '#b9b3d8'), reducirMov() ? 0 : 1000);
      break;
    }
    case 'poblado': Sonido.fx('construir'); break;
    case 'camino': Sonido.fx('construir'); break;
    case 'ciudad': Sonido.fx('ciudad'); break;
    case 'carta': Sonido.fx('carta'); if (e.j === y && e.k) aviso('Compraste: ' + CARTAS[e.k].nombre, '#ffd23d'); break;
    case 'jugarCarta': aviso(`${nombreCap(e.j)}: ${CARTAS[e.carta].nombre}`, colJ(e.j)); Sonido.fx('carta'); break;
    case 'ladron': Sonido.fx('ladron'); break;
    case 'robo': Sonido.fx('robo'); if (e.a === y) { aviso('Robaste ' + (e.res ? NOMBRE_RES[e.res] : 'una carta'), '#6dff6d'); } else if (e.de === y) { aviso(`${nombre(e.a)} te robó ${e.res ? NOMBRE_RES[e.res] : 'una carta'}`, '#ff6b4a'); vibrar(0.6, 0.4, 220); } break;
    case 'descarte': Sonido.fx('descarte'); break;
    case 'trato': if (e.j !== y) Sonido.fx('trato'); break;
    case 'respuesta': if (v.trato && v.trato.de === y && e.j !== y) { aviso(`${nombre(e.j)} ${e.ok ? 'aceptó' : 'rechazó'} tu oferta`, e.ok ? '#6dff6d' : '#ff6b4a'); Sonido.fx(e.ok ? 'hecho' : 'error'); } break;
    case 'tratoHecho': Sonido.fx('hecho'); aviso(`Trato cerrado: ${nombre(e.j)} y ${nombre(e.con)}`, '#6dff6d'); break;
    case 'banco': Sonido.fx('banco'); break;
    case 'largo': Sonido.fx('largo'); aviso(e.j >= 0 ? `${nombreCap(e.j)}: camino más largo (${e.len})` : 'Nadie tiene el camino más largo', '#ffd23d'); break;
    case 'ejercito': Sonido.fx('largo'); aviso(`${nombreCap(e.j)}: ejército mayor (${e.n})`, '#ffd23d'); break;
    case 'acaparo': aviso(`${nombreCap(e.j)} acaparó ${e.n} de ${NOMBRE_RES[e.r]}`, '#ffd23d'); break;
    case 'turno': if (e.j === y) { Sonido.fx('turno'); vibrar(0.2, 0.5, 160); aviso('¡Es tu turno!', colJ(y)); } T.dado = null; break;
    case 'piloto': aviso(`${nombre(e.j)} pasa al piloto automático`, '#ffd23d'); break;
    case 'presencia': aviso(`${nombre(e.j)} ${e.ausente ? 'se desconectó: un bot juega por él' : 'volvió a la mesa'}`, '#ffd23d'); break;
    case 'chat': mostrarBurbuja(e.j, e.k); if (e.j !== y) Sonido.fx('chat'); break;
    case 'fin': Sonido.fx(e.ganador === y ? 'gana' : 'pierde'); vibrar(0.5, 0.8, 400); break;
    default: break;
  }
  if (T.alEvento) T.alEvento(e, v);
}
function textoEv(e, v) {
  const n = (i) => nombreCap(i), cant = (g) => RES.filter((r) => g[r]).map((r) => `${g[r]} ${NOMBRE_RES[r]}`).join(', ');
  switch (e.t) {
    case 'inicio': return 'Empieza la fundación: elige tus poblados en serpiente.';
    case 'tirada': return `${n(e.j)} sacó ${e.d[0] + e.d[1]} (${e.d[0]}+${e.d[1]})`;
    case 'prod': { const q = e.g.map((g, i) => (Object.keys(g).length ? `${n(i)}: ${cant(g)}` : '')).filter(Boolean); return q.length ? 'Producción · ' + q.join(' · ') : 'Nadie produce'; }
    case 'inicial': return Object.keys(e.g).length ? `${n(e.j)} recibe ${cant(e.g)} de su 2.º poblado` : null;
    case 'poblado': return `${n(e.j)} fundó un poblado`;
    case 'camino': return `${n(e.j)} construyó un camino`;
    case 'ciudad': return `${n(e.j)} mejoró a ciudad`;
    case 'carta': return `${n(e.j)} compró una carta de desarrollo`;
    case 'jugarCarta': return `${n(e.j)} jugó ${CARTAS[e.carta].nombre}`;
    case 'ladron': return `${n(e.j)} movió al bandido${e.victima >= 0 ? ' y robó a ' + n(e.victima) : ''}`;
    case 'descarte': return `${n(e.j)} descartó ${e.n} cartas`;
    case 'trato': return `${n(e.j)} propone un trato`;
    case 'tratoHecho': return `Trato: ${n(e.j)} da ${cant(e.da)} y recibe ${cant(e.pide)} de ${n(e.con)}`;
    case 'banco': return `${n(e.j)} cambió ${e.n} ${NOMBRE_RES[e.da]} por 1 ${NOMBRE_RES[e.recibe]} en el banco`;
    case 'largo': return e.j >= 0 ? `${n(e.j)} tiene el camino más largo (${e.len})` : 'El camino más largo queda sin dueño';
    case 'ejercito': return `${n(e.j)} tiene el ejército mayor (${e.n})`;
    case 'acaparo': return `${n(e.j)} acaparó ${e.n} de ${NOMBRE_RES[e.r]}`;
    case 'turno': return `Turno de ${n(e.j)}`;
    case 'escasez': return `El banco no tiene suficiente ${NOMBRE_RES[e.res]}`;
    case 'fin': return `¡${n(e.ganador)} gana la partida!`;
    case 'chat': return `${n(e.j)}: ${e.k < FRASES.length ? FRASES[e.k] : EMOJIS[e.k - FRASES.length]}`;
    default: void v; return null;
  }
}

/* ---------- animaciones ligeras ---------- */
function ganancia(g) {
  if (reducirMov()) return;
  RES.forEach((r) => {
    if (!g[r]) return;
    const t = el.mano.querySelector(`[data-res="${r}"]`); if (!t) return;
    const s = h('span', { cls: 'sube-res', txt: '+' + g[r] }); t.appendChild(s); setTimeout(() => s.remove(), 1500);
  });
}
function animarDados() {
  el.dados.hidden = false;
  if (reducirMov()) { pintarDados(); return; }
  const fin = performance.now() + 800;
  const paso = () => { if (!T.dado) return; const ahora = performance.now(); if (ahora < fin) { pintarDados([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]); setTimeout(paso, 70); } else pintarDados(); };
  paso();
}
function carasDado(n) {
  const mapa = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const d = h('span', { cls: 'dado' });
  for (let i = 0; i < 9; i++) d.appendChild(h('i', { cls: (mapa[n] || []).includes(i) ? 'p' : '' }));
  return d;
}
function pintarDados(tmp) {
  const d = tmp || (T.dado && T.dado.d);
  el.dados.textContent = '';
  if (!d) { el.dados.hidden = true; return; }
  el.dados.hidden = false;
  el.dados.classList.toggle('rueda', !!tmp);
  el.dados.append(carasDado(d[0]), carasDado(d[1]), h('b', { cls: 'suma', txt: String(d[0] + d[1]) }));
  el.dados.title = (T.dado ? nombre(T.dado.j) : '') + ' sacó ' + (d[0] + d[1]);
}
function mostrarBurbuja(j, k) {
  const chip = el.jug.querySelector(`[data-j="${j}"]`); if (!chip) return;
  const r = chip.getBoundingClientRect(), txt = k < FRASES.length ? FRASES[k] : EMOJIS[k - FRASES.length];
  const b = h('div', { cls: 'burbuja' + (k >= FRASES.length ? ' corta' : ''), txt, style: `left:${r.left + r.width / 2}px;top:${r.bottom + 34}px` });
  $('#burbujas').appendChild(b); setTimeout(() => b.remove(), 2600);
}

/* ---------- refresco general ---------- */
function refrescar() {
  const v = T.v; if (!v) return;
  document.body.classList.toggle('mi-turno', miTurno());
  pintarJugadores(); pintarMano(); calcularModo(); pintarAcciones(); pintarEstado(); pintarPista(); pintarDados(); revisarPrompts();
  if (v.fin && !T.finMostrado) { T.finMostrado = true; setTimeout(pintarFin, 900); }
  if (!v.fin) el.fin.hidden = true;
  $('#bCalor') && $('#bCalor').setAttribute('aria-pressed', String(T.calor));
}
function pintarJugadores() {
  const v = T.v, c = el.jug; c.textContent = ''; c.style.setProperty('--n', v.n);
  for (let i = 0; i < v.n; i++) {
    const ausente = T.meta.tipos[i] === 'ausente', bot = /^bot/.test(T.meta.tipos[i]);
    const pts = i === v.yo ? v.misPts : v.pts[i];
    const ins = (T.meta.nombres[i] || '?').trim().slice(0, 1).toUpperCase();
    const chip = h('div', { cls: 'chip' + (v.turno === i && !v.fin ? ' turno' : '') + (ausente ? ' ausente' : '') + (i === v.yo ? ' yo' : ''), 'data-j': i, style: '--c:' + colJ(i), 'aria-label': `${nombre(i)}: ${pts} puntos` }, [
      h('div', { cls: 'av' }, [h('span', { cls: 'ini', txt: ins })]),
      h('div', { cls: 'datos' }, [h('div', { cls: 'nom', txt: i === v.yo ? 'Tú' : T.meta.nombres[i] }), h('div', { cls: 'sub', txt: bot ? 'Bot ' + NIVELES[+T.meta.tipos[i].slice(3)].nombre : ausente ? 'Desconectado' : i === v.yo ? T.meta.nombres[i] : 'Jugador' })]),
      h('div', { cls: 'pv' }, [h('b', { txt: String(pts) }), h('small', { txt: '/' + v.cfg.meta })]),
      h('div', { cls: 'ins' }, [
        h('span', { cls: 'ib', title: 'Cartas de recurso', txt: '▮' + v.totales[i] }),
        h('span', { cls: 'ib d', title: 'Cartas de desarrollo', txt: '★' + v.nCartas[i] }),
        v.largo.j === i ? h('span', { cls: 'ib gana', title: 'Camino más largo', txt: '⟿' + v.largo.len }) : (v.lens[i] ? h('span', { cls: 'ib', title: 'Camino más largo propio', txt: '⟿' + v.lens[i] }) : null),
        v.ejer.j === i ? h('span', { cls: 'ib gana', title: 'Ejército mayor', txt: '⚔' + v.ejer.n }) : (v.jugadas[i].guardia ? h('span', { cls: 'ib', title: 'Guardias jugados', txt: '⚔' + v.jugadas[i].guardia }) : null)
      ])
    ]);
    c.appendChild(chip);
  }
}
function pintarMano() {
  const v = T.v;
  el.mano.querySelectorAll('.rt').forEach((b) => { const r = b.dataset.res; b.querySelector('.rn').textContent = v.mano[r]; b.classList.toggle('vacio', !v.mano[r]); });
}
const accionesVisibles = () => {
  const v = T.v, mi = miTurno();
  return { tirar: mi && v.fase === 'tirada', construir: mi && v.fase === 'accion', comerciar: mi && v.fase === 'accion', cartas: v.cm.length > 0 || (mi && v.fase === 'accion'), terminar: mi && v.fase === 'accion' };
};
function pintarAcciones() {
  const v = T.v, vis = accionesVisibles(), mi = miTurno();
  const set = (id, mostrar, hab = true) => { const b = $('#' + id); b.hidden = !mostrar; b.disabled = !hab; };
  set('bTirar', vis.tirar, true);
  set('bConstruir', vis.construir, v.camGratis === 0);
  set('bComerciar', vis.comerciar, v.camGratis === 0);
  const jugables = Object.values(cartasJugables(v, v.yo)).reduce((a, b) => a + b, 0);
  set('bCartas', v.fase !== 'fundacion' && !v.fin, true);
  $('#bCartas').textContent = 'Cartas' + (v.cm.length ? ` (${v.cm.length})` : '');
  $('#bCartas').classList.toggle('resalta', mi && !v.cartaJug && jugables > 0 && v.fase !== 'fundacion');
  set('bTerminar', vis.terminar, v.camGratis === 0);
  $('#bTerminar').classList.toggle('resalta', mi && v.fase === 'accion' && !puedeHacerAlgo(v));
}
function puedeHacerAlgo(v) {
  const P = v.piezas[v.yo];
  return (P.cam > 0 && puedePagar(v.mano, COSTO.cam) && lugaresCamino(v, v.yo).length) || (P.pob > 0 && puedePagar(v.mano, COSTO.pob) && lugaresPoblado(v, v.yo, false).length) || (P.ciu > 0 && puedePagar(v.mano, COSTO.ciu) && lugaresCiudad(v, v.yo).length) || (v.mazoN > 0 && puedePagar(v.mano, COSTO.carta));
}
function pintarEstado() {
  const v = T.v; let txt = '', mio = false;
  const quien = nombre(v.turno);
  if (v.fin) txt = `¡${nombre(v.fin.ganador)} ${v.fin.ganador === v.yo ? 'ganaste' : 'ganó'} la partida!`;
  else if (v.fase === 'fundacion') {
    const mi = v.turno === v.yo; mio = mi;
    txt = mi ? (v.fund.pend === 'pob' ? 'Fundación: toca un vértice libre para tu poblado' : 'Fundación: construye un camino junto a tu poblado') : `Fundación: ${quien} elige ${v.fund.pend === 'pob' ? 'poblado' : 'camino'}…`;
  } else if (v.fase === 'descartar') {
    const mio2 = v.desc[v.yo]; mio = !!mio2;
    txt = mio2 ? `Descarta ${mio2} cartas` : `Esperando descartes (${Object.keys(v.desc).map((k) => nombre(+k)).join(', ')})…`;
  } else if (v.fase === 'ladron') { mio = miTurno(); txt = miTurno() ? (T.pend ? 'Confirma el hexágono del bandido' : 'Mueve al bandido: toca un hexágono') : `${quien} mueve al bandido…`; }
  else if (miTurno()) {
    mio = true;
    if (v.fase === 'tirada') txt = 'Tu turno: tira los dados';
    else if (v.camGratis) txt = `Camino gratis: coloca ${v.camGratis} más`;
    else if (T.modo) txt = ({ poblado: 'Elige dónde fundar el poblado', ciudad: 'Elige un poblado para mejorar', camino: 'Elige dónde construir el camino' })[T.modo.k] || 'Elige un lugar';
    else txt = 'Tu turno: construye, comercia o termina';
  } else txt = v.fase === 'tirada' ? `${quien} va a tirar los dados…` : `Turno de ${quien}…`;
  el.estado.textContent = txt; el.estado.classList.toggle('mio', mio);
  if (T.lim && !v.fin) { el.tiempo.hidden = false; } else el.tiempo.hidden = true;
}
function tick(t) {
  if (!T.lim || !T.v || T.v.fin) return;
  const resto = Math.max(0, T.lim.ms - (performance.now() - T.limT0)), p = T.lim.total ? resto / T.lim.total : 0;
  el.tiempo.style.setProperty('--p', Math.round(p * 100) + '%'); el.tiempo.classList.toggle('urge', resto < 8000);
  const s = Math.ceil(resto / 1000);
  if (resto < 8000 && s !== T.tickSonado && miTurno()) { T.tickSonado = s; if (s > 0) Sonido.fx('tictac'); }
  void t;
}

/* ---------- pistas de tutorial ---------- */
const PISTAS = {
  fundPob: 'Fundación: elige un vértice libre para tu poblado. Cada poblado necesita 2 espacios libres alrededor. Los puntos bajo cada número indican su probabilidad: ¡busca 6 y 8!',
  fundCam: 'Ahora un camino que salga de tu poblado. Los caminos te permiten expandirte y conseguir el Camino más largo.',
  tirar: 'Tira los dados: los hexágonos con ese número dan recursos a los poblados (1) y ciudades (2) que los tocan.',
  accion: 'Gasta recursos para construir (Construir), comprar cartas o comerciar con jugadores y con el banco. Cuando termines, pulsa Terminar.',
  descartar: 'Con un 7, quien tenga más de 7 cartas descarta la mitad. Luego se mueve el bandido.',
  ladron: 'Mueve al bandido: bloquea el hexágono y robas una carta a un vecino. Elige donde produzcan tus rivales, no tú.',
  comerciar: 'Ofrece cartas a todos o a un jugador, o cambia con el banco: 4:1, 3:1 con puerto genérico y 2:1 con el puerto del recurso.'
};
function pistaActual() {
  const v = T.v;
  if (!A.ayudas.pistas || !v || v.fin) return '';
  const t = leer(CLAVES.tutorial, {}); if (t.saltado) return '';
  const vistos = t.vistos || {};
  let id = '';
  if (v.fase === 'fundacion' && miTurno()) id = v.fund.pend === 'pob' ? 'fundPob' : 'fundCam';
  else if (v.fase === 'tirada' && miTurno()) id = 'tirar';
  else if (v.fase === 'descartar' && v.desc[v.yo]) id = 'descartar';
  else if (v.fase === 'ladron' && miTurno()) id = 'ladron';
  else if (v.fase === 'accion' && miTurno()) id = 'accion';
  return id && !vistos[id] ? id : '';
}
function pintarPista() {
  const id = pistaActual();
  el.pista.hidden = !id; if (!id) { T.pistaId = ''; return; }
  T.pistaId = id; el.pista.textContent = '';
  const sig = () => { const t = leer(CLAVES.tutorial, {}); t.vistos = { ...(t.vistos || {}), [id]: 1 }; escribir(CLAVES.tutorial, t); pintarPista(); };
  const saltar = () => { const t = leer(CLAVES.tutorial, {}); t.saltado = true; escribir(CLAVES.tutorial, t); pintarPista(); };
  el.pista.append(h('p', { txt: PISTAS[id] }), h('div', { cls: 'pb' }, [btn('Entendido', sig, 'peq'), btn('Saltar tutorial', saltar, 'peq sec')]));
}
export function marcarPista(id) { const t = leer(CLAVES.tutorial, {}); t.vistos = { ...(t.vistos || {}), [id]: 1 }; escribir(CLAVES.tutorial, t); }
export function reiniciarPistas() { escribir(CLAVES.tutorial, { vistos: {}, saltado: false }); }

/* ---------- modos de seleccion en el tablero ---------- */
const sumaPips = (v, vtx) => geo(v.cfg.radio).verts[vtx].hs.reduce((a, hi) => a + pips(v.hex[hi].num), 0);
function calcularModo() {
  const v = T.v, mi = miTurno(); let lugares = null, tipo = null, et = null, k = null;
  if (!mi) { T.modo = null; T.pend = null; tab.setCandidatos(null); limpiarConfirma(); return; }
  if (v.fase === 'fundacion') {
    k = v.fund.pend === 'pob' ? 'fundPob' : 'fundCam';
  } else if (v.fase === 'ladron') k = 'ladron';
  else if (v.fase === 'accion' && v.camGratis > 0) k = 'camino';
  else if (v.fase === 'accion' && T.modo && ['poblado', 'ciudad', 'camino'].includes(T.modo.k)) k = T.modo.k;
  if (k === 'poblado' && !(v.piezas[v.yo].pob > 0 && puedePagar(v.mano, COSTO.pob))) k = null;
  if (k === 'ciudad' && !(v.piezas[v.yo].ciu > 0 && puedePagar(v.mano, COSTO.ciu))) k = null;
  if (k === 'camino' && !v.camGratis && !(v.piezas[v.yo].cam > 0 && puedePagar(v.mano, COSTO.cam))) k = null;
  if (!k || (v.fase === 'tirada' && !k)) { T.modo = null; T.pend = null; tab.setCandidatos(null); limpiarConfirma(); return; }
  const antes = T.modo && T.modo.k;
  T.modo = { k };
  if (k === 'fundPob' || k === 'poblado') { tipo = 'v'; lugares = lugaresPoblado(v, v.yo, k === 'fundPob'); et = {}; lugares.forEach((x) => { et[x] = sumaPips(v, x); }); }
  else if (k === 'fundCam') { tipo = 'e'; lugares = lugaresCamino(v, v.yo, v.fund.ult); }
  else if (k === 'camino') { tipo = 'e'; lugares = lugaresCamino(v, v.yo); }
  else if (k === 'ciudad') { tipo = 'v'; lugares = lugaresCiudad(v, v.yo); }
  else if (k === 'ladron') { tipo = 'h'; lugares = v.hex.map((_, i) => i).filter((i) => i !== v.ladron); et = {}; lugares.forEach((i) => { et[i] = v.hex[i].num ? pips(v.hex[i].num) + '/36' : ''; }); }
  tab.setCalor(T.calor && (k === 'fundPob' || k === 'poblado') && A.ayudas.calor);
  tab.setCandidatos(tipo, lugares, et);
  if (T.pend && !(T.pend.tipo === tipo && lugares.includes(T.pend.id))) { T.pend = null; limpiarConfirma(); }
  if (T.pend) tab.setSeleccion(T.pend.tipo, T.pend.id);
  if (antes !== k && lugares.length === 1 && !pedirConfirmacion() === false) { /* un solo lugar: se muestra seleccionado */ }
}
function alToque(hit, x, y) {
  if (!T.v) return;
  if (!hit) { if (T.pend) { T.pend = null; tab.setSeleccion(null); limpiarConfirma(); } return; }
  if (hit.tipo === 'info') { if (!T.modo) alInfo(hit.id, x || 0, y || 0, true); else { T.pend = null; tab.setSeleccion(null); limpiarConfirma(); } return; }
  if (!T.modo) return;
  elegir(hit.tipo, hit.id);
}
function elegir(tipo, id) {
  if (T.pend && T.pend.tipo === tipo && T.pend.id === id) { confirmar(); return; }
  Sonido.fx('selecciona');
  T.pend = { tipo, id }; tab.setSeleccion(tipo, id);
  if (pedirConfirmacion()) mostrarConfirma(); else confirmar();
}
function mostrarConfirma() {
  const k = T.modo && T.modo.k, c = el.conf; c.hidden = false; c.textContent = '';
  const et = { fundPob: 'Fundar aquí', poblado: 'Construir poblado', fundCam: 'Camino aquí', camino: 'Construir camino', ciudad: 'Mejorar a ciudad', ladron: 'Mover bandido aquí' }[k] || 'Confirmar';
  c.append(btn('✓ ' + et, () => confirmar(), 'grande'), btn('✕', () => cancelarSel(), 'sec'));
  const f = c.querySelector('button'); if (f && document.body.classList.contains('usando-mando')) f.focus();
}
function limpiarConfirma() { if (el.conf) el.conf.hidden = true; }
function cancelarSel() { T.pend = null; tab.setSeleccion(null); limpiarConfirma(); pintarEstado(); }
export function confirmar() {
  const p = T.pend, v = T.v; if (!p || !v || !T.modo) return false;
  const k = T.modo.k; let cmd = null;
  if (k === 'fundPob' || k === 'poblado') cmd = { t: 'poblado', v: p.id };
  else if (k === 'fundCam' || k === 'camino') cmd = { t: 'camino', e: p.id };
  else if (k === 'ciudad') cmd = { t: 'ciudad', v: p.id };
  else if (k === 'ladron') {
    const vic = victimasUI(p.id);
    if (vic.length > 1) { elegirVictima(p.id, vic); return true; }
    cmd = { t: 'ladron', h: p.id };
  }
  T.pend = null; tab.setSeleccion(null); limpiarConfirma();
  if (cmd) enviar(cmd);
  if (['poblado', 'ciudad', 'camino'].includes(k) && !(k === 'camino' && v.camGratis > 1)) T.modo = null;
  return true;
}
export function enviar(cmd) {
  const r = T.enviar ? T.enviar(cmd) : null;
  if (r && r.ok === false) { aviso(r.err || 'Jugada no válida', '#ff6b4a'); Sonido.fx('error'); }
  return r;
}
function victimasUI(h) {
  const v = T.v, G = geo(v.cfg.radio), r = [];
  for (const x of G.hexes[h].vs) { const o = v.vj[x]; if (o >= 0 && o !== v.yo && !r.includes(o) && v.totales[o] > 0) r.push(o); }
  return r;
}
function elegirVictima(hx, vic) {
  abrirHoja('¿A quién robar?', (c, api) => {
    c.appendChild(h('p', { cls: 'nota', txt: 'Robarás una carta al azar de su mano.' }));
    vic.forEach((i) => c.appendChild(h('button', { type: 'button', cls: 'btn objetivo', 'data-f': 1, style: '--c:' + colJ(i), on: { click: () => { api.cerrar(); T.pend = null; tab.setSeleccion(null); limpiarConfirma(); enviar({ t: 'ladron', h: hx, victima: i }); } } }, [h('span', { txt: nombre(i) }), h('span', { txt: `▮${T.v.totales[i]} · ${T.v.pts[i]} PV` })])));
  }, { alCerrar: () => {} });
}

/* ---------- info al pasar el raton / mantener pulsado ---------- */
function alInfo(hi, x, y, fijo) {
  const t = el.tip;
  if (hi == null || !A.ayudas.hover || !T.v) { t.hidden = true; return; }
  const v = T.v, hx = v.hex[hi], G = geo(v.cfg.radio);
  const duenos = []; G.hexes[hi].vs.forEach((x2) => { if (v.vj[x2] >= 0) duenos.push(`${nombre(v.vj[x2])}${v.vc[x2] === 2 ? ' (ciudad)' : ''}`); });
  t.textContent = '';
  t.append(h('b', { txt: NOMBRE_TERRENO[hx.t] + (hx.num ? ' · ' + hx.num : '') }));
  if (hx.num) t.append(h('div', { txt: `Probabilidad: ${(pips(hx.num) / 36 * 100).toFixed(1)}% por tirada (${pips(hx.num)}/36)` }));
  if (hi === v.ladron) t.append(h('div', { cls: 'mal', txt: 'El bandido bloquea este hexágono' }));
  if (duenos.length) t.append(h('div', { txt: 'Producen aquí: ' + duenos.join(', ') }));
  t.hidden = false; posTip(x, y);
  clearTimeout(tipTimer); if (fijo) tipTimer = setTimeout(() => { t.hidden = true; }, 3500);
}
function posTip(x, y) {
  const t = el.tip, w = t.offsetWidth || 180, W = el.lienzo.parentNode.clientWidth;
  t.style.left = limitar(x + 14, 4, W - w - 4) + 'px'; t.style.top = Math.max(4, y - (t.offsetHeight || 60) - 12) + 'px';
}
function alternarCalor() { T.calor = !T.calor; aviso('Mapa de probabilidades ' + (T.calor ? 'activado' : 'desactivado'), '#3df5ff'); calcularModo(); tab.invalidar(); $('#bCalor').setAttribute('aria-pressed', String(T.calor)); }

/* ---------- hojas ---------- */
export function abrirHoja(titulo, construir, opts = {}) {
  cerrarHoja();
  const cuerpo = h('div', { cls: 'capa-cuerpo' });
  const cab = h('div', { cls: 'capa-cab' }, [h('h2', { txt: titulo }), h('button', { type: 'button', cls: 'icono', 'data-f': 1, 'data-cerrar': 1, 'aria-label': 'Cerrar', txt: '✕', on: { click: () => cerrar() } })]);
  const capa = h('div', { cls: 'capa hoja', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo }, [cab, cuerpo]);
  $('#mesa').appendChild(capa);
  const api = { capa, cuerpo, cerrar, titulo, rehacer: () => { cuerpo.textContent = ''; construir(cuerpo, api); } };
  function cerrar() { if (!capa.isConnected) return; capa.remove(); if (T.hoja === api) T.hoja = null; opts.alCerrar && opts.alCerrar(); }
  T.hoja = api; construir(cuerpo, api);
  setTimeout(() => { const f = $('[data-f]:not([data-cerrar])', cuerpo) || $('[data-f]', cuerpo); if (f && document.body.classList.contains('usando-mando')) f.focus(); }, 40);
  return api;
}
export function cerrarHoja() { if (T.hoja) T.hoja.cerrar(); T.hoja = null; }
const stepper = (obj, r, max, alCambiar) => {
  const n = h('b', { txt: String(obj[r] || 0) });
  const ajustar = (d) => { obj[r] = limitar((obj[r] || 0) + d, 0, max); n.textContent = obj[r]; alCambiar && alCambiar(); };
  return h('div', { cls: 'step' }, [h('img', { src: iconoURL(r, 40), alt: NOMBRE_RES[r], width: 26, height: 26 }), h('button', { type: 'button', cls: 'mm', 'data-f': 1, 'aria-label': 'Menos ' + NOMBRE_RES[r], txt: '−', on: { click: () => ajustar(-1) } }), n, h('button', { type: 'button', cls: 'mm', 'data-f': 1, 'aria-label': 'Más ' + NOMBRE_RES[r], txt: '+', on: { click: () => ajustar(1) } })]);
};
export function abrirConstruir() {
  const v = T.v;
  if (!miTurno() || v.fase !== 'accion') return;
  abrirHoja('Construir', (c, api) => {
    const P = v.piezas[v.yo];
    const item = (clave, titulo, costo, ok, razon, fn) => c.appendChild(h('button', { type: 'button', cls: 'btn objetivo item' + (ok ? '' : ' no'), 'data-f': 1, disabled: ok ? null : true, on: { click: () => { api.cerrar(); fn(); } } }, [h('span', { cls: 'it' }, [h('b', { txt: titulo }), h('small', { txt: ok ? '' : razon })]), costoChips(costo)]));
    const razon = (clave, extra) => (P[clave] <= 0 ? 'No te quedan piezas' : extra);
    item('cam', `Camino (${P.cam} restantes)`, COSTO.cam, P.cam > 0 && puedePagar(v.mano, COSTO.cam) && lugaresCamino(v, v.yo).length > 0, razon('cam', puedePagar(v.mano, COSTO.cam) ? 'Sin sitio conectado' : 'Te faltan recursos'), () => ponerModo('camino'));
    item('pob', `Poblado (${P.pob} restantes) · 1 PV`, COSTO.pob, P.pob > 0 && puedePagar(v.mano, COSTO.pob) && lugaresPoblado(v, v.yo, false).length > 0, razon('pob', puedePagar(v.mano, COSTO.pob) ? 'Necesita un camino tuyo y 2 espacios libres' : 'Te faltan recursos'), () => ponerModo('poblado'));
    item('ciu', `Ciudad (${P.ciu} restantes) · 2 PV`, COSTO.ciu, P.ciu > 0 && puedePagar(v.mano, COSTO.ciu) && lugaresCiudad(v, v.yo).length > 0, razon('ciu', lugaresCiudad(v, v.yo).length ? 'Te faltan recursos' : 'Primero un poblado'), () => ponerModo('ciudad'));
    item('carta', `Carta de desarrollo (${v.mazoN} en el mazo)`, COSTO.carta, v.mazoN > 0 && puedePagar(v.mano, COSTO.carta), v.mazoN > 0 ? 'Te faltan recursos' : 'El mazo está vacío', () => enviar({ t: 'comprarCarta' }));
    c.appendChild(h('p', { cls: 'nota', txt: 'Poblado: 1 PV, produce 1 carta. Ciudad: 2 PV, produce 2. Los puntos bajo los números muestran la probabilidad.' }));
  });
}
export function ponerModo(k) {
  if (!miTurno()) return;
  T.modo = { k }; T.pend = null; tab.setSeleccion(null); limpiarConfirma(); calcularModo();
  if (!T.modo) { aviso('No puedes construir eso ahora', '#ff6b4a'); Sonido.fx('error'); return; }
  const lg = tab.cand && tab.cand.ids; if (lg && lg.length) { const mejor = k === 'poblado' ? lg.slice().sort((a, b) => sumaPips(T.v, b) - sumaPips(T.v, a))[0] : lg[0]; tab.enfocar(tab.cand.tipo, mejor); }
  pintarEstado(); anunciar($('#estado').textContent);
}
export function cicloConstruir(d) {
  const v = T.v; if (!miTurno() || v.fase !== 'accion' || v.camGratis) return;
  const ordenes = ['camino', 'poblado', 'ciudad'], P = v.piezas[v.yo];
  const ok = { camino: P.cam > 0 && puedePagar(v.mano, COSTO.cam) && lugaresCamino(v, v.yo).length, poblado: P.pob > 0 && puedePagar(v.mano, COSTO.pob) && lugaresPoblado(v, v.yo, false).length, ciudad: P.ciu > 0 && puedePagar(v.mano, COSTO.ciu) && lugaresCiudad(v, v.yo).length };
  const act = T.modo ? ordenes.indexOf(T.modo.k) : -1;
  for (let i = 1; i <= 3; i++) { const k = ordenes[(act + d * i + 9) % 3]; if (ok[k]) { ponerModo(k); return; } }
  aviso('No tienes recursos para construir', '#ff6b4a');
}

/* ---- comerciar ---- */
export function abrirComerciar(pest) {
  const v = T.v;
  if (!miTurno() || v.fase !== 'accion') return;
  marcarPista('comerciar');
  const est = { da: {}, pide: {}, a: [], banco: { da: null, recibe: null }, pest: pest || 'jugadores' };
  abrirHoja('Comerciar', (c, api) => {
    const tabs = h('div', { cls: 'aj-tabs' }, [['jugadores', 'Con jugadores'], ['banco', 'Banco y puertos']].map(([id, nom]) => h('button', { type: 'button', cls: 'aj-tab' + (est.pest === id ? ' on' : ''), 'data-f': 1, txt: nom, on: { click: () => { est.pest = id; api.rehacer(); } } })));
    c.appendChild(tabs);
    if (est.pest === 'banco') return pestBanco(c, api, est);
    pestJugadores(c, api, est);
  }, { alCerrar: () => {} });
}
function pestJugadores(c, api, est) {
  const v = T.v, tr = v.trato && v.trato.de === v.yo ? v.trato : null;
  if (!v.cfg.trato) { c.appendChild(h('p', { cls: 'nota', txt: 'El comercio entre jugadores está desactivado en esta partida. Usa el banco.' })); return; }
  if (tr) {
    c.appendChild(h('div', { cls: 'aj-sub', txt: 'Tu oferta está abierta' }));
    c.appendChild(h('div', { cls: 'oferta' }, [h('span', { txt: 'Das ' }), chipsRes(tr.da), h('span', { txt: ' y pides ' }), chipsRes(tr.pide)]));
    tr.a.forEach((i) => {
      const r = tr.resp[i], ok = r === 'si', puede = puedePagar({ ...v.mano }, tr.da);
      c.appendChild(h('div', { cls: 'resp-fila', style: '--c:' + colJ(i) }, [h('span', { cls: 'rf-n', txt: nombre(i) }), h('span', { cls: 'rf-e ' + (r || 'esp'), txt: ok ? 'Aceptó' : r === 'no' ? 'Rechazó' : 'Pensando…' }), ok ? btn('Cerrar trato', () => { enviar({ t: 'cerrarTrato', con: i }); api.cerrar(); }, 'peq' + (puede ? '' : ' no')) : null]));
    });
    c.appendChild(btn('Cancelar oferta', () => { enviar({ t: 'cancelarTrato' }); api.cerrar(); }, 'sec'));
    return;
  }
  const valido = () => { const dd = RES.some((r) => est.da[r] > 0), pp = RES.some((r) => est.pide[r] > 0), solap = RES.some((r) => est.da[r] > 0 && est.pide[r] > 0); return dd && pp && !solap; };
  let enviarBtn;
  const act = () => { enviarBtn.disabled = !valido(); aviso2.textContent = RES.some((r) => est.da[r] > 0 && est.pide[r] > 0) ? 'No puedes dar y pedir el mismo recurso.' : ''; };
  const aviso2 = h('p', { cls: 'nota mal', txt: '' });
  c.appendChild(h('div', { cls: 'aj-sub', txt: 'Yo doy' }));
  c.appendChild(h('div', { cls: 'steps' }, RES.map((r) => stepper(est.da, r, v.mano[r], act))));
  c.appendChild(h('div', { cls: 'aj-sub', txt: 'Yo pido' }));
  c.appendChild(h('div', { cls: 'steps' }, RES.map((r) => stepper(est.pide, r, 9, act))));
  c.appendChild(h('div', { cls: 'aj-sub', txt: 'Para' }));
  const dest = h('div', { cls: 'aj-opc', role: 'group' });
  const pintarDest = () => { dest.textContent = ''; [['todos', 'Todos'], ...Array.from({ length: v.n }, (_, i) => [i, nombre(i)]).filter(([i]) => i !== v.yo)].forEach(([k, nom]) => dest.appendChild(h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, txt: nom, 'aria-pressed': String(k === 'todos' ? !est.a.length : est.a[0] === k), on: { click: () => { est.a = k === 'todos' ? [] : [k]; pintarDest(); } } }))); };
  pintarDest(); c.appendChild(dest); c.appendChild(aviso2);
  enviarBtn = btn('Enviar oferta', () => { const r = enviar({ t: 'ofrecer', da: { ...est.da }, pide: { ...est.pide }, a: est.a.length ? est.a.slice() : undefined }); if (!r || r.ok !== false) { api.rehacer(); } }, 'grande');
  enviarBtn.disabled = true; c.appendChild(enviarBtn);
  c.appendChild(h('p', { cls: 'nota', txt: 'Los bots y jugadores responden Aceptar o Rechazar; tú eliges con quién cerrar el trato.' }));
}
function pestBanco(c, api, est) {
  const v = T.v, b = est.banco, puertos = puertosDe(v, v.yo);
  c.appendChild(h('p', { cls: 'nota', txt: 'Tus puertos: ' + (puertos.length ? puertos.map((p) => (p === 'gen' ? 'Genérico 3:1' : NOMBRE_RES[p] + ' 2:1')).join(' · ') : 'ninguno (4:1)') }));
  c.appendChild(h('div', { cls: 'aj-sub', txt: 'Entrego' }));
  const fila1 = h('div', { cls: 'tiles' }), fila2 = h('div', { cls: 'tiles' });
  let go;
  const act = () => {
    fila1.textContent = ''; fila2.textContent = '';
    RES.forEach((r) => { const t = tasaBanco(v, v.yo, r), ok = v.mano[r] >= t; fila1.appendChild(h('button', { type: 'button', cls: 'tile' + (b.da === r ? ' sel' : ''), 'data-f': 1, disabled: ok ? null : true, 'aria-pressed': String(b.da === r), on: { click: () => { b.da = r; if (b.recibe === r) b.recibe = null; act(); } } }, [h('img', { src: iconoURL(r, 48), alt: '', width: 32, height: 32 }), h('b', { txt: t + ':1' }), h('small', { txt: 'tienes ' + v.mano[r] })])); });
    RES.forEach((r) => { const ok = v.banco[r] > 0 && b.da !== r; fila2.appendChild(h('button', { type: 'button', cls: 'tile' + (b.recibe === r ? ' sel' : ''), 'data-f': 1, disabled: ok ? null : true, 'aria-pressed': String(b.recibe === r), on: { click: () => { b.recibe = r; act(); } } }, [h('img', { src: iconoURL(r, 48), alt: '', width: 32, height: 32 }), h('b', { txt: '+1' }), h('small', { txt: 'banco ' + (v.banco[r] > 900 ? '∞' : v.banco[r]) })])); });
    go.disabled = !(b.da && b.recibe);
    go.textContent = b.da && b.recibe ? `Cambiar ${tasaBanco(v, v.yo, b.da)} ${NOMBRE_RES[b.da]} por 1 ${NOMBRE_RES[b.recibe]}` : 'Elige qué entregas y qué recibes';
  };
  go = btn('', () => { enviar({ t: 'banco', da: b.da, recibe: b.recibe }); b.da = b.recibe = null; setTimeout(() => api.rehacer(), 30); }, 'grande');
  c.appendChild(fila1); c.appendChild(h('div', { cls: 'aj-sub', txt: 'Recibo' })); c.appendChild(fila2); c.appendChild(go); act();
}

/* ---- cartas de desarrollo ---- */
export function abrirCartas() {
  const v = T.v; if (!v || v.fin) return;
  abrirHoja('Cartas de desarrollo', (c, api) => {
    const mi = miTurno(), cuenta = {}; v.cm.forEach((k) => { cuenta[k] = (cuenta[k] || 0) + 1; });
    const jug = cartasJugables(v, v.yo);
    if (!v.cm.length) c.appendChild(h('p', { cls: 'nota', txt: 'No tienes cartas. Cómpralas en Construir (algodón + maíz + metal).' }));
    Object.keys(CARTAS).forEach((k) => {
      if (!cuenta[k]) return;
      const puede = mi && !v.cartaJug && jug[k] > 0 && (k === 'guardia' ? ['tirada', 'accion'].includes(v.fase) : v.fase === 'accion') && v.camGratis === 0;
      const nuevas = k === 'pv' ? 0 : cuenta[k] - (jug[k] || 0);
      c.appendChild(h('div', { cls: 'carta-fila' }, [h('img', { src: cartaURL(k, 56), alt: '', width: 44, height: 44 }), h('div', { cls: 'cf' }, [h('b', { txt: `${CARTAS[k].nombre} ×${cuenta[k]}` }), h('small', { txt: CARTAS[k].desc + (nuevas ? ` (${nuevas} nueva${nuevas > 1 ? 's' : ''}: la usas el próximo turno)` : '') })]), k === 'pv' ? h('span', { cls: 'nota', txt: '+' + cuenta[k] + ' PV' }) : btn('Jugar', () => jugarCarta(k, api), 'peq' + (puede ? '' : ' no')) ]));
      if (k !== 'pv' && !puede) c.lastChild.querySelector('.btn').disabled = true;
    });
    if (v.cartaJug) c.appendChild(h('p', { cls: 'nota', txt: 'Ya jugaste una carta este turno.' }));
    if (mi && v.fase === 'accion') c.appendChild(btn(`Comprar carta (${v.mazoN} en el mazo)`, () => { api.cerrar(); enviar({ t: 'comprarCarta' }); }, 'sec' + (v.mazoN > 0 && puedePagar(v.mano, COSTO.carta) ? '' : ' no')));
    c.appendChild(h('p', { cls: 'nota', txt: 'Una carta por turno (las Reliquias no cuentan). La Guardia puede jugarse antes de tirar; las demás, después.' }));
  });
}
function jugarCarta(k, api) {
  if (k === 'guardia' || k === 'rutas') { api.cerrar(); enviar({ t: 'jugarCarta', carta: k }); return; }
  api.cuerpo.textContent = ''; const sel = [];
  const c = api.cuerpo, tit = k === 'cosecha' ? 'Elige 2 recursos del banco' : 'Elige el recurso a acaparar';
  c.appendChild(h('div', { cls: 'aj-sub', txt: tit }));
  const f = h('div', { cls: 'tiles' }); c.appendChild(f);
  const go = btn('Jugar', () => { api.cerrar(); enviar(k === 'cosecha' ? { t: 'jugarCarta', carta: k, r1: sel[0], r2: sel[1] } : { t: 'jugarCarta', carta: k, r: sel[0] }); }, 'grande');
  const pint = () => {
    f.textContent = '';
    RES.forEach((r) => f.appendChild(h('button', { type: 'button', cls: 'tile' + (sel.includes(r) ? ' sel' : ''), 'data-f': 1, on: { click: () => { if (k === 'cosecha') { if (sel.length >= 2) sel.shift(); sel.push(r); } else { sel.length = 0; sel.push(r); } pint(); } } }, [h('img', { src: iconoURL(r, 48), alt: '', width: 32, height: 32 }), h('b', { txt: NOMBRE_RES[r] }), h('small', { txt: sel.filter((x) => x === r).length ? '×' + sel.filter((x) => x === r).length : '' })])));
    go.disabled = k === 'cosecha' ? sel.length < 2 : sel.length < 1;
  };
  c.appendChild(go); pint();
  if (k === 'cosecha') c.appendChild(h('p', { cls: 'nota', txt: 'Toca el mismo recurso dos veces para tomar 2 iguales.' }));
}

/* ---- avisos automaticos: descarte y ofertas recibidas ---- */
function revisarPrompts() {
  const v = T.v;
  if (v.fase === 'descartar' && v.desc[v.yo]) { if (!T.hoja || T.hoja.titulo !== 'Descartar') abrirDescarte(); }
  else if (T.hoja && T.hoja.titulo === 'Descartar') cerrarHoja();
  const tr = v.trato;
  if (tr && tr.de !== v.yo && tr.a.includes(v.yo) && tr.resp[v.yo] == null && v.fase === 'accion') {
    if (!T.hoja || T.hoja.titulo !== 'Oferta de ' + nombre(tr.de) || T.ofertaId !== tr.id) { T.ofertaId = tr.id; abrirOferta(tr); }
  } else if (T.hoja && /^Oferta de /.test(T.hoja.titulo)) cerrarHoja();
  if (T.hoja && ['Construir', 'Comerciar'].includes(T.hoja.titulo) && !miTurno()) cerrarHoja();
  if (T.hoja && T.hoja.titulo === 'Comerciar' && v.trato && v.trato.de === v.yo) T.hoja.rehacer();
  else if (T.hoja && T.hoja.titulo === 'Cartas de desarrollo') T.hoja.rehacer();
  else if (T.hoja && T.hoja.titulo === 'Construir') T.hoja.rehacer();
}
function abrirDescarte() {
  const v = T.v, n = v.desc[v.yo], sel = {};
  abrirHoja('Descartar', (c) => {
    c.appendChild(h('p', { cls: 'nota', txt: `Un 7 y tienes más de 7 cartas: descarta exactamente ${n}.` }));
    const info = h('b', { cls: 'cuenta-desc', txt: `0 / ${n}` });
    const act = () => { const t = RES.reduce((a, r) => a + (sel[r] || 0), 0); info.textContent = `${t} / ${n}`; go.disabled = t !== n; };
    c.appendChild(h('div', { cls: 'steps' }, RES.map((r) => stepper(sel, r, v.mano[r], act))));
    c.appendChild(info);
    const go = btn('Descartar', () => { const r = enviar({ t: 'descartar', r: { ...sel } }); if (r && r.ok === false) return; cerrarHoja(); }, 'grande'); go.disabled = true;
    c.appendChild(go);
    c.appendChild(btn('Elegir automáticamente', () => { const m = { ...v.mano }; const d = {}; for (let i = 0; i < n; i++) { const k = RES.slice().sort((a, b) => m[b] - m[a])[0]; m[k]--; d[k] = (d[k] || 0) + 1; } enviar({ t: 'descartar', r: d }); cerrarHoja(); }, 'sec'));
  }, { alCerrar: () => {} });
  Sonido.fx('descarte');
}
function abrirOferta(tr) {
  abrirHoja('Oferta de ' + nombre(tr.de), (c, api) => {
    const v = T.v, puede = puedePagar(v.mano, tr.pide);
    c.appendChild(h('div', { cls: 'oferta grande', style: '--c:' + colJ(tr.de) }, [h('span', { txt: nombre(tr.de) + ' te da ' }), chipsRes(tr.da), h('span', { txt: ' y te pide ' }), chipsRes(tr.pide)]));
    if (!puede) c.appendChild(h('p', { cls: 'nota mal', txt: 'No tienes lo que te piden.' }));
    const a = btn('Aceptar', () => { api.cerrar(); enviar({ t: 'responder', ok: true, id: tr.id }); aviso('Aceptaste: espera a que cierre el trato', '#6dff6d'); }, 'grande'); a.disabled = !puede;
    c.append(a, btn('Rechazar', () => { api.cerrar(); enviar({ t: 'responder', ok: false, id: tr.id }); }, 'sec'));
  }, { alCerrar: () => {} });
  Sonido.fx('trato');
}

/* ---- probabilidades y registro ---- */
export function verProbabilidades() {
  const v = T.v; if (!v) return;
  abrirHoja('Probabilidades', (c) => {
    c.appendChild(h('h3', { txt: 'Dados' }));
    const tot = v.hist.reduce((a, b) => a + b, 0), max = Math.max(1, ...v.hist, ...Array.from({ length: 11 }, (_, i) => (pips(i + 2) / 36) * Math.max(tot, 1)));
    const g = h('div', { cls: 'histo' });
    for (let s = 2; s <= 12; s++) {
      const esp = (pips(s) / 36) * 100, obs = tot ? (v.hist[s] / tot) * 100 : 0;
      g.appendChild(h('div', { cls: 'hb' + (s === 6 || s === 8 ? ' rojo' : '') }, [h('i', { cls: 'obs', style: `height:${(v.hist[s] / max) * 100}%`, title: `Salió ${v.hist[s]} veces` }), h('i', { cls: 'esp', style: `bottom:${(((pips(s) / 36) * Math.max(tot, 1)) / max) * 100}%` }), h('b', { txt: String(s) }), h('small', { txt: esp.toFixed(0) + '%' }), h('small', { cls: 'o', txt: tot ? String(v.hist[s]) : '' })]));
    }
    c.appendChild(g);
    c.appendChild(h('p', { cls: 'nota', txt: tot ? `${tot} tiradas. Barra = veces que salió; marca = lo esperado. El 7 (16.7%) mueve al bandido.` : 'Aún no hay tiradas. Probabilidad teórica por número; el 7 (16.7%) mueve al bandido.' }));
    c.appendChild(h('h3', { txt: 'Producción esperada por tirada' }));
    const t = h('table', { cls: 'tabla' });
    t.appendChild(h('tr', {}, [h('th', { txt: 'Jugador' }), ...RES.map((r) => h('th', {}, [h('img', { src: iconoURL(r, 28), alt: NOMBRE_RES[r], width: 18, height: 18 })])), h('th', { txt: 'Total' })]));
    for (let i = 0; i < v.n; i++) { const e = expectativa(v, i), sum = RES.reduce((a, r) => a + e[r], 0); t.appendChild(h('tr', { cls: i === v.yo ? 'gana' : '', style: '--c:' + colJ(i) }, [h('td', { txt: nombre(i) }), ...RES.map((r) => h('td', { txt: e[r] ? e[r].toFixed(2) : '·' })), h('td', { txt: sum.toFixed(2) })])); }
    c.appendChild(t);
    c.appendChild(h('p', { cls: 'nota', txt: 'Cartas esperadas por tirada (el bandido bloqueado no cuenta). Úsalo para decidir con quién comerciar y dónde mover al bandido.' }));
    c.appendChild(h('h3', { txt: 'Probabilidad de cada número' }));
    c.appendChild(h('p', { cls: 'nota', txt: '2 y 12: 1/36 · 3 y 11: 2/36 · 4 y 10: 3/36 · 5 y 9: 4/36 · 6 y 8: 5/36 (13.9%).' }));
  });
}
export function verRegistro() {
  abrirHoja('Registro', (c) => {
    if (!T.log.length) c.appendChild(h('p', { cls: 'nota', txt: 'Aún no hay jugadas.' }));
    const l = h('ul', { cls: 'logros registro' });
    T.log.slice(-60).reverse().forEach((x) => l.appendChild(h('li', {}, [h('span', { txt: x })])));
    c.appendChild(l);
  });
}

/* ---------- chat ---------- */
export function alternarChat(b) {
  const p = el.chat, abrir = b == null ? p.hidden : b;
  p.hidden = !abrir; if (!abrir) return;
  p.textContent = '';
  const f = h('div', { cls: 'frases' }, FRASES.map((x, k) => h('button', { type: 'button', cls: 'btn peq sec', 'data-f': 1, txt: x, on: { click: () => { enviar({ t: 'chat', k }); alternarChat(false); } } })));
  const e = h('div', { cls: 'emojis' }, EMOJIS.map((x, k) => h('button', { type: 'button', cls: 'emoji', 'data-f': 1, txt: x, 'aria-label': 'Emoji ' + x, on: { click: () => { enviar({ t: 'chat', k: FRASES.length + k }); alternarChat(false); } } })));
  p.append(e, f); const q = p.querySelector('[data-f]'); if (q) q.focus();
}
export const chatAbierto = () => !!el.chat && !el.chat.hidden;

/* ---------- acciones (teclado, mando, botones) ---------- */
export function accion(n) {
  const v = T.v; if (!v) return false;
  if (n === 'tirar') { if (miTurno() && v.fase === 'tirada') { enviar({ t: 'tirar' }); return true; } return false; }
  if (n === 'terminar') {
    if (!miTurno() || v.fase !== 'accion' || v.camGratis) return false;
    if (v.mano && puedeHacerAlgo(v) && !confirmarTerminar()) return false;
    T.modo = null; enviar({ t: 'terminar' }); return true;
  }
  if (n === 'construir') { if (T.hoja && T.hoja.titulo === 'Construir') { cerrarHoja(); return true; } abrirConstruir(); return true; }
  if (n === 'comerciar') { if (T.hoja && T.hoja.titulo === 'Comerciar') { cerrarHoja(); return true; } abrirComerciar(); return true; }
  if (n === 'cartas') { if (T.hoja && T.hoja.titulo === 'Cartas de desarrollo') { cerrarHoja(); return true; } abrirCartas(); return true; }
  if (n === 'confirmar') { if (T.pend) return confirmar(); if (T.modo && tab.cand) { const i = tab.siguienteCandidato(0, 0), tp = tab.cand.tipo; if (i != null) { tab.enfocar(tp, i); elegir(tp, i); return true; } } return false; }
  if (n === 'zoomMas') { tab.zoomPor(1.3); return true; }
  if (n === 'zoomMenos') { tab.zoomPor(1 / 1.3); return true; }
  if (n === 'centrar') { tab.centrar(); return true; }
  if (n === 'calor') { alternarCalor(); return true; }
  return false;
}
let ultimoConfirmaTerminar = 0;
function confirmarTerminar() { // evita terminar por accidente teniendo jugadas posibles: segundo intento en 3 s confirma
  const ahora = performance.now();
  if (ahora - ultimoConfirmaTerminar < 3000) return true;
  ultimoConfirmaTerminar = ahora; aviso('Aún puedes construir. Pulsa Terminar otra vez para pasar el turno.', '#ffd23d'); return false;
}
export function cancelar() {
  if (T.hoja) { cerrarHoja(); return true; }
  if (chatAbierto()) { alternarChat(false); return true; }
  if (T.pend) { cancelarSel(); return true; }
  if (T.modo && ['poblado', 'ciudad', 'camino'].includes(T.modo.k) && !T.v.camGratis) { T.modo = null; calcularModo(); pintarEstado(); return true; }
  return false;
}
export function moverSeleccion(dx, dy) {
  if (!tab.cand) return false;
  const i = tab.siguienteCandidato(dx, dy);
  if (i == null) return false;
  T.pend = { tipo: tab.cand.tipo, id: i }; tab.setSeleccion(tab.cand.tipo, i); tab.enfocar(tab.cand.tipo, i);
  Sonido.fx('selecciona'); if (pedirConfirmacion() || true) mostrarConfirma();
  return true;
}
export const hayCandidatos = () => !!(tab && tab.cand);

/* ---------- fin de partida ---------- */
function pintarFin() {
  const v = T.v; if (!v || !v.fin) return;
  const f = el.fin; f.hidden = false; f.textContent = '';
  const gan = v.fin.ganador, yoGane = gan === v.yo;
  const orden = Array.from({ length: v.n }, (_, i) => i).sort((a, b) => v.fin.pts[b] - v.fin.pts[a]);
  const t = h('table', { cls: 'tabla' });
  t.appendChild(h('tr', {}, [h('th', { txt: 'Jugador' }), h('th', { txt: 'PV' }), h('th', { txt: 'Detalle' })]));
  orden.forEach((i) => {
    let pob = 0, ciu = 0; v.vj.forEach((j, k) => { if (j === i) { if (v.vc[k] === 2) ciu++; else pob++; } });
    const rel = v.fin.pts[i] - v.pts[i];
    const det = [`${pob} poblado${pob === 1 ? '' : 's'}`, `${ciu} ciudad${ciu === 1 ? '' : 'es'}`, v.largo.j === i ? 'camino largo' : '', v.ejer.j === i ? 'ejército' : '', rel ? `${rel} reliquia${rel > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
    t.appendChild(h('tr', { cls: i === gan ? 'gana' : '', style: '--c:' + colJ(i) }, [h('td', { txt: nombre(i) }), h('td', { txt: String(v.fin.pts[i]) }), h('td', { cls: 'det', txt: det })]));
  });
  const pos = h('p', { cls: 'nota' });
  f.append(h('h2', { txt: yoGane ? '¡Ganaste la partida!' : `${nombre(gan)} ganó la partida` }), h('p', { cls: 'sub', txt: `Meta: ${v.cfg.meta} puntos · ${Math.ceil(v.fin.turnos / v.n)} turnos por jugador` }), t, pos,
    h('div', { cls: 'botones' }, [btn('Revancha', () => T.alFin && T.alFin.revancha(), ''), btn('Ranking', () => T.alFin && T.alFin.ranking(), 'sec'), btn('Menú', () => T.alFin && T.alFin.menu(), 'sec')]));
  if (T.alFin && T.alFin.posicion) T.alFin.posicion(pos);
  const q = f.querySelector('[data-f]') || f.querySelector('button'); if (q && document.body.classList.contains('usando-mando')) q.focus();
}
export function ocultarTodo() { cerrarHoja(); if (el.fin) el.fin.hidden = true; if (el.chat) el.chat.hidden = true; $('#burbujas').textContent = ''; T.v = null; T.pend = null; T.modo = null; T.finMostrado = false; limpiarConfirma(); if (el.tip) el.tip.hidden = true; }
export const lugarDe = () => ({ miTurno });
