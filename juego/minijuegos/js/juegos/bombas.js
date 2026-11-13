import { texto, clamp, TAU, salidas, formaDe } from '../util.js';
import { ficha } from '../marca.js';

export default {
  id: 'bombas', nombre: 'Esquiva bombas', icono: '💣', cat: 'Arena', min: 2, max: 4, dur: 35, ctrl: 'stick',
  instr: ['Mueve tu bola con la palanca.', 'Los círculos rojos avisan: ¡sal antes de que exploten!', 'Botón A: arranque rápido. Gana el último vivo.'],
  crear(c) {
    const n = c.n, W = c.W, H = c.H, r = 13, sp = salidas(c, Math.min(W, H) * 0.3), J = sp.map((p) => ({ x: p.x, y: p.y, vivo: true, cd: 0, dash: 0, dx: 0, dy: 0, tr: 0 })), pts = Array(n).fill(0), bombas = [];
    let prox = 1.2;
    const inst = {
      pts, fin: false, t: 0,
      update(dt, ent) {
        if (this.fin) return; this.t += dt; prox -= dt;
        if (prox <= 0) { prox = Math.max(0.26, 0.85 - this.t * 0.011); const vivos = J.map((p, i) => i).filter((i) => J[i].vivo); const objetivo = c.rnd() < 0.55 ? J[c.rnd.elige(vivos)] : null; bombas.push({ x: objetivo ? clamp(objetivo.x + c.rnd.gauss() * 45, 20, W - 20) : c.rnd.entre(20, W - 20), y: objetivo ? clamp(objetivo.y + c.rnd.gauss() * 45, 20, H - 20) : c.rnd.entre(20, H - 20), R: 44 + Math.min(34, this.t * 0.7), f: 1.05, e: 0 }); }
        for (let k = bombas.length - 1; k >= 0; k--) {
          const b = bombas[k];
          if (b.f > 0) { b.f -= dt; if (b.f <= 0) { b.e = 0.32; c.fx.snd('explosion'); c.fx.chispas(b.x, b.y, '#ff8a3d', 14); } } else { b.e -= dt; if (b.e <= 0) { bombas.splice(k, 1); continue; } }
          if (b.f <= 0) J.forEach((p, i) => { if (p.vivo && Math.hypot(p.x - b.x, p.y - b.y) < b.R + r * 0.5) { p.vivo = false; pts[i] = this.t; c.fx.snd('pierde'); c.fx.chispas(p.x, p.y, c.jug[i].color, 22); if (!c.jug[i].bot) c.fx.vib(i, 1, 0.6, 300); } });
        }
        J.forEach((p, i) => {
          if (!p.vivo) return; p.cd = Math.max(0, p.cd - dt); p.dash = Math.max(0, p.dash - dt);
          let mx = ent[i].wx, my = ent[i].wy, salta = ent[i].aP;
          if (c.jug[i].bot) {
            const lv = c.jug[i].nivel, ven = [0.5, 0.75, 1.05][lv]; let fx = 0, fy = 0, peligro = 0;
            bombas.forEach((b) => { const d = Math.hypot(p.x - b.x, p.y - b.y); if ((b.f > 0 ? b.f < ven : b.e > 0) && d < b.R + 42) { const w = (b.R + 42 - d) / (b.R + 42); fx += (p.x - b.x) / (d || 1) * w; fy += (p.y - b.y) / (d || 1) * w; peligro += w; } });
            if (peligro > 0) { mx = fx; my = fy; const m = Math.hypot(mx, my) || 1; mx /= m; my /= m; salta = lv > 0 && peligro > 0.6 && bombas.some((b) => b.f > 0 && b.f < 0.3 && Math.hypot(p.x - b.x, p.y - b.y) < b.R) && p.cd <= 0; if (p.x < 40 || p.x > W - 40) mx += (W / 2 - p.x) / W * 3; if (p.y < 40 || p.y > H - 40) my += (H / 2 - p.y) / H * 3; }
            else { p.tr -= dt; if (p.tr <= 0) { p.tr = c.rnd.entre(0.6, 1.6); const a = c.rnd.entre(0, TAU); p.dx = Math.cos(a) * 0.5; p.dy = Math.sin(a) * 0.5; if (c.rnd() < 0.5) { p.dx = (W / 2 - p.x) / W; p.dy = (H / 2 - p.y) / H; } } mx = p.dx; my = p.dy; }
          }
          if (salta && p.cd <= 0) { p.cd = 1.8; p.dash = 0.18; const m = Math.hypot(mx, my) || 1; p.dx = mx / m; p.dy = my / m; if (m < 0.1) { p.dx = 0; p.dy = -1; } c.fx.snd('salto'); }
          const v = p.dash > 0 ? 520 : 195, m = Math.min(1, Math.hypot(mx, my)); const dirx = p.dash > 0 ? p.dx : (Math.hypot(mx, my) ? mx / Math.hypot(mx, my) : 0), diry = p.dash > 0 ? p.dy : (Math.hypot(mx, my) ? my / Math.hypot(mx, my) : 0);
          p.x = clamp(p.x + dirx * v * (p.dash > 0 ? 1 : m) * dt, r, W - r); p.y = clamp(p.y + diry * v * (p.dash > 0 ? 1 : m) * dt, r, H - r);
        });
        const vivos = J.filter((p) => p.vivo).length;
        if ((n > 1 && vivos <= 1) || vivos === 0 || this.t > 45) { this.fin = true; J.forEach((p, i) => { if (p.vivo) pts[i] = 1000 + this.t; }); }
      },
      draw(g) {
        bombas.forEach((b) => {
          if (b.f > 0) { const k = 1 - b.f / 1.05; g.beginPath(); g.arc(b.x, b.y, b.R, 0, TAU); g.fillStyle = `rgba(255,70,60,${0.12 + k * 0.25})`; g.fill(); g.lineWidth = 3; g.strokeStyle = '#ff6b4a'; g.stroke(); g.beginPath(); g.arc(b.x, b.y, b.R * k, 0, TAU); g.stroke(); texto(g, '💣', b.x, b.y, 22); }
          else { g.beginPath(); g.arc(b.x, b.y, b.R, 0, TAU); g.fillStyle = `rgba(255,200,80,${b.e * 2.5})`; g.fill(); }
        });
        J.forEach((p, i) => { if (!p.vivo) return; ficha(g, formaDe(c, i), p.x, p.y, r, c.jug[i].color); texto(g, c.jug[i].avatar, p.x, p.y + 1, r * 0.95); if (p.cd > 0) { g.strokeStyle = '#fff8'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, r + 4, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.cd / 1.8)); g.stroke(); } });
      }
    };
    return inst;
  }
};
