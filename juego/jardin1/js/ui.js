// Gestor de pantallas DOM y pantallas principales: menu, mapa, seleccion de semillas, pausa, fin, ayuda.
import { h, $, toast, fmt } from './dom.js';
import { P, Z, IDS_P, IDS_Z, MUNDOS, DESBLOQUEO, plantasDe } from './datos.js';
import { PR, AJ, completados, slots, estrellasTotal, guardarProgreso, leerPartida } from './almacen.js';
import { nivelAventura, zombisDe, NOMBRE_MINI, nivelSupervivencia, nivelPuzzle, nivelJarrones, nivelVersus, ESCENARIOS, N_PUZZLES, N_JARROS, INTRO } from './niveles.js';
import * as Ar from './arte.js';
import * as S from './sonido.js';
import { App } from './app.js';
import * as CJ from './cuenta-jardin.js';

/* ---------- gestor de pantallas ---------- */
const pila = [];
let cont = null;
export function iniciarUI() { cont = $('#pantalla'); }
export const hayPantalla = () => !!cont && cont.classList.contains('on');
export function mostrar(construir, opc) {
  pila.push({ construir, opc: opc || {} }); pintarTop();
}
function pintarTop() {
  const top = pila[pila.length - 1]; cont.textContent = '';
  if (!top) { cont.classList.remove('on'); document.body.classList.remove('con-pantalla'); return; }
  const el = top.construir(); cont.appendChild(el); cont.classList.add('on'); document.body.classList.add('con-pantalla');
  el.classList.add('pan'); cont.dataset.t = el.classList.contains('menu') ? 'menu' : el.classList.contains('pausa') ? 'pausa' : 'otro'; const f = el.querySelector('[data-f]:not([data-atras])') || el.querySelector('[data-f]'); if (f && window.Mando && window.Mando.conectado) f.focus({ preventScroll: true });
  cont.scrollTop = 0;
}
export function atras() { if (!pila.length) return; const t = pila.pop(); if (t.opc.alCerrar) t.opc.alCerrar(); pintarTop(); }
export function cerrarTodo() { while (pila.length) { const t = pila.pop(); if (t.opc.alCerrar) t.opc.alCerrar(); } pintarTop(); }
export function reemplazar(construir, opc) { pila.pop(); mostrar(construir, opc); }
export function refrescar() { pintarTop(); }
export const profundidad = () => pila.length;

/* ---------- navegacion con mando para menus ---------- */
let navRaf = 0, rep = { d: '', t: 0 }, ult = 0;
export function iniciarNavMando() {
  const paso = (ts) => {
    navRaf = requestAnimationFrame(paso); const dt = Math.min(0.1, (ts - ult) / 1000 || 0.016); ult = ts;
    const Md = window.Mando; if (!Md || !hayPantalla()) return; if (window.Lobby && window.Lobby.abierto) return;
    Md.leer(); if (!Md.conectado) return;
    const ex = Md.ejes.izq.x, ey = Md.ejes.izq.y; let dir = '';
    if (Md.sostenido('ARRIBA') || ey < -0.55) dir = 'u'; else if (Md.sostenido('ABAJO') || ey > 0.55) dir = 'd'; else if (Md.sostenido('IZQ') || ex < -0.55) dir = 'l'; else if (Md.sostenido('DER') || ex > 0.55) dir = 'r';
    if (dir) { rep.t -= dt; if (rep.d !== dir || rep.t <= 0) { moverFoco(dir); rep.t = rep.d === dir ? 0.14 : 0.3; rep.d = dir; } } else { rep.d = ''; rep.t = 0; }
    if (Md.pulsado('A')) { const a = document.activeElement; if (a && cont.contains(a)) a.click(); else moverFoco('d'); }
    if (Md.pulsado('B')) { const b = cont.querySelector('[data-atras]'); if (b) b.click(); else atras(); }
    if (Md.pulsado('RB') || Md.pulsado('LB')) { const tabs = [...cont.querySelectorAll('.tabs:first-of-type .tab, .tabs .tab')].filter((x) => x.offsetParent); const i = tabs.findIndex((x) => x.classList.contains('on')); if (tabs.length) { const n = tabs[(i + (Md.pulsado('RB') ? 1 : -1) + tabs.length) % tabs.length]; n.click(); } }
  };
  navRaf = requestAnimationFrame(paso);
}
function moverFoco(dir) {
  const els = [...cont.querySelectorAll('[data-f]')].filter((e) => !e.disabled && e.offsetParent);
  if (!els.length) return; const act = document.activeElement; if (!els.includes(act)) { els[0].focus(); return; }
  const a = act.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2; let mejor = null, ms = 1e9;
  for (const e of els) { if (e === act) continue; const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, dx = x - ax, dy = y - ay; let p, o;
    if (dir === 'u') { if (dy >= -4) continue; p = -dy; o = Math.abs(dx); } else if (dir === 'd') { if (dy <= 4) continue; p = dy; o = Math.abs(dx); } else if (dir === 'l') { if (dx >= -4) continue; p = -dx; o = Math.abs(dy); } else { if (dx <= 4) continue; p = dx; o = Math.abs(dy); }
    const sc = p + o * 2.2; if (sc < ms) { ms = sc; mejor = e; } }
  if (mejor) { mejor.focus(); mejor.scrollIntoView({ block: 'nearest', inline: 'nearest' }); S.sfx('clic'); }
}

