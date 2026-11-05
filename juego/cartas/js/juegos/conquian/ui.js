// Interfaz del Conquian: mano en bandeja con seleccion multiple, combinaciones en el tapete (clic o arrastre para añadir), ayuda de jugadas.
import { h, aviso } from '../../ui/dom.js';
import { elementoCarta } from '../../marco/dibujo.js';
import { parse, nombreCarta } from '../../marco/barajas.js';
import { perfil, analizar, sinCartas, puedeAgregarA, COMODIN } from './melds.js';
import { sugerencia } from './bot.js';

let selCods = [], sug = null, sugK = '', ultimoArrastre = 0, instalado = false;
const refrescar = () => { const S = window.__cartas && window.__cartas.Sesion; if (S && S.vm && S.alVista) S.alVista(S.vm); };
const enviar = (a) => { const c = window.__cartas; if (c && c.accion) c.accion(a); };
const nombre = (vm, i) => (vm.asientos[i] && vm.asientos[i].nombre) || 'Jugador';
const ORD_PALO = { o: 0, c: 1, e: 2, b: 3 };
function ordenar(mano, P) { return mano.slice().sort((a, b) => { if (a === COMODIN) return b === COMODIN ? 0 : 1; if (b === COMODIN) return -1; const x = parse(a), y = parse(b); return ORD_PALO[x.p] - ORD_PALO[y.p] || P.pos[x.v] - P.pos[y.v]; }); }
const indicesSel = (orden) => { const usados = new Set(), out = []; selCods.forEach((c) => { const k = orden.findIndex((x, i) => x === c && !usados.has(i)); if (k >= 0) { usados.add(k); out.push(k); } }); return out; };
function clave(vm) { const j = vm.j; return [vm.mano, j.turno, j.sub, j.jug[vm.yo] ? j.jug[vm.yo].c.join() : '', j.melds.length].join('|'); }

