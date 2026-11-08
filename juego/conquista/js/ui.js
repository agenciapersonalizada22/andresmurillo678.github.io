// Interfaz de la partida: fichas y chips, reproduccion de eventos con animaciones, hojas de ataque/movimiento, cartas, mision, mundo y fin.
import { h, $ } from './dom.js';
import { TERR, ADY, CONTINENTES, DE_CONT, CONT_DE, N, SIMBOLO } from './mapa.js';
import { probConquista, esConjunto, valorCanje, mejorConjunto as _m, COMODIN, textoObjetivo, metaRapido } from './reglas.js';
import { Mapa } from './mapaui.js';
import { D, reducirMov } from './ajustes.js';
import { Sonido } from './sonido.js';
import { CLAVES, leer, escribir } from './almacen.js';

export const T = {
  v: null, vis: null, cola: [], tocando: false, seq: 0, enviar: null, alEvento: null, alFin: null, cur: -1, sel: null, dest: null, cant: 1, dados: 0, log: [], tutorial: false,
  mias: null, finPend: false, id: null, tipsVistos: {}, hoja: null, ultimaFase: ''
};
let el = {}, nombresTerr = TERR.map((t) => t.nombre), timerAnim = 0, aviso0 = 0, tiempoFin = 0, tiempoTotal = 0;
const NOM_FASE = { colocar: 'Despliegue inicial', refuerzo: 'Refuerzo', ataque: 'Ataque', fortificar: 'Fortificación', fin: 'Fin' };
const SIMB = ['♟', '♞', '♜', '★'];
const NOM_SIMB = ['Infantería', 'Caballería', 'Artillería', 'Comodín'];
const esp = (ms) => (reducirMov() ? Math.min(ms, 60) : ms / D.velAnim);

export const yo = () => (T.v ? T.v.yo : -1);
export const miTurno = () => !!T.v && T.v.turno === T.v.yo && T.v.fase !== 'fin' && T.v.jug[T.v.yo].vivo;
export const nombreJ = (i) => (T.v && T.v.jug[i] ? T.v.jug[i].nombre : '?');
export function aviso(txt, color) {
  const box = el.toasts || $('#toasts'); if (!box) return;
  const n = h('div', { cls: 'aviso', txt, style: color ? '--c:' + color : '' });
  box.appendChild(n); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => n.remove(), 2600);
  const a = $('#aria'); if (a && D.acc.anuncios) a.textContent = txt;
}
const registrar = (txt) => { T.log.push(txt); if (T.log.length > 80) T.log.shift(); };
const col = (i) => Mapa.colorDe(i);
const enviar = (c) => { if (T.enviar) return T.enviar(c); return null; };

/* ---------- arranque ---------- */
export function iniciar() {
  el = { mesa: $('#mesa'), jugadores: $('#jugadores'), estado: $('#estado'), info: $('#infoT'), dados: $('#dados'), hoja: $('#hoja'), fin: $('#finPanel'), tiempo: $('#tiempo'), pista: $('#pista'), toasts: $('#toasts'),
    bFase: $('#bFase'), bCartas: $('#bCartas'), bObjetivo: $('#bObjetivo'), bMundo: $('#bMundo'), bCant: $('#bCant'), bFort: $('#bFort'), modal: $('#modal') };
  Mapa.iniciar($('#mapa'));
  Mapa.alTocar = tocar; Mapa.alHover = (t) => { if (t >= 0) info(t); else if (T.cur < 0) el.info.textContent = ''; };
  new ResizeObserver(() => { Mapa.medir(); Mapa.irA({ k: Mapa.meta.k, tx: Mapa.meta.tx, ty: Mapa.meta.ty }, true); }).observe($('#mapa'));
  $('#bZoomMas').addEventListener('click', () => Mapa.zoom(1.5)); $('#bZoomMenos').addEventListener('click', () => Mapa.zoom(1 / 1.5)); $('#bZoomTodo').addEventListener('click', () => Mapa.ver());
  el.bFase.addEventListener('click', () => accion('fase')); el.bCartas.addEventListener('click', () => accion('cartas')); el.bObjetivo.addEventListener('click', () => accion('objetivo'));
  el.bMundo.addEventListener('click', () => accion('mundo')); el.bCant.addEventListener('click', () => accion('cantidad'));
  const t = leer(CLAVES.tutorial, {}); T.tipsVistos = t.tips || {};
}
export function reiniciar() {
  T.v = null; T.vis = null; T.cola = []; T.tocando = false; T.sel = null; T.dest = null; T.cur = -1; T.log = []; T.finPend = false; T.hoja = null; T.id = null; T.mias = null;
  clearTimeout(timerAnim); el.hoja.hidden = true; el.fin.hidden = true; el.dados.hidden = true; el.pista.hidden = true; el.hoja.textContent = '';
}
export function ocultarTodo() { reiniciar(); }

/* ---------- recepcion de paquetes ---------- */
export function recibir(p) {
  const v = p.v, nuevo = T.id !== v.id;
  if (nuevo) { reiniciar(); T.id = v.id; T.nuevaPartida && T.nuevaPartida(); Mapa.colores = v.jug.map((j) => j.color); }
  Mapa.colores = v.jug.map((j) => j.color);
  T.v = v;
  tiempoTotal = p.tmax || 0; tiempoFin = p.tr ? performance.now() + p.tr : 0;
  const reenvio = nuevo || p.resync || !T.vis;
  if (reenvio) { T.vis = { o: v.o.slice(), e: v.e.slice() }; T.cola = []; T.tocando = false; clearTimeout(timerAnim); if (nuevo) { Mapa.medir(); Mapa.pintar(T.vis, v); Mapa.enfocar(propios(), { ya: true, max: 2.6, min: Mapa.Vh / 545 * 0.97 }); } }
  else if (p.ev && p.ev.length) T.cola.push(...p.ev);
  if (T.finPend && v.fase !== 'fin') T.finPend = false;
  if (reenvio) { refrescarTodo(); if (v.fase === 'fin') mostrarFin(); }
  else if (!T.tocando) siguiente();
  else refrescarHUD();
}
const propios = () => { const r = []; if (T.v) for (let i = 0; i < N; i++) if (T.v.o[i] === T.v.yo) r.push(i); return r; };
function sincronizar() { if (!T.v) return; T.vis = { o: T.v.o.slice(), e: T.v.e.slice() }; }

