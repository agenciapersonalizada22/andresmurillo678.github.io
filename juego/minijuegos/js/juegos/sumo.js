import { texto, clamp, TAU, salidas, formaDe } from '../util.js';
import { ficha } from '../marca.js';

export default {
  id: 'sumo', nombre: 'Sumo de bolas', icono: '⚪', cat: 'Arena', min: 2, max: 4, dur: 40, ctrl: 'stick',
  instr: ['Mueve tu bola con la palanca y empuja a las demás.', 'Botón A: embestida (se recarga).', 'El ring se encoge: ¡el último en pie gana!'],
  crear(c) {
    const n = c.n, W = c.W, H = c.H, cx = W / 2, cy = H / 2, R0 = Math.min(W, H) * 0.44, r = Math.max(15, Math.min(W, H) * 0.045), RMIN = R0 * 0.3;
    const sp = salidas(c, R0 * 0.6), b = sp.map((p) => ({ x: p.x, y: p.y, vx: 0, vy: 0, vivo: true, cd: 0, t: 0, flash: 0 }));
    const pts = Array(n).fill(0), jit = Array(n).fill(0), azar = Array(n).fill(0);
    const inst = {
      pts, fin: false, t: 0, R: R0,
      update(dt, ent) {
        if (this.fin) return; this.t += dt;
        if (this.t > 8) this.R = Math.max(RMIN, this.R - (this.t > 30 ? 22 : 8) * dt);
        for (let i = 0; i < n; i++) {
          const p = b[i]; if (!p.vivo) continue;
          p.cd = Math.max(0, p.cd - dt); p.flash = Math.max(0, p.flash - dt);
          let ax = ent[i].wx, ay = ent[i].wy, dash = ent[i].aP;
          if (c.jug[i].bot) {
            const lv = c.jug[i].nivel; let obj = null, dm = 1e9;
            b.forEach((q, j) => { if (j !== i && q.vivo) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < dm) { dm = d; obj = q; } } });
            const dc = Math.hypot(p.x - cx, p.y - cy);
            if (dc > 0.7 * this.R || !obj) { ax = cx - p.x; ay = cy - p.y; }
            else { let ex = obj.x - cx, ey = obj.y - cy; const m = Math.hypot(ex, ey) || 1; ax = obj.x - ex / m * r * 1.6 - p.x; ay = obj.y - ey / m * r * 1.6 - p.y; if (dm < r * 5) { ax = obj.x - p.x; ay = obj.y - p.y; } }
            const m2 = Math.hypot(ax, ay) || 1; azar[i] -= dt; if (azar[i] <= 0) { azar[i] = 0.3; jit[i] = c.rnd.gauss() * [0.7, 0.3, 0.08][lv]; }
            const cs = Math.cos(jit[i]), sn = Math.sin(jit[i]), f = [0.7, 0.9, 1][lv], ux = ax / m2, uy = ay / m2;
            ax = (ux * cs - uy * sn) * f; ay = (ux * sn + uy * cs) * f;
            dash = obj && dm < r * 3.4 && p.cd <= 0 && c.rnd() < [0.01, 0.03, 0.07][lv];
          }
          p.vx += ax * 560 * dt; p.vy += ay * 560 * dt;
          const k = Math.exp(-1.1 * dt); p.vx *= k; p.vy *= k;
          if (dash && p.cd <= 0) { let dx = ax, dy = ay; const m = Math.hypot(dx, dy); if (m < 0.1) { dx = p.vx; dy = p.vy; } const m3 = Math.hypot(dx, dy) || 1; p.vx += dx / m3 * 330; p.vy += dy / m3 * 330; p.cd = 1.4; c.fx.snd('salto'); if (!c.jug[i].bot) c.fx.vib(i, 0.3, 0.5, 80); }
          const v = Math.hypot(p.vx, p.vy); if (v > 640) { p.vx *= 640 / v; p.vy *= 640 / v; }
        }
        for (let i = 0; i < n; i++) { const p = b[i]; if (p.vivo) { p.x += p.vx * dt; p.y += p.vy * dt; } }
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          const p = b[i], q = b[j]; if (!p.vivo || !q.vivo) continue;
          let dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy); if (d >= 2 * r || d === 0) continue;
          dx /= d; dy /= d; const o = (2 * r - d) / 2; p.x -= dx * o; p.y -= dy * o; q.x += dx * o; q.y += dy * o;
          const vn = (p.vx - q.vx) * dx + (p.vy - q.vy) * dy;
          if (vn > 0) { const J = vn * 0.9 + 25; p.vx -= dx * J; p.vy -= dy * J; q.vx += dx * J; q.vy += dy * J; p.flash = q.flash = 0.15; c.fx.snd('golpe'); c.fx.chispas((p.x + q.x) / 2, (p.y + q.y) / 2, '#fff', 6); if (!c.jug[i].bot) c.fx.vib(i, 0.4, 0.4, 70); if (!c.jug[j].bot) c.fx.vib(j, 0.4, 0.4, 70); }
        }
        for (let i = 0; i < n; i++) { const p = b[i]; if (p.vivo && Math.hypot(p.x - cx, p.y - cy) > this.R + r * 0.4) { p.vivo = false; pts[i] = this.t; c.fx.snd('pop'); c.fx.chispas(p.x, p.y, c.jug[i].color, 18); } }
        const vivos = b.filter((p) => p.vivo).length;
        if ((n > 1 && vivos <= 1) || vivos === 0 || this.t > 60) {
          this.fin = true; for (let i = 0; i < n; i++) if (b[i].vivo) pts[i] = 1000 + (this.R - Math.hypot(b[i].x - cx, b[i].y - cy));
        }
      },
      draw(g) {
        g.beginPath(); g.arc(cx, cy, this.R, 0, TAU); const gr = g.createRadialGradient(cx, cy, 10, cx, cy, this.R); gr.addColorStop(0, '#3b3a8e'); gr.addColorStop(1, '#262466'); g.fillStyle = gr; g.fill(); g.lineWidth = 8; g.strokeStyle = this.t > 6 ? '#ff6b4a' : '#fff'; g.stroke();
        g.lineWidth = 2; g.strokeStyle = '#ffffff22'; g.beginPath(); g.arc(cx, cy, this.R * 0.5, 0, TAU); g.stroke();
        b.forEach((p, i) => {
          if (!p.vivo) return;
          ficha(g, formaDe(c, i), p.x, p.y, r, p.flash > 0 ? '#fff' : c.jug[i].color);
          if (p.cd > 0) { g.strokeStyle = '#fff9'; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.cd / 1.4)); g.stroke(); }
          texto(g, c.jug[i].avatar, p.x, p.y + 1, r * 0.9);
        });
      }
    };
    return inst;
  }
};
