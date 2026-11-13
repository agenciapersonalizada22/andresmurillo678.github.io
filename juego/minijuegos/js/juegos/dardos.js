import { dentroZona, texto, rrect, TAU } from '../util.js';

export const puntosDiana = (d) => (d < 0.08 ? 50 : d < 0.22 ? 25 : d < 0.48 ? 10 : d < 0.76 ? 5 : d <= 1 ? 2 : 0);
export default {
  id: 'dardos', nombre: 'Dardos', icono: '🎯', cat: 'Puntería y ritmo', min: 2, max: 4, dur: 35, ctrl: 'tap',
  instr: ['La mira se mueve sola sobre tu diana.', 'Toca para lanzar: centro 50, aros 25 · 10 · 5 · 2.', 'Cinco dardos cada uno: gana el que sume más.'],
  crear(c) {
    const n = c.n, DARDOS = 5, pts = Array(n).fill(0), lanz = Array(n).fill(0), t = Array(n).fill(0), cong = Array(n).fill(0), marcas = Array(n).fill(null).map(() => []), ult = Array(n).fill(''), espera = Array(n).fill(0);
    const f = Array(n).fill(0).map(() => ({ a: c.rnd.entre(1.9, 2.6), b: c.rnd.entre(2.7, 3.5), pa: c.rnd.entre(0, TAU), pb: c.rnd.entre(0, TAU) }));
    const pos = (i) => ({ x: Math.sin(f[i].a * t[i] + f[i].pa) * 0.95, y: Math.sin(f[i].b * t[i] + f[i].pb) * 0.95 });
    const lanzar = (i) => {
      if (lanz[i] >= DARDOS || cong[i] > 0) return;
      const p = pos(i), d = Math.hypot(p.x, p.y), v = puntosDiana(d); pts[i] += v; lanz[i]++; cong[i] = 0.8; marcas[i].push({ x: p.x, y: p.y, c: c.jug[i].color }); ult[i] = v ? '+' + v : '¡Fuera!';
      c.fx.snd(v >= 25 ? 'ok' : v ? 'golpe' : 'mal'); if (!c.jug[i].bot) c.fx.vib(i, v ? 0.3 : 0.1, 0.3, 50); espera[i] = 0;
    };
    const inst = {
      pts, fin: false, tt: 0, etq: (i) => pts[i] + ' · ' + (DARDOS - lanz[i]) + '🎯',
      update(dt, ent) {
        if (this.fin) return; this.tt += dt;
        for (let i = 0; i < n; i++) {
          if (cong[i] > 0) cong[i] -= dt; else if (lanz[i] < DARDOS) t[i] += dt;
          if (c.jug[i].bot && cong[i] <= 0 && lanz[i] < DARDOS) { espera[i] += dt; const p = pos(i), lv = c.jug[i].nivel; if ((espera[i] > 0.9 && Math.hypot(p.x, p.y) < [0.45, 0.25, 0.1][lv]) || espera[i] > [1.2, 2, 2.8][lv]) lanzar(i); }
          else if (ent[i].aP && !c.jug[i].bot) lanzar(i);
        }
        if (lanz.every((l) => l >= DARDOS) && cong.every((q) => q <= 0)) this.fin = true;
      },
      draw(g) {
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => {
          const R = Math.min(w, h - 90) * 0.44, cx = w / 2, cy = 60 + (h - 60) * 0.5;
          [[1, '#2c2c58'], [0.76, '#1e1e45'], [0.48, '#2c2c58'], [0.22, c.jug[i].color + 'cc'], [0.08, '#fff']].forEach(([r, col]) => { g.beginPath(); g.arc(cx, cy, R * r, 0, TAU); g.fillStyle = col; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#ffffff55'; g.stroke(); });
          marcas[i].forEach((m) => { g.beginPath(); g.arc(cx + m.x * R, cy + m.y * R, 6, 0, TAU); g.fillStyle = '#ffd23d'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#000'; g.stroke(); });
          if (lanz[i] < DARDOS) { const p = pos(i); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(cx + p.x * R, cy + p.y * R, 14, 0, TAU); g.moveTo(cx + p.x * R - 22, cy + p.y * R); g.lineTo(cx + p.x * R + 22, cy + p.y * R); g.moveTo(cx + p.x * R, cy + p.y * R - 22); g.lineTo(cx + p.x * R, cy + p.y * R + 22); g.stroke(); }
          if (cong[i] > 0) texto(g, ult[i], cx, cy - R - 16, 22, '#ffd23d');
          texto(g, 'TOCA PARA LANZAR', w / 2, h - 16, 12, '#ffffff88', 'center', 600);
        });
      }
    };
    return inst;
  }
};
