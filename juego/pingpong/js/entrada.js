// Entrada de golpes: gesto tactil/raton (direccion, fuerza, efecto), teclado remapeable y mando. Emite comandos {aimX,power,top,curva}.
const lim = (x, a, b) => Math.max(a, Math.min(b, x));
export const ALCANCE_X = 0.66;

/* Convierte un trazo en comando. Puro (se prueba en Node). pts=[{x,y,t}], alto=alto de pantalla, vista=lado local (+1/-1), efecto='auto'|'top'|'plano'|'corte'. */
export function trazoACmd(pts, alto, vista, efecto = 'auto', sens = 1) {
  const a = pts[0], z = pts[pts.length - 1], dx = z.x - a.x, dy = z.y - a.y, len = Math.hypot(dx, dy), T = Math.max(30, z.t - a.t);
  let dev = 0;
  if (len > 0) for (let i = 1; i < pts.length - 1; i++) { const c = (dx * (pts[i].y - a.y) - dy * (pts[i].x - a.x)) / len; if (Math.abs(c) > Math.abs(dev)) dev = c; }
  const ang = Math.atan2(dx, Math.max(-dy, Math.abs(dx) * 0.15 + 1)); // 0 = recto hacia arriba
  const aimV = lim(ang / 0.95 * sens, -1, 1);
  const s = (len / alto) / (T / 1000), power = lim((s - 0.6) / 3.6, 0.05, 1);
  let top = power > 0.45 ? ((power - 0.45) / 0.55) * 0.9 : -((0.45 - power) / 0.45) * 0.75;
  if (efecto === 'top') top = 0.85; else if (efecto === 'plano') top = 0; else if (efecto === 'corte') top = -0.8;
  const cn = len > 0 ? dev / len : 0, curva = Math.abs(cn) < 0.07 ? 0 : lim(cn * 4, -1, 1);
  return { aimX: aimV * ALCANCE_X * vista, power, top, curva, sigma: 0, len, T, vel: s };
}

