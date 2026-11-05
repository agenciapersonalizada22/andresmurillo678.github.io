// Lienzo: camara (zoom/pan), cache de objetos fuera de pantalla, capa superior de efectos y bucle de dibujo.
import { dibujarFondo, dibujarObjetos, dibujarObjeto } from './dibujo.js';

export class Vista {
  constructor(cont, app) {
    this.app = app; this.doc = app.doc; this.cont = cont;
    this.lienzo = cont.querySelector('#lienzo'); this.sup = cont.querySelector('#superior');
    this.ctx = this.lienzo.getContext('2d'); this.sctx = this.sup.getContext('2d');
    this.cache = document.createElement('canvas'); this.cctx = this.cache.getContext('2d');
    this.pg = null; this.camaras = new Map(); this.W = 300; this.H = 300; this.dpr = 1;
    this.capasSup = []; this.ocultos = new Set(); this.imgs = new Map();
    this.cacheCam = null; this.sucioEst = true; this.sucioPaint = true; this.sucioSup = true;
    this.nUltimo = 0; this.tCam = 0; this.rafId = 0; this.animando = 0; this.dts = []; this.tPrev = 0;
    this.onLento = null; this.cuentaCuadros = 0; this.pintando = false;
    this.ro = new ResizeObserver(() => this.redimensionar());
    this.ro.observe(cont);
    this.doc.on((k, e, cam, local, nuevo) => this._alCambiar(k, e, cam, local, nuevo));
    this.redimensionar();
  }
  get cam() { return this.camaras.get(this.pg) || this._nuevaCam(); }
  _nuevaCam() {
    const c = { x: -40, y: -40, z: Math.min(1, Math.max(0.2, this.W / 1700)) };
    this.camaras.set(this.pg, c); return c;
  }
  ponerPagina(pg) {
    if (this.pg === pg) return;
    this.pg = pg;
    if (!this.camaras.has(pg)) { this._nuevaCam(); this.ajustar(true); }
    this.sucioEst = true; this.pedir();
  }
  calidadDpr() {
    const q = this.app.ajustes.calidad, d = window.devicePixelRatio || 1;
    return q === 'baja' ? 1 : q === 'media' ? Math.min(d, 1.5) : q === 'alta' ? Math.min(d, 2) : Math.min(d, 3);
  }
  redimensionar() {
    const r = this.cont.getBoundingClientRect();
    this.W = Math.max(1, Math.round(r.width)); this.H = Math.max(1, Math.round(r.height));
    this.aplicarDpr();
  }
  aplicarDpr() {
    this.dpr = this.calidadDpr();
    for (const c of [this.lienzo, this.sup, this.cache]) { c.width = Math.round(this.W * this.dpr); c.height = Math.round(this.H * this.dpr); }
    for (const c of [this.lienzo, this.sup]) { c.style.width = this.W + 'px'; c.style.height = this.H + 'px'; }
    this.sucioEst = this.sucioPaint = this.sucioSup = true; this.pedir();
  }
  _alCambiar(k, e, cam, local, nuevo) {
    if (k === 'o') {
      if (this.ocultos.has(e.id)) { this.sucioSup = true; this.pedir(); return; }
      const pg = e.v.pg;
      if (pg !== this.pg && !('pg' in cam)) return;
      if (nuevo && e.v.tipo === 'trazo' && e.v.pg === this.pg && this._capaSuperior(e.v.cap) && this._camIgual()) { this.incremental(e); return; }
      this.sucioEst = true;
    } else if (k === 'l') this.sucioEst = true;
    this.sucioPaint = true; this.pedir();
  }
  _capaSuperior(cap) { const o = this.doc.capaOrden(cap || 'c1'); return this.doc.capas().every(c => (c.v.ord ?? 1) <= o); }
  _camIgual() { const a = this.cacheCam, b = this.cam; return a && a.x === b.x && a.y === b.y && a.z === b.z && !this.sucioEst; }
  incremental(e) {
    this.cctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const c = this.cam;
    this.cctx.save(); this.cctx.scale(c.z, c.z); this.cctx.translate(-c.x, -c.y);
    dibujarObjeto(this.cctx, this.doc, e, this._cx()); this.cctx.restore();
    this.sucioPaint = true; this.pedir();
  }
  _cx() { const p = this.doc.ent.p.get(this.pg); return { oscuro: !!(p && p.v.fondo === 'oscuro'), imagen: id => this.imagen(id), z: this.cam.z }; }
  imagen(id) {
    let r = this.imgs.get(id);
    if (!r) {
      const data = this.app.assets[id];
      if (!data) { this.app.pedirAsset && this.app.pedirAsset(id); return null; }
      r = { img: new Image(), ok: false };
      r.img.onload = () => { r.ok = true; this.sucioEst = true; this.pedir(); };
      r.img.src = data; this.imgs.set(id, r);
    }
    return r.ok ? r.img : null;
  }
  assetNuevo(id) { this.sucioEst = true; this.pedir(); }

