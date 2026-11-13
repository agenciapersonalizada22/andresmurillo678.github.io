// Controlador de la partida: entrada (tactil, raton, teclado), temporizador, pistas, resolucion paso a paso, fin de partida y guardado.
import { h, $, limitar } from './dom.js';
import { crearVista } from './vista.js';
import * as PA from './partida.js';
import { A, guardar as guardarAjustes } from './ajustes.js';
import { sonar, vibrar, desbloquear } from './sonido.js';
import { generarAsync } from './generar-cliente.js';
import { NIVELES, variante } from './variantes.js';
import { pasoDePista, aplicarPista, crearResolucion } from './pistas.js';
import { fmtTiempo, fechaLocal } from './formato.js';
import * as PR from './progreso.js';
import { CLAVES, leer, escribir, borrar } from './almacen.js';
import * as CU from './cuenta-sudoku.js';

export const LIMITE_CR = [480, 600, 780, 1080, 1500, 2100]; // contrarreloj: segundos por nivel
export const MARATON = { puzzles: 12, vidas: 3, objetivo: [180, 300, 480, 720, 1200, 1800] };
export const nivelMaraton = (i) => Math.min(5, Math.floor(i / 2));

const S = { p: null, sel: new Set(), foco: -1, num: 0, lapiz: false, multi: false, pista: null, res: null, activo: false, ultimo: 0, guardado: 0, malos: null, ver: 0, alFin: null, hayCapa: () => false, atras: [] };
export const estado = S;
let vista = null, el = {};

export function iniciar(refs, hooks) {
  el = refs; Object.assign(S, hooks);
  vista = crearVista(el.tablero);
  S.num = 0;
  construirTeclado();
  enlazarEntrada();
  setInterval(tic, 250);
  addEventListener('resize', ajustarLayout);
  addEventListener('orientationchange', () => setTimeout(ajustarLayout, 200));
  document.addEventListener('visibilitychange', () => { if (document.hidden) guardarPartida(); });
  addEventListener('pagehide', guardarPartida);
}

/* ---------- layout ---------- */
export function ajustarLayout() {
  if (!S.p || el.juego.hidden) return;
  const z = el.zona, W = z.clientWidth - 16, H = z.clientHeight - 8, ancho = matchMedia('(min-width: 760px) and (min-aspect-ratio: 11/10)').matches;
  let tam;
  if (ancho) tam = Math.min(H - 8, W - Math.min(340, innerWidth * 0.34) - 40);
  else { el.juego.style.setProperty('--tam', Math.max(220, W) + 'px'); tam = Math.min(W, H - el.lateral.offsetHeight - 6); }
  tam = Math.max(220, Math.floor(tam));
  el.juego.style.setProperty('--tam', tam + 'px');
  if (!ancho) { /* el lateral puede cambiar de alto (aviso): recalcula una vez */ const t2 = Math.max(220, Math.floor(Math.min(W, H - el.lateral.offsetHeight - 6))); if (t2 !== tam) el.juego.style.setProperty('--tam', t2 + 'px'); }
  vista.ajustarTam();
}

/* ---------- partida ---------- */
export async function nueva(cfg) {
  desbloquear();
  const vid = cfg.variante, nivel = cfg.nivel;
  let puzzle = cfg.puzzle;
  if (!puzzle) {
    S.cargando(true, cfg.textoCarga);
    try { puzzle = await generarAsync({ variante: vid, nivel, semilla: cfg.semilla }); }
    catch (e) { S.cargando(false); S.toast('No se pudo generar el puzzle. Inténtalo de nuevo.'); return false; }
    S.cargando(false);
  }
  const vidas = cfg.modo === 'sinerrores' ? 3 : cfg.modo === 'maraton' ? (cfg.meta && cfg.meta.vidas != null ? cfg.meta.vidas : MARATON.vidas) : 0;
  const p = PA.nuevaPartida(puzzle, { modo: cfg.modo, vidas, meta: cfg.meta || {} });
  if (cfg.modo === 'maraton') p.vidasIni = MARATON.vidas;
  if (cfg.modo === 'contrarreloj') p.meta = Object.assign({ limite: LIMITE_CR[Math.min(puzzle.nivelPedido != null ? puzzle.nivelPedido : puzzle.nivel, 5)] }, p.meta);
  if (cfg.modo === 'pegado') p.meta = Object.assign({ pegado: true }, p.meta);
  if (A.controles.autocomprobar) p.autocheck = true;
  montar(p);
  return true;
}
export function continuar() {
  const o = leer(CLAVES.partida);
  const p = o && PA.restaurar(o);
  if (!p) { borrar(CLAVES.partida); return false; }
  montar(p);
  return true;
}
export const hayPartidaGuardada = () => { const o = leer(CLAVES.partida); return !!(o && o.puzzle && o.valores); };
export function resumenGuardada() {
  const o = leer(CLAVES.partida); if (!o || !o.puzzle) return null;
  return { variante: variante(o.puzzle.v).corto, nivel: NIVELES[Math.min(o.puzzle.nivelPedido != null ? o.puzzle.nivelPedido : o.puzzle.nivel, 5)].nombre, modo: o.modo, t: o.t };
}

