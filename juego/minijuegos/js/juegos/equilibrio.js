import { dentroZona, texto, rrect } from '../util.js';

export default {
  id: 'equilibrio', nombre: 'Equilibrio', icono: '🤹', cat: 'Puntería y ritmo', min: 2, max: 4, dur: 40, ctrl: 'ab',
  instr: ['Tu vara se cae sola. ¡Mantenla en pie!', 'Izquierda empuja a la izquierda, derecha a la derecha.', 'Sobrevive más tiempo que los demás.'],
  crear(c) {
    const n = c.n, pts = Array(n).fill(0), th = Array(n).fill(0), om = Array(n).fill(0), vivo = Array(n).fill(true), viento = Array(n).fill(0), enfr = Array(n).fill(0);
    const fase = Array(n).fill(0).map(() => c.rnd.entre(0, 6)), fase2 = Array(n).fill(0).map(() => c.rnd.entre(0, 6));
    for (let i = 0; i < n; i++) th[i] = c.rnd.entre(-0.05, 0.05);
    const empuja = (i, s) => { if (vivo[i]) { om[i] += s * 1.45; c.fx.snd('toque'); } };
    const inst = {
      pts, fin: false, t: 0, etq: (i) => (pts[i] / 10).toFixed(1) + ' s',
      update(dt, ent) {
        if (this.fin) return; this.t += dt;
        const G = 3 + this.t * 0.09;
        for (let i = 0; i < n; i++) {
          if (!vivo[i]) continue;
          enfr[i] = Math.max(0, enfr[i] - dt);
          viento[i] = Math.sin(this.t * 1.3 + fase[i]) * 0.55 + Math.sin(this.t * 2.9 + fase2[i]) * 0.4;
          om[i] += (G * Math.sin(th[i]) + viento[i] * (0.6 + this.t * 0.02)) * dt; om[i] *= 1 - 0.35 * dt; th[i] += om[i] * dt;
          if (c.jug[i].bot) {
            const lv = c.jug[i].nivel, est = th[i] + 0.45 * om[i] + c.rnd.gauss() * [0.07, 0.03, 0.01][lv];
            if (enfr[i] <= 0 && Math.abs(est) > [0.09, 0.05, 0.03][lv]) { empuja(i, est > 0 ? -1 : 1); enfr[i] = [0.3, 0.2, 0.12][lv]; }
          } else { if (ent[i].aP) empuja(i, 1); if (ent[i].bP) empuja(i, -1); }
          pts[i] = Math.round(this.t * 10);
          if (Math.abs(th[i]) > 1) { vivo[i] = false; c.fx.snd('mal'); if (!c.jug[i].bot) c.fx.vib(i, 0.8, 0.4, 250); }
        }
        const vivos = vivo.filter((v) => v).length;
        if ((n > 1 && vivos <= 1) || vivos === 0 || this.t > 45) { this.fin = true; for (let i = 0; i < n; i++) if (vivo[i]) pts[i] = Math.round(this.t * 10) + 5; }
      },
      draw(g) {
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => {
          const s = Math.min(w, h), cx = w / 2, by = h * 0.72, L = s * 0.5;
          g.fillStyle = '#ffffff0d'; rrect(g, 8, 44, w - 16, h - 52, 20); g.fill();
          g.fillStyle = '#ffffff30'; g.fillRect(cx - s * 0.3, by, s * 0.6, 6);
          g.save(); g.translate(cx, by); g.rotate(th[i]);
          g.strokeStyle = vivo[i] ? c.jug[i].color : '#777'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -L); g.stroke();
          g.beginPath(); g.arc(0, -L, 15, 0, 6.3); g.fillStyle = vivo[i] ? '#fff' : '#888'; g.fill(); g.restore();
          g.beginPath(); g.arc(cx, by, 8, 0, 6.3); g.fillStyle = '#fff'; g.fill();
          texto(g, vivo[i] ? '💨'.repeat(Math.min(3, Math.round(Math.abs(viento[i]) * 3))) : '¡Se cayó!', cx + (viento[i] < 0 ? -s * 0.35 : s * 0.35), 76, 18);
          g.lineWidth = 3; g.strokeStyle = '#ffffff22'; g.beginPath(); g.arc(cx, by, L, -Math.PI / 2 - 1, -Math.PI / 2 + 1); g.stroke();
        });
      }
    };
    return inst;
  }
};