/* ---------- iconos de canvas ---------- */
export function iconoP(id, tam, t) { const c = h('canvas', { width: tam * 2, height: tam * 2, style: `width:${tam}px;height:${tam}px`, 'aria-hidden': 'true' }); const g = c.getContext('2d'); g.scale(2, 2); Ar.dibujarPlanta(g, id, tam / 2, tam * 0.9, tam * 0.95, t || 0, { hp: 1, arma: 0 }); return c; }
export function iconoZ(tipo, tam) { const c = h('canvas', { width: tam * 2, height: tam * 2, style: `width:${tam}px;height:${tam}px`, 'aria-hidden': 'true' }); const g = c.getContext('2d'); g.scale(2, 2); const d = Z[tipo]; const big = tipo === 'moho' ? 0.42 : 0.82; Ar.dibujarZombi(g, { tipo, id: 1, hp: 1, hpMax: 1, arm: d.arm ? { k: d.arm.k } : null, dir: -1, estado: 'anda', vuelo: !!d.vuelo }, tam * 0.5 + (tipo === 'moho' ? 0 : 0), tam * (tipo === 'moho' ? 0.95 : 0.93), tam * big * (tipo === 'coloso' || tipo === 'capataz' ? 0.55 : 1), 0, {}); return c; }

/* ---------- fondo animado del menu ---------- */
let menuCv = null, menuRaf = 0, menuT = 0, menuOn = false;
import('./juego.js').then((J) => { window.__layout = J.layout; });
export function fondoMenu(on) {
  menuOn = on; menuCv = $('#fondoMenu'); if (!menuCv) return; menuCv.style.display = on ? 'block' : 'none';
  if (on && !menuRaf) { const f = (ts) => { menuRaf = requestAnimationFrame(f); if (!menuOn) return; menuT = ts / 1000; dibujarMenu(); }; menuRaf = requestAnimationFrame(f); }
  if (!on && menuRaf) { cancelAnimationFrame(menuRaf); menuRaf = 0; }
}
function dibujarMenu() {
  const cv = menuCv, w = cv.clientWidth, hh = cv.clientHeight; if (!w || !hh) return; const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); }
  const g = cv.getContext('2d'); const L = window.__layout ? window.__layout(w, hh, false) : null; if (!L) return;
  g.setTransform(dpr * L.esc, 0, 0, dpr * L.esc, dpr * L.ox, dpr * L.oy);
  const W = Math.floor(menuT / 14) % 5, M = MUNDOS[W]; const niv = { noche: M.noche, agua: M.agua, tejado: M.tejado };
  Ar.dibujarFondo(g, L, niv, menuT);
  const u = L.u; const pl = ['giras', 'dispa', 'nogal', 'hielo', 'cereza', 'luci', 'cacto', 'pincho', 'melon'];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { if ((r * 3 + c * 5) % 4 === 0) continue; const id = pl[(r * 2 + c * 3 + W) % pl.length]; if (M.agua.includes(r)) { Ar.dibujarBase(g, 'lirio', L.bx + (c + 0.5) * L.cw, L.by + (r + 0.92) * L.ch, u, menuT); } Ar.dibujarPlanta(g, id, L.bx + (c + 0.5) * L.cw, L.by + (r + 0.92) * L.ch, u, menuT, { ph: r + c }); }
  const zs = ['paseante', 'baliza', 'cubero', 'corredor', 'reja'];
  for (let r = 0; r < 5; r++) { const x = ((menuT * 0.35 + r * 2.3) % 10) ; const z = { tipo: zs[r], id: r + 3, hp: 1, hpMax: 1, arm: Z[zs[r]].arm ? { k: Z[zs[r]].arm.k } : null, dir: -1, estado: 'anda' }; Ar.dibujarZombi(g, z, L.bx + (9.8 - x) * L.cw, L.by + (r + 0.95) * L.ch, u, menuT, {}); }
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(8,16,10,.58)'; g.fillRect(0, 0, cv.width, cv.height);
}