function montar(p) {
  S.p = p; S.sel = new Set(); S.foco = -1; S.pista = null; S.res = null; S.malos = null; S.lapiz = false; S.multi = false;
  construirTeclado();
  el.menu.hidden = true; el.juego.hidden = false; document.body.classList.remove('en-menu');
  vista.montar(p);
  ajustarLayout(); setTimeout(ajustarLayout, 60); setTimeout(ajustarLayout, 400);
  const prim = [...p.v].findIndex((x) => x === 0);
  seleccionar(prim >= 0 ? prim : 0);
  S.activo = true; S.ultimo = performance.now(); S.guardado = performance.now();
  pintarInfo(); pintar(); pintarAcciones(); guardarPartida();
  el.tablero.focus({ preventScroll: true });
}
export function salirAlMenu() {
  guardarPartida(); S.activo = false; S.p = null;
  el.juego.hidden = true; el.menu.hidden = false; document.body.classList.add('en-menu');
  S.alMenu();
}
export function guardarPartida() {
  const p = S.p;
  if (!p || p.fin) { if (!p || p.fin) borrar(CLAVES.partida); return; }
  escribir(CLAVES.partida, PA.serializar(p));
  S.guardado = performance.now();
}
export const descartarPartida = () => { borrar(CLAVES.partida); };

/* ---------- tiempo ---------- */
function tic() {
  const p = S.p, ahora = performance.now();
  if (!p || p.fin || !S.activo) { S.ultimo = ahora; return; }
  const dt = ahora - S.ultimo; S.ultimo = ahora;
  if (document.hidden || S.hayCapa() || S.res) return;
  p.t += Math.min(dt, 1000);
  pintarTiempo();
  if (p.modo === 'contrarreloj' && p.t / 1000 >= p.meta.limite) { terminar(false, 'tiempo'); return; }
  if (ahora - S.guardado > 5000) guardarPartida();
}
export const segundos = () => (S.p ? S.p.t / 1000 : 0);
function pintarTiempo() {
  const p = S.p; if (!p) return;
  const e = el.iTiempo;
  if (!A.graficos.mostrarTiempo && p.modo !== 'contrarreloj') { e.textContent = '··:··'; return; }
  if (p.modo === 'contrarreloj') { const r = Math.max(0, p.meta.limite - p.t / 1000); e.textContent = fmtTiempo(r); e.classList.toggle('urgente', r < 60); }
  else { e.textContent = fmtTiempo(p.t / 1000); e.classList.remove('urgente'); }
}
const NOMBRE_MODO = { libre: 'Partida libre', diario: 'Reto diario', semanal: 'Desafío semanal', contrarreloj: 'Contrarreloj', sinerrores: 'Sin errores', maraton: 'Maratón', pegado: 'Puzzle pegado' };
export const nombreModo = (m) => NOMBRE_MODO[m] || m;
export function pintarInfo() {
  const p = S.p; if (!p) return;
  const pz = p.puzzle, lv = NIVELES[Math.min(pz.nivelPedido != null ? pz.nivelPedido : pz.nivel, 5)].nombre;
  el.iModo.textContent = nombreModo(p.modo) + (p.modo === 'maraton' ? ` ${(p.meta.idx || 0) + 1}/${MARATON.puzzles}` : '');
  el.iNivel.textContent = variante(pz.v).corto + ' · ' + lv + (pz.pistas ? ' · ' + pz.pistas + ' pistas' : '') + (p.modo === 'maraton' ? ' · ' + (p.meta.pts || 0) + ' pts' : '');
  el.iVidas.hidden = !(p.vidasIni > 0);
  if (p.vidasIni > 0) el.iVidas.textContent = '♥'.repeat(p.vidas) + '♡'.repeat(Math.max(0, p.vidasIni - p.vidas));
  el.iErr.hidden = !(A.graficos.mostrarErrores && p.vidasIni === 0 && p.errores > 0 && (p.autocheck));
  el.iErr.textContent = '✖ ' + p.errores;
  pintarTiempo();
}

