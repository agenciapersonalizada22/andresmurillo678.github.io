import { dentroZona, texto, clamp } from '../util.js';

export default {
  id: 'taprace', nombre: 'Carrera de toques', icono: '👆', cat: 'Reflejos', min: 2, max: 4, dur: 12, ctrl: 'tap',
  instr: ['Toca tu zona lo más rápido que puedas.', 'Tras la cuenta atrás tienes 10 segundos.', 'Gana quien consiga más toques.'],
  crear(c) {
    const n = c.n, TIEMPO = 10, ritmo = [3.2, 5.2, 7.2];
    const pts = Array(n).fill(0), pulso = Array(n).fill(0), acum = Array(n).fill(0);
    const inst = {
      pts, fin: false, t: 0, toques: pts,
      update(dt, ent) {
        if (this.fin) return;
        this.t += dt;
        for (let i = 0; i < n; i++) {
          pulso[i] = Math.max(0, pulso[i] - dt * 6);
          let golpes = ent[i].aN || (ent[i].aP ? 1 : 0);
          if (c.jug[i].bot) { acum[i] += dt * ritmo[c.jug[i].nivel] * (0.8 + c.rnd() * 0.4); while (acum[i] >= 1) { acum[i]--; golpes++; } }
          if (golpes) { pts[i] += golpes; pulso[i] = 1; c.fx.snd('toque'); if (!c.jug[i].bot) c.fx.vib(i, 0.1, 0.2, 25); }
        }
        if (this.t >= TIEMPO) this.fin = true;
      },
      draw(g) {
        const max = Math.max(10, ...pts), rest = Math.max(0, TIEMPO - this.t);
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => {
          const col = c.jug[i].color, r = Math.min(w, h) * 0.28 * (1 + pulso[i] * 0.12);
          g.fillStyle = col + '33'; g.fillRect(0, 0, w, h);
          g.beginPath(); g.arc(w / 2, h / 2, r, 0, 6.3); g.fillStyle = col; g.fill(); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke();
          texto(g, pts[i], w / 2, h / 2, r * 0.9, '#fff');
          g.fillStyle = '#0006'; g.fillRect(12, h - 22, w - 24, 10); g.fillStyle = col; g.fillRect(12, h - 22, (w - 24) * clamp(pts[i] / max, 0, 1), 10);
          texto(g, rest.toFixed(1) + ' s', w / 2, 56, 18, '#fff');
        });
      }
    };
    return inst;
  }
};
