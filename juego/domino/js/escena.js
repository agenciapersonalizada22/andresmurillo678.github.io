// Escena de la mesa en canvas 2D: fieltro, cadena autoacomodada con zoom/desplazamiento, mano, rivales, pozo, animaciones y entrada
// (tactil, raton, teclado y mando). No toca el DOM salvo el canvas; la interfaz de botones/puntos vive en ui.js.
import * as R from './reglas.js';
import { disponer, L } from './cadena.js';
import { ficha, dorso, fantasma, fieltro } from './dibujo.js';
import { A, D, reducirMov } from './ajustes.js';
import { Sonido } from './sonido.js';

export const S = {
  v: null, meta: { nombres: [], colores: [], tipos: [] }, cv: null, c: null, w: 0, h: 0, k: 1, g: null, fondo: null, fondoClave: '',
  mano: new Map(), orden: [], vistos: new Set(), lay: null, vp: { x: 0, y: 0, s: 14 }, auto: true, vuelos: [], pulsos: [], part: [], burbujas: [],
  lim: 8, sel: null, cur: 0, ladoPref: 'd', ptr: new Map(), arrastre: null, hov: null, sucio: true, ahora: 0, tDeal: 0, pista: 0, ultimoCuadro: 0, ayudaPulso: 0
};
export const H = { enviar: null, aviso: null, alAterrizar: null, alPozo: null };
const fx = (n) => Sonido.fx(n);
const anim = () => !reducirMov();
const lerp = (a, b, t) => a + (b - a) * t;
const lerpAng = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
const ease = (t) => 1 - Math.pow(1 - t, 3);
const rel = (j) => (j - S.v.yo + S.v.n) % S.v.n;
const unidad = (j) => (S.v.cfg.modo === 'parejas' ? j % 2 : j);

/* ---------- inicio y tamano ---------- */
export function iniciar(cv) {
  S.cv = cv; S.c = cv.getContext('2d');
  const ro = new ResizeObserver(() => ajustarTamano());
  ro.observe(cv.parentNode);
  cv.addEventListener('pointerdown', abajo); cv.addEventListener('pointermove', mueve); cv.addEventListener('pointerup', arriba);
  cv.addEventListener('pointercancel', arriba); cv.addEventListener('pointerleave', () => { S.hov = null; });
  cv.addEventListener('wheel', rueda, { passive: false });
  cv.addEventListener('dblclick', (e) => { if (!enMano(e) && !enChip(e)) ajustar(); });
  ajustarTamano();
}
export function ajustarTamano() {
  const p = S.cv.parentNode, w = p.clientWidth, h = p.clientHeight;
  if (!w || !h) return;
  const cap = D.calidad === 'ultra' ? 3 : D.calidad === 'baja' ? 1.25 : 2;
  const dpr = Math.min(window.devicePixelRatio || 1, cap) * (D.resolucion / 100);
  const pw = Math.max(2, Math.round(w * dpr)), ph = Math.max(2, Math.round(h * dpr));
  if (S.cv.width !== pw || S.cv.height !== ph) { S.cv.width = pw; S.cv.height = ph; }
  S.w = w; S.h = h; S.k = pw / w; S.fondo = null; S.g = null; S.sucio = true;
}

