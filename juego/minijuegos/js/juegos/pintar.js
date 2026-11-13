import { texto, clamp, TAU, salidas, formaDe } from '../util.js';
import { ficha } from '../marca.js';

export default {
  id: 'pintar', nombre: 'Pintar territorio', icono: '🎨', cat: 'Arena', min: 2, max: 4, dur: 30, ctrl: 'stick',
  instr: ['Muévete con la palanca: pintas el suelo por donde pasas.', 'Puedes pintar encima del color de otros.', 'Botón A: turbo. Gana quien tenga más suelo a los 30 s.'],
  crear(c) {
    const n = c.n, W = c.W, H = c.H, TIEMPO = 30, cs = Math.max(14, Math.floor(Math.min(W, H) / 22)), cols = Math.floor(W / cs), filas = Math.floor(H / cs), ox = (W - cols * cs) / 2, oy = (H - filas * cs) / 2;
    const dueno = new Int8Array(cols * filas).fill(-1), cuenta = Array(n).fill(0), sp = salidas(c, Math.min(W, H) * 0.4);
    const J = sp.map((p) => ({ x: clamp(p.x, ox + cs, ox + cols * cs - cs), y: clamp(p.y, oy + cs, oy + filas * cs - cs), en: 1, turbo: 0, tx: 0, ty: 0, tr: 0 }));
    const pintar = (i, x, y) => { const cx = Math.floor((x - ox) / cs), cy = Math.floor((y - oy) / cs); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (Math.abs(dx) + Math.abs(dy) > 1) continue; const a = cx + dx, b = cy + dy; if (a < 0 || b < 0 || a >= cols || b >= filas) continue; const k = b * cols + a, o = dueno[k]; if (o === i) continue; if (o >= 0) cuenta[o]--; dueno[k] = i; cuenta[i]++; } };
    J.forEach((p, i) => pintar(i, p.x, p.y));
    const pts = cuenta;
    const inst = {
      pts, fin: false, t: 0, etq: (i) => Math.round(cuenta[i] / (cols * filas) * 100) + '%',
      update(dt, ent) {
        if (this.fin) return; this.t += dt;
        J.forEach((p, i) => {
          let mx = ent[i].wx, my = ent[i].wy, turbo = ent[i].a;
          if (c.jug[i].bot) {
            const lv = c.jug[i].nivel; p.tr -= dt;
            if (p.tr <= 0 || Math.hypot(p.tx - p.x, p.ty - p.y) < cs) { p.tr = c.rnd.entre(0.5, 1.1); let mejor = null, mp = 1e9; for (let k = 0; k < [4, 9, 16][lv]; k++) { const x = ox + c.rnd() * cols * cs, y = oy + c.rnd() * filas * cs, o = dueno[Math.floor((y - oy) / cs) * cols + Math.floor((x - ox) / cs)], d = Math.hypot(x - p.x, y - p.y); const pen = o === i ? 220 : o < 0 ? 0 : (lv === 2 ? -30 : 0); if (d + pen < mp) { mp = d + pen; mejor = [x, y]; } } p.tx = mejor[0]; p.ty = mejor[1]; }
            mx = p.tx - p.x; my = p.ty - p.y; const m = Math.hypot(mx, my) || 1; mx /= m; my /= m; turbo = lv > 0 && p.en > 0.5 && c.rnd() < 0.05;
          }
          const usaT = turbo && p.en > 0.05; p.en = clamp(p.en + (usaT ? -0.4 : 0.18) * dt, 0, 1);
          const m = Math.min(1, Math.hypot(mx, my)), L = Math.hypot(mx, my) || 1, v = (usaT ? 235 : 135) * m * (c.jug[i].bot ? [0.8, 0.92, 1][c.jug[i].nivel] : 1);
          p.x = clamp(p.x + mx / L * v * dt, ox + 4, ox + cols * cs - 4); p.y = clamp(p.y + my / L * v * dt, oy + 4, oy + filas * cs - 4);
          pintar(i, p.x, p.y);
        });
        if (this.t >= TIEMPO) this.fin = true;
      },
      draw(g) {
        for (let y = 0; y < filas; y++) for (let x = 0; x < cols; x++) { const o = dueno[y * cols + x]; g.fillStyle = o >= 0 ? c.jug[o].color + 'cc' : ((x + y) & 1 ? '#ffffff0a' : '#ffffff05'); g.fillRect(ox + x * cs, oy + y * cs, cs, cs); }
        J.forEach((p, i) => { ficha(g, formaDe(c, i), p.x, p.y, cs * 0.65, c.jug[i].color, { borde: '#fff' }); texto(g, c.jug[i].avatar, p.x, p.y + 1, cs * 0.7); });
        texto(g, Math.max(0, Math.ceil(TIEMPO - this.t)) + ' s', c.W / 2, c.H / 2, 34, '#ffffff33');
      }
    };
    return inst;
  }
};