/* ---------- componentes ---------- */
export const btn = (txt, fn, cls, extra) => h('button', { type: 'button', cls: 'btn ' + (cls || ''), 'data-f': 1, txt, on: { click: () => { S.iniciar(); S.sfx('clic'); fn(); } }, ...(extra || {}) });
export const volver = (fn) => h('button', { type: 'button', cls: 'btn atras', 'data-f': 1, 'data-atras': 1, txt: '← Volver', on: { click: () => { S.sfx('clic'); (fn || atras)(); } } });
export const cab = (titulo, extra) => h('div', { cls: 'cab' }, [volver(), h('h2', { txt: titulo }), h('div', { cls: 'cab-extra' }, extra || [])]);
export const chipsMon = () => h('span', { cls: 'chip' }, ['🪙 ', h('b', { txt: fmt(PR.monedas) }), ' · ⭐ ', h('b', { txt: String(estrellasTotal()) })]);

/* ---------- menu principal ---------- */
export function menuPrincipal() {
  App.limpiarJuego && App.limpiarJuego(); fondoMenu(true); S.musica('menu');
  cerrarTodo();
  mostrar(() => {
    const u = CJ.usuario(), pa = leerPartida();
    const items = [];
    if (pa && pa.id && pa.estado) items.push(btn('▶ Continuar', () => App.continuar(), 'primario', { 'data-test': 'continuar' }));
    items.push(btn('Aventura', mapaAventura, 'primario', { 'data-test': 'aventura' }), btn('Minijuegos', menuMinijuegos, '', { 'data-test': 'minijuegos' }), btn('Supervivencia', menuSurv, '', { 'data-test': 'surv' }), btn('Rompecabezas', menuPuzzles, ''), btn('Rompe-jarrones', menuJarros, ''), btn('Jardín Zen', () => App.zen(), '', { 'data-test': 'zen' }), btn('Jardín contra Jardín', menuVersus, ''), btn('Tienda del vecino', () => App.tienda(), '', { 'data-test': 'tienda' }), btn('Almanaque', () => App.almanaque(), '', { 'data-test': 'almanaque' }), btn('Misiones y logros', () => App.misiones(), ''), btn('Ranking', () => App.ranking(), ''), btn('Ajustes', () => App.ajustes(), '', { 'data-test': 'ajustes' }), btn('Ayuda', ayuda, ''));
    return h('div', { cls: 'menu' }, [
      h('div', { cls: 'titulo' }, [h('h1', { txt: 'Jardín Zombi' }), h('p', { txt: 'La primera aventura' })]),
      h('div', { cls: 'userline' }, [h('span', { txt: u ? (u.nombre || u.usuario) : 'Invitado' }), chipsMon()]),
      h('div', { cls: 'grid-menu' }, items),
      h('a', { cls: 'link-portal', href: '../', txt: '← Volver al portal' }),
    ]);
  });
}