/* ---------- reproduccion de eventos ---------- */
function siguiente() {
  if (!T.cola.length) { T.tocando = false; sincronizar(); refrescarTodo(); if (T.v.fase === 'fin' && !T.finPend) { T.finPend = true; mostrarFin(); } else cerrarDadosLuego(); return; }
  T.tocando = true;
  const lote = [T.cola.shift()];
  if (lote[0].t === 'bat') while (T.cola.length && T.cola[0].t === 'bat') lote.push(T.cola.shift());
  const ms = lote[0].t === 'bat' ? reproducirBatallas(lote) : reproducir(lote[0]);
  T.alEvento && lote.forEach((e) => T.alEvento(e, T.v));
  Mapa.pintar(T.vis, T.v); chips();
  const f = T.cola.length > 40 ? 0.08 : T.cola.length > 16 ? 0.25 : T.cola.length > 6 ? 0.55 : 1;
  timerAnim = setTimeout(siguiente, esp(ms) * f);
}
function reproducir(e) {
  const vis = T.vis, v = T.v, yoo = v.yo;
  switch (e.t) {
    case 'turno': case 'turnoColocar': {
      const mio = e.j === yoo;
      registrar(`Turno de ${nombreJ(e.j)}` + (e.ronda ? ` (ronda ${e.ronda})` : ''));
      aviso(mio ? 'Es tu turno' : 'Turno de ' + nombreJ(e.j), col(e.j));
      if (mio) { Sonido.fx('turno'); vibrar(0.3, 0.3, 120); T.sel = null; T.dest = null; cerrarHoja(); if (D.autoCamara) Mapa.enfocar(propios(), { max: 2.8, min: Mapa.Vh / 545 * 0.72 }); }
      return 420;
    }
    case 'col': { vis.e[e.a] += e.n; Mapa.flotante(e.a, '+' + e.n, '#fff'); Mapa.pulso(e.a, col(e.j)); Sonido.fx('coloca'); if (e.j !== yoo) Mapa.seguir(e.a); registrar(`${nombreJ(e.j)} coloca ${e.n} en ${nombresTerr[e.a]}`); return e.j === yoo ? 120 : 230; }
    case 'canje': { aviso(`${nombreJ(e.j)} canjea cartas: +${e.valor} ejércitos`, col(e.j)); Sonido.fx('canje'); if (e.bono >= 0) { vis.e[e.bono] += 2; Mapa.flotante(e.bono, '+2', '#ffd23d'); } registrar(`${nombreJ(e.j)} canjea cartas (+${e.valor})`); return 600; }
    case 'carta': if (e.j === yoo) { aviso('Recibes una carta de territorio', '#ffd23d'); Sonido.fx('carta'); } return e.j === yoo ? 400 : 120;
    case 'conq': {
      vis.o[e.h] = e.j; vis.e[e.h] = 0; Mapa.destello(e.h); Mapa.chispas(e.h, col(e.j)); Sonido.fx('conquista');
      if (e.j === yoo) vibrar(0.5, 0.7, 260);
      registrar(`${nombreJ(e.j)} conquista ${nombresTerr[e.h]}`); aviso(`${nombreJ(e.j)} conquista ${nombresTerr[e.h]}`, col(e.j));
      return 520;
    }
    case 'mov': { vis.e[e.d] -= e.n; vis.e[e.h] = e.n; Mapa.flotante(e.h, '+' + e.n, '#fff'); if (e.d != null) Mapa.flecha(e.d, e.h, 300); return 260; }
    case 'fort': { vis.e[e.d] -= e.n; vis.e[e.h] += e.n; Mapa.flecha(e.d, e.h, 500); Mapa.flotante(e.h, '+' + e.n, '#fff'); registrar(`${nombreJ(e.j)} fortifica ${nombresTerr[e.h]} desde ${nombresTerr[e.d]}`); Sonido.fx('coloca'); return 520; }
    case 'elim': { aviso(`${nombreJ(e.j)} fue eliminado por ${nombreJ(e.por)}`, '#ff6b4a'); Sonido.fx('elimina'); if (e.j === yoo) vibrar(0.9, 0.9, 500); registrar(`${nombreJ(e.j)} eliminado por ${nombreJ(e.por)}`); return 900; }
    case 'tiempo': aviso(`Se acabó el tiempo de ${nombreJ(e.j)}`, '#ffd23d'); return 300;
    case 'fin': Sonido.fx(esGanador() ? 'gana' : 'pierde'); return 500;
    default: return 0;
  }
}
function reproducirBatallas(lote) {
  const vis = T.vis, n = lote.length, ms = Math.max(170, Math.min(560, 1500 / n));
  const ult = lote[n - 1], r0 = lote[0];
  let pa = 0, pd = 0;
  lote.forEach((e) => { pa += e.pa; pd += e.pd; vis.e[e.d] -= e.pa; vis.e[e.h] -= e.pd; });
  Mapa.flecha(r0.d, r0.h, ms + 200);
  const bajas = (pd ? `-${pd}` : '') ;
  if (pd) Mapa.flotante(r0.h, '-' + pd, '#ff6b4a'); if (pa) Mapa.flotante(r0.d, '-' + pa, '#ff6b4a', 6);
  mostrarDados(ult, n, pa, pd, ms);
  registrar(`${nombreJ(r0.ja)} ataca ${nombresTerr[r0.h]} desde ${nombresTerr[r0.d]}: -${pa} / -${pd}`);
  const mio = r0.ja === T.v.yo || r0.jd === T.v.yo;
  if (mio) vibrar(0.2, 0.4, 90);
  void bajas;
  return ms + (n > 1 ? 200 : 380);
}
function esGanador() { const v = T.v; if (!v || !v.ganador) return false; return v.cfg.modo === 'equipos' ? v.jug[v.yo].equipo === v.ganador.equipo : v.ganador.j === v.yo; }
function vibrar(a, b, ms) { if (D.vibracion && window.Mando && Mando.conectado) Mando.vibrar(a * D.intensidadVib, b * D.intensidadVib, ms); }