/* ---------- pintado ---------- */
export function pintar() {
  const p = S.p; if (!p) return;
  const r = S.res, G = A.graficos;
  const est = { sel: S.sel, foco: S.foco, num: S.num && !r ? S.num : 0, conf: r ? new Set() : PA.conflictos(p), malos: null, resaltar: { iguales: G.resaltarIguales, unidades: G.resaltarUnidades, conflictos: G.resaltarConflictos } };
  if (r) {
    const a = r.actual, sim = { v: a.v, notas: a.v.map(() => 0), dados: p.dados };
    const n = new Uint16Array(p.N); for (let i = 0; i < p.N; i++) n[i] = a.v[i] ? 0 : a.c[i];
    sim.notas = n; est.p = sim; est.sel = new Set(); est.foco = -1;
    if (a.paso) {
      est.pc = new Set(a.paso.celdas || []); est.pa = new Set(a.paso.area || []);
      est.elim = new Map(); (a.paso.eli || []).forEach((x) => est.elim.set(x.i, x.m));
      est.num = 0;
    }
    // las eliminaciones ya aplicadas en esta instantanea se muestran como tachadas sobre el estado previo
    if (a.paso && a.previo) { const n2 = new Uint16Array(p.N); for (let i = 0; i < p.N; i++) n2[i] = a.v[i] ? 0 : a.previo.c[i]; sim.notas = n2; est.fantasma = new Map((a.paso.col || []).map((x) => [x.i, x.d])); sim.v = a.previo.v; }
  } else {
    if (p.autocheck) est.malos = new Set(PA.incorrectas(p));
    if (S.malos) { est.malos = est.malos || new Set(); S.malos.forEach((i) => est.malos.add(i)); }
    if (S.pista) {
      const q = S.pista.paso;
      est.pa = new Set(q.area || []); est.pc = new Set(S.pista.nivel >= 1 ? q.celdas || [] : []);
      if (S.pista.nivel >= 2) { est.elim = new Map(); (q.eli || []).forEach((x) => est.elim.set(x.i, x.m)); est.fantasma = new Map((q.col || []).map((x) => [x.i, x.d])); }
    }
  }
  vista.pintar(est);
  pintarTeclado();
}
function pintarAcciones() {
  const p = S.p; if (!p) return;
  const b = (id) => el.acciones.querySelector('[data-a="' + id + '"]');
  b('lapiz').setAttribute('aria-pressed', String(S.lapiz));
  b('multi').setAttribute('aria-pressed', String(S.multi));
  b('deshacer').disabled = !p.hist.length || !!S.res; b('rehacer').disabled = !p.fut.length || !!S.res;
}