/* ---------- aventura ---------- */
let mundoSel = 1;
export function mapaAventura(w) {
  if (w) mundoSel = w; else { const c = completados(); let mx = 0; c.forEach((i) => { mx = Math.max(mx, i); }); mundoSel = Math.min(5, Math.floor(mx / 10) + 1); }
  mostrar(() => construirMapa());
}
function construirMapa() {
  const comp = completados(), M = MUNDOS[mundoSel - 1];
  const tabs = h('div', { cls: 'tabs' }, MUNDOS.map((m) => { const lock = (m.id - 1) * 10 > 0 && !comp.has((m.id - 1) * 10); return h('button', { type: 'button', cls: 'tab' + (m.id === mundoSel ? ' on' : ''), disabled: lock, 'data-f': 1, txt: 'Mundo ' + m.id, on: { click: () => { mundoSel = m.id; refrescar(); } } }); }));
  const grid = h('div', { cls: 'niveles' });
  for (let n = 1; n <= 10; n++) {
    const i = (mundoSel - 1) * 10 + n, id = mundoSel + '-' + n, hecho = PR.hechos[id], libre = i === 1 || comp.has(i - 1), niv = nivelAventura(mundoSel, n);
    grid.appendChild(h('button', { type: 'button', cls: 'nivel' + (hecho ? ' hecho' : '') + (libre ? '' : ' lock') + (niv.mini !== 'normal' ? ' mini' : ''), disabled: !libre, 'data-f': 1, 'data-test': 'nivel-' + id, title: NOMBRE_MINI[niv.mini] || '', on: { click: () => { S.iniciar(); S.sfx('clic'); previo(niv); } } }, [
      h('b', { txt: id }), h('span', { cls: 'est', txt: hecho ? '★'.repeat(hecho.e || 1) + '☆'.repeat(3 - (hecho.e || 1)) : libre ? '' : '🔒' }), h('small', { txt: NOMBRE_MINI[niv.mini] || (n === 10 ? 'Gran final' : '') }),
    ]));
  }
  return h('div', { cls: 'mapa', style: `--col:${M.col}` }, [cab('Aventura: ' + M.n, [chipsMon()]), tabs, grid]);
}