/* ---------- dados ---------- */
const CARAS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
let cerrarDados = 0;
function mostrarDados(e, rondas, pa, pd, ms) {
  clearTimeout(cerrarDados);
  const d = el.dados; d.hidden = false; d.textContent = '';
  const mk = (arr, cls, j) => h('div', { cls: 'dgrupo' }, arr.map((x, i) => h('span', { cls: 'dado ' + cls, 'data-v': x, style: '--c:' + col(j), txt: reducirMov() ? CARAS[x] : CARAS[1 + Math.floor(Math.random() * 6)] })));
  const A = mk(e.ad, 'at', e.ja), B = mk(e.dd, 'df', e.jd);
  const comp = h('div', { cls: 'dcomp' });
  for (let i = 0; i < Math.min(e.ad.length, e.dd.length); i++) comp.appendChild(h('b', { cls: e.ad[i] > e.dd[i] ? 'ok' : 'mal', txt: e.ad[i] > e.dd[i] ? '▶' : '◀' }));
  d.append(h('div', { cls: 'dtit' }, [h('b', { txt: nombresTerr[e.d] }), ' → ', h('b', { txt: nombresTerr[e.h] }), rondas > 1 ? h('small', { txt: ` · ${rondas} rondas` }) : null]), h('div', { cls: 'dfila' }, [A, comp, B]),
    h('div', { cls: 'dres', txt: `Atacante −${pa} · Defensor −${pd}` }));
  Sonido.fx('dados');
  const finales = () => { d.querySelectorAll('.dado').forEach((x) => { x.textContent = CARAS[+x.dataset.v]; x.classList.add('listo'); }); Sonido.fx('golpe'); };
  if (reducirMov()) finales(); else { d.classList.add('rueda'); const t0 = performance.now(), dur = Math.min(ms * 0.6, 420);
    const iv = setInterval(() => { if (performance.now() - t0 > dur) { clearInterval(iv); d.classList.remove('rueda'); finales(); return; } d.querySelectorAll('.dado').forEach((x) => { x.textContent = CARAS[1 + Math.floor(Math.random() * 6)]; }); }, 60); }
}
function cerrarDadosLuego() { clearTimeout(cerrarDados); cerrarDados = setTimeout(() => { el.dados.hidden = true; }, esp(1100)); }