/* ---------- teclado numerico ---------- */
function construirTeclado() {
  const p = S.p, n = p ? p.n : 9;
  el.teclado.textContent = ''; el.teclado.style.setProperty('--nt', n); el.teclado.style.setProperty('--ncol', n === 4 ? 2 : 3);
  for (let d = 1; d <= n; d++) {
    const b = h('button', { type: 'button', cls: 'tec', 'data-d': d, 'data-f': 1, 'aria-label': 'Número ' + d, 'aria-pressed': 'false' }, [String(d), h('small', { txt: String(n) })]);
    b.addEventListener('click', () => pulsarNumero(d));
    el.teclado.appendChild(b);
  }
  if (!el.acciones.children.length) {
    const defs = [['lapiz', '✎', 'Lápiz'], ['borrar', '⌫', 'Borrar'], ['deshacer', '↶', 'Deshacer'], ['rehacer', '↷', 'Rehacer'], ['pista', '💡', 'Pista'], ['multi', '▦', 'Varias']];
    defs.forEach(([id, ic, tx]) => el.acciones.appendChild(h('button', { type: 'button', cls: 'acc', 'data-a': id, 'data-f': 1, 'aria-label': tx, 'aria-pressed': id === 'lapiz' || id === 'multi' ? 'false' : null, on: { click: () => accion(id) } }, [h('b', { txt: ic }), tx])));
  }
}
function pintarTeclado() {
  const p = S.p; if (!p) return;
  for (const b of el.teclado.children) {
    const d = +b.dataset.d, r = PA.restantes(p, d);
    b.lastChild.textContent = String(Math.max(0, r)); b.disabled = r <= 0 || !!S.res;
    b.setAttribute('aria-pressed', String(S.num === d));
  }
}
export function pulsarNumero(d) {
  const p = S.p; if (!p || p.fin || S.res) return;
  if (A.controles.entrada === 'numero') {
    S.num = S.num === d && !S.lapizTemp ? 0 : d;
    S.pista = null; ocultarAviso();
    if (S.num && S.sel.size > 1) aplicarNumero(d);
    pintar(); return;
  }
  aplicarNumero(d);
}
export function aplicarNumero(d) {
  const p = S.p; if (!p || p.fin || S.res) return;
  const objetivos = (S.sel.size ? [...S.sel] : S.foco >= 0 ? [S.foco] : []).filter((i) => !PA.esDado(p, i));
  if (!objetivos.length) { if (S.sel.size) { vibrar(15); S.toast('Esa celda es una pista inicial.'); } return; }
  S.pista = null; ocultarAviso(); S.malos = null;
  let error = false, cambio = false;
  if (S.lapiz) {
    const vacias = objetivos.filter((i) => p.v[i] === 0);
    if (!vacias.length) return;
    const todos = vacias.every((i) => p.notas[i] & PA.bit(d));
    PA.snap(p); vacias.forEach((i) => PA.fijarNota(p, i, d, !todos)); cambio = true; sonar('nota');
  } else {
    PA.snap(p);
    for (const i of objetivos) {
      const r = PA.poner(p, i, d, { autoquitar: A.controles.autoquitarNotas, sinSnap: true });
      if (r.cambio) cambio = true; if (r.error) error = true;
    }
    if (!cambio) p.hist.pop();
    else if (error && (p.autocheck || p.vidasIni > 0)) { sonar('error'); vibrar(60); } else sonar(objetivos.length && p.v[objetivos[0]] ? 'poner' : 'borrar');
  }
  cambioTablero(error);
}
export function borrarSel() {
  const p = S.p; if (!p || p.fin || S.res) return;
  const objetivos = (S.sel.size ? [...S.sel] : S.foco >= 0 ? [S.foco] : []).filter((i) => !PA.esDado(p, i) && (p.v[i] || p.notas[i]));
  if (!objetivos.length) return;
  S.pista = null; ocultarAviso(); S.malos = null;
  PA.snap(p); objetivos.forEach((i) => PA.borrar(p, i, { sinSnap: true }));
  sonar('borrar'); cambioTablero(false);
}
function cambioTablero(error) {
  const p = S.p;
  pintarInfo(); pintar(); pintarAcciones();
  clearTimeout(S.gt); S.gt = setTimeout(guardarPartida, 400);
  if (p.vidasIni > 0 && p.vidas <= 0) { terminar(false, 'vidas'); return; }
  if (PA.completo(p)) {
    if (PA.resuelta(p)) terminar(true);
    else if (!p.autocheck) { S.toast('El tablero está lleno, pero hay errores. Revisa los números en conflicto.'); }
  }
}
export function accion(id) {
  const p = S.p; if (!p) return;
  if (id === 'lapiz') { S.lapiz = !S.lapiz; pintarAcciones(); }
  else if (id === 'multi') { S.multi = !S.multi; pintarAcciones(); S.toast(S.multi ? 'Toca varias celdas para seleccionarlas.' : 'Selección múltiple desactivada.'); }
  else if (id === 'borrar') borrarSel();
  else if (id === 'deshacer') { if (PA.deshacer(p)) { S.pista = null; ocultarAviso(); sonar('borrar'); cambioTablero(false); } }
  else if (id === 'rehacer') { if (PA.rehacer(p)) { S.pista = null; ocultarAviso(); sonar('poner'); cambioTablero(false); } }
  else if (id === 'pista') pedirPista();
  else if (id === 'autonotas') { if (S.res || p.fin) return; PA.autonotas(p); S.pista = null; ocultarAviso(); sonar('nota'); cambioTablero(false); S.toast('Notas rellenadas con los candidatos posibles.'); }
  else if (id === 'verificar') verificar();
}
export function verificar() {
  const p = S.p; if (!p || p.fin || S.res) return;
  const mal = PA.incorrectas(p); p.verificaciones++;
  if (!mal.length) { S.toast(PA.completo(p) ? 'Todo correcto.' : 'Todo lo escrito hasta ahora es correcto.'); sonar('unidad'); }
  else { S.malos = new Set(mal); S.toast(`Hay ${mal.length} celda${mal.length > 1 ? 's' : ''} incorrecta${mal.length > 1 ? 's' : ''}.`); sonar('error'); vibrar(40); setTimeout(() => { S.malos = null; pintar(); }, 4000); }
  pintar();
}

