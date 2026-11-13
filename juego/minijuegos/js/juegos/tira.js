import { dentroZona, texto, clamp } from '../util.js';

export default {
  id: 'tira', nombre: 'Tira y afloja', icono: '🪢', cat: 'Reflejos', min: 2, max: 4, dur: 25, ctrl: 'tap',
  instr: ['Hay dos equipos: toca sin parar para tirar de la cuerda.', 'Si sois más en un equipo, cada toque pesa menos.', 'Lleva la marca hasta tu lado o ten ventaja al final.'],
  crear(c) {
    const n = c.n, corte = n === 3 ? 2 : Math.floor(n / 2) || 1, eq = (i) => (i < corte ? 0 : 1), tam = [corte, n - corte];
    const ritmo = [3, 4.8, 6.6], taps = Array(n).fill(0), acum = Array(n).fill(0), pts = Array(n).fill(0), TIEMPO = 25;
    const vertical = c.zonas.some((z) => z.rot), colE = [0, 1].map((e) => c.jug[e ? corte : 0].color);
    const inst = {
      pts, fin: false, t: 0, m: 0, ganador: -1,
      etq: (i) => String(taps[i]),
      update(dt, ent) {
        if (this.fin) return;
        this.t += dt;
        let fuerza = [0, 0];
        for (let i = 0; i < n; i++) {
          let g = ent[i].aN || (ent[i].aP ? 1 : 0);
          if (c.jug[i].bot) { acum[i] += dt * ritmo[c.jug[i].nivel] * (0.8 + c.rnd() * 0.4); while (acum[i] >= 1) { acum[i]--; g++; } }
          if (g) { taps[i] += g; fuerza[eq(i)] += g / tam[eq(i)]; if (!c.jug[i].bot) { c.fx.snd('toque'); c.fx.vib(i, 0.05, 0.15, 20); } }
        }
        this.m = clamp(this.m + (fuerza[0] - fuerza[1]) * 0.03, -1, 1);
        if (Math.abs(this.m) >= 1 || this.t >= TIEMPO) {
          this.fin = true; const tt = [0, 1].map((e) => taps.reduce((a, x, i) => a + (eq(i) === e ? x : 0), 0) / tam[e]); const w = this.m > 0.001 ? 0 : this.m < -0.001 ? 1 : tt[0] > tt[1] ? 0 : tt[1] > tt[0] ? 1 : -1; this.ganador = w;
          for (let i = 0; i < n; i++) pts[i] = w < 0 ? 0.5 : eq(i) === w ? 1 : 0;
        }
      },
      draw(g) {
        const W = c.W, H = c.H, L = (vertical ? H : W) * 0.4, mx = W / 2, my = H / 2;
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => {
          g.fillStyle = colE[eq(i)] + '2a'; g.fillRect(0, 0, w, h);
          texto(g, '¡TOCA!', w / 2, h * 0.7, Math.min(w, h) * 0.12, '#fff');
          texto(g, taps[i], w / 2, h * 0.84, Math.min(w, h) * 0.1, c.jug[i].color);
        });
        g.lineWidth = 8; g.strokeStyle = '#d8c28a'; g.beginPath();
        const px = vertical ? mx : mx - this.m * L, py = vertical ? my + this.m * L : my;
        if (vertical) { g.moveTo(mx, 0); g.lineTo(mx, H); } else { g.moveTo(0, my); g.lineTo(W, my); }
        g.stroke();
        [[colE[0], 1], [colE[1], -1]].forEach(([col, s]) => { g.fillStyle = col; if (vertical) g.fillRect(mx - 46, my + s * L - 4, 92, 8); else g.fillRect(mx - s * L - 4, my - 46, 8, 92); });
        g.beginPath(); g.arc(px, py, 22, 0, 6.3); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 5; g.strokeStyle = this.m > 0.02 ? colE[0] : this.m < -0.02 ? colE[1] : '#888'; g.stroke();
        texto(g, '🚩', px, py + 1, 22);
      }
    };
    return inst;
  }
};
