import { dentroZona, texto, rrect } from '../util.js';

export default {
  id: 'globos', nombre: 'Globos', icono: '🎈', cat: 'Puntería y ritmo', min: 2, max: 4, dur: 25, ctrl: 'ab',
  instr: ['Izquierda: infla el globo (+1 punto por soplido).', 'Derecha: guarda tus puntos. ¡Si revienta los pierdes!', 'Tras 25 segundos gana quien guardó más.'],
  crear(c) {
    const n = c.n, TIEMPO = 25, umbral = [4, 6, 8], ritmo = [1.3, 2, 2.8];
    const bomba = Array(n).fill(0), lim = Array(n).fill(0), ban = Array(n).fill(0), pop = Array(n).fill(0), acum = Array(n).fill(0), pulso = Array(n).fill(0), objetivo = Array(n).fill(0), msg = Array(n).fill('');
    const nuevoLim = (i) => { lim[i] = 5 + c.rnd.int(18); if (c.jug[i].bot) objetivo[i] = Math.max(2, umbral[c.jug[i].nivel] + c.rnd.int(3) - 1); };
    for (let i = 0; i < n; i++) nuevoLim(i);
    const inflar = (i) => {
      if (pop[i] > 0) return;
      bomba[i]++; pulso[i] = 1; c.fx.snd('toque');
      if (bomba[i] >= lim[i]) { pop[i] = 1; msg[i] = '¡PUM! −' + bomba[i]; bomba[i] = 0; nuevoLim(i); c.fx.snd('pop'); c.fx.chispasZ(i, c.zonas[i].w / 2, c.zonas[i].h / 2, c.jug[i].color, 16); if (!c.jug[i].bot) c.fx.vib(i, 0.8, 0.5, 250); }
    };
    const guardar = (i) => { if (pop[i] > 0 || !bomba[i]) return; ban[i] += bomba[i]; msg[i] = '+' + bomba[i] + ' guardados'; pop[i] = 0.35; bomba[i] = 0; nuevoLim(i); c.fx.snd('coin'); };
    const inst = {
      pts: ban, fin: false, t: 0,
      update(dt, ent) {
        if (this.fin) return; this.t += dt;
        for (let i = 0; i < n; i++) {
          pop[i] = Math.max(0, pop[i] - dt); pulso[i] = Math.max(0, pulso[i] - dt * 5);
          if (c.jug[i].bot) { acum[i] += dt * ritmo[c.jug[i].nivel]; if (acum[i] >= 1 && pop[i] <= 0) { acum[i] = 0; if (bomba[i] >= objetivo[i]) guardar(i); else inflar(i); } }
          else { if (ent[i].aP) inflar(i); if (ent[i].bP) guardar(i); }
        }
        if (this.t >= TIEMPO) { this.fin = true; for (let i = 0; i < n; i++) if (bomba[i] > 0) bomba[i] = 0; }
      },
      draw(g) {
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => {
          const s = Math.min(w, h), cx = w / 2, cy = h * 0.46, r = (s * 0.1 + bomba[i] * s * 0.014) * (1 + pulso[i] * 0.06);
          g.fillStyle = '#ffffff0d'; rrect(g, 8, 44, w - 16, h - 52, 20); g.fill();
          if (pop[i] <= 0.4 || bomba[i] > 0) {
            g.strokeStyle = '#fff8'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy + r); g.quadraticCurveTo(cx - 8, cy + r + 22, cx + 4, cy + r + 40); g.stroke();
            g.beginPath(); g.ellipse(cx, cy, r * 0.85, r, 0, 0, 6.3); g.fillStyle = c.jug[i].color; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
            g.fillStyle = '#ffffff55'; g.beginPath(); g.ellipse(cx - r * 0.3, cy - r * 0.35, r * 0.18, r * 0.28, -0.5, 0, 6.3); g.fill();
            texto(g, bomba[i], cx, cy, Math.max(14, r * 0.6), '#fff');
          }
          if (msg[i] && pop[i] > 0) texto(g, msg[i], cx, cy, s * 0.09, pop[i] > 0.5 ? '#ff8a6b' : '#7dffa8');
          texto(g, `Guardado: ${ban[i]}`, cx, h - s * 0.3 - 8, 15, '#ffd23d');
          texto(g, ((TIEMPO - this.t) | 0) + ' s', cx, 56, 14, '#ffffffaa', 'center', 600);
        });
      }
    };
    return inst;
  }
};