export function layout(vm) {
  instalar();
  const j = vm.j, yo = vm.yo, P = perfil(j.cfg), res = j.res && j.fase === 'entre', mio = yo >= 0 ? j.jug[yo].c : [];
  const orden = ordenar(mio, P), legal = j.legal;
  selCods = selCods.filter((c) => mio.includes(c)); const k = clave(vm); if (sugK !== k) { sug = null; sugK = k; }
  if (!legal) selCods = [];
  const sel = indicesSel(orden), selC = sel.map((i) => orden[i]);
  const asientos = j.jug.map((p, i) => {
    const badges = []; if (j.dealer === i && j.fase === 'mano') badges.push({ txt: 'REPARTE', cls: 'dealer' });
    return { manos: i === yo || p.st === 'fuera' ? [] : [{ cartas: p.c, etiqueta: res ? '' : p.n + ' cartas' + (j.cfg.puntos && p.pts ? ' · ' + p.pts + 'p' : ''), activa: false, cls: res && j.res.ganadores.includes(i) ? 'gana' : '' }], badges, apuesta: 0, fichas: p.f, estado: '', turno: j.fase === 'mano' && j.turno === i, gana: res && j.res.ganadores.includes(i), fuera: p.st === 'fuera', delta: res ? j.res.gan[i] : null };
  });
  const destinos = new Set(); // combinaciones donde cabe la seleccion
  if (legal && selC.length) j.melds.forEach((m) => { if (j.cfg.agregar !== 'no' && puedeAgregarA(m, legal.sub === 'robar' ? selC.concat([j.descarte]) : selC, P, j.cfg.agregar, yo)) destinos.add(m.id); });
  if (sug && sug.accion && sug.accion.m != null) destinos.add(sug.accion.m);
  const tapete = j.melds.map((m) => { const a = analizar(m.c, P); return { id: m.id, cartas: m.c, etiqueta: a.ok ? a.etiqueta : '', color: vm.asientos[m.due] ? vm.asientos[m.due].color : '#fff', clic: !!legal, destacada: destinos.has(m.id), aria: (a.ok ? a.etiqueta : 'Combinación') + ' de ' + nombre(vm, m.due) }; });
  let sub = '', extra = '';
  if (res) { sub = (j.res.ganadores.length ? nombre(vm, j.res.ganadores[0]) + ' gana · ' : '') + j.res.texto; extra = j.res.puntos ? 'Puntos de la ronda: ' + j.res.puntos : ''; }
  else if (j.fase === 'mano') {
    sub = legal ? (legal.primer ? 'Tu turno · baja combinaciones y descarta' : legal.sub === 'robar' ? 'Tu turno · roba o toma el descarte' : 'Tu turno · baja, añade y descarta') : 'Turno de ' + nombre(vm, j.turno);
    extra = 'Mazo ' + j.mazo + ' · descarte ' + j.nDesc;
  }
  const barra = [];
  if (yo >= 0 && j.jug[yo].st === 'activo') {
    barra.push({ txt: 'En mano: ' + mio.length, cls: '' });
    if (legal && selC.length) {
      const a = analizar(selC, P);
      barra.push(a.ok ? { txt: 'Selección: ' + a.etiqueta + ' ✔', cls: 'ok' } : { txt: 'Selección: ' + selC.length + ' carta' + (selC.length > 1 ? 's' : '') + (destinos.size ? ' · cabe en ' + destinos.size + ' combinación' + (destinos.size > 1 ? 'es' : '') : ''), cls: destinos.size ? 'cerca' : 'lejos' });
    }
    if (legal && legal.sub === 'robar' && j.descarte) barra.push({ txt: 'Descarte: ' + nombreCarta(j.descarte) + (j.cfg.tomarDescarte ? ' (solo si lo usas ya)' : ''), cls: 'cerca' });
    if (sug) barra.push({ txt: '💡 ' + sug.texto, cls: 'ok' });
  }
  const pilas = [{ id: 'mazo', cartas: j.mazo ? [null] : [], etiqueta: 'Mazo ' + j.mazo, clic: !!legal && legal.sub === 'robar' }];
  if (j.descarte) pilas.push({ id: 'descarte', cartas: [j.descarte], etiqueta: 'Descarte (' + j.nDesc + ')', clic: !!legal });
  return {
    disposicion: 'elipse', fin: !!res, asientos, cabecera: 'Conquián · ' + j.jug.filter((p) => p.st === 'activo').length + ' jugadores' + (j.cfg.ana ? ' · ana ' + j.cfg.ana : ''), info: '',
    barra, bandeja: yo >= 0 && mio.length ? { cartas: orden, clic: !!legal, sel, etiqueta: selC.length ? selC.map((c) => nombreCarta(c)).join(', ') : '', turno: !!legal } : null,
    centro: { cartas: [], huecos: 0, bote: j.bote, subtitulo: sub, extra, grupos: [], pilas, tapete },
  };
}
const hint = (t) => { aviso(t, '#ffd23d'); return null; };
function accionTomar(vm, m) {
  const j = vm.j, P = perfil(j.cfg), top = j.descarte;
  if (!top) return hint('No hay descarte');
  if (!j.cfg.tomarDescarte) return hint('En esta mesa no se puede tomar del descarte');
  const r = m == null ? analizar([top].concat(selCods), P) : analizar(j.melds.find((x) => x.id === m).c.concat([top], selCods), P);
  if (!r.ok) return hint('El descarte se toma solo si lo usas ya: elige de tu mano las cartas que forman combinación con él' + (j.cfg.agregar !== 'no' ? ' o toca una combinación de la mesa' : ''));
  return { t: 'tomar', cartas: selCods.slice(), m: m == null ? null : m };
}
function accionBajar(vm) {
  const r = analizar(selCods, perfil(vm.j.cfg));
  if (!r.ok) return hint(selCods.length < 3 ? 'Elige 3 o más cartas de tu mano' : r.motivo || 'Esa selección no es una combinación');
  return { t: 'bajar', cartas: selCods.slice() };
}
function accionDescartar(vm) { if (selCods.length !== 1) return hint('Elige una sola carta para descartar'); return { t: 'descartar', c: selCods[0] }; }
function accionAgregar(vm, id) {
  const j = vm.j, m = j.melds.find((x) => x.id === id); if (!m) return null;
  if (!selCods.length) return hint('Elige primero las cartas de tu mano que quieres añadir');
  if (j.cfg.agregar === 'no') return hint('Esta mesa no permite añadir a combinaciones');
  if (!puedeAgregarA(m, selCods, perfil(j.cfg), j.cfg.agregar, vm.yo)) return hint(j.cfg.agregar === 'propias' && m.due !== vm.yo ? 'Solo puedes añadir a tus propias combinaciones' : 'Esas cartas no encajan en esa combinación');
  return { t: 'agregar', m: id, cartas: selCods.slice() };
}
export function panel(vm) {
  const j = vm.j, L = j.legal;
  if (!L) return { espera: true };
  const sugerir = { id: 'sugerir', txt: '💡 Sugerir', cls: 'sec', tecla: 's', local: () => { const s = sugerencia(j, vm.yo); if (!s) return; sug = { texto: s.texto, accion: s.accion }; const a = s.accion; selCods = a.t === 'bajar' || a.t === 'agregar' || a.t === 'tomar' ? (a.cartas || []).slice() : a.t === 'descartar' ? [a.c] : []; if (a.t === 'tomar') sug.texto += ' (' + (a.cartas || []).map(nombreCarta).join(', ') + ')'; sugK = clave(vm); refrescar(); } };
  const b = [];
  if (L.sub === 'robar') {
    b.push({ id: 'robar', txt: 'Robar del mazo', cls: 'prim', accion: { t: 'robar' }, tecla: 'm' });
    if (L.puedeTomar) { const a = accionTomarSilencioso(vm); b.push(a ? { id: 'tomar', txt: 'Tomar descarte ✔', cls: 'prim', accion: a, tecla: 'd' } : { id: 'tomar', txt: 'Tomar descarte', cls: 'sec', tecla: 'd', local: () => { const x = accionTomar(vm, null); if (x) enviar(x); } }); }
    b.push(sugerir);
    return { botones: b, titulo: 'Tu turno', info: j.descarte ? 'Descarte: ' + nombreCarta(j.descarte) + ' · para tomarlo elige antes las cartas con las que lo usarás' : '' };
  }
  const r = selCods.length >= 3 ? analizar(selCods, perfil(j.cfg)) : null;
  b.push(r && r.ok ? { id: 'bajar', txt: 'Bajar ✔', cls: 'prim', accion: { t: 'bajar', cartas: selCods.slice() }, tecla: 'b' } : { id: 'bajar', txt: 'Bajar', cls: 'sec', tecla: 'b', local: () => { const x = accionBajar(vm); if (x) enviar(x); } });
  if (j.jug[vm.yo].c.length === 1 && !j.cfg.ganarDescarte) b.push({ id: 'pasar', txt: 'Pasar turno', cls: 'prim', accion: { t: 'pasar' }, tecla: 'p' });
  else b.push(selCods.length === 1 ? { id: 'descartar', txt: 'Descartar', cls: 'prim', accion: { t: 'descartar', c: selCods[0] }, tecla: 'x' } : { id: 'descartar', txt: 'Descartar', cls: 'sec', tecla: 'x', local: () => { const x = accionDescartar(vm); if (x) enviar(x); } });
  b.push(sugerir);
  return { botones: b, titulo: L.primer ? 'Empiezas tú (10 cartas)' : 'Tu turno', info: selCods.length ? selCods.length + ' carta' + (selCods.length > 1 ? 's' : '') + ' elegida' + (selCods.length > 1 ? 's' : '') + ' · toca una combinación de la mesa para añadirlas' : 'Elige cartas para bajarlas, añadirlas o descartar' };
}
function accionTomarSilencioso(vm) {
  const j = vm.j; if (!j.descarte || !j.cfg.tomarDescarte || !selCods.length) return null;
  return analizar([j.descarte].concat(selCods), perfil(j.cfg)).ok ? { t: 'tomar', cartas: selCods.slice(), m: null } : null;
}
export function alCarta(vm, idx, code) {
  if (!vm.j.legal || Date.now() - ultimoArrastre < 350) return null;
  const i = selCods.indexOf(code);
  if (i >= 0) selCods.splice(i, 1); else selCods.push(code);
  refrescar(); return null;
}
export function alPila(vm, id) {
  const L = vm.j.legal; if (!L) return null;
  if (id === 'mazo') return L.sub === 'robar' ? { t: 'robar' } : null;
  return L.sub === 'robar' ? accionTomar(vm, null) : accionDescartar(vm);
}
export function alMeld(vm, id) {
  const L = vm.j.legal; if (!L) return null;
  return L.sub === 'robar' ? (selCods.length || vm.j.descarte ? accionTomar(vm, id) : null) : accionAgregar(vm, id);
}
export const mandoCartas = true;