/* ---------- HUD ---------- */
function contar(i) { let t = 0, a = 0; const o = T.vis.o, e = T.vis.e; for (let k = 0; k < N; k++) if (o[k] === i) { t++; a += e[k]; } return [t, a]; }
function chips() {
  const v = T.v; if (!v || !T.vis) return;
  const box = el.jugadores;
  if (box.children.length !== v.n) { box.textContent = ''; for (let i = 0; i < v.n; i++) box.appendChild(h('div', { cls: 'chip' })); }
  box.style.setProperty('--n', v.n);
  v.jug.forEach((p, i) => {
    const c = box.children[i], [t, a] = contar(i);
    const eq = v.cfg.modo === 'equipos' ? ' · Eq ' + ['A', 'B', 'C'][p.equipo] : '';
    const html = `<span class="av" style="--c:${col(i)}"><i>${D.acc.dalto ? i + 1 : ''}</i></span><span class="datos"><b class="nom">${esc(p.nombre)}${i === v.yo ? ' (tú)' : ''}</b><small title="territorios · ejércitos · cartas">${t}T · ${a}E · ${p.nc}C${eq}</small></span>`;
    if (c.dataset.h !== html) { c.innerHTML = html; c.dataset.h = html; }
    c.classList.toggle('turno', v.turno === i && v.fase !== 'fin'); c.classList.toggle('muerto', !p.vivo); c.classList.toggle('ausente', !!p.ausente && p.vivo);
    c.title = p.nombre + (p.tipo === 'bot' ? ' (bot)' : '') + (!p.vivo ? ' · eliminado' : '');
  });
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function refrescarTodo() { if (!T.v) return; Mapa.pintar(T.vis || { o: T.v.o, e: T.v.e }, T.v); chips(); refrescarHUD(); resaltar(); }
function refrescarHUD() {
  const v = T.v; if (!v) return;
  const mio = miTurno(), f = v.fase, yoo = v.yo, me = v.jug[yoo];
  document.body.classList.toggle('mi-turno', mio);
  let txt = '';
  if (f === 'fin') txt = 'Partida terminada';
  else if (!me.vivo) txt = 'Estás eliminado · observas la partida';
  else if (!mio) txt = `Turno de ${nombreJ(v.turno)} · ${NOM_FASE[f]}`;
  else if (v.conq) txt = 'Conquista: elige cuántos ejércitos mover';
  else if (f === 'colocar') txt = `Despliegue: coloca ${v.pool} ejército${v.pool === 1 ? '' : 's'} (reserva ${v.reserva[yoo]})`;
  else if (f === 'refuerzo') txt = me.nc >= 5 && me.cartas ? `Tienes ${me.nc} cartas: debes canjear` : v.pool > 0 ? `Refuerzo: coloca ${v.pool} ejército${v.pool === 1 ? '' : 's'} tocando tus territorios` : 'Refuerzos colocados: pasa al ataque';
  else if (f === 'ataque') txt = v.pool > 0 ? `Coloca ${v.pool} ejércitos del canje` : T.sel != null ? 'Elige un vecino enemigo (resaltado) para atacar' : 'Ataque: toca un territorio tuyo con 2+ ejércitos';
  else if (f === 'fortificar') txt = T.sel != null ? 'Elige el territorio destino (resaltado)' : 'Fortificación opcional: mueve ejércitos o termina el turno';
  el.estado.textContent = txt; el.estado.classList.toggle('mio', mio);
  // botones
  const puede = mio && !v.conq && me.vivo;
  let etq = '', hab = false;
  if (puede && f === 'refuerzo') { etq = 'Atacar →'; hab = v.pool === 0 && me.nc < 5; }
  else if (puede && f === 'ataque') { etq = 'Terminar ataque'; hab = v.pool === 0; }
  else if (puede && f === 'fortificar') { etq = 'Terminar turno'; hab = true; }
  else if (f === 'colocar') { etq = 'Colocando…'; }
  else { etq = 'Esperando…'; }
  el.bFase.textContent = etq; el.bFase.disabled = !hab;
  const colocando = puede && (f === 'colocar' || (f === 'refuerzo' && v.pool > 0) || (f === 'ataque' && v.pool > 0));
  el.bCant.hidden = !colocando; el.bCant.textContent = '×' + (T.cant === 'todo' ? 'Todo' : T.cant);
  const nc = me.cartas ? me.cartas.length : me.nc;
  el.bCartas.textContent = 'Cartas ' + nc; el.bCartas.classList.toggle('alerta', mio && f === 'refuerzo' && puedeCanjear());
  el.bObjetivo.hidden = !(me.obj || (v.cfg.objetivos && me.vivo)); el.bObjetivo.disabled = !me.obj;
  tiempoBarra();
  pistaFase();
  if (puede && v.conq) abrirMover(); else if (T.hoja === 'mover') cerrarHoja();
  if (T.hoja === 'ataque') refrescarAtaque();
}
function tiempoBarra() {
  const t = el.tiempo;
  if (!tiempoTotal || !tiempoFin || !miTurno() && !(T.v && T.v.jug[T.v.turno].tipo === 'humano')) { t.hidden = true; return; }
  t.hidden = false;
}
export function cuadroUI(ahora) {
  if (el.tiempo && !el.tiempo.hidden && tiempoTotal) {
    const r = Math.max(0, tiempoFin - ahora), p = Math.min(1, r / tiempoTotal);
    el.tiempo.firstChild.style.width = p * 100 + '%'; el.tiempo.classList.toggle('urge', r < 8000);
  }
}
const puedeCanjear = () => { const m = T.v && T.v.jug[T.v.yo].cartas; if (!m || m.length < 3) return false; for (let a = 0; a < m.length; a++) for (let b = a + 1; b < m.length; b++) for (let c = b + 1; c < m.length; c++) if (esConjunto([m[a], m[b], m[c]])) return true; return false; };

/* ---------- resaltes y seleccion ---------- */
function resaltar() {
  const v = T.v; if (!v) return;
  const r = { cursor: T.cur >= 0 ? T.cur : null };
  if (miTurno() && !v.conq) {
    if (T.sel != null) {
      r.origen = T.sel;
      if (v.fase === 'ataque') r.destinos = ADY[T.sel].filter((x) => !aliado(v.o[x]));
      else if (v.fase === 'fortificar') r.destinos = alcanzables(T.sel);
      if (T.dest != null) r.destino = T.dest;
    } else if (v.fase === 'ataque' && v.pool === 0) r.opciones = [];
  }
  Mapa.resaltar(r);
}
const aliado = (o) => { const v = T.v; return o === v.yo || (v.cfg.modo === 'equipos' && v.jug[o].equipo === v.jug[v.yo].equipo); };
function alcanzables(d) {
  const v = T.v, vis = new Set([d]), cola = [d];
  while (cola.length) { const x = cola.shift(); for (const y of ADY[x]) if (v.o[y] === v.yo && !vis.has(y)) { vis.add(y); cola.push(y); } }
  vis.delete(d); return [...vis];
}
export function info(t) {
  if (t < 0 || !T.v) return;
  const v = T.v, o = (T.vis || v).o[t], e = (T.vis || v).e[t], c = CONTINENTES[CONT_DE[t]];
  el.info.innerHTML = `<b>${esc(TERR[t].nombre)}</b> · ${c.nombre} · <span style="color:${col(o)}">●</span> ${esc(v.jug[o].nombre)} · ${e} ejército${e === 1 ? '' : 's'}`;
}
export function tocar(t) {
  const v = T.v; if (!v) return;
  if (t < 0) { if (T.sel != null || T.hoja) { T.sel = null; T.dest = null; cerrarHoja(); resaltar(); refrescarHUD(); } return; }
  T.cur = t; info(t);
  if (!miTurno() || v.conq) { resaltar(); return; }
  const f = v.fase, mio = v.o[t] === v.yo;
  if (f === 'colocar' || (f === 'refuerzo' && v.pool > 0) || (f === 'ataque' && v.pool > 0)) {
    if (!mio) { aviso('Coloca los ejércitos en un territorio tuyo', '#ffd23d'); Sonido.fx('error'); return; }
    if (f === 'refuerzo' && v.jug[v.yo].nc >= 5) { aviso('Debes canjear cartas antes de colocar', '#ffd23d'); Sonido.fx('error'); accion('cartas'); return; }
    const n = T.cant === 'todo' ? v.pool : Math.min(T.cant, v.pool);
    enviar({ t: 'colocar', a: t, n }); return;
  }
  if (f === 'refuerzo') { aviso('Pulsa «Atacar →» para pasar a la fase de ataque', '#ffd23d'); return; }
  if (f === 'ataque') {
    if (T.sel == null) { if (mio && v.e[t] >= 2) { T.sel = t; T.dest = null; Sonido.fx('selecciona'); } else if (mio) aviso('Necesitas al menos 2 ejércitos para atacar', '#ffd23d'); }
    else if (t === T.sel) { T.sel = null; cerrarHoja(); }
    else if (mio && v.e[t] >= 2) { T.sel = t; T.dest = null; cerrarHoja(); Sonido.fx('selecciona'); }
    else if (!mio && ADY[T.sel].includes(t) && !aliado(v.o[t])) { T.dest = t; abrirAtaque(T.sel, t); }
    else { T.sel = null; cerrarHoja(); }
  } else if (f === 'fortificar') {
    if (T.sel == null) { if (mio && v.e[t] >= 2 && alcanzables(t).length) { T.sel = t; Sonido.fx('selecciona'); } else if (mio) aviso('Elige un territorio con 2+ ejércitos y camino propio', '#ffd23d'); }
    else if (t === T.sel) T.sel = null;
    else if (mio && alcanzables(T.sel).includes(t)) { T.dest = t; abrirFort(T.sel, t); }
    else if (mio && v.e[t] >= 2) T.sel = t; else T.sel = null;
  }
  resaltar(); refrescarHUD();
}

/* ---------- acciones (botones, teclado y mando) ---------- */
export function accion(a) {
  const v = T.v; if (!v) return;
  switch (a) {
    case 'fase': {
      if (!miTurno() || v.conq) return;
      if (v.fase === 'refuerzo') enviar({ t: 'atacarFase' });
      else if (v.fase === 'ataque') { if (D.confirmarFin && !v.ganoCarta && ataqueFavorable() && !T.confirmado) { T.confirmado = true; aviso('Aún tienes ataques favorables y no ganarás carta. Pulsa de nuevo para terminar.', '#ffd23d'); setTimeout(() => { T.confirmado = false; }, 4000); return; } T.confirmado = false; T.sel = null; cerrarHoja(); enviar({ t: 'finAtaque' }); }
      else if (v.fase === 'fortificar') { T.sel = null; cerrarHoja(); enviar({ t: 'terminar' }); }
      return;
    }
    case 'cartas': return abrirCartas();
    case 'objetivo': return abrirObjetivo();
    case 'mundo': return abrirMundo();
    case 'cantidad': T.cant = T.cant === 1 ? 5 : T.cant === 5 ? 'todo' : 1; refrescarHUD(); return;
    case 'blitz': if (T.hoja === 'ataque' && T.sel != null && T.dest != null) enviar({ t: 'blitz', d: T.sel, h: T.dest, max: 0 }); return;
    default:
  }
}
function ataqueFavorable() {
  const v = T.v;
  for (let d = 0; d < N; d++) if (v.o[d] === v.yo && v.e[d] >= 4) for (const h of ADY[d]) if (!aliado(v.o[h]) && probConquista(v.e[d] - 1, v.e[h]) >= 0.7) return true;
  return false;
}

/* ---------- hojas inferiores ---------- */
export const hojaAbierta = () => !el.hoja.hidden;
export function cerrarHoja() { if (!el.hoja) return; el.hoja.hidden = true; el.hoja.textContent = ''; T.hoja = null; document.body.classList.remove('con-hoja'); }
function abrirHoja(tipo) { T.hoja = tipo; el.hoja.hidden = false; el.hoja.textContent = ''; document.body.classList.add('con-hoja'); return el.hoja; }
const btn = (txt, fn, cls = '') => h('button', { type: 'button', cls: 'btn ' + cls, 'data-f': 1, txt, on: { click: fn } });
function abrirAtaque(d, hh) {
  T.dados = 0; const hoja = abrirHoja('ataque');
  hoja.dataset.d = d; hoja.dataset.h = hh;
  refrescarAtaque(); const b = hoja.querySelector('[data-atacar]'); if (b && document.body.classList.contains('usando-mando')) b.focus();
}
function refrescarAtaque() {
  const v = T.v, hoja = el.hoja; if (T.hoja !== 'ataque') return;
  const d = +hoja.dataset.d, hh = +hoja.dataset.h;
  if (v.o[d] !== v.yo || aliado(v.o[hh]) || v.e[d] < 2 || !miTurno() || v.conq) { cerrarHoja(); if (v.e[d] < 2 || v.o[d] !== v.yo) { T.sel = null; resaltar(); } return; }
  const ad = v.e[d] - 1, de = v.e[hh], p = probConquista(ad, de), maxD = Math.min(3, ad);
  if (T.dados > maxD) T.dados = 0;
  hoja.textContent = '';
  hoja.append(
    h('div', { cls: 'h-cab' }, [h('span', { cls: 'h-j', style: '--c:' + col(v.yo), html: `<b>${esc(TERR[d].nombre)}</b><small>${v.e[d]} ejércitos</small>` }), h('span', { cls: 'h-vs', txt: '⚔' }), h('span', { cls: 'h-j', style: '--c:' + col(v.o[hh]), html: `<b>${esc(TERR[hh].nombre)}</b><small>${de} ejército${de === 1 ? '' : 's'} · ${esc(nombreJ(v.o[hh]))}</small>` })]),
    h('div', { cls: 'h-prob' }, [h('i', { style: `width:${Math.round(p * 100)}%` }), h('span', { txt: `Probabilidad de conquista ${Math.round(p * 100)} %` })]),
    h('div', { cls: 'h-dados' }, [h('span', { txt: 'Dados' }), ...[0, 1, 2, 3].filter((x) => x <= maxD).map((x) => h('button', { type: 'button', cls: 'aj-o', 'data-f': 1, 'aria-pressed': String(T.dados === x), txt: x === 0 ? 'Máx' : String(x), on: { click: () => { T.dados = x; refrescarAtaque(); } } }))]),
    h('div', { cls: 'botones' }, [
      h('button', { type: 'button', cls: 'btn grande', 'data-f': 1, 'data-atacar': 1, txt: 'Atacar', on: { click: () => enviar({ t: 'atacar', d, h: hh, dados: T.dados || maxD }) } }),
      btn('Hasta el final', () => enviar({ t: 'blitz', d, h: hh, max: 0 })), btn('Cancelar', () => { T.sel = null; T.dest = null; cerrarHoja(); resaltar(); refrescarHUD(); }, 'sec')
    ])
  );
}
function abrirMover() {
  const v = T.v, c = v.conq; if (!c) return;
  if (T.hoja === 'mover') return;
  const hoja = abrirHoja('mover'); let n = c.min;
  const out = h('output', { txt: String(n) });
  const rango = h('input', { type: 'range', min: c.min, max: c.max, value: n, 'data-f': 1, on: { input: () => { n = +rango.value; out.textContent = n; } } });
  hoja.append(
    h('div', { cls: 'h-cab' }, [h('span', { cls: 'h-j', style: '--c:' + col(v.yo), html: `<b>${esc(TERR[c.d].nombre)}</b><small>origen</small>` }), h('span', { cls: 'h-vs', txt: '→' }), h('span', { cls: 'h-j', style: '--c:' + col(v.yo), html: `<b>${esc(TERR[c.h].nombre)}</b><small>conquistado</small>` })]),
    h('p', { cls: 'nota', txt: `Mueve entre ${c.min} y ${c.max} ejércitos al nuevo territorio.` }),
    h('div', { cls: 'aj-rango' }, [rango, out]),
    h('div', { cls: 'h-dados' }, [btn('Mínimo', () => { rango.value = c.min; rango.dispatchEvent(new Event('input')); }, 'peq sec'), btn('Mitad', () => { rango.value = Math.round((c.min + c.max) / 2); rango.dispatchEvent(new Event('input')); }, 'peq sec'), btn('Todos', () => { rango.value = c.max; rango.dispatchEvent(new Event('input')); }, 'peq sec')]),
    h('div', { cls: 'botones' }, [btn('Mover', () => { cerrarHoja(); T.sel = null; T.dest = null; enviar({ t: 'mover', n }); }, 'grande')])
  );
  rango.value = c.max > c.min ? Math.round((c.min + c.max) / 2) : c.min; n = +rango.value; out.textContent = n;
  rango.focus();
}
function abrirFort(d, hh) {
  const v = T.v, hoja = abrirHoja('fort'); const max = v.e[d] - 1; let n = max;
  const out = h('output', { txt: String(n) });
  const rango = h('input', { type: 'range', min: 1, max, value: n, 'data-f': 1, on: { input: () => { n = +rango.value; out.textContent = n; } } });
  hoja.append(
    h('div', { cls: 'h-cab' }, [h('span', { cls: 'h-j', style: '--c:' + col(v.yo), html: `<b>${esc(TERR[d].nombre)}</b><small>${v.e[d]} ejércitos</small>` }), h('span', { cls: 'h-vs', txt: '→' }), h('span', { cls: 'h-j', style: '--c:' + col(v.yo), html: `<b>${esc(TERR[hh].nombre)}</b><small>${v.e[hh]} ejércitos</small>` })]),
    h('p', { cls: 'nota', txt: 'Fortificar termina tu turno.' }),
    h('div', { cls: 'aj-rango' }, [rango, out]),
    h('div', { cls: 'botones' }, [btn('Fortificar y terminar', () => { cerrarHoja(); T.sel = null; T.dest = null; enviar({ t: 'fortificar', d, h: hh, n }); }, 'grande'), btn('Cancelar', () => { T.dest = null; cerrarHoja(); resaltar(); }, 'sec')])
  );
}

/* ---------- ventanas modales (cartas, mision, mundo) ---------- */
let ventana = null;
export const ventanaAbierta = () => !!(ventana && ventana.capa.isConnected);
export function cerrarVentana() { if (ventana) { ventana.cerrar(); } }
function abrirVentana(titulo, construir) {
  cerrarVentana();
  const cuerpo = h('div', { cls: 'capa-cuerpo' });
  const capa = h('div', { cls: 'capa ventana', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo }, [h('div', { cls: 'capa-cab' }, [h('h2', { txt: titulo }), h('button', { type: 'button', cls: 'icono', 'data-f': 1, 'data-cerrar': 1, 'aria-label': 'Cerrar', txt: '✕', on: { click: () => cerrar() } })]), cuerpo]);
  $('#app').appendChild(capa);
  const api = { capa, cuerpo, cerrar };
  function cerrar() { if (!capa.isConnected) return; capa.remove(); if (ventana === api) ventana = null; }
  ventana = api; construir(cuerpo, api);
  setTimeout(() => { const f = capa.querySelector('[data-f]:not([data-cerrar])') || capa.querySelector('[data-f]'); if (f) f.focus(); }, 40);
  return api;
}
function miniatura(t, color) {
  const [x0, y0, x1, y1] = TERR[t].bb, w = x1 - x0, hh = y1 - y0, m = 3;
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', `${x0 - m} ${y0 - m} ${w + 2 * m} ${hh + 2 * m}`); s.setAttribute('class', 'mini-t');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', TERR[t].d); p.setAttribute('fill', color); s.appendChild(p); return s;
}
function abrirCartas() {
  const v = T.v; if (!v) return;
  abrirVentana('Cartas de territorio', (c, api) => {
    const me = v.jug[v.yo], mano = me.cartas || [], sel = new Set();
    const puede = miTurno() && !v.conq && (v.fase === 'refuerzo' || (v.fase === 'ataque' && mano.length >= 6));
    const forz = mano.length >= 5;
    const sig = valorCanje(v.canjes);
    c.appendChild(h('p', { cls: 'nota', txt: `Un conjunto son 3 cartas iguales, 3 distintas, o un comodín con 2 cualquiera. Siguiente canje: ${sig} ejércitos${forz ? ' · ¡Debes canjear (5+ cartas)!' : ''}. Si controlas el territorio de una carta canjeada, +2 ejércitos en él.` }));
    const rej = h('div', { cls: 'cartas-rej' });
    const btnC = btn('Canjear conjunto', () => { enviar({ t: 'canjear', cartas: [...sel] }); api.cerrar(); }, 'grande');
    const actualizar = () => { btnC.disabled = !(puede && sel.size === 3 && esConjunto([...sel])); };
    if (!mano.length) c.appendChild(h('p', { cls: 'nota', txt: 'Aún no tienes cartas. Conquista al menos un territorio en tu turno para recibir una.' }));
    mano.forEach((id) => {
      const s = id >= COMODIN ? 3 : SIMBOLO[id], mia = id < COMODIN && v.o[id] === v.yo;
      const tarj = h('button', { type: 'button', cls: 'carta-t s' + s, 'data-f': 1, 'aria-pressed': 'false', on: { click: () => { if (sel.has(id)) sel.delete(id); else if (sel.size < 3) sel.add(id); tarj.setAttribute('aria-pressed', String(sel.has(id))); actualizar(); } } }, [
        h('span', { cls: 'cs', txt: SIMB[s] }), id >= COMODIN ? h('span', { cls: 'cn', txt: 'Comodín' }) : miniatura(id, mia ? col(v.yo) : '#7a7a8c'), h('span', { cls: 'cn', txt: id >= COMODIN ? '' : TERR[id].nombre }), h('small', { txt: NOM_SIMB[s] + (mia ? ' · tuyo (+2)' : '') })
      ]);
      rej.appendChild(tarj);
    });
    c.appendChild(rej);
    if (mano.length >= 3) c.appendChild(btn('Elegir el mejor conjunto', () => { const m = _m({ jug: [{ cartas: mano }], o: v.o }, 0); sel.clear(); (m || []).forEach((x) => sel.add(x)); rej.querySelectorAll('.carta-t').forEach((b, i) => b.setAttribute('aria-pressed', String(sel.has(mano[i])))); actualizar(); }, 'sec'));
    c.appendChild(btnC); actualizar();
    if (!puede && mano.length >= 3) c.appendChild(h('p', { cls: 'nota', txt: 'Solo puedes canjear durante tu fase de refuerzo.' }));
  });
}
let revelado = false;
function abrirObjetivo() {
  const v = T.v; if (!v || !v.jug[v.yo].obj) return;
  abrirVentana('Misión secreta', (c) => {
    const o = v.mia && v.mia.obj, pr = v.mia && v.mia.prog;
    const caja = h('div', { cls: 'mision' + (revelado ? '' : ' oculta') }, [h('p', { cls: 'm-t', txt: textoObjetivo(v, o) }), pr ? h('div', { cls: 'h-prob' }, [h('i', { style: `width:${Math.min(100, Math.round((pr.hecho / pr.meta) * 100))}%` }), h('span', { txt: `Progreso ${pr.hecho} / ${pr.meta}` })]) : null]);
    c.appendChild(h('p', { cls: 'nota', txt: 'Nadie más ve tu misión. Si la cumples en tu turno, ganas aunque queden rivales. Si no hay misión posible, gana quien elimine a todos.' }));
    c.appendChild(caja);
    c.appendChild(btn(revelado ? 'Ocultar' : 'Mostrar misión', () => { revelado = !revelado; caja.classList.toggle('oculta', !revelado); }, 'sec'));
  });
}
function abrirMundo() {
  const v = T.v; if (!v) return;
  abrirVentana('El mundo', (c) => {
    const t = h('table', { cls: 'tabla' }); t.appendChild(h('tr', {}, [h('th', { txt: 'Jugador' }), h('th', { txt: 'Terr.' }), h('th', { txt: 'Ejérc.' }), h('th', { txt: 'Cartas' }), h('th', { txt: 'Refuerzo' })]));
    v.jug.forEach((p, i) => {
      const [tn, an] = contar(i); let ref = Math.max(3, Math.floor(tn / 3)); CONTINENTES.forEach((ct, ci) => { if (DE_CONT[ci].every((x) => v.o[x] === i)) ref += ct.bono; });
      t.appendChild(h('tr', { cls: v.turno === i ? 'gana' : '', style: '--c:' + col(i) }, [h('td', { txt: p.nombre + (p.vivo ? '' : ' ✝') + (v.cfg.modo === 'equipos' ? ' · ' + ['A', 'B', 'C'][p.equipo] : '') }), h('td', { txt: String(tn) }), h('td', { txt: String(an) }), h('td', { txt: String(p.nc) }), h('td', { txt: p.vivo ? '+' + ref : '—' })]));
    });
    c.appendChild(t);
    if (v.cfg.modo === 'rapido') c.appendChild(h('p', { cls: 'nota', txt: `Modo rápido: gana quien controle ${metaRapido(v.n)} de ${N} territorios.` }));
    CONTINENTES.forEach((ct, ci) => {
      const cnt = {}; DE_CONT[ci].forEach((x) => { cnt[v.o[x]] = (cnt[v.o[x]] || 0) + 1; });
      const barra = h('div', { cls: 'cont-barra' }, Object.keys(cnt).map((j) => h('i', { style: `flex:${cnt[j]};background:${col(+j)}`, title: v.jug[j].nombre })));
      c.appendChild(h('div', { cls: 'cont' }, [h('div', { cls: 'cont-t' }, [h('b', { style: 'color:' + ct.color, txt: ct.nombre }), h('small', { txt: ` · bono +${ct.bono} · ${DE_CONT[ci].length} territorios` })]), barra]));
    });
    c.appendChild(h('h3', { txt: 'Registro' }));
    const reg = h('ul', { cls: 'registro' }, T.log.slice(-18).reverse().map((x) => h('li', { txt: x })));
    c.appendChild(reg);
  });
}