/* ---------- geometria ---------- */
function geometria() {
  const v = S.v, W = S.w, H2 = S.h, g = {};
  const fs = A.acc.textoGrande ? 1.15 : 1;
  g.modo = W >= 640 && W / H2 > 1.05 ? 'lados' : 'banda';
  const N = Math.max(1, v ? v.mano.length : 7), disp = W - 14;
  let len = Math.min(100 * D.tamFicha / 100, 2 * (disp / N - 3.5), H2 * 0.21);
  len = Math.max(36, len);
  g.mano = { len, y: H2 - len / 2 - 12, step: N > 1 ? Math.min(len / 2 + 6, (disp - len / 2) / (N - 1)) : 0, n: N };
  g.manoTop = g.mano.y - len / 2 - len * 0.3;
  g.top = 44;
  g.chips = {};
  const n = v ? v.n : 4, ch = (H2 < 520 ? 50 : 78) * fs;
  if (g.modo === 'banda') {
    const rels = n === 2 ? [1] : n === 3 ? [2, 1] : [3, 2, 1], m = rels.length;
    const cw = n === 2 ? Math.min(W - 12, 260) : (W - 12 - 5 * (m - 1)) / m;
    const x0 = n === 2 ? (W - cw) / 2 : 6;
    rels.forEach((r, i) => { g.chips[r] = { x: x0 + i * (cw + 5), y: g.top + 2, w: cw, h: ch }; });
    g.tab = { x0: 6, y0: g.top + ch + 8, x1: W - 44, y1: g.manoTop - 34 };
  } else {
    const cw = 168 * fs;
    if (n === 2) g.chips[1] = { x: (W - 250) / 2, y: g.top + 2, w: 250, h: ch };
    if (n === 4) g.chips[2] = { x: (W - 250) / 2, y: g.top + 2, w: 250, h: ch };
    if (n >= 3) { g.chips[1] = { x: W - cw - 8, y: H2 * 0.34, w: cw, h: ch }; g.chips[n === 3 ? 2 : 3] = { x: 8, y: H2 * 0.34, w: cw, h: ch }; }
    const lados = n >= 3 ? cw + 16 : 6, arriba = n === 3 ? g.top + 6 : g.top + ch + 8;
    g.tab = { x0: lados, y0: arriba, x1: W - lados - 44, y1: g.manoTop - 34 };
  }
  g.cx = (g.tab.x0 + g.tab.x1) / 2; g.cy = (g.tab.y0 + g.tab.y1) / 2;
  g.tabW = g.tab.x1 - g.tab.x0; g.tabH = g.tab.y1 - g.tab.y0;
  g.pozo = { x: g.tab.x0 + 34, y: g.tab.y1 - 34 };
  if (S.cv) { const st = S.cv.parentNode.style; st.setProperty('--mano-top', g.manoTop + 'px'); st.setProperty('--tab-top', g.tab.y0 + 6 + 'px'); st.setProperty('--zoom-right', (W - g.tab.x1 - 40) + 'px'); }
  return g;
}
const geo = () => S.g || (S.g = geometria());
function pantalla(wx, wy) { const g = geo(); return { x: g.cx + (wx - S.vp.x) * S.vp.s, y: g.cy + (wy - S.vp.y) * S.vp.s }; }
const mundo = (sx, sy) => { const g = geo(); return { x: (sx - g.cx) / S.vp.s + S.vp.x, y: (sy - g.cy) / S.vp.s + S.vp.y }; };
function destinoVista() {
  const g = geo(), lay = S.lay, b = lay.caja;
  const bw = b.x1 - b.x0, bh = b.y1 - b.y0;
  const s = Math.max(6, Math.min(g.tabW * 0.95 / bw, g.tabH * 0.95 / bh, 40));
  return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, s };
}
function posFicha(f) {
  const p = pantalla(f.x, f.y);
  return { x: p.x, y: p.y, ang: f.ang, len: L * S.vp.s };
}
function anclaChip(j) {
  const g = geo(), r = g.chips[rel(j)];
  return r ? { x: r.x + 20, y: r.y + 18 } : { x: g.cx, y: 0 };
}

// Fichas por fila segun la forma del tablero (apaisado = filas largas, vertical = filas cortas y mas altas).
function limiteFila() {
  const g = geo(), v = S.v;
  const hasta = Math.min(R.tabla(v.max).length, v.n * v.mano.length + (v.cfg.modo === 'duelo' ? v.pozo * 0.4 : 0));
  const N = Math.max(8, Math.round(hasta * 0.8)), ic = Math.floor(N / 2);
  const cad = Array.from({ length: N }, (_, i) => ({ id: i, a: 1, b: 2 }));
  let mejor = 8, ms = -1;
  for (const lim of [8, 7, 9, 6, 5]) {
    const c = disponer(cad, ic, lim).caja, s = Math.min(40, g.tabW * 0.95 / (c.x1 - c.x0), g.tabH * 0.95 / (c.y1 - c.y0));
    if (s > ms + 0.05) { ms = s; mejor = lim; }
  }
  return mejor;
}

