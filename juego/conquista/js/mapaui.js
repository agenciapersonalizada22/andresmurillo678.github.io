// Mapa SVG: dibujo de territorios, fichas de ejercitos, resaltes, rutas maritimas, camara (zoom/arrastre/pellizco) y efectos.
import { TERR, W, H, MARES, CONTINENTES, BORDES, DE_CONT } from './mapa.js';
import { D, reducirMov } from './ajustes.js';
import { PALETA, PALETA_DALTO } from './sesion.js';

const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, kids) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs || {}) { if (attrs[k] == null) continue; if (k === 'txt') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
  for (const c of kids || []) if (c) e.appendChild(c);
  return e;
};
const luminancia = (c) => { const n = parseInt(c.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

export const Mapa = {
  svg: null, vp: null, paths: [], fichas: [], costuras: [], k: 1, tx: 0, ty: 0, meta: { k: 1, tx: 0, ty: 0 }, s: 1, x0: 0, y0: 0, Vw: W, Vh: H,
  alTocar: null, alHover: null, colores: [], alMover: null, ocupado: false
};

Mapa.colorDe = (i) => (D.acc.dalto ? PALETA_DALTO[i % 6] : (Mapa.colores[i] || PALETA[i % 6]));

Mapa.iniciar = (svg) => {
  Mapa.svg = svg; svg.textContent = '';
  const pat = (i) => sv('pattern', { id: 'pt' + i, width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(' + (i * 30) + ')' }, [
    [sv('path', { d: 'M0 2H8', stroke: '#000', 'stroke-width': 1.6, opacity: .5 })], [sv('circle', { cx: 4, cy: 4, r: 1.5, fill: '#000', opacity: .5 }), sv('circle', { cx: 0, cy: 0, r: 1.5, fill: '#000', opacity: .5 })],
    [sv('path', { d: 'M0 0L8 8M8 0L0 8', stroke: '#000', 'stroke-width': 1, opacity: .5 })], [sv('path', { d: 'M4 0V8', stroke: '#000', 'stroke-width': 2, opacity: .5 })],
    [sv('rect', { width: 4, height: 4, fill: '#000', opacity: .5 }), sv('rect', { x: 4, y: 4, width: 4, height: 4, fill: '#000', opacity: .5 })], [sv('path', { d: 'M0 6L2 8M6 0L8 2', stroke: '#000', 'stroke-width': 2.4, opacity: .5 })]
  ][i]);
  const defs = sv('defs', {}, [
    sv('radialGradient', { id: 'oceano', cx: '50%', cy: '45%', r: '75%' }, [sv('stop', { offset: '0', 'stop-color': 'var(--oc1)' }), sv('stop', { offset: '1', 'stop-color': 'var(--oc2)' })]),
    sv('pattern', { id: 'olas', width: 40, height: 14, patternUnits: 'userSpaceOnUse' }, [sv('path', { d: 'M0 7q10-6 20 0t20 0', fill: 'none', stroke: '#fff', 'stroke-width': .7, opacity: .12 })]),
    ...[0, 1, 2, 3, 4, 5].map(pat),
    sv('marker', { id: 'punta', viewBox: '0 0 10 10', refX: 7, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }, [sv('path', { d: 'M0 0L10 5L0 10z', fill: '#fff' })])
  ]);
  Mapa.vp = sv('g', { id: 'vp' });
  const oceano = sv('rect', { x: -2000, y: -1500, width: W + 4000, height: H + 3000, fill: 'url(#oceano)' });
  const olas = sv('rect', { id: 'olasR', x: -2000, y: -1500, width: W + 4000, height: H + 3000, fill: 'url(#olas)', 'pointer-events': 'none' });
  const gT = sv('g', { id: 'gTierra' }), gPat = sv('g', { id: 'gPat', 'pointer-events': 'none' }), gCos = sv('g', { id: 'gCostura', 'pointer-events': 'none' });
  TERR.forEach((t) => {
    const p = sv('path', { d: t.d, 'data-t': t.i, class: 'terr', 'shape-rendering': 'geometricPrecision' });
    Mapa.paths[t.i] = p; gT.appendChild(p);
    Mapa.costuras[t.i] = sv('path', { d: t.costura, fill: 'none', class: 'costura' }); gCos.appendChild(Mapa.costuras[t.i]);
    gPat.appendChild(sv('path', { d: t.d, 'data-p': t.i, class: 'pat', fill: 'none' }));
  });
  const bordes = sv('g', { 'pointer-events': 'none' }, [sv('path', { d: BORDES.fino, class: 'b-fino', fill: 'none' }), sv('path', { d: BORDES.cont, class: 'b-cont', fill: 'none' })]);
  const gEtq = sv('g', { id: 'gEtq', 'pointer-events': 'none' });
  CONTINENTES.forEach((c, ci) => {
    const ts = DE_CONT[ci].map((i) => TERR[i].lab);
    const cx = ts.reduce((s, p) => s + p[0], 0) / ts.length, cy = ts.reduce((s, p) => s + p[1], 0) / ts.length;
    gEtq.appendChild(sv('text', { x: cx, y: cy - 22, class: 'etq-c', fill: c.color, 'text-anchor': 'middle', txt: c.nombre.toUpperCase() }));
  });
  const gRutas = sv('g', { id: 'gRutas', 'pointer-events': 'none' });
  const ruta = (a, b) => { const A = TERR[a].lab, B = TERR[b].lab, mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1, k = Math.min(30, l * 0.12); return `M${A[0]} ${A[1]}Q${mx - (dy / l) * k} ${my + (dx / l) * k} ${B[0]} ${B[1]}`; };
  MARES.forEach(([a, b]) => {
    const A = TERR[a], B = TERR[b];
    if (A.id === 'ala' && B.id === 'kam') {
      gRutas.appendChild(sv('path', { d: `M${A.lab[0]} ${A.lab[1]}L0 ${A.lab[1]}`, class: 'ruta', fill: 'none' }));
      gRutas.appendChild(sv('path', { d: `M${B.lab[0]} ${B.lab[1]}L${W} ${B.lab[1]}`, class: 'ruta', fill: 'none' }));
    } else gRutas.appendChild(sv('path', { d: ruta(a, b), class: 'ruta', fill: 'none' }));
  });
  const gRes = sv('g', { id: 'gRes', 'pointer-events': 'none' }), gFi = sv('g', { id: 'gFichas', 'pointer-events': 'none' }), gFx = sv('g', { id: 'gFx', 'pointer-events': 'none' });
  TERR.forEach((t) => {
    const g = sv('g', { class: 'ficha', style: `transform:translate(${t.lab[0]}px,${t.lab[1]}px) scale(var(--ts,1))` }, [
      sv('circle', { r: 8.6, class: 'f-c' }), sv('text', { class: 'f-n', y: 3.4, 'text-anchor': 'middle', txt: '1' }), sv('text', { class: 'f-j', y: -10.2, 'text-anchor': 'middle' }), sv('text', { class: 'f-nom', y: 19, 'text-anchor': 'middle', txt: t.nombre })
    ]);
    Mapa.fichas[t.i] = g; gFi.appendChild(g);
  });
  Mapa.vp.append(gT, gPat, gCos, bordes, gEtq, gRutas, gRes, gFi, gFx);
  svg.append(defs, oceano, olas, Mapa.vp);
  Mapa.gRes = gRes; Mapa.gFx = gFx; Mapa.gFi = gFi;
  conectarGestos(svg);
  Mapa.medir(); Mapa.ver(true);
};

/* ---------- pintado ---------- */
// vis = {o:[], e:[]}; v = vista (para daltonismo / equipos)
Mapa.pintar = (vis, v) => {
  for (let i = 0; i < TERR.length; i++) {
    const o = vis.o[i], col = Mapa.colorDe(o), p = Mapa.paths[i], f = Mapa.fichas[i];
    if (p.dataset.o !== String(o) || p.dataset.dal !== String(D.acc.dalto)) { p.dataset.o = o; p.dataset.dal = D.acc.dalto; p.style.fill = col; Mapa.costuras[i].style.stroke = col; }
    const c = f.firstChild, n = c.nextSibling, jn = n.nextSibling;
    if (c.dataset.o !== String(o) || c.dataset.dal !== String(D.acc.dalto)) { c.dataset.o = o; c.dataset.dal = D.acc.dalto; c.style.fill = col; n.style.fill = luminancia(col) > 0.6 ? '#111' : '#fff'; }
    const txt = String(vis.e[i]); if (n.textContent !== txt) n.textContent = txt;
    const jt = D.acc.dalto || (v && v.cfg.modo === 'equipos') ? (v && v.cfg.modo === 'equipos' ? ['A', 'B', 'C'][v.jug[o].equipo] + (D.acc.dalto ? (o + 1) : '') : String(o + 1)) : '';
    if (jn.textContent !== jt) jn.textContent = jt;
  }
  const pats = Mapa.vp.querySelectorAll('.pat');
  pats.forEach((p) => { const i = +p.dataset.p; p.setAttribute('fill', D.acc.dalto ? 'url(#pt' + (vis.o[i] % 6) + ')' : 'none'); });
};

/* ---------- resaltes ---------- */
// r = {origen, destinos[], cursor, extra[]}
Mapa.resaltar = (r) => {
  const g = Mapa.gRes; g.textContent = '';
  const add = (i, cls) => { if (i == null || i < 0) return; g.appendChild(sv('path', { d: TERR[i].d, class: 'res ' + cls, fill: 'none' })); };
  (r.destinos || []).forEach((i) => add(i, 'r-dest'));
  (r.opciones || []).forEach((i) => add(i, 'r-opc'));
  add(r.origen, 'r-orig'); add(r.destino, 'r-sel'); add(r.cursor, 'r-cur');
  Mapa.vp.classList.toggle('con-res', !!((r.destinos && r.destinos.length) || (r.opciones && r.opciones.length)));
};

/* ---------- camara ---------- */
Mapa.medir = () => {
  const s = Mapa.svg, cw = s.clientWidth || 390, ch = s.clientHeight || 400;
  Mapa.s = Math.min(cw / W, ch / H); Mapa.Vw = cw / Mapa.s; Mapa.Vh = ch / Mapa.s; Mapa.x0 = (W - Mapa.Vw) / 2; Mapa.y0 = (H - Mapa.Vh) / 2;
};
function acotar(c) {
  const { Vw, Vh, x0, y0 } = Mapa;
  c.k = Math.max(1, Math.min(10, c.k));
  const mw = W * c.k, mh = H * c.k;
  c.tx = mw <= Vw ? x0 + (Vw - mw) / 2 : Math.max(x0 + Vw - mw, Math.min(x0, c.tx));
  c.ty = mh <= Vh ? y0 + (Vh - mh) / 2 : Math.max(y0 + Vh - mh, Math.min(y0, c.ty));
  return c;
}
function aplicarCam() {
  Mapa.vp.setAttribute('transform', `translate(${Mapa.tx.toFixed(2)} ${Mapa.ty.toFixed(2)}) scale(${Mapa.k.toFixed(4)})`);
  Mapa.svg.style.setProperty('--ts', String(Math.min(1.7, 1 / Math.pow(Mapa.k, 0.62))));
  Mapa.svg.style.setProperty('--ks', String(1 / Mapa.k));
  Mapa.svg.classList.toggle('zoom-cerca', Mapa.k > 2.3); Mapa.svg.classList.toggle('zoom-medio', Mapa.k > 1.5);
  Mapa.alMover && Mapa.alMover();
}
Mapa.ver = (ya) => { Mapa.irA(acotar({ k: 1, tx: 0, ty: 0 }), ya); };
Mapa.irA = (c, ya) => {
  acotar(c); Mapa.meta = { k: c.k, tx: c.tx, ty: c.ty };
  if (ya || reducirMov()) { Mapa.k = c.k; Mapa.tx = c.tx; Mapa.ty = c.ty; aplicarCam(); }
};
Mapa.enfocar = (lista, opt = {}) => {
  if (!lista || !lista.length) return Mapa.ver(opt.ya);
  const pts = lista.map((i) => TERR[i].lab);
  const minx = Math.min(...pts.map((p) => p[0])) - 55, maxx = Math.max(...pts.map((p) => p[0])) + 55, miny = Math.min(...pts.map((p) => p[1])) - 55, maxy = Math.max(...pts.map((p) => p[1])) + 55;
  const k = Math.max(opt.min || 1, Math.min(opt.max || 4, Mapa.Vw / (maxx - minx), Mapa.Vh / (maxy - miny)));
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  Mapa.irA({ k, tx: Mapa.x0 + Mapa.Vw / 2 - cx * k, ty: Mapa.y0 + Mapa.Vh / 2 - cy * k }, opt.ya);
};
Mapa.centrarEn = (i, k) => { const p = TERR[i].lab, kk = Math.max(Mapa.meta.k, k || Mapa.meta.k); Mapa.irA({ k: kk, tx: Mapa.x0 + Mapa.Vw / 2 - p[0] * kk, ty: Mapa.y0 + Mapa.Vh / 2 - p[1] * kk }); };
Mapa.zoom = (f, ux, uy) => { // ux,uy en unidades del mapa; por defecto el centro de la vista
  const m = Mapa.meta, cx = ux == null ? Mapa.x0 + Mapa.Vw / 2 : ux, cy = uy == null ? Mapa.y0 + Mapa.Vh / 2 : uy;
  const k = Math.max(1, Math.min(10, m.k * f)), r = k / m.k;
  Mapa.irA({ k, tx: cx - (cx - m.tx) * r, ty: cy - (cy - m.ty) * r });
};
Mapa.pan = (dxU, dyU, ya) => { const m = Mapa.meta; Mapa.irA({ k: m.k, tx: m.tx + dxU, ty: m.ty + dyU }, ya); };
Mapa.aPantalla = (i) => { const r = Mapa.svg.getBoundingClientRect(), p = TERR[i].lab; return [r.left + (p[0] * Mapa.k + Mapa.tx - Mapa.x0) * Mapa.s, r.top + (p[1] * Mapa.k + Mapa.ty - Mapa.y0) * Mapa.s]; };
Mapa.visibleEs = (i, margen = 0.12) => {
  const p = TERR[i].lab, m = Mapa.meta, x = p[0] * m.k + m.tx, y = p[1] * m.k + m.ty;
  return x > Mapa.x0 + Mapa.Vw * margen && x < Mapa.x0 + Mapa.Vw * (1 - margen) && y > Mapa.y0 + Mapa.Vh * margen && y < Mapa.y0 + Mapa.Vh * (1 - margen);
};
Mapa.seguir = (i) => { if (!Mapa.visibleEs(i)) Mapa.centrarEn(i, Math.max(Mapa.meta.k, 1.8)); };
// llamar una vez por cuadro
Mapa.cuadro = (dt) => {
  const m = Mapa.meta;
  if (Math.abs(m.k - Mapa.k) < 0.0005 && Math.abs(m.tx - Mapa.tx) < 0.02 && Math.abs(m.ty - Mapa.ty) < 0.02) { if (Mapa.k !== m.k || Mapa.tx !== m.tx || Mapa.ty !== m.ty) { Mapa.k = m.k; Mapa.tx = m.tx; Mapa.ty = m.ty; aplicarCam(); } return; }
  const a = 1 - Math.exp(-dt / 90);
  Mapa.k += (m.k - Mapa.k) * a; Mapa.tx += (m.tx - Mapa.tx) * a; Mapa.ty += (m.ty - Mapa.ty) * a; aplicarCam();
};

/* ---------- gestos ---------- */
function conectarGestos(svg) {
  const ptrs = new Map();
  let tap = null, pinch = null;
  const aU = (e) => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / Mapa.s + Mapa.x0, (e.clientY - r.top) / Mapa.s + Mapa.y0]; };
  const terrDe = (e) => { const t = e.target && e.target.closest ? e.target.closest('[data-t]') : null; return t ? +t.dataset.t : -1; };
  svg.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    Mapa.medir();
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { svg.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ }
    if (ptrs.size === 1) tap = { x: e.clientX, y: e.clientY, t: terrDe(e), mov: false, tm: performance.now() };
    else { if (tap) tap.mov = true; const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: Mapa.meta.k }; }
  });
  svg.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) { if (e.pointerType === 'mouse' && Mapa.alHover) Mapa.alHover(terrDe(e)); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 1) {
      if (tap && !tap.mov && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > (e.pointerType === 'mouse' ? 4 : 9)) tap.mov = true;
      if (tap && tap.mov) Mapa.pan(dx / Mapa.s, dy / Mapa.s, true);
    } else if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = svg.getBoundingClientRect();
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, ux = (cx - r.left) / Mapa.s + Mapa.x0, uy = (cy - r.top) / Mapa.s + Mapa.y0;
      const m = Mapa.meta, k = Math.max(1, Math.min(10, pinch.k * Math.pow(d / pinch.d, D.sensZoom))), rr = k / m.k;
      Mapa.irA({ k, tx: ux - (ux - m.tx) * rr + dx / Mapa.s / 2, ty: uy - (uy - m.ty) * rr + dy / Mapa.s / 2 }, true);
    }
  });
  const fin = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (tap && !tap.mov && e.type === 'pointerup' && ptrs.size === 0) { const t = tap.t; tap = null; Mapa.alTocar && Mapa.alTocar(t); }
    if (ptrs.size === 0) { tap = null; pinch = null; } else if (ptrs.size === 1) { pinch = null; if (tap) tap.mov = true; }
  };
  svg.addEventListener('pointerup', fin); svg.addEventListener('pointercancel', fin);
  svg.addEventListener('pointerleave', () => { if (Mapa.alHover && !ptrs.size) Mapa.alHover(-1); });
  svg.addEventListener('wheel', (e) => { e.preventDefault(); Mapa.medir(); const [ux, uy] = aU(e); Mapa.zoom(Math.exp(-e.deltaY * 0.0014 * D.sensZoom), ux, uy); }, { passive: false });
  svg.addEventListener('contextmenu', (e) => e.preventDefault());
}