/* ---------- fin de partida ---------- */
function mostrarFin() {
  const v = T.v; if (!v || !v.ganador) return;
  cerrarHoja(); cerrarVentana(); T.sel = null; resaltar();
  const f = el.fin; f.hidden = false; f.textContent = '';
  const g = v.ganador, gano = esGanador();
  const motivo = { dominacion: 'dominación total', mision: 'misión secreta cumplida', rapido: `controlar ${metaRapido(v.n)} territorios`, equipo: 'victoria por equipos', limite: 'ventaja al terminar el límite de rondas' }[g.motivo] || '';
  const titulo = v.cfg.modo === 'equipos' ? `Gana el equipo ${['A', 'B', 'C'][g.equipo]}` : `Gana ${v.jug[g.j].nombre}`;
  f.append(h('h2', { txt: gano ? '¡Victoria!' : 'Fin de la partida' }), h('p', { cls: 'nota', txt: `${titulo} por ${motivo}.` }));
  const tb = h('table', { cls: 'tabla' }); tb.appendChild(h('tr', {}, [h('th', { txt: 'Jugador' }), h('th', { txt: 'Terr.' }), h('th', { txt: 'Conq.' }), h('th', { txt: 'Elim.' })]));
  v.jug.forEach((p, i) => { const [tn] = contar(i); tb.appendChild(h('tr', { cls: (v.cfg.modo === 'equipos' ? p.equipo === g.equipo : i === g.j) ? 'gana' : '', style: '--c:' + col(i) }, [h('td', { txt: p.nombre }), h('td', { txt: String(tn) }), h('td', { txt: String(p.st ? p.st.conq : 0) }), h('td', { txt: String(p.st ? p.st.elim : 0) })])); });
  f.appendChild(tb);
  v.jug.forEach((p, i) => { if (p.obj && v.cfg.objetivos) f.appendChild(h('p', { cls: 'nota', txt: `Misión de ${p.nombre}: ${textoObjetivo(v, p.obj)}` })); });
  const slot = h('p', { cls: 'nota', 'aria-live': 'polite' }); f.appendChild(slot);
  if (T.alFin && T.alFin.posicion) T.alFin.posicion(slot);
  f.appendChild(h('div', { cls: 'botones' }, [btn('Revancha', () => { f.hidden = true; T.alFin && T.alFin.revancha(); }, 'grande'), btn('Ranking', () => T.alFin && T.alFin.ranking(), 'sec'), btn('Menú', () => { f.hidden = true; T.alFin && T.alFin.menu(); }, 'sec')]));
  setTimeout(() => { const b = f.querySelector('[data-f]'); if (b) b.focus(); }, 60);
  if (!reducirMov() && D.efectos && gano) for (let i = 0; i < 12; i++) setTimeout(() => Mapa.chispas(Math.floor(Math.random() * N), col(v.yo)), i * 90);
}