// ---- arrastrar cartas: sobre una combinacion (añadir), al descarte (descartar) o al tapete (bajar) ----
function instalar() {
  if (instalado) return; instalado = true;
  let d = null, ghost = null;
  const objetivo = (x, y) => { const el = document.elementFromPoint(x, y); if (!el) return null; return el.closest('.meld, .pila-c') || (el.closest('#fieltro') && !el.closest('#bandeja') ? el.closest('#fieltro') : null); };
  document.addEventListener('pointerdown', (e) => {
    const c = e.target.closest && e.target.closest('#bandeja .carta.clic'); if (!c || e.button) return;
    d = { x: e.clientX, y: e.clientY, i: Array.from(c.parentNode.children).indexOf(c), on: false, el: null };
  });
  document.addEventListener('pointermove', (e) => {
    if (!d) return;
    if (!d.on) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10) return;
      const S = window.__cartas && window.__cartas.Sesion, vm = S && S.vm; if (!vm || !vm.j.legal) { d = null; return; }
      const orden = ordenar(vm.j.jug[vm.yo].c, perfil(vm.j.cfg)), code = orden[d.i]; if (!code) { d = null; return; }
      if (!selCods.includes(code)) selCods = [code];
      d.on = true; ghost = h('div', { cls: 'arrastre' }, selCods.map((c) => elementoCarta(c))); ghost.querySelectorAll('.carta').forEach((x) => x.classList.add('arriba')); document.body.appendChild(ghost); refrescar();
    }
    ghost.style.transform = `translate(${e.clientX - 22}px,${e.clientY - 40}px)`;
    const t = objetivo(e.clientX, e.clientY); document.querySelectorAll('.sobre').forEach((x) => { if (x !== t) x.classList.remove('sobre'); }); if (t) t.classList.add('sobre');
  });
  const fin = (e) => {
    if (!d) return; const on = d.on; d = null;
    if (!on) return;
    ultimoArrastre = Date.now(); if (ghost) { ghost.remove(); ghost = null; }
    const t = objetivo(e.clientX, e.clientY); document.querySelectorAll('.sobre').forEach((x) => x.classList.remove('sobre'));
    const S = window.__cartas && window.__cartas.Sesion, vm = S && S.vm; if (!t || !vm || !vm.j.legal) return;
    let a = null;
    if (t.classList.contains('meld')) a = alMeld(vm, +t.dataset.meld);
    else if (t.classList.contains('pila-c')) { const id = t.dataset.id; if (id === 'descarte') a = alPila(vm, 'descarte'); else if (id === 'mazo' && vm.j.legal.sub === 'robar') a = { t: 'robar' }; }
    else if (t.id === 'fieltro' && vm.j.legal.sub === 'jugar') a = selCods.length >= 3 ? accionBajar(vm) : hint('Para bajar suelta 3 o más cartas válidas; para añadir, suéltalas sobre una combinación');
    if (a) enviar(a);
  };
  document.addEventListener('pointerup', fin); document.addEventListener('pointercancel', () => { d = null; if (ghost) { ghost.remove(); ghost = null; } });
}
export const texto = {
  nombre: 'Conquián',
  ayuda: [
    'Baraja española de 40. Cada jugador recibe 9 cartas y el repartidor 10 (empieza descartando). Forma combinaciones: tríos o cuartetos del mismo número, o escaleras del mismo palo de 3 o más cartas (1-2-3 … 5-6-7-sota-caballo-rey: tras el 7 sigue la sota).',
    'En tu turno robas del mazo o tomas el descarte del jugador anterior, pero solo si lo usas ya en una combinación. Después puedes bajar combinaciones, añadir cartas a las de la mesa (propias o ajenas según la mesa) y debes descartar una carta. Gana quien se queda sin cartas (bajándolas todas o descartando la última, según la mesa).',
    'Toca cartas para elegirlas (puedes elegir varias) y usa Bajar o Descartar; toca una combinación de la mesa para añadirle las cartas elegidas. También puedes arrastrar las cartas: sobre una combinación (añadir), al descarte (descartar) o al centro de la mesa (bajar). 💡 Sugerir te propone una jugada.',
    'Con puntuación por rondas, el ganador suma los puntos de las cartas que le quedan a los rivales (figuras 10, comodín 15). Con 4 jugadores el mazo es corto: se rebaraja el descarte dos veces y después son tablas.',
  ],
  controles: ['<b>Táctil/ratón:</b> toca cartas para elegirlas; Bajar, Descartar o toca una combinación; también se pueden arrastrar.', '<b>Teclado:</b> M mazo · D tomar descarte · B bajar · X descartar · S sugerir · flechas mueven el foco, Enter elige · Esc menú.', '<b>Mando Xbox:</b> cruceta/stick mueve el foco por tus cartas, la mesa y los botones · A elige/confirma · MENU pausa.'],
};