/* ---------- seleccion ---------- */
export function seleccionar(i, { add = false, extender = false } = {}) {
  const p = S.p; if (!p || i < 0 || i >= p.N) return;
  if (extender || add) { if (add && S.sel.has(i) && S.sel.size > 1) S.sel.delete(i); else S.sel.add(i); }
  else S.sel = new Set([i]);
  S.foco = i;
  pintar();
}
export function mover(dx, dy, extender = false) {
  const p = S.p; if (!p) return;
  const n = p.n; let i = S.foco < 0 ? 0 : S.foco;
  const r = limitar(Math.floor(i / n) + dy, 0, n - 1), c = limitar((i % n) + dx, 0, n - 1);
  seleccionar(r * n + c, { extender }); sonar('seleccion');
}
export function seleccionarIguales() { const p = S.p; if (!p || S.foco < 0 || !p.v[S.foco]) return; const d = p.v[S.foco]; S.sel = new Set(); for (let i = 0; i < p.N; i++) if (p.v[i] === d) S.sel.add(i); pintar(); }

function enlazarEntrada() {
  const t = el.tablero;
  let arrastre = false, inicioNum = false;
  t.addEventListener('pointerdown', (e) => {
    if (!S.p || S.res) { return; }
    desbloquear();
    const i = vista.celdaEn(e.clientX, e.clientY); if (i < 0) return;
    e.preventDefault();
    arrastre = true; t.setPointerCapture && t.setPointerCapture(e.pointerId);
    if (A.controles.entrada === 'numero' && S.num) { inicioNum = true; S.sel = new Set([i]); S.foco = i; aplicarNumero(S.num); return; }
    inicioNum = false;
    const multi = e.ctrlKey || e.metaKey || e.shiftKey || S.multi;
    if (multi) seleccionar(i, { add: true }); else seleccionar(i);
    sonar('seleccion');
  });
  t.addEventListener('pointermove', (e) => {
    if (!arrastre || !S.p) return;
    const i = vista.celdaEn(e.clientX, e.clientY); if (i < 0 || i === S.foco) return;
    if (inicioNum) { S.sel = new Set([i]); S.foco = i; if (S.num && !S.p.dados[i]) aplicarNumero(S.num); return; }
    seleccionar(i, { extender: true });
  });
  const fin = () => { arrastre = false; };
  t.addEventListener('pointerup', fin); t.addEventListener('pointercancel', fin);
  t.addEventListener('dblclick', () => seleccionarIguales());
  document.addEventListener('keydown', teclas);
}
function teclas(e) {
  if (S.hayCapa() || !S.p || el.juego.hidden || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) return;
  const p = S.p, k = e.key;
  if (S.res) { if (k === 'ArrowRight' || k === ' ' || k === 'Enter') { e.preventDefault(); pasoRes(1); } else if (k === 'ArrowLeft') pasoRes(-1); else if (k === 'Escape') cerrarRes(); return; }
  if (/^[1-9]$/.test(k) && +k <= p.n) { e.preventDefault(); if (e.shiftKey) { const l = S.lapiz; S.lapiz = true; aplicarNumero(+k); S.lapiz = l; } else pulsarNumero(+k); return; }
  if (e.code && /^Digit[1-9]$/.test(e.code) && e.shiftKey && +e.code.slice(5) <= p.n) { e.preventDefault(); const l = S.lapiz; S.lapiz = true; aplicarNumero(+e.code.slice(5)); S.lapiz = l; return; }
  const mv = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[k];
  if (mv && !e.ctrlKey) { e.preventDefault(); mover(mv[0], mv[1], e.shiftKey); return; }
  if (k === 'Backspace' || k === 'Delete' || k === '0') { e.preventDefault(); borrarSel(); }
  else if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { e.preventDefault(); accion(e.shiftKey ? 'rehacer' : 'deshacer'); }
  else if ((e.ctrlKey || e.metaKey) && (k === 'y' || k === 'Y')) { e.preventDefault(); accion('rehacer'); }
  else if (k === 'n' || k === 'N') accion('lapiz');
  else if (k === 'h' || k === 'H') accion('pista');
  else if (k === 'Escape' || k === 'p' || k === 'P') S.menuPausa();
  else if (k === 'Tab') { e.preventDefault(); const q = [...p.v].map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0); if (q.length) { const sig = q.find((i) => i > S.foco) ?? q[0]; seleccionar(sig); } }
}