/* ---------- vista previa y semillas ---------- */
let seleccion = [];
const PREF = ['giras', 'dispa', 'hielo', 'nogal', 'cereza', 'lirio', 'maceta', 'luci', 'esporin', 'cacto', 'mina', 'pincho', 'arco', 'melon', 'chile', 'trip', 'col', 'dosol', 'bidispa', 'nieblon', 'faro', 'iman'];
export function autoSemillas(niv, disp, n) {
  const w = (id) => { const d = P[id]; if ((id === 'lirio') && !niv.agua.length) return -1; if (id === 'maceta' && !niv.tejado) return -1; if (d.hongo && !niv.noche) return -1; if (id === 'escarba' && !(niv.tumbas && niv.tumbas.length)) return -1; if (id === 'faro' && !niv.niebla) return -1; return 1; };
  const res = []; const pref = niv.tejado ? ['maceta', 'giras', 'col', 'hielo', 'nogal', 'cereza', 'arco', 'melon', 'dosol'] : niv.agua.length ? ['giras', 'dispa', 'lirio', 'hielo', 'nogal', 'cereza', 'arco', 'melon'] : niv.noche ? ['luci', 'giras', 'esporin', 'dispa', 'hielo', 'nogal', 'cereza', 'nieblon', 'escarba'] : PREF;
  [...pref, ...PREF].forEach((id) => { if (res.length < n && disp.includes(id) && !res.includes(id) && w(id) > 0) res.push(id); });
  IDS_P.forEach((id) => { if (res.length < n && disp.includes(id) && !res.includes(id) && w(id) > 0) res.push(id); });
  return res;
}
export function previo(niv, opc) {
  opc = opc || {}; const sinElegir = ['cinta', 'bolera', 'puzzle', 'jarros'].includes(niv.tipo) || niv.i === 1;
  const disp = niv.i === 1 ? ['dispa'] : plantasDe(completados());
  const nSlots = slots();
  seleccion = (PR.ultSel || []).filter((id) => disp.includes(id)).slice(0, nSlots);
  if (!seleccion.length && !sinElegir) seleccion = autoSemillas(niv, disp, nSlots);
  const comienza = () => {
    const semillas = niv.i === 1 ? ['dispa'] : sinElegir ? [] : seleccion.slice();
    if (!sinElegir && semillas.length === 0) { toast('Elige al menos una semilla'); return; }
    if (!sinElegir) { PR.ultSel = semillas.slice(); guardarProgreso(); }
    App.jugar({ nivel: niv, semillas, dif: AJ.juego.dif, tutorial: niv.tutorial && AJ.juego.tutorial });
  };
  mostrar(() => {
    const zs = zombisDe(niv).sort((a, b) => (INTRO[a] || 0) - (INTRO[b] || 0));
    const prev = h('div', { cls: 'zprev' }, zs.map((z) => h('div', { cls: 'zp' }, [iconoZ(z, 56), h('small', { txt: Z[z].n })])));
    const raiz = h('div', { cls: 'previo' }, [cab(niv.titulo, [chipsMon()])]);
    raiz.appendChild(h('div', { cls: 'sub', txt: (NOMBRE_MINI[niv.mini] ? NOMBRE_MINI[niv.mini] + ' · ' : '') + 'Zombis que vienen:' }));
    raiz.appendChild(prev);
    const dif = h('div', { cls: 'tabs dif' }, [['facil', 'Fácil'], ['normal', 'Normal'], ['desafiante', 'Desafiante']].map(([k, n]) => h('button', { type: 'button', cls: 'tab' + (AJ.juego.dif === k ? ' on' : ''), 'data-f': 1, txt: n, on: { click: () => { AJ.juego.dif = k; import('./almacen.js').then((A) => A.guardarAjustes()); [...dif.children].forEach((b) => b.classList.toggle('on', b.textContent === n)); } } })));
    raiz.appendChild(dif);
    if (sinElegir) {
      raiz.appendChild(h('p', { cls: 'nota', txt: niv.i === 1 ? 'Primer nivel: solo la Disparaina. ¡Recoge soles y defiende tu jardín!' : niv.tipo === 'cinta' ? 'Las semillas llegan por una cinta transportadora: tienen coste cero, pero no puedes escoger.' : niv.tipo === 'bolera' ? 'Elige una bola y toca un carril: rueda y derriba zombis. ¡Cuidado con la bomba!' : niv.tipo === 'puzzle' ? 'Coloca las plantas dadas para derrotar a todos los zombis.' : 'Toca los jarrones para romperlos: pueden dar plantas, energía... o zombis.' }));
    } else {
      const slotsEl = h('div', { cls: 'slots' }), grid = h('div', { cls: 'semillas' });
      const pintar = () => {
        slotsEl.textContent = '';
        for (let i = 0; i < nSlots; i++) { const id = seleccion[i]; slotsEl.appendChild(h('button', { type: 'button', cls: 'slot' + (id ? ' lleno' : ''), 'data-f': 1, 'aria-label': id ? P[id].n : 'Ranura vacía', on: { click: () => { if (id) { seleccion.splice(i, 1); pintar(); } } } }, id ? [iconoP(id, 46), h('small', { txt: String(P[id].c) })] : [h('small', { txt: String(i + 1) })])); }
        grid.textContent = '';
        disp.forEach((id) => { const en = seleccion.includes(id); const d = P[id]; grid.appendChild(h('button', { type: 'button', cls: 'semilla' + (en ? ' en' : ''), 'data-f': 1, title: d.d, 'data-test': 'sem-' + id, on: { click: () => { if (en) seleccion.splice(seleccion.indexOf(id), 1); else if (seleccion.length < nSlots) seleccion.push(id); else toast('Cargador lleno: quita una semilla'); S.sfx('clic'); pintar(); } } }, [iconoP(id, 48), h('small', { txt: d.n }), h('small', { cls: 'cs', txt: '☀ ' + d.c })])); });
      };
      pintar();
      raiz.appendChild(h('div', { cls: 'sub', txt: 'Tu cargador (' + nSlots + ' ranuras):' })); raiz.appendChild(slotsEl); raiz.appendChild(grid);
      raiz.appendChild(btn('Elegir por mí', () => { seleccion = autoSemillas(niv, disp, nSlots); pintar(); }, 'sec'));
    }
    raiz.appendChild(h('div', { cls: 'acciones' }, [btn('¡A jugar!', comienza, 'primario grande', { 'data-test': 'empezar' })]));
    return raiz;
  });
}