/* ---------- estado nuevo ---------- */
export function nuevoEstado(v, evs, meta, sinAnim) {
  if (!S.w || S.cv.parentNode.clientWidth !== S.w) ajustarTamano();
  const prev = S.v;
  S.v = v; S.meta = meta; S.g = null;
  const dealing0 = evs.some((x) => x.t === 'reparto');
  if (!prev || sinAnim || dealing0 || !v.cadena.length) S.lim = limiteFila();
  S.lay = disponer(v.cadena, v.centro, S.lim);
  if (!prev || sinAnim || (prev.ronda !== v.ronda && !evs.some((e) => e.t === 'reparto'))) { S.vp = destinoVista(); }
  const dealing = evs.some((e) => e.t === 'reparto');
  if (dealing || !prev) { S.vistos = new Set(); S.vuelos = []; S.mano.clear(); S.sel = null; S.pulsos = []; S.tDeal = performance.now(); if (anim() && dealing) fx('mezcla'); }
  // mano: reconcilia fichas
  const ids = new Set(v.mano), geoM = geo();
  for (const [id, it] of S.mano) if (!ids.has(id)) S.mano.delete(id);
  let k = 0;
  for (const id of v.mano) {
    if (S.mano.has(id)) continue;
    const it = { id, x: geoM.cx, y: geoM.cy, tx: 0, ty: 0, esc: 0.5, al: 1, delay: 0 };
    const rb = evs.find((e) => e.t === 'robo' && e.j === v.yo && e.id === id);
    if (rb && anim()) { it.x = geoM.pozo.x; it.y = geoM.pozo.y; it.esc = 0.7; fx('robar'); }
    else if ((dealing || !prev) && anim() && !sinAnim) { it.delay = 380 + k * 45; it.al = 0; if (k < 3) setTimeout(() => fx('reparte'), it.delay); }
    else { it.esc = 1; it.pos0 = true; }
    S.mano.set(id, it); k++;
  }
  if (S.sel != null && !ids.has(S.sel)) S.sel = null;
  ordenarMano(); posicionarMano(true);
  // fichas nuevas en la cadena: vuelo desde la mano (propias) o desde el rival
  for (const f of S.lay.fichas) {
    if (!f || S.vistos.has(f.id)) continue;
    S.vistos.add(f.id);
    if (sinAnim || !anim() || !prev) continue;
    const e = evs.find((x) => x.t === 'jugar' && x.id === f.id);
    if (!e) continue;
    let de;
    if (e.j === v.yo && S.ultMano && S.ultMano[f.id]) { const q = S.ultMano[f.id]; de = { x: q.x, y: q.y, ang: (f.vi === R.par(v.max, f.id)[0] ? 1 : -1) * Math.PI / 2, len: q.len }; }
    else { const a = anclaChip(e.j); de = { x: a.x, y: a.y, ang: (f.vi === R.par(v.max, f.id)[0] ? 1 : -1) * Math.PI / 2, len: 26 }; }
    S.vuelos.push({ id: f.id, t0: performance.now(), dur: 520, de });
  }
  const ult = evs.filter((e) => e.t === 'jugar' || e.t === 'pase').slice(-1)[0];
  if (S.auto || !prev) { /* vista automatica: se interpola en cuadro() */ }
  for (const e of evs) {
    if (e.t === 'pase') burbuja(e.j, '¡Paso!', 'pase');
    if (e.t === 'chat' && e.j !== v.yo) { /* ui lo gestiona via burbuja() */ }
  }
  void ult;
  S.sucio = true;
}
export function burbuja(j, txt, tipo) { S.burbujas.push({ j, txt, tipo, t0: performance.now() }); S.sucio = true; }

function ordenarMano() {
  const ids = S.v.mano.slice();
  if (A.juego.ordenar) ids.sort((a, b) => a - b);
  else { const ant = Array.from(S.mano.keys()); ids.sort((a, b) => ant.indexOf(a) - ant.indexOf(b)); }
  S.orden = ids;
  if (S.cur >= ids.length) S.cur = Math.max(0, ids.length - 1);
}
function posicionarMano(inicial) {
  const g = geo(), m = g.mano, n = S.orden.length;
  const x0 = S.w / 2 - m.step * (n - 1) / 2;
  S.orden.forEach((id, i) => {
    const it = S.mano.get(id); if (!it) return;
    it.tx = x0 + i * m.step; it.ty = m.y;
    if (it.pos0) { it.x = it.tx; it.y = it.ty; it.pos0 = false; }
  });
}

/* ---------- jugadas ---------- */
export const ladosDe = (id) => (S.v ? S.v.jugables.filter((m) => m.id === id).map((m) => m.lado) : []);
export function seleccionar(id) {
  if (id == null) { S.sel = null; S.sucio = true; return; }
  S.sel = id; const i = S.orden.indexOf(id); if (i >= 0) S.cur = i;
  const l = ladosDe(id);
  if (l.length && !l.includes(S.ladoPref)) S.ladoPref = l[0];
  fx('selecciona'); S.sucio = true;
}
export function intentarJugar(id, lado) {
  const v = S.v; if (!v) return false;
  if (v.turno !== v.yo) { H.aviso && H.aviso(v.fin ? 'La mano terminó' : 'Espera tu turno', '#ffd23d'); fx('error'); return false; }
  const l = ladosDe(id);
  if (!l.length) {
    const p = R.par(v.max, id);
    H.aviso && H.aviso(v.cadena.length ? `${p[0]}-${p[1]} no encaja con ${v.ext.izq} ni ${v.ext.der}` : 'Debes salir con la ficha marcada', '#ff6b4a'); fx('error'); return false;
  }
  if (!lado) { if (l.length === 1) lado = l[0]; else { H.aviso && H.aviso('Toca el extremo donde la quieres poner', '#ffd23d'); S.ayudaPulso = performance.now(); S.sucio = true; return false; } }
  if (!l.includes(lado)) return false;
  S.ultMano = {}; for (const [k, it] of S.mano) S.ultMano[k] = { x: it.x, y: it.y, len: geo().mano.len };
  H.enviar && H.enviar({ t: 'jugar', id, lado });
  return true;
}
export function confirmar() {
  if (!S.v) return;
  const id = S.orden[S.cur];
  if (S.sel == null || S.sel !== id) { seleccionar(id); return; }
  intentarJugar(id, ladosDe(id).includes(S.ladoPref) ? S.ladoPref : undefined);
}
export function moverCursor(d) {
  const n = S.orden.length; if (!n) return;
  if (S.sel == null) S.cur = Math.min(Math.max(S.cur, 0), n - 1); else S.cur = (S.cur + d + n) % n;
  seleccionar(S.orden[S.cur]);
}
export function cambiarExtremo(lado) {
  const l = S.sel != null ? ladosDe(S.sel) : [];
  if (lado) S.ladoPref = lado; else S.ladoPref = S.ladoPref === 'i' ? 'd' : 'i';
  if (l.length === 1) S.ladoPref = l[0];
  fx('click'); S.sucio = true;
}
export const cancelar = () => { const t = S.sel != null; S.sel = null; S.sucio = true; return t; };