/* ---------- pistas ---------- */
function ocultarAviso() { el.aviso.hidden = true; el.aviso.textContent = ''; setTimeout(ajustarLayout, 0); }
function mostrarAviso(nodos) { el.aviso.textContent = ''; nodos.forEach((x) => el.aviso.appendChild(x)); el.aviso.hidden = false; setTimeout(ajustarLayout, 0); }
export function pedirPista() {
  const p = S.p; if (!p || p.fin || S.res) return;
  if (!S.pista) {
    const paso = pasoDePista(p);
    if (!paso) { S.toast('El tablero ya está resuelto.'); return; }
    S.pista = { paso, nivel: 0 }; p.pistas++; S.pistaUsada = true;
    sonar('pista');
  } else if (S.pista.nivel < 2) S.pista.nivel++;
  else { aplicarLaPista(); return; }
  pintarPista(); pintar();
}
function pintarPista() {
  const q = S.pista.paso, n = S.pista.nivel;
  const txt = n === 0 ? q.pista1 : n === 1 ? q.pista2 : q.texto;
  const nodos = [h('p', {}, [h('b', { txt: q.titulo + ' · ' }), txt])];
  const fila = h('div', { cls: 'fila' });
  if (n < 2) fila.appendChild(h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: n === 0 ? 'Más ayuda' : 'Explícamelo', on: { click: pedirPista } }));
  else fila.appendChild(h('button', { type: 'button', cls: 'btn peq prim', 'data-f': 1, txt: q.borrar ? 'Borrar ese número' : q.col ? 'Aplicar jugada' : 'Aplicar y limpiar candidatos', on: { click: aplicarLaPista } }));
  fila.appendChild(h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: 'Cerrar', on: { click: () => { S.pista = null; ocultarAviso(); pintar(); } } }));
  nodos.push(fila); mostrarAviso(nodos);
}
function aplicarLaPista() {
  const p = S.p, paso = S.pista.paso;
  aplicarPista(p, paso, { autoquitar: A.controles.autoquitarNotas });
  S.pista = null; ocultarAviso(); sonar('poner');
  cambioTablero(false);
}

/* ---------- resolucion paso a paso ---------- */
export function abrirResolucion() {
  const p = S.p; if (!p) return;
  p.resolvio = true; S.pista = null; ocultarAviso(); S.malos = null;
  S.res = crearResolucion(p); S.res.siguiente(); S.res.anterior();
  S.sel = new Set(); S.foco = -1;
  pintarResolucion(); pintar(); guardarPartida();
  if (PR.logroManual('aprendiz')) { S.logros(['aprendiz']); }
}
export function pasoRes(d) {
  if (!S.res) return false;
  const r = d > 0 ? S.res.siguiente() : S.res.anterior();
  pintarResolucion(); pintar();
  return !!r;
}
export function cerrarRes() { S.res = null; ocultarAviso(); pintar(); pintarAcciones(); }
function pintarResolucion() {
  const r = S.res; if (!r) return;
  pintarAcciones();
  const a = r.actual, fin = r.listo && r.pos === r.hist.length - 1;
  const texto = a.paso ? [h('b', { txt: `Paso ${r.pos} · ${a.paso.titulo}: ` }), a.paso.texto] : [fin ? 'Resuelto.' : 'Pulsa «Siguiente» para ver el primer paso lógico.'];
  const nodos = [h('p', {}, texto)];
  if (fin && r.pos > 0) nodos[0].appendChild(h('b', { cls: 'ok-txt', txt: ' ¡Tablero resuelto!' }));
  nodos.push(h('div', { cls: 'fila' }, [
    h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: '◀ Anterior', disabled: r.pos === 0 ? '' : null, on: { click: () => pasoRes(-1) } }),
    h('button', { type: 'button', cls: 'btn peq prim', 'data-f': 1, txt: 'Siguiente ▶', disabled: fin ? '' : null, on: { click: () => pasoRes(1) } }),
    h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: S.auto ? 'Detener' : 'Auto ▶▶', on: { click: autoRes } }),
    h('button', { type: 'button', cls: 'btn peq', 'data-f': 1, txt: 'Volver a mi tablero', on: { click: () => { S.auto = false; clearInterval(S.autoT); cerrarRes(); } } })
  ]));
  mostrarAviso(nodos);
}
function autoRes() {
  if (S.auto) { S.auto = false; clearInterval(S.autoT); pintarResolucion(); return; }
  S.auto = true; S.autoT = setInterval(() => { if (!S.res || !pasoRes(1)) { S.auto = false; clearInterval(S.autoT); if (S.res) pintarResolucion(); } }, 1400);
  pintarResolucion();
}