export class Entrada {
  constructor(o) {
    this.zona = o.zona; this.trail = o.trail; this.get = o.ajustes; this.vista = o.vista || (() => 1); this.alGolpe = o.alGolpe; this.alPausa = o.alPausa; this.activo = o.activo || (() => true);
    this.aim = 0; this.objAim = 0; this.der = false; this.izq = false; this.fuerte = false; this.pts = null; this.id = -1; this.fade = 0; this.ult = null;
    this.ctx = this.trail.getContext('2d');
    this.enlazar();
  }
  enlazar() {
    const z = this.zona;
    z.addEventListener('pointerdown', (e) => {
      if (!this.activo() || (e.target.closest && e.target.closest('[data-hud]')) || this.id >= 0) return;
      this.id = e.pointerId; try { z.setPointerCapture(e.pointerId); } catch (x) { /* sin captura */ }
      this.pts = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }]; this.boton = e.button; this.tipo = e.pointerType; this.mods = { shift: e.shiftKey, ctrl: e.ctrlKey };
      this.fade = 1; e.preventDefault();
    });
    z.addEventListener('pointermove', (e) => { if (e.pointerId !== this.id || !this.pts) return; const p = this.pts[this.pts.length - 1]; if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 2) this.pts.push({ x: e.clientX, y: e.clientY, t: e.timeStamp }); });
    const fin = (e) => {
      if (e.pointerId !== this.id) return; const pts = this.pts; this.id = -1; this.pts = null; this.fade = 0.6; this.ultTrazo = pts;
      if (!pts || e.type === 'pointercancel' || !this.activo()) return;
      pts.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      const a = this.get(), esc = Math.max(0.7, Math.min(1.5, this.zona.clientHeight / 700)), len = Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y);
      if (len < 26 * esc) this.toque(pts[0], a); else this.emitir(trazoACmd(pts, this.zona.clientHeight, this.vista(), a.ct.efecto, a.ct.sens));
    };
    z.addEventListener('pointerup', fin); z.addEventListener('pointercancel', fin);
    z.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('keydown', (e) => this.tecla(e, true)); addEventListener('keyup', (e) => this.tecla(e, false));
  }
  emitir(cmd) { this.ult = cmd; this.alGolpe(cmd); }
  toque(p, a) { // clic/toque sin arrastre: apuntar segun la posicion horizontal
    const w = this.zona.clientWidth, v = lim((p.x - w / 2) / (w * 0.42), -1, 1);
    let power = this.tipo === 'mouse' ? 0.55 : 0.5, top = 0.2;
    if (this.tipo === 'mouse' && this.boton === 2) { power = 0.35; top = -0.7; } else if (this.tipo === 'mouse' && this.boton === 1) { power = 0.75; top = 0.8; }
    if (this.mods.shift) power = 0.85; if (this.mods.ctrl) power = 0.22;
    const ef = a.ct.efecto; if (ef === 'top') top = 0.85; else if (ef === 'corte') top = -0.8; else if (ef === 'plano') top = 0;
    this.emitir({ aimX: v * ALCANCE_X * this.vista(), power, top, curva: 0, sigma: 0 });
  }
  tecla(e, abajo) {
    const t = this.get().ct.teclas, es = (n) => (t[n] || []).includes(e.code);
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target && e.target.tagName) || '')) return;
    if (abajo && es('pausa') && !e.repeat) { this.alPausa(); e.preventDefault(); return; }
    if (es('izq')) this.izq = abajo; if (es('der')) this.der = abajo; if (es('fuerte')) this.fuerte = abajo;
    if (!abajo || e.repeat || !this.activo()) return;
    const f = this.fuerte ? 1.4 : 1, ax = this.aim * ALCANCE_X * this.vista();
    if (es('golpe')) { this.emitir({ aimX: ax, power: Math.min(1, 0.55 * f), top: 0.2, curva: 0, sigma: 0 }); e.preventDefault(); }
    else if (es('top')) { this.emitir({ aimX: ax, power: Math.min(1, 0.7 * f), top: 0.85, curva: 0, sigma: 0 }); e.preventDefault(); }
    else if (es('corte')) { this.emitir({ aimX: ax, power: Math.min(1, 0.35 * f), top: -0.8, curva: 0, sigma: 0 }); e.preventDefault(); }
  }
  /* Cada cuadro: apuntado suave por teclado/mando y botones del mando. M = window.Mando ya leido. */
  actualizar(dt, M) {
    const a = this.get(); let t = (this.der ? 1 : 0) - (this.izq ? 1 : 0);
    if (M && M.conectado) { const sx = M.ejes.izq.x; if (Math.abs(sx) > 0.05) t = sx; }
    this.objAim = t; this.aim += (this.objAim - this.aim) * Math.min(1, dt * 12);
    this.dibujarTrazo(dt);
    if (!M || !M.conectado || !this.activo()) return;
    const ax = this.aim * ALCANCE_X * this.vista(), r = M.gatillo.der, curva = (M.sostenido('RB') ? 0.8 : 0) - (M.sostenido('LB') ? 0.8 : 0);
    if (M.pulsado('A')) this.emitir({ aimX: ax, power: 0.5 + r * 0.5, top: 0.2, curva, sigma: 0 });
    else if (M.pulsado('X')) this.emitir({ aimX: ax, power: 0.65 + r * 0.35, top: 0.85, curva, sigma: 0 });
    else if (M.pulsado('B')) this.emitir({ aimX: ax, power: 0.3 + r * 0.3, top: -0.8, curva, sigma: 0 });
    else if (M.pulsado('Y')) this.emitir({ aimX: ax, power: 0.95, top: 0.3, curva, sigma: 0 });
    if (M.pulsado('MENU')) this.alPausa();
  }
  dibujarTrazo(dt) {
    const c = this.trail, x = this.ctx, w = this.zona.clientWidth, h = this.zona.clientHeight;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    x.clearRect(0, 0, w, h);
    const pts = this.pts || this.ultTrazo; if (!pts || pts.length < 2 || this.fade <= 0) return;
    if (!this.pts) this.fade -= dt * 3; const r = this.zona.getBoundingClientRect();
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) { const k = i / pts.length; x.strokeStyle = `rgba(255,${Math.round(255 - 160 * k)},${Math.round(120 - 80 * k)},${Math.max(0, this.fade) * (0.25 + 0.6 * k)})`; x.lineWidth = 3 + 9 * k; x.beginPath(); x.moveTo(pts[i - 1].x - r.left, pts[i - 1].y - r.top); x.lineTo(pts[i].x - r.left, pts[i].y - r.top); x.stroke(); }
  }
}
