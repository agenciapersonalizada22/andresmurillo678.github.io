import { dentroZona, texto, rrect, clamp } from '../util.js';
import { ficha } from '../marca.js';

export default {
  id: 'salto', nombre: 'Salto alto', icono: '🦘', cat: 'Carreras', min: 2, max: 4, dur: 35, ctrl: 'lr',
  instr: ['Rebotas solo: dirige a tu personaje a izquierda y derecha.', 'Cae sobre las plataformas para subir cada vez más.', 'Gana quien llegue más alto (o a la cima) primero.'],
  crear(c) {
    const n = c.n, SEP = 88, FILAS = 34, META = FILAS * SEP, G = 1000, SALTO = 640, pts = Array(n).fill(0);
    const PL = [{ f: 0.4, y: 0, w: 0.24 }]; let fx = 0.4;
    for (let k = 1; k <= FILAS + 4; k++) { fx = (fx + c.rnd.entre(-0.3, 0.3) + 1) % 1; PL.push({ f: fx, y: k * SEP, w: 0.24 }); }
    const plat = (k) => PL[Math.max(0, Math.min(PL.length - 1, k))];
    const dentro = (p, pl) => { const d = (((p.x - pl.f) % 1) + 1) % 1; return d < pl.w + 0.03 || d > 0.97; };
    const wd = (d) => ((d + 1.5) % 1) - 0.5;
    const P = Array(n).fill(0).map((_, i) => ({ x: 0.5, y: 0, vy: SALTO, max: 0, ult: 0, cd: 0 }));
    const inst = {
      P, pts, fin: false, t: 0, etq: (i) => Math.round(P[i].max / 10) + ' m',
      update(dt, ent) {
        if (this.fin) return; this.t += dt;
        for (let i = 0; i < n; i++) {
          const p = P[i], z = c.zonas[i], e = ent[i];
          let dir = e.dx;
          if (c.jug[i].bot) {
            const lv = c.jug[i].nivel, tope = p.vy > 0 ? p.y + p.vy * p.vy / (2 * G) : p.y, kt = Math.max(1, Math.floor(tope / SEP)), obj = [plat(kt), plat(kt - 1)].map((q) => q.f + q.w / 2).sort((a, b) => Math.abs(wd(a - p.x)) - Math.abs(wd(b - p.x)))[0];
            if (!p.err || c.rnd() < 0.02) p.err = c.rnd.gauss() * [0.14, 0.07, 0.025][lv];
            dir = clamp(wd(obj + p.err - p.x) * [3, 6, 10][lv], -1, 1);
          }
          p.x += dir * 0.95 * dt; if (p.x < 0) p.x += 1; if (p.x > 1) p.x -= 1;
          const y0 = p.y; p.vy -= G * dt; p.y += p.vy * dt;
          if (p.vy < 0) { const k = Math.floor(y0 / SEP + 1e-6); for (let q = k; q >= Math.max(0, k - 1); q--) { const pl = plat(q); if (y0 >= pl.y - 1 && p.y <= pl.y && dentro(p, pl)) { p.y = pl.y; p.vy = SALTO; p.ult = q; c.fx.snd('salto'); break; } } }
          if (p.y <= 0 && p.vy < 0) { p.y = 0; p.vy = SALTO; }
          p.max = Math.max(p.max, p.y);
          const cam = Math.max(0, p.max - 180); if (p.y < cam - 40) { const pl = plat(p.ult); p.y = pl.y + 1; p.x = pl.f + pl.w / 2; p.vy = SALTO; p.max -= 0; c.fx.snd('mal'); }
          pts[i] = Math.round(p.max);
          if (p.max >= META) { this.fin = true; pts[i] = META + 30; }
        }
        if (this.t > 60) this.fin = true;
      },
      draw(g) {
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => {
          const p = P[i], cam = Math.max(0, p.max - 180), sy = (y) => h - 30 - (y - cam) * 0.62, pw = w * 0.24;
          g.fillStyle = '#ffffff0a'; g.fillRect(0, 44, w, h - 44);
          const k0 = Math.max(0, Math.floor(cam / SEP) - 1);
          for (let k = k0; k < k0 + Math.ceil(h / (SEP * 0.62)) + 3 && k <= FILAS; k++) { const pl = plat(k), y = sy(pl.y); g.fillStyle = k === FILAS ? '#ffd23d' : c.jug[i].color + 'cc'; rrect(g, pl.f * w, y, pw, 9, 5); g.fill(); if (pl.f * w + pw > w) { rrect(g, pl.f * w - w, y, pw, 9, 5); g.fill(); } }
          const px = p.x * w, py = sy(p.y) - 14; ficha(g, c.forma ? c.forma(c.jug[i], i) : 'circulo', px, py, 14, c.jug[i].color);
          if (px < 14 || px > w - 14) ficha(g, c.forma ? c.forma(c.jug[i], i) : 'circulo', px + (px < 14 ? w : -w), py, 14, c.jug[i].color);
          g.fillStyle = '#0006'; g.fillRect(w - 14, 50, 6, h - 120); g.fillStyle = '#fff'; g.fillRect(w - 14, 50 + (h - 120) * (1 - clamp(p.max / META, 0, 1)), 6, 4);
        });
      }
    };
    return inst;
  }
};
