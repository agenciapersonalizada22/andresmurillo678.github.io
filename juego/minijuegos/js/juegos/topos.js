import { dentroZona, texto, rrect } from '../util.js';

export default {
  id: 'topos', nombre: 'Cazar topos', icono: '🐹', cat: 'Puntería y ritmo', min: 2, max: 4, dur: 25, ctrl: 'puntero',
  instr: ['Toca los topos 🐹 cuando asomen (+1).', 'El topo dorado vale 3 y las bombas 💣 restan 2.', '25 segundos: todos ven los mismos topos.'],
  crear(c) {
    const n = c.n, TIEMPO = 25, ev = [], pts = Array(n).fill(0), topos = Array(n).fill(null).map(() => new Map()), cur = Array(n).fill(null).map(() => ({ x: 1, y: 1 })), tocado = Array(n).fill(false), flash = Array(n).fill(null).map(() => ({}));
    for (let t = 0.8; t < TIEMPO - 1; t += c.rnd.entre(0.4, 0.8)) { const r = c.rnd(); ev.push({ t, cel: c.rnd.int(9), tipo: r < 0.1 ? 'oro' : r < 0.24 ? 'bomba' : 'topo', vida: c.rnd.entre(0.85, 1.35) }); }
    let sig = 0; const plan = Array(n).fill(null).map(() => []);
    const valor = { topo: 1, oro: 3, bomba: -2 };
    const golpe = (i, cel) => {
      const m = topos[i].get(cel); if (!m) return;
      topos[i].delete(cel); pts[i] += valor[m.tipo]; flash[i][cel] = { t: 0.35, v: valor[m.tipo] }; c.fx.snd(m.tipo === 'bomba' ? 'explosion' : 'pop'); if (!c.jug[i].bot) c.fx.vib(i, m.tipo === 'bomba' ? 0.7 : 0.2, 0.3, 60);
    };
    const celda = (w, h, k) => { const s = Math.min(w - 24, (h - 120)) / 3, x0 = (w - s * 3) / 2, y0 = 70 + (h - 70 - s * 3) / 2 - 10; return { x: x0 + (k % 3) * s, y: y0 + Math.floor(k / 3) * s, s }; };
    const inst = {
      pts, fin: false, t: 0,
      puntero(i, lx, ly) { if (i < 0 || c.jug[i].bot) return; tocado[i] = true; const z = c.zonas[i]; for (let k = 0; k < 9; k++) { const q = celda(z.w, z.h, k); if (lx >= q.x && lx <= q.x + q.s && ly >= q.y && ly <= q.y + q.s) { cur[i] = { x: k % 3, y: (k / 3) | 0 }; golpe(i, k); } } },
      update(dt, ent) {
        if (this.fin) return; this.t += dt;
        while (sig < ev.length && ev[sig].t <= this.t) {
          const e = ev[sig++];
          for (let i = 0; i < n; i++) {
            if (topos[i].has(e.cel)) continue;
            topos[i].set(e.cel, { tipo: e.tipo, fin: this.t + e.vida });
            if (c.jug[i].bot) { const lv = c.jug[i].nivel; if ((e.tipo === 'bomba' && lv > 0) || c.rnd() > [0.55, 0.82, 0.96][lv]) continue; plan[i].push({ t: this.t + [0.85, 0.52, 0.3][lv] * c.rnd.entre(0.8, 1.3), cel: e.cel }); }
          }
        }
        for (let i = 0; i < n; i++) {
          for (const [k, m] of topos[i]) if (m.fin <= this.t) topos[i].delete(k);
          for (const k in flash[i]) { flash[i][k].t -= dt; if (flash[i][k].t <= 0) delete flash[i][k]; }
          if (c.jug[i].bot) { plan[i] = plan[i].filter((p) => { if (p.t <= this.t) { golpe(i, p.cel); return false; } return true; }); continue; }
          const e = ent[i]; if (e.izqP || e.derP || e.arrP || e.abaP) tocado[i] = false;
          if (e.izqP) cur[i].x = (cur[i].x + 2) % 3; if (e.derP) cur[i].x = (cur[i].x + 1) % 3; if (e.arrP) cur[i].y = (cur[i].y + 2) % 3; if (e.abaP) cur[i].y = (cur[i].y + 1) % 3;
          if (e.aP) golpe(i, cur[i].y * 3 + cur[i].x);
        }
        if (this.t >= TIEMPO) this.fin = true;
      },
      draw(g) {
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => {
          texto(g, ((TIEMPO - this.t) | 0) + ' s', w / 2, 56, 14, '#ffffffaa', 'center', 600);
          for (let k = 0; k < 9; k++) {
            const q = celda(w, h, k), m = topos[i].get(k), f = flash[i][k], foco = !c.jug[i].bot && !tocado[i] && cur[i].y * 3 + cur[i].x === k;
            g.fillStyle = m ? (m.tipo === 'oro' ? '#7a5d12' : m.tipo === 'bomba' ? '#5a1f1f' : '#4a3a22') : '#2a2250'; rrect(g, q.x + 4, q.y + 4, q.s - 8, q.s - 8, 16); g.fill();
            if (foco) { g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); }
            if (m) texto(g, m.tipo === 'bomba' ? '💣' : '🐹', q.x + q.s / 2, q.y + q.s / 2, q.s * 0.5);
            if (m && m.tipo === 'oro') texto(g, '⭐', q.x + q.s * 0.8, q.y + q.s * 0.2, q.s * 0.2);
            if (f) texto(g, (f.v > 0 ? '+' : '') + f.v, q.x + q.s / 2, q.y + q.s / 2 - (0.35 - f.t) * 40, q.s * 0.3, f.v > 0 ? '#7dffa8' : '#ff8a6b');
          }
        });
      }
    };
    return inst;
  }
};
