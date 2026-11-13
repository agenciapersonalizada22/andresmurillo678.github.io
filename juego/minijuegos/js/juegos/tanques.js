import { texto, clamp, TAU, salidas } from '../util.js';

const empujar = (p, r, q) => {
  const nx = clamp(p.x, q.x, q.x + q.w), ny = clamp(p.y, q.y, q.y + q.h); let dx = p.x - nx, dy = p.y - ny, d = Math.hypot(dx, dy);
  if (d >= r) return false;
  if (d === 0) { const l = p.x - q.x, rr = q.x + q.w - p.x, t = p.y - q.y, bb = q.y + q.h - p.y, m = Math.min(l, rr, t, bb); if (m === l) p.x = q.x - r; else if (m === rr) p.x = q.x + q.w + r; else if (m === t) p.y = q.y - r; else p.y = q.y + q.h + r; return true; }
  p.x = nx + dx / d * r; p.y = ny + dy / d * r; return true;
};
export default {
  id: 'tanques', nombre: 'Tanques', icono: '🛡️', cat: 'Arena', min: 2, max: 4, dur: 45, ctrl: 'stick',
  instr: ['Palanca: mueve tu tanque y apunta hacia donde vas.', 'Botón A: disparar. Cada tanque aguanta 3 impactos.', 'Los muros frenan las balas. ¡Último tanque en pie!'],
  crear(c) {
    const n = c.n, W = c.W, H = c.H, m = 14, r = 15, sp = null;
    const ssp = c.zonas.map((z) => ({ x: clamp(W * (0.1 + 0.8 * z.cx / W), 60, W - 60), y: z.rot ? H * 0.12 : H * 0.88 }));
    void sp;
    const muros = [], M = Math.min(W, H);
    for (let k = 0, intentos = 0; k < 7 && intentos < 80; intentos++) { const w = c.rnd.entre(0.07, 0.2) * M * (c.rnd() < 0.5 ? 1 : 0.35), h = c.rnd.entre(0.07, 0.2) * M * (w < 0.1 * M ? 3 : 0.4), q = { x: c.rnd.entre(m + 20, W - m - w - 20), y: c.rnd.entre(m + 20, H - m - h - 20), w, h }; if (ssp.some((s) => s.x > q.x - 85 && s.x < q.x + q.w + 85 && s.y > q.y - 85 && s.y < q.y + q.h + 85)) continue; muros.push(q); k++; }
    const T = ssp.map((s, i) => ({ x: s.x, y: s.y, ang: Math.atan2(H / 2 - s.y, W / 2 - s.x), hp: 3, vivo: true, cd: 0, flash: 0, wob: 0, ws: 1 }));
    const balas = [], pts = Array(n).fill(0);
    const vista = (a, b) => { const d = Math.hypot(b.x - a.x, b.y - a.y), pasos = Math.ceil(d / 10); for (let k = 1; k < pasos; k++) { const x = a.x + (b.x - a.x) * k / pasos, y = a.y + (b.y - a.y) * k / pasos; if (muros.some((q) => x > q.x && x < q.x + q.w && y > q.y && y < q.y + q.h)) return false; } return true; };
    const disparar = (i) => { const t = T[i]; if (t.cd > 0) return; t.cd = 0.55; balas.push({ x: t.x + Math.cos(t.ang) * (r + 6), y: t.y + Math.sin(t.ang) * (r + 6), vx: Math.cos(t.ang) * 360, vy: Math.sin(t.ang) * 360, d: i, t: 1.8 }); c.fx.snd('disparo'); if (!c.jug[i].bot) c.fx.vib(i, 0.2, 0.4, 50); };
    const inst = {
      pts, fin: false, t: 0, etq: (i) => '❤'.repeat(Math.max(0, T[i].hp)),
      update(dt, ent) {
        if (this.fin) return; this.t += dt;
        for (let i = 0; i < n; i++) {
          const t = T[i]; if (!t.vivo) continue; t.cd = Math.max(0, t.cd - dt); t.flash = Math.max(0, t.flash - dt);
          let wx = ent[i].wx, wy = ent[i].wy, fuego = ent[i].a;
          if (c.jug[i].bot) {
            const lv = c.jug[i].nivel; let obj = null, dm = 1e9; T.forEach((q, j) => { if (j !== i && q.vivo) { const d = Math.hypot(q.x - t.x, q.y - t.y); if (d < dm) { dm = d; obj = q; } } });
            wx = wy = 0; fuego = false;
            if (obj) {
              const aa = Math.atan2(obj.y - t.y, obj.x - t.x); let da = ((aa - t.ang + Math.PI * 3) % TAU) - Math.PI; const giro = [1.8, 3, 5][lv] * dt; t.ang += clamp(da, -giro, giro);
              t.wob -= dt; if (t.wob <= 0) { t.wob = c.rnd.entre(0.8, 1.8); t.ws = c.rnd() < 0.5 ? 1 : -1; }
              const ve = vista(t, obj);
              if (!ve || dm > 220) { wx = Math.cos(aa) * 0.9 - Math.sin(aa) * 0.3 * t.ws; wy = Math.sin(aa) * 0.9 + Math.cos(aa) * 0.3 * t.ws; } else { wx = -Math.sin(aa) * t.ws * 0.8 + Math.cos(aa) * (dm < 120 ? -0.4 : 0.1); wy = Math.cos(aa) * t.ws * 0.8 + Math.sin(aa) * (dm < 120 ? -0.4 : 0.1); }
              const f = [0.55, 0.8, 1][lv]; wx *= f; wy *= f;
              fuego = ve && Math.abs(da) < [0.4, 0.2, 0.09][lv] && c.rnd() < [0.04, 0.15, 0.4][lv];
            }
          } else if (Math.hypot(wx, wy) > 0.25) t.ang = Math.atan2(wy, wx);
          t.x += wx * 125 * dt; t.y += wy * 125 * dt;
          t.x = clamp(t.x, m + r, W - m - r); t.y = clamp(t.y, m + r, H - m - r); muros.forEach((q) => empujar(t, r, q));
          if (fuego) disparar(i);
        }
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = T[i], b = T[j]; if (!a.vivo || !b.vivo) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 2 * r && d > 0) { const o = (2 * r - d) / 2; a.x -= dx / d * o; a.y -= dy / d * o; b.x += dx / d * o; b.y += dy / d * o; } }
        for (let k = balas.length - 1; k >= 0; k--) {
          const q = balas[k]; q.x += q.vx * dt; q.y += q.vy * dt; q.t -= dt; let quitar = q.t <= 0 || q.x < 0 || q.y < 0 || q.x > W || q.y > H;
          if (!quitar && muros.some((w) => q.x > w.x && q.x < w.x + w.w && q.y > w.y && q.y < w.y + w.h)) quitar = true;
          if (!quitar) for (let i = 0; i < n; i++) { const t = T[i]; if (i !== q.d && t.vivo && Math.hypot(t.x - q.x, t.y - q.y) < r + 3) { t.hp--; t.flash = 0.2; quitar = true; c.fx.snd('golpe'); c.fx.chispas(q.x, q.y, c.jug[i].color, 8); if (!c.jug[i].bot) c.fx.vib(i, 0.8, 0.6, 140); if (t.hp <= 0) { t.vivo = false; pts[i] = this.t; c.fx.snd('explosion'); c.fx.chispas(t.x, t.y, c.jug[i].color, 26); } break; } }
          if (quitar) balas.splice(k, 1);
        }
        const vivos = T.filter((t) => t.vivo).length;
        if ((n > 1 && vivos <= 1) || vivos === 0 || this.t > 50) { this.fin = true; T.forEach((t, i) => { if (t.vivo) pts[i] = 1000 + t.hp * 10; }); }
      },
      draw(g) {
        g.strokeStyle = '#ffffff55'; g.lineWidth = 4; g.strokeRect(m, m, W - 2 * m, H - 2 * m);
        muros.forEach((q) => { g.fillStyle = '#6b5fb5'; g.fillRect(q.x, q.y, q.w, q.h); g.strokeStyle = '#fff6'; g.lineWidth = 2; g.strokeRect(q.x, q.y, q.w, q.h); });
        T.forEach((t, i) => {
          if (!t.vivo) return;
          g.save(); g.translate(t.x, t.y); g.rotate(t.ang);
          g.fillStyle = t.flash > 0 ? '#fff' : c.jug[i].color; g.fillRect(-r, -r * 0.8, r * 2, r * 1.6); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.strokeRect(-r, -r * 0.8, r * 2, r * 1.6);
          g.fillStyle = '#0006'; g.fillRect(0, -3.5, r + 9, 7); g.restore();
          texto(g, '❤'.repeat(t.hp), t.x, t.y - r - 10, 10, '#ff6b8a');
        });
        g.fillStyle = '#fff'; balas.forEach((q) => { g.beginPath(); g.arc(q.x, q.y, 4, 0, TAU); g.fill(); });
      }
    };
    return inst;
  }
};