  // ----- coordenadas -----
  mundo(px, py) { const c = this.cam; return [px / c.z + c.x, py / c.z + c.y]; }
  pantalla(wx, wy) { const c = this.cam; return [(wx - c.x) * c.z, (wy - c.y) * c.z]; }
  aplicar(ctx) { const c = this.cam; ctx.scale(c.z, c.z); ctx.translate(-c.x, -c.y); }
  mover(dx, dy) { const c = this.cam; c.x -= dx / c.z; c.y -= dy / c.z; this.camCambio(); }
  zoomEn(px, py, f) {
    const c = this.cam, z = Math.min(8, Math.max(0.03, c.z * f)), k = z / c.z;
    if (k === 1) return;
    const [wx, wy] = this.mundo(px, py);
    c.z = z; c.x = wx - px / z; c.y = wy - py / z;
    this.camCambio();
  }
  camCambio() { this.tCam = performance.now(); this.sucioPaint = true; this.sucioSup = true; this.pedir(); if (this.alMoverCamara) this.alMoverCamara(); }
  ajustar(marco) {   // encuadra el marco o todo el contenido
    const c = this.cam; let b = null;
    const p = this.doc.ent.p.get(this.pg);
    if (marco || !this.doc.lista(this.pg).length) b = { x0: 0, y0: 0, x1: 1600, y1: 900 };
    else { b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }; for (const e of this.doc.lista(this.pg)) { const q = this.app.caja(e); b.x0 = Math.min(b.x0, q.x0); b.y0 = Math.min(b.y0, q.y0); b.x1 = Math.max(b.x1, q.x1); b.y1 = Math.max(b.y1, q.y1); } }
    const m = 30, w = b.x1 - b.x0 + 2 * m, h = b.y1 - b.y0 + 2 * m;
    const padL = this.W >= 700 ? 84 : 0, padB = this.W < 700 ? 70 : 0, AW = this.W - padL, AH = this.H - padB;
    c.z = Math.min(AW / w, AH / h, 4); c.x = b.x0 - m - (AW / c.z - w) / 2 - padL / c.z; c.y = b.y0 - m - (AH / c.z - h) / 2;
    this.camCambio(); this.sucioEst = true;
  }
  visible() { const c = this.cam; return { x0: c.x, y0: c.y, x1: c.x + this.W / c.z, y1: c.y + this.H / c.z }; }

  // ----- bucle -----
  pedir() { if (!this.rafId) this.rafId = requestAnimationFrame(t => this.cuadro(t)); }
  cuadro(t) {
    this.rafId = 0;
    if (document.hidden) return;
    if (this.pg == null) return;
    const t0 = performance.now();
    const cam = this.cam, cc = this.cacheCam;
    const camCambiada = !cc || cc.x !== cam.x || cc.y !== cam.y || cc.z !== cam.z;
    let pintoEst = false;
    if (this.sucioEst || (camCambiada && (this.nUltimo < 500 || t0 - this.tCam > 90))) {
      this.cctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.cctx.clearRect(0, 0, this.W, this.H);
      this.nUltimo = dibujarObjetos(this.cctx, this.doc, this.pg, cam, this.W, this.H, this._cx(), this.ocultos);
      this.cacheCam = { x: cam.x, y: cam.y, z: cam.z };
      this.sucioEst = false; this.sucioPaint = true; pintoEst = true;
    } else if (camCambiada && this.nUltimo >= 500) this.pedirTardio();
    if (this.sucioPaint) {
      const ctx = this.ctx, c = this.cacheCam, s = cam.z / c.z;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const p = this.doc.ent.p.get(this.pg);
      dibujarFondo(ctx, (p && p.v.fondo) || 'blanco', cam, this.W, this.H, !!(p && p.v.marco));
      ctx.drawImage(this.cache, 0, 0, this.cache.width, this.cache.height, (c.x - cam.x) * cam.z, (c.y - cam.y) * cam.z, this.W * s, this.H * s);
      this.sucioPaint = false;
    }
    if (this.sucioSup || this.animando > 0) {
      const s = this.sctx;
      s.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); s.clearRect(0, 0, this.W, this.H);
      for (const fn of this.capasSup) { s.save(); try { fn(s, this); } catch (e) { console.error(e); } s.restore(); }
      this.sucioSup = false;
    }
    const ahora = performance.now();
    this.ultimoCuadro = ahora - t0;
    if (this.animando > 0) { this.animando = Math.max(0, this.animando - 1); this.pedir(); }
    // medidor de rendimiento para la autobajada de calidad
    if (this.tPrev && ahora - this.tPrev < 200) { this.dts.push(ahora - this.tPrev); if (this.dts.length > 45) this.dts.shift(); }
    this.tPrev = ahora;
    this.cuentaCuadros++;
    if (this.dts.length >= 45 && this.cuentaCuadros % 45 === 0 && this.onLento) {
      const m = this.dts.reduce((a, b) => a + b, 0) / this.dts.length;
      this.onLento(m);
    }
  }
  pedirTardio() { clearTimeout(this._tt); this._tt = setTimeout(() => { this.pedir(); }, 100); }
  redibujarTodo() { this.sucioEst = this.sucioSup = this.sucioPaint = true; this.pedir(); }
  animar(n = 2) { this.animando = Math.max(this.animando, n); this.pedir(); }
  superior() { this.sucioSup = true; this.pedir(); }
}
