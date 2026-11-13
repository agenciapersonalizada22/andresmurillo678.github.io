import { texto, clamp, rrect } from '../util.js';

const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
export default {
  id: 'snake', nombre: 'Serpientes', icono: '🐍', cat: 'Arena', min: 2, max: 4, dur: 40, ctrl: 'lr',
  instr: ['Tu serpiente avanza sola: toca izquierda o derecha para girar.', 'Come manzanas para crecer.', 'No choques con paredes ni cuerpos. ¡Sobrevive!'],
  crear(c) {
    const n = c.n, W = c.W, H = c.H, cs = Math.max(15, Math.floor(Math.min(W, H) / 19)), cols = Math.floor(W / cs), filas = Math.floor(H / cs), ox = (W - cols * cs) / 2, oy = (H - filas * cs) / 2;
    const pts = Array(n).fill(0), ocu = new Int16Array(cols * filas).fill(-1);
    const inicios = c.zonas.map((z, i) => ({ x: Math.round(clamp(n === 2 ? cols * (i ? 0.7 : 0.3) : n > 2 && z.w < W ? cols * [0.22, 0.78, 0.6, 0.4][i] : z.cx / cs, 4, cols - 5)), y: Math.round(clamp(z.rot || z.h < H ? z.cy / cs : filas * 0.72, 4, filas - 5)) }));
    const S = inicios.map((p, i) => { const dir = p.y > filas / 2 ? 0 : 2, body = [0, 1, 2, 3].map((k) => [p.x, p.y - DY[dir] * k]); return { body, dir, vivo: true, crece: 0, giro: 0, t: 0 }; });
    if (n === 2 && c.zonas[0].w !== W) { S[0] = { body: [0, 1, 2, 3].map((k) => [4 - k, (filas / 2) | 0]), dir: 1, vivo: true, crece: 0, giro: 0, t: 0 }; S[1] = { body: [0, 1, 2, 3].map((k) => [cols - 5 + k, (filas / 2) | 0]), dir: 3, vivo: true, crece: 0, giro: 0, t: 0 }; }
    const idx = (x, y) => y * cols + x, comida = [];
    const reocupar = () => { ocu.fill(-1); S.forEach((s, i) => { if (s.vivo) s.body.forEach(([x, y]) => { ocu[idx(x, y)] = i; }); }); };
    const nuevaComida = () => { for (let k = 0; k < 40; k++) { const x = 1 + c.rnd.int(cols - 2), y = 1 + c.rnd.int(filas - 2); if (ocu[idx(x, y)] < 0 && !comida.some((f) => f[0] === x && f[1] === y)) { comida.push([x, y]); return; } } };
    reocupar(); for (let k = 0; k < 3 + (n > 2 ? 1 : 0); k++) nuevaComida();
    const libre = (x, y) => x >= 0 && y >= 0 && x < cols && y < filas && ocu[idx(x, y)] < 0;
    const espacio = (x0, y0, lim) => { const vis = new Set([idx(x0, y0)]), cola = [[x0, y0]]; while (cola.length && vis.size < lim) { const [x, y] = cola.shift(); for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (libre(nx, ny) && !vis.has(idx(nx, ny))) { vis.add(idx(nx, ny)); cola.push([nx, ny]); } } } return vis.size; };
    const elegir = (i) => {
      const s = S[i], lv = c.jug[i].nivel, h = s.body[0], opts = [s.dir, (s.dir + 3) % 4, (s.dir + 1) % 4];
      const seg = opts.filter((d) => libre(h[0] + DX[d], h[1] + DY[d]));
      if (!seg.length) return s.dir;
      if (lv === 0 && seg.includes(s.dir) && c.rnd() < 0.85) return s.dir;
      let mejor = seg[0], mp = -1e9;
      for (const d of seg) {
        const x = h[0] + DX[d], y = h[1] + DY[d], esp = Math.min(espacio(x, y, lv === 0 ? 8 : 45), lv === 0 ? 8 : 45);
        let pun = esp * (lv === 0 ? 0.5 : 2); const f = comida.reduce((m, q) => Math.min(m, Math.abs(q[0] - x) + Math.abs(q[1] - y)), 99); pun -= f * [0.3, 0.7, 1.2][lv] + c.rnd() * [4, 1.5, 0.3][lv];
        if (lv === 2) S.forEach((o, j) => { if (j !== i && o.vivo && Math.abs(o.body[0][0] - x) + Math.abs(o.body[0][1] - y) <= 2) pun -= 12; });
        if (pun > mp) { mp = pun; mejor = d; }
      }
      return mejor;
    };
    const inst = {
      pts, fin: false, t: 0, acum: 0, etq: (i) => String(S[i].body.length),
      update(dt, ent) {
        if (this.fin) return; this.t += dt;
        for (let i = 0; i < n; i++) { const e = ent[i]; if (!S[i].vivo || c.jug[i].bot) continue; if (e.izqP || e.aP) S[i].giro = -1; else if (e.derP || e.bP) S[i].giro = 1; }
        this.acum += dt; const paso = Math.max(0.075, 0.125 - this.t * 0.0007);
        while (this.acum >= paso && !this.fin) {
          this.acum -= paso; reocupar();
          const nuevos = S.map((s, i) => {
            if (!s.vivo) return null;
            if (c.jug[i].bot) s.dir = elegir(i); else if (s.giro) { s.dir = (s.dir + (s.giro < 0 ? 3 : 1)) % 4; s.giro = 0; }
            return [s.body[0][0] + DX[s.dir], s.body[0][1] + DY[s.dir]];
          });
          const colas = S.map((s) => (s.vivo && !s.crece ? s.body[s.body.length - 1] : null));
          const muere = S.map((s, i) => {
            const h = nuevos[i]; if (!h) return false;
            if (h[0] < 0 || h[1] < 0 || h[0] >= cols || h[1] >= filas) return true;
            const o = ocu[idx(h[0], h[1])]; if (o >= 0 && !(colas[o] && colas[o][0] === h[0] && colas[o][1] === h[1])) return true;
            return nuevos.some((q, j) => j !== i && q && q[0] === h[0] && q[1] === h[1]);
          });
          S.forEach((s, i) => {
            if (!s.vivo) return;
            if (muere[i]) { s.vivo = false; pts[i] = this.t * 10 + s.body.length; c.fx.snd('pierde'); if (!c.jug[i].bot) c.fx.vib(i, 0.8, 0.4, 200); c.fx.chispas(ox + s.body[0][0] * cs + cs / 2, oy + s.body[0][1] * cs + cs / 2, c.jug[i].color, 14); return; }
            s.body.unshift(nuevos[i]); if (s.crece > 0) s.crece--; else s.body.pop();
            const k = comida.findIndex((f) => f[0] === nuevos[i][0] && f[1] === nuevos[i][1]); if (k >= 0) { comida.splice(k, 1); s.crece += 2; nuevaComida(); c.fx.snd('coin'); }
          });
          const vivos = S.filter((s) => s.vivo).length;
          if ((n > 1 && vivos <= 1) || vivos === 0 || this.t > 45) { this.fin = true; S.forEach((s, i) => { if (s.vivo) pts[i] = 10000 + s.body.length; }); }
        }
      },
      draw(g) {
        g.fillStyle = '#ffffff08'; g.fillRect(ox, oy, cols * cs, filas * cs); g.strokeStyle = '#ffffff30'; g.lineWidth = 2; g.strokeRect(ox, oy, cols * cs, filas * cs);
        comida.forEach(([x, y]) => { g.beginPath(); g.arc(ox + x * cs + cs / 2, oy + y * cs + cs / 2, cs * 0.36, 0, 6.3); g.fillStyle = '#ff5a5a'; g.fill(); g.fillStyle = '#3ddc84'; g.fillRect(ox + x * cs + cs / 2 - 1, oy + y * cs + 1, 3, 4); });
        S.forEach((s, i) => {
          s.body.forEach(([x, y], k) => { g.globalAlpha = s.vivo ? 1 : 0.2; g.fillStyle = c.jug[i].color; rrect(g, ox + x * cs + 1, oy + y * cs + 1, cs - 2, cs - 2, k ? 4 : 7); g.fill(); if (!k) { g.fillStyle = '#fff'; g.fillRect(ox + x * cs + cs * 0.25, oy + y * cs + cs * 0.3, 3, 3); g.fillRect(ox + x * cs + cs * 0.6, oy + y * cs + cs * 0.3, 3, 3); } });
          g.globalAlpha = 1;
        });
      }
    };
    return inst;
  }
};