/* ---------- vista ---------- */
export function zoomPor(f, sx, sy) {
  const g = geo(); sx = sx == null ? g.cx : sx; sy = sy == null ? g.cy : sy;
  const antes = mundo(sx, sy);
  S.vp.s = Math.max(5, Math.min(70, S.vp.s * f)); S.auto = false;
  S.vp.x = antes.x - (sx - g.cx) / S.vp.s; S.vp.y = antes.y - (sy - g.cy) / S.vp.s; S.sucio = true;
}
export function panPor(dx, dy) { S.vp.x -= dx / S.vp.s; S.vp.y -= dy / S.vp.s; S.auto = false; S.sucio = true; }
export function ajustar() { S.auto = true; S.sucio = true; }
const rueda = (e) => { e.preventDefault(); const r = S.cv.getBoundingClientRect(); zoomPor(Math.exp(-e.deltaY * 0.0015 * D.sensZoom), e.clientX - r.left, e.clientY - r.top); };

/* ---------- entrada puntero ---------- */
const pt = (e) => { const r = S.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
function itemEn(x, y) {
  const m = geo().mano, w = m.len / 2 + 2, ids = S.orden;
  for (let i = ids.length - 1; i >= 0; i--) {
    const it = S.mano.get(ids[i]); if (!it || it.al < 0.5) continue;
    if (Math.abs(x - it.x) <= (m.step < w ? m.step / 2 + 3 : w / 2 + 2) && Math.abs(y - it.y) <= m.len / 2 + 4) return it;
  }
  return null;
}
const enMano = (e) => { const p = pt(e); return !!itemEn(p.x, p.y); };
const enChip = () => false;
function ghostEn(x, y) {
  if (S.sel == null && !(S.v && !S.v.cadena.length)) return null;
  const l = S.sel != null ? ladosDe(S.sel) : [];
  let mejor = null, md = 1e9;
  for (const lado of l) {
    const gh = S.lay.fantasmas[lado], p = pantalla(gh.x, gh.y), d = Math.hypot(p.x - x, p.y - y);
    if (d < md) { md = d; mejor = lado; }
  }
  return mejor && md < Math.max(46, L * S.vp.s * 0.9) ? mejor : null;
}
function abajo(e) {
  if (!S.v) return;
  S.cv.setPointerCapture(e.pointerId);
  const p = pt(e);
  S.ptr.set(e.pointerId, { ...p, x0: p.x, y0: p.y, t0: performance.now(), tipo: 'nada' });
  Sonido.despertar();
  if (S.ptr.size === 2) { const [a, b] = [...S.ptr.values()]; S.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: S.vp.s }; for (const q of S.ptr.values()) q.tipo = 'zoom'; S.arrastre = null; return; }
  const it = itemEn(p.x, p.y);
  const q = S.ptr.get(e.pointerId);
  if (it) { q.tipo = 'ficha'; q.id = it.id; }
  else {
    const pz = geo().pozo;
    if (S.v.cfg.modo === 'duelo' && Math.hypot(p.x - pz.x, p.y - pz.y) < 32) { q.tipo = 'pozo'; return; }
    const gh = ghostEn(p.x, p.y);
    if (gh) { q.tipo = 'ghost'; q.lado = gh; } else if (p.y < geo().manoTop) q.tipo = 'fondo';
  }
}
function mueve(e) {
  const p = pt(e), q = S.ptr.get(e.pointerId);
  if (!q) { const it = itemEn(p.x, p.y); const h = it ? it.id : null; if (h !== S.hov) { S.hov = h; S.sucio = true; } return; }
  q.x = p.x; q.y = p.y;
  if (S.pinch && S.ptr.size >= 2) {
    const [a, b] = [...S.ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; zoomPor(Math.pow(d / S.pinch.d * S.pinch.s / S.vp.s, D.sensZoom), mx, my); return;
  }
  const dx = p.x - q.x0, dy = p.y - q.y0;
  if (q.tipo === 'ficha' && Math.hypot(dx, dy) > 10 && !S.arrastre) { S.arrastre = { id: q.id, x: p.x, y: p.y }; seleccionar(q.id); }
  if (S.arrastre && q.tipo === 'ficha') { S.arrastre.x = p.x; S.arrastre.y = p.y; S.sucio = true; return; }
  if (q.tipo === 'fondo' && (Math.hypot(dx, dy) > 6 || q.mov)) {
    q.mov = true; panPor(p.x - (q.px == null ? q.x0 : q.px), p.y - (q.py == null ? q.y0 : q.py)); q.px = p.x; q.py = p.y;
  }
}
function arriba(e) {
  const q = S.ptr.get(e.pointerId); S.ptr.delete(e.pointerId);
  if (S.ptr.size < 2) S.pinch = null;
  if (!q || !S.v) return;
  const p = pt(e);
  if (S.arrastre && q.tipo === 'ficha') {
    const a = S.arrastre; S.arrastre = null;
    if (p.y < geo().manoTop + 6) {
      const l = ladosDe(a.id);
      if (l.length === 1) intentarJugar(a.id, l[0]);
      else if (l.length === 2) {
        let mejor = l[0], md = 1e9;
        for (const lado of l) { const gh = S.lay.fantasmas[lado], pp = pantalla(gh.x, gh.y), d = Math.hypot(pp.x - p.x, pp.y - p.y); if (d < md) { md = d; mejor = lado; } }
        intentarJugar(a.id, mejor);
      } else intentarJugar(a.id);
    }
    S.sucio = true; return;
  }
  if (q.tipo === 'ficha') {
    if (S.sel === q.id) intentarJugar(q.id);
    else { seleccionar(q.id); if (!A.juego.confirmar && S.v.turno === S.v.yo && ladosDe(q.id).length === 1) intentarJugar(q.id); }
  } else if (q.tipo === 'ghost' && S.sel != null) intentarJugar(S.sel, q.lado);
  else if (q.tipo === 'pozo') H.alPozo && H.alPozo();
  else if (q.tipo === 'fondo' && !q.mov && S.sel != null) { S.sel = null; S.sucio = true; }
}

/* ---------- dibujo ---------- */
function particulas(x, y, n, col) {
  if (!D.particulas || !anim()) return;
  const cols = col || ['#ffd23d', '#ff6b4a', '#6dff6d', '#3df5ff', '#ff4fd8', '#fff'];
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 60 + Math.random() * 260; S.part.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, c: cols[i % cols.length], t: 0, vida: 0.9 + Math.random() * 0.8, r: 2 + Math.random() * 3 }); }
}
export function celebrar(x, y, n) { const g = geo(); particulas(x == null ? g.cx : x, y == null ? g.cy : y, n || 60); S.sucio = true; }

