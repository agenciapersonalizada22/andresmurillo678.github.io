import { dentroZona, texto, rrect, clamp } from '../util.js';
import { ficha } from '../marca.js';

export default {
  id: 'dedos', nombre: 'Carrera de dedos', icono: '🏃', cat: 'Carreras', min: 2, max: 4, dur: 30, ctrl: 'ab',
  instr: ['Alterna izquierda y derecha para correr.', 'Si repites el mismo lado tropiezas un momento.', 'Gana quien llegue primero a la meta.'],
  crear(c) {
    const n = c.n, META = 45, ritmo = [2.3, 3.5, 4.8], pasos = Array(n).fill(0), ult = Array(n).fill(null), trop = Array(n).fill(0), acum = Array(n).fill(0), pts = Array(n).fill(0);
    const paso = (i, lado) => {
      if (trop[i] > 0) return;
      if (ult[i] === lado) { trop[i] = 0.4; c.fx.snd('mal'); return; }
      ult[i] = lado; pasos[i]++; c.fx.snd('toque');
    };
    const inst = {
      pts, fin: false, t: 0, etq: (i) => pasos[i] + '/' + META,
      update(dt, ent) {
        if (this.fin) return; this.t += dt;
        for (let i = 0; i < n; i++) {
          trop[i] = Math.max(0, trop[i] - dt);
          if (c.jug[i].bot) { acum[i] += dt * ritmo[c.jug[i].nivel] * (0.75 + c.rnd() * 0.5); while (acum[i] >= 1) { acum[i]--; if (c.rnd() < [0.12, 0.05, 0.01][c.jug[i].nivel]) paso(i, ult[i]); else paso(i, ult[i] === 'a' ? 'b' : 'a'); } }
          else { if (ent[i].aP) paso(i, 'a'); if (ent[i].bP) paso(i, 'b'); }
          pts[i] = pasos[i];
          if (pasos[i] >= META) { this.fin = true; pts[i] = META + 5; }
        }
        if (this.t > 45) this.fin = true;
      },
      draw(g) {
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => {
          const x = w / 2, y0 = h - 110, y1 = 70, p = clamp(pasos[i] / META, 0, 1), y = y0 + (y1 - y0) * p;
          g.fillStyle = '#ffffff10'; rrect(g, x - 34, y1 - 24, 68, y0 - y1 + 50, 20); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 4; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(x - 34, y1); g.lineTo(x + 34, y1); g.stroke(); g.setLineDash([]);
          texto(g, '🏁', x + 50, y1, 22);
          ficha(g, c.forma ? c.forma(c.jug[i], i) : 'circulo', x, y + (trop[i] > 0 ? 8 : 0), 19, c.jug[i].color);
          if (trop[i] > 0) texto(g, '¡tropiezo!', x, y + 34, 13, '#ffd23d');
          else { const sig = ult[i] === 'a' ? 'der' : 'izq'; texto(g, sig === 'izq' ? '◀' : '▶', x + (sig === 'izq' ? -56 : 56), y0 - 6, 22, '#ffffffaa'); }
        });
      }
    };
    return inst;
  }
};
