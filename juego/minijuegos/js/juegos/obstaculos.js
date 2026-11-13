import { dentroZona, texto, rrect, clamp } from '../util.js';
import { ficha } from '../marca.js';

export default {
  id: 'obstaculos', nombre: 'Carrera de obstáculos', icono: '🏁', cat: 'Carreras', min: 2, max: 4, dur: 30, ctrl: 'tap',
  instr: ['Tu corredor avanza solo.', 'Toca para saltar los obstáculos.', 'Si chocas pierdes velocidad. ¡Gana quien llegue primero!'],
  crear(c) {
    const n = c.n, LARGO = 3400, V = 175, obs = [];
    for (let x = 420; x < LARGO - 250; x += c.rnd.entre(230, 400)) obs.push({ x, w: c.rnd.entre(26, 40), h: c.rnd.entre(28, 42) });
    const pos = Array(n).fill(0), alt = Array(n).fill(0), tsalto = Array(n).fill(-1), choque = Array(n).fill(0), pts = Array(n).fill(0), prox = Array(n).fill(0), cd = Array(n).fill(0), fallo = Array(n).fill(0);
    const DUR = 0.66, saltar = (i) => { if (tsalto[i] >= 0 || choque[i] > 0 || cd[i] > 0) return; tsalto[i] = 0; c.fx.snd('salto'); };
    const inst = {
      pts, fin: false, t: 0, etq: (i) => Math.round(clamp(pos[i] / LARGO, 0, 1) * 100) + '%',
      update(dt, ent) {
        if (this.fin) return; this.t += dt;
        for (let i = 0; i < n; i++) {
          cd[i] = Math.max(0, cd[i] - dt);
          if (tsalto[i] >= 0) { tsalto[i] += dt; alt[i] = Math.sin(Math.min(1, tsalto[i] / DUR) * Math.PI) * 78; if (tsalto[i] >= DUR) { tsalto[i] = -1; alt[i] = 0; cd[i] = 0.05; } }
          const v = choque[i] > 0 ? V * 0.25 : V; choque[i] = Math.max(0, choque[i] - dt); pos[i] += v * dt;
          while (prox[i] < obs.length && obs[prox[i]].x + obs[prox[i]].w < pos[i] - 20) prox[i]++;
          const o = obs[prox[i]];
          if (o && choque[i] <= 0 && pos[i] + 12 > o.x && pos[i] - 12 < o.x + o.w && alt[i] < o.h * 0.8) { choque[i] = 0.7; c.fx.snd('golpe'); if (!c.jug[i].bot) c.fx.vib(i, 0.6, 0.3, 150); prox[i]++; }
          if (c.jug[i].bot) {
            const lv = c.jug[i].nivel; if (o && tsalto[i] < 0 && choque[i] <= 0) { if (!fallo[i]) fallo[i] = c.rnd.gauss() * [34, 18, 6][lv] + [10, 0, 0][lv]; const d = o.x - pos[i]; if (d < 54 + fallo[i] && d > -4) { saltar(i); fallo[i] = 0; } }
          } else if (ent[i].aP) saltar(i);
          pts[i] = pos[i];
          if (pos[i] >= LARGO) { this.fin = true; pts[i] = LARGO + (50 - this.t) ; }
        }
        if (this.t > 55) this.fin = true;
      },
      draw(g) {
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => {
          const gy = h * 0.74, px = w * 0.28, sx = (x) => px + (x - pos[i]);
          g.fillStyle = '#ffffff0c'; g.fillRect(0, 44, w, gy - 44); g.fillStyle = '#3a2f77'; g.fillRect(0, gy, w, h - gy);
          g.fillStyle = '#ffffff22'; for (let x = -((pos[i] * 0.4) % 60); x < w; x += 60) g.fillRect(x, gy + 10, 28, 3);
          g.fillStyle = '#fff'; const mx = sx(LARGO); if (mx < w + 20) { g.fillRect(mx, gy - 60, 6, 60); texto(g, '🏁', mx + 18, gy - 52, 26); }
          obs.forEach((o) => { const x = sx(o.x); if (x > -60 && x < w + 20) { g.fillStyle = '#d96a3a'; rrect(g, x, gy - o.h, o.w, o.h, 6); g.fill(); g.strokeStyle = '#fff6'; g.lineWidth = 2; g.stroke(); } });
          ficha(g, c.forma ? c.forma(c.jug[i], i) : 'circulo', px, gy - 16 - alt[i], 16, c.jug[i].color, { borde: choque[i] > 0 ? '#ff6b4a' : undefined });
          g.fillStyle = '#0006'; g.fillRect(12, 48, w - 24, 8); g.fillStyle = c.jug[i].color; g.fillRect(12, 48, (w - 24) * clamp(pos[i] / LARGO, 0, 1), 8);
          texto(g, 'TOCA PARA SALTAR', w / 2, h - 18, 12, '#ffffff88', 'center', 600);
        });
      }
    };
    return inst;
  }
};