function pulsoLleg(f) { S.pulsos.push({ x: f.x, y: f.y, t0: performance.now() }); }

function texto(c, t, x, y, px, col, al, peso, max) {
  c.font = (peso || 700) + ' ' + Math.round(px * (A.acc.textoGrande ? 1.12 : 1)) + 'px system-ui, -apple-system, Segoe UI, sans-serif';
  c.textAlign = al || 'left'; c.textBaseline = 'middle'; c.fillStyle = col || '#fff';
  if (max && c.measureText(t).width > max) { while (t.length > 1 && c.measureText(t + '…').width > max) t = t.slice(0, -1); t += '…'; }
  c.fillText(t, x, y);
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }

function opciones(extra) {
  return { tema: A.tema, pips: A.pips, numeros: A.acc.numeros, sombra: D.sombras, detalle: D.detalle, ...extra };
}
function pintarChip(c, j, r, t) {
  const v = S.v, meta = S.meta, turno = v.turno === j, col = meta.colores[j] || '#3df5ff';
  const ausente = meta.tipos[j] === 'ausente';
  c.save();
  c.globalAlpha = ausente ? 0.55 : 1;
  c.fillStyle = turno ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.34)';
  rr(c, r.x, r.y, r.w, r.h, 14); c.fill();
  if (turno) { c.strokeStyle = col; c.lineWidth = 2.5; c.shadowColor = col; c.shadowBlur = D.sombras ? 14 : 0; c.stroke(); c.shadowBlur = 0; }
  const companero = v.cfg.modo === 'parejas' && unidad(j) === unidad(v.yo);
  c.fillStyle = col; c.beginPath(); c.arc(r.x + 20, r.y + 18, 12, 0, 6.283); c.fill();
  c.lineWidth = 2; c.strokeStyle = companero ? '#6dff6d' : 'rgba(255,255,255,.5)'; c.stroke();
  texto(c, (meta.nombres[j] || '?').trim().charAt(0).toUpperCase(), r.x + 20, r.y + 19, 13, '#111', 'center', 800);
  const bot = String(meta.tipos[j] || '').startsWith('bot');
  texto(c, (meta.nombres[j] || 'Jugador') + (bot ? ' 🤖' : ''), r.x + 37, r.y + 13, 12, '#fff', 'left', 700, r.w - 44);
  const pts = v.cfg.modo === 'parejas' ? '' : v.puntos[j] + ' pts';
  const sub = v.cfg.modo === 'parejas' ? (companero ? 'Compañero' : 'Rival') : pts;
  texto(c, sub + (v.cuentas[j] ? ' · ' + v.cuentas[j] : ''), r.x + 37, r.y + 27, 10, companero ? '#9dffb0' : '#c8c2ea', 'left', 600, r.w - 44);
  // fichas del rival: dorsos (o caras al terminar la mano)
  const cnt = v.fin ? v.fin.manos[j].length : v.cuentas[j];
  const fl = r.h < 62 ? 20 : 22, fw = fl / 2 + 1, disp = r.w - (r.h < 62 ? 100 : 16), paso = cnt > 1 ? Math.min(fw + 1, (disp - fw) / (cnt - 1)) : 0;
  const compacto = r.h < 62;
  const x0 = compacto ? r.x + r.w - 8 - fw / 2 - paso * (cnt - 1) : r.x + r.w / 2 - paso * (cnt - 1) / 2, y = compacto ? r.y + r.h / 2 : r.y + r.h - fl / 2 - 6;
  const dealT = Math.min(1, (performance.now() - S.tDeal) / 500);
  c.globalAlpha *= anim() ? dealT : 1;
  for (let i = 0; i < cnt; i++) {
    if (v.fin) { const id = v.fin.manos[j][i], p = R.par(v.max, id); ficha(c, { ...opciones({ sombra: false }), x: x0 + i * paso, y, ang: Math.PI / 2, len: fl, a: p[0], b: p[1] }); }
    else dorso(c, { tema: A.tema, sombra: false, x: x0 + i * paso, y, ang: Math.PI / 2, len: fl });
  }
  c.restore();
}