/* ---------- submenus ---------- */
export function menuMinijuegos() {
  mostrar(() => {
    const comp = completados(), lista = [['1-5'], ['2-5'], ['2-10'], ['3-8'], ['3-10'], ['4-5'], ['4-10'], ['5-5'], ['5-10']];
    const g = h('div', { cls: 'niveles' });
    lista.forEach(([id]) => { const [w, n] = id.split('-').map(Number), i = (w - 1) * 10 + n, niv = nivelAventura(w, n), libre = i === 1 || comp.has(i - 1); g.appendChild(h('button', { type: 'button', cls: 'nivel mini' + (libre ? '' : ' lock') + (PR.hechos[id] ? ' hecho' : ''), disabled: !libre, 'data-f': 1, on: { click: () => previo(niv) } }, [h('b', { txt: id }), h('span', { cls: 'est', txt: libre ? (PR.hechos[id] ? '★' : '') : '🔒' }), h('small', { txt: NOMBRE_MINI[niv.mini] || 'Jefe' })])); });
    return h('div', { cls: 'mapa' }, [cab('Minijuegos'), h('p', { cls: 'nota', txt: 'Estos desafíos están en la aventura. Se desbloquean al llegar a ellos. También: Rompecabezas y Rompe-jarrones.' }), g,
      h('div', { cls: 'acciones' }, [btn('Rompecabezas', menuPuzzles), btn('Rompe-jarrones', menuJarros)])]);
  });
}
export function menuPuzzles() {
  mostrar(() => { const g = h('div', { cls: 'niveles' }); for (let n = 1; n <= N_PUZZLES; n++) { const niv = nivelPuzzle(n); g.appendChild(h('button', { type: 'button', cls: 'nivel mini' + (PR.puzzle['r' + n] ? ' hecho' : ''), 'data-f': 1, 'data-test': 'puz-' + n, on: { click: () => previo(niv) } }, [h('b', { txt: 'R' + n }), h('span', { cls: 'est', txt: PR.puzzle['r' + n] ? '★' : '' }), h('small', { txt: niv.titulo.split(': ')[1] })])); } return h('div', { cls: 'mapa' }, [cab('Rompecabezas'), h('p', { cls: 'nota', txt: 'Plantas ya dadas, zombis ya colocados: ¿puedes limpiar el tablero?' }), g]); });
}
export function menuJarros() {
  mostrar(() => { const g = h('div', { cls: 'niveles' }); for (let n = 1; n <= N_JARROS; n++) { const niv = nivelJarrones(n); g.appendChild(h('button', { type: 'button', cls: 'nivel mini' + (PR.jarros['j' + n] ? ' hecho' : ''), 'data-f': 1, 'data-test': 'jar-' + n, on: { click: () => previo(niv) } }, [h('b', { txt: 'J' + n }), h('span', { cls: 'est', txt: PR.jarros['j' + n] ? '★' : '' })])); } return h('div', { cls: 'mapa' }, [cab('Rompe-jarrones'), h('p', { cls: 'nota', txt: 'Rompe todos los jarrones: dan plantas, energía o... sorpresas.' }), g]); });
}
export function menuSurv() {
  let esc = 'dia', duro = false;
  mostrar(() => {
    const info = h('p', { cls: 'nota' }), act = () => { const id = 'sv_' + esc + (duro ? '_duro' : ''); info.textContent = 'Mejor: ' + (PR.surv[id] || 0) + ' oleadas. Mejor global (normal/duro): ' + (PR.stats.mejorSurv || 0) + '.'; };
    const t1 = h('div', { cls: 'tabs' }), t2 = h('div', { cls: 'tabs' });
    const mk = () => { t1.textContent = ''; ESCENARIOS.forEach((e) => t1.appendChild(h('button', { type: 'button', cls: 'tab' + (esc === e.id ? ' on' : ''), 'data-f': 1, txt: e.n, on: { click: () => { esc = e.id; mk(); act(); } } }))); t2.textContent = ''; [[false, 'Normal'], [true, 'Duro']].forEach(([d, n]) => t2.appendChild(h('button', { type: 'button', cls: 'tab' + (duro === d ? ' on' : ''), 'data-f': 1, txt: n, on: { click: () => { duro = d; mk(); act(); } } }))); };
    mk(); act();
    return h('div', { cls: 'mapa' }, [cab('Supervivencia'), h('p', { cls: 'nota', txt: 'Oleadas infinitas. ¿Cuántas aguantas? Se envía al ranking (Oleadas).' }), t1, t2, info, h('div', { cls: 'acciones' }, [btn('Empezar', () => previo(nivelSupervivencia(esc, duro)), 'primario grande', { 'data-test': 'surv-go' })])]);
  });
}
export function menuVersus() {
  mostrar(() => h('div', { cls: 'mapa' }, [cab('Jardín contra Jardín'), h('p', { cls: 'nota', txt: 'Dos jugadores en el mismo móvil. Jugador 1 planta (energía solar); Jugador 2 lanza zombis (cerebros). Las plantas ganan si resisten 150 s; los zombis, si uno llega a la casa. Marcador: ' + PR.versus[0] + ' - ' + PR.versus[1] + '.' }), h('div', { cls: 'acciones' }, [btn('¡Duelo!', () => App.jugar({ nivel: nivelVersus(), semillas: [], dif: 'normal' }), 'primario grande', { 'data-test': 'versus-go' })])]));
}