/* ---------- pistas y tutorial ---------- */
const PISTAS = {
  colocar: ['Despliegue inicial', 'Cada jugador coloca sus ejércitos iniciales por turnos, de 3 en 3. Toca tus territorios para añadir ejércitos. Usa «×» para cambiar cuántos colocas por toque.'],
  refuerzo: ['Refuerzos', 'Cada turno recibes ejércitos: 1 por cada 3 territorios (mínimo 3), más el bono de cada continente completo y los canjes de cartas. Colócalos tocando tus territorios.'],
  ataque: ['Ataque', 'Toca un territorio tuyo con 2+ ejércitos y luego un vecino enemigo. El atacante tira hasta 3 dados y el defensor hasta 2; se comparan de mayor a menor y los empates los gana el defensor. Conquista al menos un territorio para recibir una carta.'],
  conq: ['Conquista', 'Al conquistar eliges cuántos ejércitos pasan al nuevo territorio (mínimo los dados que usaste).'],
  fortificar: ['Fortificación', 'Al terminar de atacar puedes mover ejércitos entre dos territorios tuyos conectados por un camino propio. Después termina tu turno.']
};
function pistaFase() {
  const v = T.v; if (!v || !miTurno()) { el.pista.hidden = true; return; }
  const k = v.conq ? 'conq' : v.fase;
  if (!PISTAS[k]) { el.pista.hidden = true; return; }
  if (!T.tutorial && T.tipsVistos[k]) { el.pista.hidden = true; return; }
  if (T.tutorial && T.tipsVistos['t_' + k + '_' + T.id]) { el.pista.hidden = true; return; }
  if (T.pistaActual === k && !el.pista.hidden) return;
  T.pistaActual = k;
  const [tit, txt] = PISTAS[k];
  clearTimeout(T.pistaT); T.pistaT = setTimeout(() => { el.pista.hidden = true; T.pistaActual = ''; T.tipsVistos[k] = 1; }, 11000);
  el.pista.hidden = false; el.pista.textContent = '';
  el.pista.append(h('b', { txt: tit }), h('span', { txt }), btn('Entendido', () => { el.pista.hidden = true; if (T.tutorial) T.tipsVistos['t_' + k + '_' + T.id] = 1; else T.tipsVistos[k] = 1; const t = leer(CLAVES.tutorial, {}); t.tips = { ...t.tips }; if (!T.tutorial) t.tips[k] = 1; escribir(CLAVES.tutorial, t); T.pistaActual = ''; }, 'peq'));
}