function pintarBurbujas(c, t) {
  S.burbujas = S.burbujas.filter((b) => t - b.t0 < 2600);
  for (const b of S.burbujas) {
    const p = (t - b.t0) / 2600, a = anclaChip(b.j), y = a.y + 30 - Math.min(1, p * 5) * 8, op = p > 0.8 ? (1 - p) / 0.2 : 1;
    c.save(); c.globalAlpha = op; c.font = '800 13px system-ui, sans-serif';
    const w = c.measureText(b.txt).width + 18;
    c.fillStyle = b.tipo === 'pase' ? '#ffd23d' : '#fff'; rr(c, a.x + 16 - 4, y + 18, w, 24, 12); c.fill();
    texto(c, b.txt, a.x + 16 + w / 2 - 4, y + 30, 13, '#111', 'center', 800);
    c.restore();
  }
}

function pintarFondo(c) {
  const clave = S.w + 'x' + S.h + A.mesa + D.detalle + S.k;
  if (!S.fondo || S.fondoClave !== clave) {
    const o = document.createElement('canvas'); o.width = S.cv.width; o.height = S.cv.height;
    const cc = o.getContext('2d'); cc.scale(S.k, S.k); fieltro(cc, S.w, S.h, A.mesa, D.detalle);
    S.fondo = o; S.fondoClave = clave;
  }
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(S.fondo, 0, 0); c.setTransform(S.k, 0, 0, S.k, 0, 0);
}

