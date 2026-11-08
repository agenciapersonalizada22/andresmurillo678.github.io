// Tablero en canvas 2D: mar animado, losetas con arte propio, piezas, ayudas de probabilidad, zoom y arrastre (raton, tactil, teclado, mando).
import { geo, pips } from './geometria.js';
import { dibujarLoseta, dibujarRecurso, hexPath, colorJug, COL_RES, shade, semilla } from './iconos.js';

const R3 = Math.sqrt(3);
const bucketDe = (px) => [96, 128, 192, 256, 384, 512].find((b) => b >= px) || 512;
export const colorCalor = (val) => { const t = Math.max(0, Math.min(1, (val - 2) / 11)); return `hsl(${215 - t * 165}, 85%, ${38 + t * 22}%)`; };

export class Tablero {
  constructor(canvas, cb) {
    this.cv = canvas; this.c = canvas.getContext('2d'); this.cb = cb;
    this.cam = { x: 0, y: 0, k: 1 }; this.dest = null; this.vel = { x: 0, y: 0 };
    this.v = null; this.G = null; this.cand = null; this.sel = null; this.calor = false; this.flash = null; this.sprites = {};
    this.W = 300; this.H = 300; this.ef = 1; this.base = 40; this.dirty = true; this.t = 0; this.tUlt = 0;
    this.nacidos = new Map(); this.prev = null; this.ladronPos = null; this.ladronAnim = null; this.activo = true;
    this.ptr = new Map(); this.pinch = null; this.movido = false; this.largo = 0; this.hover = -1;
    this.ondas = Array.from({ length: 14 }, (_, i) => ({ y: i / 14, f: 0.6 + semilla(i + 3)() * 0.9, a: 0.004 + semilla(i + 9)() * 0.01, v: 0.02 + semilla(i + 5)() * 0.04, o: semilla(i + 1)() * 6 }));
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas.parentNode || canvas);
    this.enlazar();
  }
  opt() { return this.cb.opts(); }
  /* ---------- estado ---------- */
  setVista(v) {
    const nuevo = !this.v || this.v.cfg.radio !== v.cfg.radio;
    if (nuevo) { this.G = geo(v.cfg.radio); this.prev = null; this.nacidos.clear(); this.ladronPos = null; this.cam = { x: (this.G.caja.x0 + this.G.caja.x1) / 2, y: (this.G.caja.y0 + this.G.caja.y1) / 2, k: 1 }; this.calcBase(); }
    if (this.prev) {
      const ahora = performance.now();
      v.vc.forEach((c, i) => { if (c !== this.prev.vc[i] || v.vj[i] !== this.prev.vj[i]) this.nacidos.set('v' + i, ahora); });
      v.ed.forEach((p, i) => { if (p !== this.prev.ed[i]) this.nacidos.set('e' + i, ahora); });
    }
    const hi = v.ladron, gp = this.G.hexes[hi];
    if (!this.ladronPos) this.ladronPos = { x: gp.x, y: gp.y, hi };
    else if (this.ladronPos.hi !== hi) this.ladronAnim = { x0: this.ladronPos.x, y0: this.ladronPos.y, x1: gp.x, y1: gp.y, t0: performance.now(), hi };
    this.prev = { vc: v.vc.slice(), vj: v.vj.slice(), ed: v.ed.slice() };
    this.v = v; this.dirty = true;
  }
  setCandidatos(tipo, ids, etiquetas) { this.cand = tipo && ids && ids.length ? { tipo, ids, set: new Set(ids), et: etiquetas || null } : null; if (!this.cand) this.sel = null; this.dirty = true; }
  setSeleccion(tipo, id) { this.sel = tipo == null ? null : { tipo, id }; this.dirty = true; }
  setCalor(b) { this.calor = b; this.dirty = true; }
  destacarNumero(num) { this.flash = { num, t0: performance.now() }; this.dirty = true; }
  invalidar() { this.dirty = true; }
  limpiarSprites() { this.sprites = {}; this.dirty = true; }

  /* ---------- camara ---------- */
  calcBase() { const b = this.G.caja; this.base = Math.min(this.W / (b.x1 - b.x0), this.H / (b.y1 - b.y0)); }
  get s() { return this.base * this.cam.k; }
  aPantalla(wx, wy) { const s = this.s; return [this.W / 2 + (wx - this.cam.x) * s, this.H / 2 + (wy - this.cam.y) * s]; }
  aMundo(px, py) { const s = this.s; return [(px - this.W / 2) / s + this.cam.x, (py - this.H / 2) / s + this.cam.y]; }
  limitar() {
    const b = this.G.caja, s = this.s, mx = Math.max(0, (b.x1 - b.x0) / 2 - this.W / 2 / s * 0.55), my = Math.max(0, (b.y1 - b.y0) / 2 - this.H / 2 / s * 0.55);
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    this.cam.x = Math.max(cx - mx - 1.6, Math.min(cx + mx + 1.6, this.cam.x)); this.cam.y = Math.max(cy - my - 1.6, Math.min(cy + my + 1.6, this.cam.y));
    this.cam.k = Math.max(0.7, Math.min(4.5, this.cam.k));
  }
  zoomPor(f, px, py) {
    if (!this.G) return;
    if (px == null) { px = this.W / 2; py = this.H / 2; }
    const [wx, wy] = this.aMundo(px, py);
    this.cam.k = Math.max(0.7, Math.min(4.5, this.cam.k * f));
    const s = this.s; this.cam.x = wx - (px - this.W / 2) / s; this.cam.y = wy - (py - this.H / 2) / s;
    this.limitar(); this.dirty = true;
  }
  panPx(dx, dy) { if (!this.G) return; const s = this.s; this.cam.x -= dx / s; this.cam.y -= dy / s; this.limitar(); this.dirty = true; }
  centrar() { if (!this.G) return; const b = this.G.caja; this.irA((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 1); }
  irA(x, y, k) { this.dest = { x, y, k: k == null ? this.cam.k : k }; this.dirty = true; }
  enfocar(tipo, id, k) {
    if (!this.G) return;
    let p;
    if (tipo === 'v') p = this.G.verts[id]; else if (tipo === 'e') p = this.G.aristas[id]; else p = this.G.hexes[id];
    const [px, py] = this.aPantalla(p.x, p.y);
    if (px > this.W * 0.12 && px < this.W * 0.88 && py > this.H * 0.12 && py < this.H * 0.88 && !k) return;
    this.irA(p.x, p.y, k || Math.max(this.cam.k, 1.15));
  }
  resize() {
    const r = (this.cv.parentNode || this.cv).getBoundingClientRect();
    const W = Math.max(50, Math.round(r.width)), H = Math.max(50, Math.round(r.height));
    const D = this.opt().D, dpr = window.devicePixelRatio || 1;
    this.ef = D.resolucion === 'auto' ? Math.min(dpr, 2) : +D.resolucion;
    if (W !== this.W || H !== this.H || this.cv.width !== Math.round(W * this.ef)) {
      const antes = this.base; this.W = W; this.H = H;
      this.cv.width = Math.round(W * this.ef); this.cv.height = Math.round(H * this.ef);
      this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
      if (this.G) { this.calcBase(); if (antes !== this.base) this.limitar(); }
    }
    this.dirty = true;
  }

  /* ---------- entrada ---------- */
  enlazar() {
    const cv = this.cv;
    cv.style.touchAction = 'none';
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', (e) => {
      const [x, y] = pos(e); try { cv.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ }
      this.ptr.set(e.pointerId, { x, y, x0: x, y0: y, t0: performance.now() }); this.vel = { x: 0, y: 0 };
      if (this.ptr.size === 1) { this.movido = false; this.dest = null; clearTimeout(this.largo); this.largo = setTimeout(() => { if (this.ptr.size === 1 && !this.movido) { const p = [...this.ptr.values()][0]; this.movido = true; this.cb.info && this.cb.info(this.hexEn(p.x, p.y), p.x, p.y, true); } }, 480); }
      if (this.ptr.size === 2) { const [a, b] = [...this.ptr.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; this.movido = true; clearTimeout(this.largo); }
    });
    cv.addEventListener('pointermove', (e) => {
      const [x, y] = pos(e), p = this.ptr.get(e.pointerId);
      if (!p) { if (e.pointerType === 'mouse') { const hx = this.hexEn(x, y); const i = hx == null ? -1 : hx; if (i !== this.hover) { this.hover = i; this.cb.info && this.cb.info(hx, x, y, false); } else if (hx != null && this.cb.infoMover) this.cb.infoMover(x, y); } return; }
      const D = this.opt().D;
      if (this.ptr.size === 1) {
        const dx = x - p.x, dy = y - p.y;
        if (!this.movido && Math.hypot(x - p.x0, y - p.y0) > 8) { this.movido = true; clearTimeout(this.largo); this.cb.info && this.cb.info(null); }
        if (this.movido) { this.panPx(dx * D.sensPan, dy * D.sensPan); this.vel = { x: dx * D.sensPan, y: dy * D.sensPan }; }
        p.x = x; p.y = y;
      } else if (this.ptr.size === 2) {
        p.x = x; p.y = y; const [a, b] = [...this.ptr.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        this.panPx((cx - this.pinch.cx) * D.sensPan, (cy - this.pinch.cy) * D.sensPan);
        this.zoomPor(Math.pow(d / this.pinch.d, D.sensZoom), cx, cy); this.pinch = { d, cx, cy };
      }
    });
    const fin = (e) => {
      const p = this.ptr.get(e.pointerId); if (!p) return;
      clearTimeout(this.largo); this.ptr.delete(e.pointerId);
      if (this.ptr.size === 0 && !this.movido && performance.now() - p.t0 < 700) this.cb.toque(this.hit(p.x, p.y), p.x, p.y);
      else if (this.ptr.size === 0 && this.movido) this.cb.info && e.pointerType !== 'mouse' && this.cb.info(null);
      if (this.ptr.size < 2) this.pinch = null;
      if (this.ptr.size === 1) { const q = [...this.ptr.values()][0]; q.x0 = q.x; q.y0 = q.y; }
    };
    cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', (e) => { this.ptr.delete(e.pointerId); clearTimeout(this.largo); });
    cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && this.hover !== -1) { this.hover = -1; this.cb.info && this.cb.info(null); } });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = pos(e); this.zoomPor(Math.exp(-e.deltaY * 0.0016 * this.opt().D.sensZoom), x, y); }, { passive: false });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  hexEn(px, py) {
    if (!this.G) return null;
    const [wx, wy] = this.aMundo(px, py);
    let mejor = null, md = 0.9;
    this.G.hexes.forEach((h, i) => { const d = Math.hypot(h.x - wx, h.y - wy); if (d < md) { md = d; mejor = i; } });
    return mejor;
  }
  hit(px, py) {
    if (!this.G) return null;
    const [wx, wy] = this.aMundo(px, py), s = this.s;
    if (this.cand) {
      const { tipo, ids } = this.cand; let mejor = null, md = 1e9;
      if (tipo === 'v') { const r = Math.max(0.3, 22 / s); for (const i of ids) { const p = this.G.verts[i], d = Math.hypot(p.x - wx, p.y - wy); if (d < r && d < md) { md = d; mejor = i; } } }
      else if (tipo === 'e') {
        const r = Math.max(0.24, 18 / s);
        for (const i of ids) { const A = this.G.aristas[i], a = this.G.verts[A.a], b = this.G.verts[A.b]; const d = distSeg(wx, wy, a.x, a.y, b.x, b.y); if (d < r && d < md) { md = d; mejor = i; } }
      } else { for (const i of ids) { const p = this.G.hexes[i], d = Math.hypot(p.x - wx, p.y - wy); if (d < 0.9 && d < md) { md = d; mejor = i; } } }
      if (mejor != null) return { tipo, id: mejor };
    }
    const h = this.hexEn(px, py);
    return h == null ? null : { tipo: 'info', id: h };
  }
  siguienteCandidato(dx, dy) { // navegacion con mando/teclado entre candidatos
    if (!this.cand || !this.G) return null;
    const pos = (i) => (this.cand.tipo === 'v' ? this.G.verts[i] : this.cand.tipo === 'e' ? this.G.aristas[i] : this.G.hexes[i]);
    const act = this.sel && this.sel.tipo === this.cand.tipo && this.cand.set.has(this.sel.id) ? pos(this.sel.id) : null;
    const [cx0, cy0] = act ? [act.x, act.y] : this.aMundo(this.W / 2, this.H / 2);
    let mejor = null, md = 1e9;
    for (const cono of [true, false]) {
      for (const i of this.cand.ids) {
        if (this.sel && i === this.sel.id) continue;
        const p = pos(i), x = p.x - cx0, y = p.y - cy0, av = dx * x + dy * y, lat = Math.abs(dx ? y : x);
        if (!act && !(dx || dy)) { const d = Math.hypot(x, y); if (d < md) { md = d; mejor = i; } continue; }
        if (av <= 0.02 || (cono && av < lat * 0.7)) continue;
        const d = av + lat * 2.2; if (d < md) { md = d; mejor = i; }
      }
      if (mejor != null) break;
    }
    return mejor;
  }

  /* ---------- dibujo ---------- */
  cuadro(t) {
    this.t = t / 1000;
    const { D, A } = this.opt(), dt = Math.min(0.1, this.t - this.tUlt || 0.016);
    if (D.fpsMax && t - (this.ultDib || 0) < 1000 / D.fpsMax - 2) return false;
    let anim = false;
    if (this.dest) {
      const k = 1 - Math.pow(0.001, dt * (A.acc.reducirMov ? 30 : 4));
      this.cam.x += (this.dest.x - this.cam.x) * k; this.cam.y += (this.dest.y - this.cam.y) * k; this.cam.k += (this.dest.k - this.cam.k) * k;
      if (Math.abs(this.dest.x - this.cam.x) + Math.abs(this.dest.y - this.cam.y) + Math.abs(this.dest.k - this.cam.k) < 0.004) this.dest = null;
      this.limitar(); anim = true;
    }
    if (!this.ptr.size && (Math.abs(this.vel.x) > 0.4 || Math.abs(this.vel.y) > 0.4) && !A.acc.reducirMov) { this.panPx(this.vel.x, this.vel.y); this.vel.x *= 0.9; this.vel.y *= 0.9; anim = true; }
    const ahora = performance.now();
    if (this.ladronAnim) { const u = (ahora - this.ladronAnim.t0) / 520, a = this.ladronAnim; const e = u >= 1 ? 1 : 1 - Math.pow(1 - u, 3); this.ladronPos = { x: a.x0 + (a.x1 - a.x0) * e, y: a.y0 + (a.y1 - a.y0) * e - Math.sin(e * Math.PI) * 0.35, hi: a.hi }; if (u >= 1) { this.ladronPos.y = a.y1; this.ladronAnim = null; } anim = true; }
    if (this.flash && ahora - this.flash.t0 > 1600) this.flash = null;
    if (this.flash || this.nacidos.size) { anim = true; for (const [k, t0] of this.nacidos) if (ahora - t0 > 600) this.nacidos.delete(k); }
    const continuo = !A.acc.reducirMov && (D.olas || this.cand);
    if (!this.dirty && !anim && !continuo) { this.tUlt = this.t; return false; }
    this.tUlt = this.t; this.ultDib = t; this.dirty = false;
    if (this.v && this.G) this.dibujar(ahora, D, A);
    return true;
  }
  sprite(tipo, variante) {
    const D = this.opt().D;
    const bucket = bucketDe(Math.ceil(2 * this.s * this.ef * 1.05)), k = tipo + variante + '_' + bucket + (D.sombras ? 's' : '');
    let sp = this.sprites[k];
    if (!sp) {
      const cv = document.createElement('canvas'); cv.width = Math.ceil(bucket * R3 / 2) + 2; cv.height = bucket + 2;
      const c = cv.getContext('2d'); c.imageSmoothingEnabled = true;
      c.setTransform(bucket / 2, 0, 0, bucket / 2, cv.width / 2, cv.height / 2);
      dibujarLoseta(c, tipo, variante, D.sombras);
      sp = this.sprites[k] = { cv, k: bucket / 2 };
    }
    return sp;
  }
  dibujar(ahora, D, A) {
    const c = this.c, v = this.v, G = this.G, ef = this.ef, s = this.s, W = this.W, H = this.H;
    c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = D.antialias; c.imageSmoothingQuality = D.antialias ? 'high' : 'low';
    // mar
    const g = c.createLinearGradient(0, 0, 0, H * ef); g.addColorStop(0, '#0e5a85'); g.addColorStop(0.55, '#127aa0'); g.addColorStop(1, '#0b4a73');
    c.fillStyle = g; c.fillRect(0, 0, W * ef, H * ef);
    c.setTransform(ef * s, 0, 0, ef * s, (W / 2 - this.cam.x * s) * ef, (H / 2 - this.cam.y * s) * ef);
    const b = G.caja;
    if (D.olas && !A.acc.reducirMov || D.olas) this.olas(c, b, this.t, A.acc.reducirMov);
    // playa
    c.save();
    if (D.sombras) { c.shadowColor = 'rgba(0,30,60,.5)'; c.shadowBlur = Math.min(40, 0.35 * s) * ef; c.shadowOffsetY = 0.06 * s * ef; }
    G.hexes.forEach((h) => { c.save(); c.translate(h.x, h.y); hexPath(c, 1.13); c.fillStyle = '#e9d7a0'; c.fill(); c.restore(); });
    c.restore();
    G.hexes.forEach((h) => { c.save(); c.translate(h.x, h.y); hexPath(c, 1.05); c.fillStyle = '#f5e8bc'; c.fill(); c.restore(); });
    // espuma en la costa
    if (D.olas && !A.acc.reducirMov) { c.save(); c.strokeStyle = `rgba(255,255,255,${0.35 + 0.2 * Math.sin(this.t * 1.6)})`; c.lineWidth = 0.04; c.beginPath(); G.costa.forEach((e) => { const A2 = G.aristas[e], a = G.verts[A2.a], bb = G.verts[A2.b], h = G.hexes[A2.hs[0]]; const ox = (A2.x - h.x) * 0.16, oy = (A2.y - h.y) * 0.16; c.moveTo(a.x + ox * 1.5, a.y + oy * 1.5); c.lineTo(bb.x + ox * 1.5, bb.y + oy * 1.5); }); c.stroke(); c.restore(); }
    // losetas
    G.hexes.forEach((h, i) => {
      const t = v.hex[i].t, sp = this.sprite(t, i % 3), w = sp.cv.width / sp.k, hh = sp.cv.height / sp.k;
      c.drawImage(sp.cv, h.x - w / 2, h.y - hh / 2, w, hh);
    });
    // numeros
    const detalle = s > 24;
    G.hexes.forEach((h, i) => {
      const hx = v.hex[i];
      if (this.flash && this.flash.num === hx.num && hx.num) { const u = (ahora - this.flash.t0) / 1600, a = Math.max(0, 1 - u); c.save(); c.translate(h.x, h.y); hexPath(c, 0.98); c.fillStyle = `rgba(255,255,255,${0.35 * a * (0.6 + 0.4 * Math.sin(u * 25))})`; c.fill(); c.lineWidth = 0.09; c.strokeStyle = `rgba(255,240,150,${a})`; c.stroke(); c.restore(); }
      if (!hx.num) return;
      this.ficha(c, h.x + 0, h.y + (i === v.ladron ? 0.0 : 0.0), hx.num, A, detalle, i === v.ladron);
    });
    // puertos
    v.puertos.forEach((p) => this.puerto(c, p, G, v, A));
    // caminos y edificios
    const dalto = A.acc.daltonico;
    for (let e = 0; e < v.ed.length; e++) if (v.ed[e] >= 0) this.camino(c, G.aristas[e], G, colorJug(v.ed[e], dalto), D, ahora, 'e' + e);
    for (let i = 0; i < v.vj.length; i++) if (v.vj[i] >= 0) this.casa(c, G.verts[i], colorJug(v.vj[i], dalto), v.vc[i], D, ahora, 'v' + i, dalto ? v.vj[i] + 1 : 0);
    // bandido
    const lp = this.ladronPos; if (lp) this.bandido(c, lp.x, lp.y + 0.12, D);
    // candidatos
    if (this.cand) this.candidatos(c, v, G, D);
    c.setTransform(1, 0, 0, 1, 0, 0);
  }
  olas(c, b, t, quieto) {
    c.save(); c.lineWidth = 0.035; c.lineCap = 'round';
    const n = this.ondas.length, tt = quieto ? 0 : t;
    for (let i = 0; i < n; i++) {
      const o = this.ondas[i], y0 = b.y0 - 2 + (b.y1 - b.y0 + 4) * o.y;
      c.strokeStyle = `rgba(255,255,255,${0.07 + 0.05 * Math.sin(tt * 0.7 + o.o)})`;
      c.beginPath();
      for (let x = b.x0 - 2; x <= b.x1 + 2; x += 0.45) { const y = y0 + Math.sin(x * o.f * 1.4 + tt * o.v * 6 + o.o) * o.a * 14; x === b.x0 - 2 ? c.moveTo(x, y) : c.lineTo(x, y); }
      c.stroke();
    }
    c.restore();
  }
  ficha(c, x, y, num, A, detalle, tapada) {
    c.save(); c.translate(x, y);
    if (tapada) c.globalAlpha = 0.55;
    const rojo = num === 6 || num === 8, r = 0.3;
    c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = this.opt().D.sombras ? 5 : 0; c.shadowOffsetY = 1;
    const g = c.createRadialGradient(-0.08, -0.1, 0.03, 0, 0, r); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#eadbb0');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.shadowColor = 'transparent';
    c.lineWidth = A.acc.daltonico && rojo ? 0.075 : 0.035; c.strokeStyle = rojo ? '#b3261e' : '#6b5a34'; c.stroke();
    c.fillStyle = rojo ? '#c4251d' : '#2b2416'; c.font = `800 ${num > 9 ? 0.27 : 0.31}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(num), 0, A.ayudas.pips && detalle ? -0.04 : 0.01);
    if (A.ayudas.pips && detalle) { const n = pips(num); c.fillStyle = rojo ? '#c4251d' : '#4a3d22'; for (let i = 0; i < n; i++) { c.beginPath(); c.arc((i - (n - 1) / 2) * 0.062, 0.17, 0.024, 0, 7); c.fill(); } }
    c.restore();
  }
  puerto(c, p, G, v, A) {
    const E = G.aristas[p.e], a = G.verts[E.a], b = G.verts[E.b], h = G.hexes[E.hs[0]];
    let dx = E.x - h.x, dy = E.y - h.y; const n = Math.hypot(dx, dy); dx /= n; dy /= n;
    const px = E.x + dx * 0.78, py = E.y + dy * 0.78;
    c.save(); c.lineCap = 'round';
    c.strokeStyle = '#7a5230'; c.lineWidth = 0.07; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(px - dx * 0.1 - dy * 0.12, py - dy * 0.1 + dx * 0.12); c.moveTo(b.x, b.y); c.lineTo(px - dx * 0.1 + dy * 0.12, py - dy * 0.1 - dx * 0.12); c.stroke();
    c.strokeStyle = '#c99a62'; c.lineWidth = 0.035; c.stroke();
    c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = this.opt().D.sombras ? 6 : 0;
    c.fillStyle = '#17395a'; c.beginPath(); c.arc(px, py, 0.3, 0, 7); c.fill(); c.shadowColor = 'transparent';
    c.lineWidth = 0.045; c.strokeStyle = p.t === 'gen' ? '#9fb9d6' : COL_RES[p.t]; c.stroke();
    dibujarRecurso(c, p.t, px, py - 0.045, p.t === 'gen' ? 0.16 : 0.17);
    c.fillStyle = '#fff'; c.font = '800 0.15px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.t === 'gen' ? '3:1' : '2:1', px, py + 0.2);
    c.restore();
  }
  camino(c, E, G, col, D, ahora, key) {
    const a = G.verts[E.a], b = G.verts[E.b];
    const t0 = this.nacidos.get(key), u = t0 ? Math.min(1, (ahora - t0) / 380) : 1;
    const dx = b.x - a.x, dy = b.y - a.y, k = 0.14, L = 1 - k * 2;
    const x0 = a.x + dx * k, y0 = a.y + dy * k, x1 = x0 + dx * L * u, y1 = y0 + dy * L * u;
    c.save(); c.lineCap = 'round';
    c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 0.2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = col; c.lineWidth = 0.14; c.stroke();
    if (D.sombras) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.04; c.beginPath(); c.moveTo(x0 - dy * 0.03, y0 + dx * 0.03); c.lineTo(x1 - dy * 0.03, y1 + dx * 0.03); c.stroke(); }
    c.restore();
  }
  casa(c, p, col, nivel, D, ahora, key, marca) {
    const t0 = this.nacidos.get(key); let u = t0 ? Math.min(1, (ahora - t0) / 420) : 1;
    const esc = u < 1 ? 1 + 0.35 * Math.sin(u * Math.PI) - (1 - u) * 0.7 : 1;
    c.save(); c.translate(p.x, p.y - 0.02); c.scale(esc, esc); c.lineJoin = 'round';
    if (D.sombras) { c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(0.03, 0.17, nivel === 2 ? 0.3 : 0.22, 0.07, 0, 0, 7); c.fill(); }
    const cuerpo = (x, y, w, h) => { const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, shade(col, 0.25)); g.addColorStop(1, col); c.fillStyle = g; c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h); };
    c.strokeStyle = 'rgba(0,0,0,.75)'; c.lineWidth = 0.04;
    const techo = (x0, x1, y0, ym) => { c.fillStyle = shade(col, -0.35); c.beginPath(); c.moveTo(x0 - 0.04, y0); c.lineTo((x0 + x1) / 2, ym); c.lineTo(x1 + 0.04, y0); c.closePath(); c.fill(); c.stroke(); };
    if (nivel === 1) { cuerpo(-0.16, -0.04, 0.32, 0.2); techo(-0.16, 0.16, -0.04, -0.3); c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(-0.04, 0.05, 0.08, 0.11); }
    else {
      cuerpo(-0.27, -0.02, 0.54, 0.2); techo(-0.27, -0.02, -0.02, -0.2);
      cuerpo(0.0, -0.3, 0.26, 0.48); techo(0.0, 0.26, -0.3, -0.5);
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(-0.2, 0.06, 0.07, 0.12); c.fillRect(0.08, -0.12, 0.07, 0.1);
      c.strokeStyle = '#fff'; c.lineWidth = 0.025; c.beginPath(); c.moveTo(0.13, -0.5); c.lineTo(0.13, -0.66); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0.13, -0.66); c.lineTo(0.27, -0.61); c.lineTo(0.13, -0.56); c.fill();
    }
    if (marca) { c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 0.05; c.font = '900 0.22px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; const mx = nivel === 2 ? -0.13 : 0, my = nivel === 2 ? 0.08 : 0.1; c.strokeText(marca, mx, my); c.fillText(marca, mx, my); }
    c.restore();
  }
  bandido(c, x, y, D) {
    c.save(); c.translate(x, y);
    if (D.sombras) { c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(0, 0.3, 0.28, 0.09, 0, 0, 7); c.fill(); }
    const g = c.createLinearGradient(0, -0.4, 0, 0.3); g.addColorStop(0, '#2f2f45'); g.addColorStop(1, '#0f0f1a');
    c.fillStyle = g; c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 0.03; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(0, -0.42); c.quadraticCurveTo(0.2, -0.38, 0.22, -0.18); c.quadraticCurveTo(0.34, 0.1, 0.3, 0.3); c.lineTo(-0.3, 0.3); c.quadraticCurveTo(-0.34, 0.1, -0.22, -0.18); c.quadraticCurveTo(-0.2, -0.38, 0, -0.42); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#070710'; c.beginPath(); c.ellipse(0, -0.16, 0.12, 0.14, 0, 0, 7); c.fill();
    c.fillStyle = '#ffd23d'; c.beginPath(); c.arc(-0.045, -0.17, 0.025, 0, 7); c.arc(0.045, -0.17, 0.025, 0, 7); c.fill();
    c.restore();
  }
  candidatos(c, v, G, D) {
    const { tipo, ids, et } = this.cand, pulso = this.opt().A.acc.reducirMov ? 0 : Math.sin(this.t * 5), calor = this.calor && tipo === 'v';
    c.save();
    for (const i of ids) {
      const esSel = this.sel && this.sel.tipo === tipo && this.sel.id === i;
      if (tipo === 'v') {
        const p = G.verts[i], val = et ? et[i] : null, r = (esSel ? 0.3 : (calor ? 0.23 : 0.2)) + 0.02 * pulso;
        c.beginPath(); c.arc(p.x, p.y, r, 0, 7);
        c.fillStyle = calor && val != null ? colorCalor(val) : (esSel ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.62)'); c.fill();
        c.lineWidth = esSel ? 0.07 : 0.04; c.strokeStyle = esSel ? '#3df5ff' : 'rgba(0,0,0,.65)'; c.stroke();
        if (val != null && (calor || esSel)) { c.fillStyle = calor ? '#fff' : '#111'; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 0.04; c.font = '800 0.25px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; if (calor) c.strokeText(String(val), p.x, p.y + 0.01); c.fillText(String(val), p.x, p.y + 0.01); }
      } else if (tipo === 'e') {
        const E = G.aristas[i], a = G.verts[E.a], b = G.verts[E.b];
        c.lineCap = 'round'; c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = esSel ? 0.26 : 0.2; c.beginPath(); c.moveTo(a.x + (b.x - a.x) * 0.13, a.y + (b.y - a.y) * 0.13); c.lineTo(b.x + (a.x - b.x) * 0.13, b.y + (a.y - b.y) * 0.13); c.stroke();
        c.strokeStyle = esSel ? '#3df5ff' : `rgba(255,255,255,${0.7 + 0.15 * pulso})`; c.lineWidth = esSel ? 0.18 : 0.13; c.stroke();
      } else {
        const h = G.hexes[i]; c.save(); c.translate(h.x, h.y); hexPath(c, 0.95);
        c.fillStyle = esSel ? 'rgba(61,245,255,.3)' : 'rgba(255,255,255,.18)'; c.fill(); c.lineWidth = esSel ? 0.08 : 0.05; c.strokeStyle = esSel ? '#3df5ff' : `rgba(255,255,255,${0.7 + 0.2 * pulso})`; c.stroke();
        if (et && et[i] != null) { c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 0.05; c.font = '800 0.2px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText(et[i], 0, 0.45); c.fillText(et[i], 0, 0.45); }
        c.restore();
      }
    }
    c.restore();
  }
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