/* ---------- cursor (teclado y mando) ---------- */
export function moverCursor(dx, dy) {
  if (!T.v) return;
  if (T.cur < 0) { const p = propios(); T.cur = p.length ? p[0] : 0; resaltar(); info(T.cur); return; }
  const A = TERR[T.cur].lab; let mejor = -1, md = 1e9;
  for (const cono of [true, false]) {
    for (let i = 0; i < N; i++) {
      if (i === T.cur) continue;
      const B = TERR[i].lab, x = B[0] - A[0], y = B[1] - A[1], av = dx * x + dy * y, lat = Math.abs(dx ? y : x);
      if (av <= 3 || (cono && av < lat * 0.8)) continue;
      const d = av + lat * 2 - (ADY[T.cur].includes(i) ? 30 : 0);
      if (d < md) { md = d; mejor = i; }
    }
    if (mejor >= 0) break;
  }
  if (mejor >= 0) { T.cur = mejor; Mapa.seguir(mejor); info(mejor); Sonido.fx('click'); resaltar(); }
}
export function confirmarCursor() { if (T.cur < 0) { moverCursor(0, 0); return; } tocar(T.cur); }
export function atras() {
  if (ventanaAbierta()) { cerrarVentana(); return true; }
  if (T.hoja && T.hoja !== 'mover') { T.sel = null; T.dest = null; cerrarHoja(); resaltar(); refrescarHUD(); return true; }
  if (T.sel != null) { T.sel = null; T.dest = null; resaltar(); refrescarHUD(); return true; }
  return false;
}
export function refrescarTema() { if (T.v) refrescarTodo(); }