/* ---------- pausa, fin, ayuda ---------- */
export function pantallaPausa() {
  mostrar(() => {
    const surv = App.esSurv && App.esSurv();
    const it = [btn('Continuar', () => App.reanudar(), 'primario', { 'data-test': 'reanudar' }), btn('Reiniciar nivel', () => App.reiniciar(), ''), btn('Ajustes', () => App.ajustes(), ''), btn('Ayuda', ayuda, '')];
    if (surv) it.push(btn('Terminar y enviar puntaje', () => App.terminarSurv(), 'peligro', { 'data-test': 'terminar' }));
    it.push(btn('Salir al menú', () => App.guardarYSalir(), '', { 'data-test': 'salir' }));
    return h('div', { cls: 'pausa' }, [h('h2', { txt: 'Pausa' }), h('div', { cls: 'col-botones' }, it)]);
  }, { alCerrar: () => {} });
}
export function pantallaFin(info) {
  mostrar(() => {
    const v = info.victoria, izq = [], der = [];
    if (info.lineas) info.lineas.forEach((l) => izq.push(h('p', { cls: 'linea', txt: l })));
    if (info.estrellas != null) izq.push(h('div', { cls: 'estrellas', 'aria-label': info.estrellas + ' estrellas' }, [0, 1, 2].map((i) => h('span', { cls: i < info.estrellas ? 'on' : '', txt: '★' }))));
    if (info.logros && info.logros.length) izq.push(h('p', { cls: 'linea', txt: '🏆 ' + info.logros.join(', ') }));
    if (info.planta) der.push(h('div', { cls: 'nueva' }, [h('small', { txt: 'Nueva planta' }), iconoP(info.planta, 72), h('b', { txt: P[info.planta].n }), h('span', { txt: P[info.planta].d })]));
    const bs = []; (info.botones || []).forEach((b) => bs.push(btn(b[0], b[1], b[2] || '', b[3] ? { 'data-test': b[3] } : undefined)));
    const hijos = [h('h2', { cls: v ? 'ok' : 'mal', txt: info.titulo }), h('div', { cls: 'fin-mid' }, [h('div', { cls: 'fin-l' }, izq), der.length ? h('div', { cls: 'fin-r' }, der) : null]), h('div', { cls: 'acciones' }, bs)];
    return h('div', { cls: 'fin' }, hijos);
  });
}
export function ayuda() {
  mostrar(() => h('div', { cls: 'ayuda' }, [cab('Ayuda y controles'),
    h('div', { cls: 'cols' }, [
      h('div', { cls: 'bloque' }, [h('h3', { txt: 'Objetivo' }), h('p', { txt: 'Los zombis llegan por la derecha en 5 carriles. Recoge energía solar, planta defensas y no dejes que lleguen a la casa. Si uno pasa, la cortadora de ese carril lo barre (una vez).' }), h('p', { txt: 'Oleada final: aparece un aviso antes de la gran oleada. ¡Prepárate!' })]),
      h('div', { cls: 'bloque' }, [h('h3', { txt: 'Táctil' }), h('p', { txt: 'Toca (o roza) los soles para recogerlos. Arrastra una semilla al tablero, o toca la semilla y luego la casilla. ⛏ Pala: toca y elige la planta a quitar. ⏸ pausa, 1× cambia la velocidad.' })]),
      h('div', { cls: 'bloque' }, [h('h3', { txt: 'Teclado y ratón' }), h('p', { txt: 'Flechas: cursor · Enter/Espacio: plantar · 1-9 o Q/E: semilla · X: pala · S: recoger sol · V: velocidad · Esc/P: pausa. Con ratón: clic en semilla y casilla, o arrastra.' })]),
      h('div', { cls: 'bloque' }, [h('h3', { txt: 'Mando Xbox' }), h('p', { txt: 'Cruceta/palanca: cursor · A: plantar · B: cancelar · X: pala · Y: recoger sol · LB/RB: cambiar semilla · Menú: pausa · Vista: velocidad. En menús: cruceta, A y B.' })]),
    ])]));
}