/* ---------- fin de partida ---------- */
export function terminar(gano, motivo) {
  const p = S.p; if (!p || p.fin) return;
  p.fin = { gano, motivo };
  S.activo = false; S.res = null; S.pista = null; ocultarAviso();
  borrar(CLAVES.partida);
  const pz = p.puzzle, nivel = Math.min(pz.nivelPedido != null ? pz.nivelPedido : pz.nivel, 5);
  const nivelReal = pz.nivel, t = p.t / 1000, ayudado = PA.ayudado(p);
  const res = { gano, motivo, modo: p.modo, variante: pz.v, nivel, nivelReal, tiempo: t, errores: p.errores, pistas: p.pistas, ayudado, meta: p.meta, nuevos: [], pun: [], mejoro: false, xp: 0, sinPerderVidas: p.vidasIni > 0 && p.vidas === p.vidasIni };
  if (gano) { sonar('victoria'); vibrar(120); celebrar(); } else { sonar('derrota'); vibrar(150); }
  if (p.modo === 'contrarreloj' && gano) { const resto = Math.max(0, p.meta.limite - t); res.puntos = Math.round((nivel + 1) * 1000 + resto * 2 - p.errores * 100 - p.pistas * 300); res.puntos = Math.max(100, res.puntos); }
  if (p.modo === 'maraton') {
    const m = p.meta; res.maraton = { idx: m.idx || 0, pts: m.pts || 0, vidas: p.vidas };
    if (gano) { const pts = (nivel + 1) * 100 + Math.max(0, Math.round((MARATON.objetivo[nivel] - t) / 10)) - p.pistas * 40; res.maraton.ganados = Math.max(20, pts); res.maraton.pts += res.maraton.ganados; res.maraton.hechos = (m.idx || 0) + 1; }
    else res.maraton.hechos = m.idx || 0;
    res.maraton.fin = !gano || res.maraton.hechos >= MARATON.puzzles;
  }
  if (p.modo !== 'maraton') {
    const r = PR.registrar({ variante: pz.v, nivel: nivel, modo: p.modo, tiempo: t, errores: p.errores, pistas: p.pistas, ayudado, gano, fecha: p.meta.fecha, semanal: p.meta.semanal, puntos: res.puntos, sinPerderVidas: res.sinPerderVidas, pegado: !!p.meta.pegado });
    Object.assign(res, { nuevos: r.nuevos, pun: r.pun, mejoro: r.mejoro, xp: r.xp });
  } else if (res.maraton.fin) {
    const r = PR.registrarMaraton(res.maraton.hechos, res.maraton.pts); res.nuevos = r.nuevos; res.pun = r.pun;
  }
  S.enviarCuenta(res);
  pintarInfo(); pintar(); pintarAcciones();
  setTimeout(() => S.alFin(res), gano ? 700 : 200);
}
function celebrar() {
  if (document.body.classList.contains('sin-mov')) return;
  const n = S.p.N;
  for (let i = 0; i < n; i++) { const c = vista.celda(i); if (!c) continue; c.style.setProperty('--k', String(Math.floor(i / S.p.n) + (i % S.p.n))); c.classList.add('celebra'); setTimeout(() => c.classList.remove('celebra'), 1400); }
}
export const aSegundosTexto = fmtTiempo;
export { fechaLocal };