export function cuadro(t, dt) {
  const v = S.v; if (!v || !S.c) return;
  S.ahora = t;
  const g = geo();
  // vista automatica
  let mueve2 = false;
  if (S.auto) {
    const d = destinoVista(), k = anim() ? 1 - Math.exp(-dt * 0.006) : 1;
    if (Math.abs(d.s - S.vp.s) > 0.02 || Math.abs(d.x - S.vp.x) > 0.01 || Math.abs(d.y - S.vp.y) > 0.01) { S.vp.s = lerp(S.vp.s, d.s, k); S.vp.x = lerp(S.vp.x, d.x, k); S.vp.y = lerp(S.vp.y, d.y, k); mueve2 = true; }
  }
  // mano
  let mm = false;
  const kk = anim() ? 1 - Math.exp(-dt * 0.014) : 1;
  posicionarMano(false);
  for (const it of S.mano.values()) {
    if (it.delay > 0) { it.delay -= dt; it.al = 0; mm = true; continue; }
    if (it.al < 1) it.al = Math.min(1, it.al + dt / 120);
    if (Math.abs(it.x - it.tx) > 0.3 || Math.abs(it.y - it.ty) > 0.3 || it.esc < 0.995) { it.x = lerp(it.x, it.tx, kk); it.y = lerp(it.y, it.ty, kk); it.esc = lerp(it.esc, 1, kk); mm = true; } else { it.x = it.tx; it.y = it.ty; it.esc = 1; }
  }
  const turnoMio = v.turno === v.yo && !v.fin;
  const vivo = S.vuelos.length || S.pulsos.length || S.part.length || S.burbujas.length || mueve2 || mm || S.arrastre || (turnoMio && D.calidad !== 'baja' && anim()) || performance.now() - S.tDeal < 900 || performance.now() - S.ayudaPulso < 1500;
  if (!vivo && !S.sucio) return;
  S.sucio = false;
  const c = S.c;
  c.setTransform(S.k, 0, 0, S.k, 0, 0);
  pintarFondo(c);
  // rivales
  for (let j = 0; j < v.n; j++) { if (j === v.yo) continue; const r = g.chips[rel(j)]; if (r) pintarChip(c, j, r, t); }
  // pozo (duelo)
  if (v.cfg.modo === 'duelo') {
    const pz = g.pozo, n = Math.min(4, Math.ceil(v.pozo / 6));
    for (let i = 0; i < n; i++) dorso(c, { tema: A.tema, sombra: D.sombras, x: pz.x + i * 2, y: pz.y - i * 2, ang: 0.2 + i * 0.12, len: 38 });
    texto(c, String(v.pozo), pz.x + 4, pz.y + 28, 12, '#fff', 'center', 800);
    if (v.puedeRobar) { c.strokeStyle = '#ffd23d'; c.lineWidth = 2; c.beginPath(); c.arc(pz.x, pz.y, 28 + Math.sin(t / 220) * 2, 0, 6.283); c.stroke(); }
  }
  // cadena (recortada a la zona del tablero)
  c.save();
  c.beginPath(); c.rect(0, g.top, S.w, S.h - g.top); c.clip();
  const lay = S.lay, l = L * S.vp.s;
  const volando = new Map(S.vuelos.map((f) => [f.id, f]));
  const pulsoUlt = v.ult ? v.ult.id : -1;
  for (const f of lay.fichas) {
    if (!f || volando.has(f.id)) continue;
    const p = posFicha(f);
    if (p.x < -l || p.x > S.w + l || p.y < -l || p.y > S.h + l) continue;
    ficha(c, { ...opciones(), x: p.x, y: p.y, ang: f.ang, len: l, a: f.vi, b: f.vo, halo: f.id === pulsoUlt && D.sombras ? 'rgba(255,214,61,.9)' : null });
  }
  // extremos y fantasmas
  const ayuda = A.juego.ayudaExtremos;
  if (v.cadena.length || v.turno === v.yo) {
    const lados = S.sel != null ? ladosDe(S.sel) : [];
    const pulso = 0.5 + 0.5 * Math.sin(t / 260);
    for (const lado of ['i', 'd']) {
      if (!v.cadena.length && lado === 'i') continue;
      const gh = lay.fantasmas[lado], p = pantalla(gh.x, gh.y), act = lados.includes(lado);
      if (act && ayuda) fantasma(c, { x: p.x, y: p.y, ang: gh.ang, len: l, color: S.ladoPref === lado && lados.length > 1 ? '#ffd23d' : '#3df5ff', pulso: anim() ? pulso : 1 });
      if (v.ext) {
        const val = lado === 'i' ? v.ext.izq : v.ext.der;
        c.save(); c.globalAlpha = act ? 1 : 0.8;
        c.fillStyle = act ? '#06222a' : 'rgba(0,0,0,.55)'; c.beginPath(); c.arc(p.x, p.y, Math.max(9, l * 0.2), 0, 6.283); c.fill();
        c.lineWidth = 2; c.strokeStyle = act ? '#3df5ff' : 'rgba(255,255,255,.4)'; c.stroke();
        texto(c, String(val), p.x, p.y + 1, Math.max(11, l * 0.24), '#fff', 'center', 800);
        c.restore();
      }
    }
    if (!v.cadena.length && S.sel != null) { const gh = lay.fantasmas.d, p = pantalla(gh.x, gh.y); fantasma(c, { x: p.x, y: p.y, ang: 0, len: l, color: '#3df5ff', pulso }); }
  }
  // fichas en vuelo
  for (let i = S.vuelos.length - 1; i >= 0; i--) {
    const fl = S.vuelos[i], f = lay.fichas.find((x) => x && x.id === fl.id);
    if (!f) { S.vuelos.splice(i, 1); continue; }
    const p = Math.min(1, (t - fl.t0) / fl.dur), e = ease(p), dst = posFicha(f);
    const x = lerp(fl.de.x, dst.x, e), y0 = lerp(fl.de.y, dst.y, e), len = lerp(fl.de.len, dst.len, e) * (1 + 0.28 * Math.sin(Math.PI * p));
    const y = y0 - Math.sin(Math.PI * p) * dst.len * 0.55;
    ficha(c, { ...opciones(), x, y, ang: lerpAng(fl.de.ang, dst.ang, e), len, a: f.vi, b: f.vo, halo: 'rgba(255,255,255,.5)' });
    if (p >= 1) { S.vuelos.splice(i, 1); fx(S.vuelos.length % 2 ? 'ficha2' : 'ficha'); pulsoLleg(f); H.alAterrizar && H.alAterrizar(f); if (v.fin && v.fin.capicua && v.fin.ultima === f.id) { const q = pantalla(f.x, f.y); celebrar(q.x, q.y, 70); } }
  }
  // ondas al colocar
  S.pulsos = S.pulsos.filter((q) => t - q.t0 < 480);
  for (const q of S.pulsos) {
    const p = (t - q.t0) / 480, s = pantalla(q.x, q.y);
    c.strokeStyle = 'rgba(255,255,255,' + (0.55 * (1 - p)) + ')'; c.lineWidth = 3 * (1 - p) + 1;
    c.beginPath(); c.arc(s.x, s.y, l * (0.5 + p * 0.9), 0, 6.283); c.stroke();
  }
  c.restore();
  // mano propia
  const m = g.mano, cursorVisible = document.body.classList.contains('usando-teclado') || document.body.classList.contains('usando-mando');
  const jug = new Set(v.jugables.map((x) => x.id));
  S.ultMano = {};
  const ordenDib = S.orden.slice();
  if (S.sel != null) { const i = ordenDib.indexOf(S.sel); if (i >= 0) { ordenDib.splice(i, 1); ordenDib.push(S.sel); } }
  for (const id of ordenDib) {
    const it = S.mano.get(id); if (!it || it.al <= 0) continue;
    if (S.arrastre && S.arrastre.id === id) continue;
    const p = R.par(v.max, id), sel = S.sel === id, hov = S.hov === id && !sel;
    const playable = jug.has(id), dim = turnoMio && ayuda && !playable;
    const alz = (sel ? 0.34 : hov ? 0.12 : playable && turnoMio && ayuda ? 0.06 : 0) * m.len;
    const esc = (it.esc || 1) * (sel ? 1.08 : 1);
    S.ultMano[id] = { x: it.x, y: it.y - alz, len: m.len };
    ficha(c, { ...opciones(), x: it.x, y: it.y - alz, ang: Math.PI / 2, len: m.len * esc, a: p[0], b: p[1], alpha: it.al * (dim ? 0.55 : 1), halo: sel ? '#3df5ff' : playable && turnoMio && ayuda && D.calidad !== 'baja' ? 'rgba(255,255,255,.55)' : null, brillo: dim ? -0.6 : hov ? 0.6 : 0 });
    if (cursorVisible && S.orden[S.cur] === id) {
      c.save(); c.strokeStyle = '#3df5ff'; c.lineWidth = 2.5; c.setLineDash([5, 4]);
      rr(c, it.x - m.len / 4 - 4, it.y - alz - m.len / 2 - 4, m.len / 2 + 8, m.len + 8, 8); c.stroke(); c.restore();
    }
  }
  if (S.arrastre) {
    const a = S.arrastre, p = R.par(v.max, a.id);
    ficha(c, { ...opciones(), x: a.x, y: a.y - 18, ang: Math.PI / 2, len: m.len * 1.15, a: p[0], b: p[1], halo: '#3df5ff' });
  }
  pintarBurbujas(c, t);
  // particulas
  if (S.part.length) {
    const d = Math.min(0.05, dt / 1000);
    S.part = S.part.filter((q) => (q.t += d) < q.vida);
    for (const q of S.part) { q.vy += 520 * d; q.x += q.vx * d; q.y += q.vy * d; c.globalAlpha = Math.max(0, 1 - q.t / q.vida); c.fillStyle = q.c; c.fillRect(q.x, q.y, q.r * 1.6, q.r); }
    c.globalAlpha = 1;
  }
}

export function reiniciar() { S.v = null; S.mano.clear(); S.vistos = new Set(); S.vuelos = []; S.sel = null; S.part = []; S.burbujas = []; S.lay = null; }
export function sucio() { S.sucio = true; S.g = null; }

// Miniatura de una ficha como <canvas> (para paneles DOM).
export function miniFicha(a, b, len, vertical) {
  const cv = document.createElement('canvas'), k = Math.min(2, window.devicePixelRatio || 1), w = vertical ? len / 2 + 4 : len + 4, h = vertical ? len + 4 : len / 2 + 4;
  cv.width = w * k; cv.height = h * k; cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const c = cv.getContext('2d'); c.scale(k, k);
  ficha(c, { ...opciones({ sombra: false, detalle: true }), x: w / 2, y: h / 2, ang: vertical ? Math.PI / 2 : 0, len, a, b });
  return cv;
}