/* ---------- efectos ---------- */
const limpiar = (el, ms) => setTimeout(() => el.remove(), ms);
Mapa.flecha = (d, hh, ms = 600, cls = '') => {
  if (reducirMov()) return;
  const A = TERR[d].lab, B = TERR[hh].lab, mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1, k = Math.min(18, l * 0.15);
  const p = sv('path', { d: `M${A[0]} ${A[1]}Q${mx - (dy / l) * k} ${my + (dx / l) * k} ${B[0]} ${B[1]}`, class: 'flecha ' + cls, fill: 'none', pathLength: 100, 'marker-end': 'url(#punta)' });
  p.style.animationDuration = Math.max(200, ms * 0.6) + 'ms'; Mapa.gFx.appendChild(p); limpiar(p, ms + 200);
};
Mapa.flotante = (t, texto, color = '#fff', dy = 0) => {
  if (reducirMov()) return;
  const p = TERR[t].lab, e = sv('text', { x: p[0], y: p[1] - 12 + dy, class: 'flot', fill: color, 'text-anchor': 'middle', txt: texto });
  Mapa.gFx.appendChild(e); limpiar(e, 1300);
};
Mapa.pulso = (t, color = '#fff') => {
  if (reducirMov() || !D.efectos) return;
  const p = TERR[t].lab, e = sv('circle', { cx: p[0], cy: p[1], r: 8, class: 'pulso', stroke: color, fill: 'none' });
  Mapa.gFx.appendChild(e); limpiar(e, 900);
};
Mapa.destello = (t) => {
  if (reducirMov()) return;
  const e = sv('path', { d: TERR[t].d, class: 'destello' }); Mapa.gFx.appendChild(e); limpiar(e, 800);
};
Mapa.chispas = (t, color) => {
  if (reducirMov() || !D.efectos) return;
  const p = TERR[t].lab;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + Math.random() * 0.5, r = 14 + Math.random() * 14;
    const e = sv('circle', { cx: p[0], cy: p[1], r: 1.7, fill: color, class: 'chispa' });
    e.style.setProperty('--dx', Math.cos(a) * r + 'px'); e.style.setProperty('--dy', Math.sin(a) * r + 'px');
    Mapa.gFx.appendChild(e); limpiar(e, 800);
  }
};
