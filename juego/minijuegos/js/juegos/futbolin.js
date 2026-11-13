import { texto, clamp, TAU, rrect } from '../util.js';
import { ficha } from '../marca.js';

export default {
  id: 'futbolin', nombre: 'Fútbol de mesa', icono: '⚽', cat: 'Arena', min: 2, max: 4, dur: 45, ctrl: 'stick',
  instr: ['Empuja el balón con tu ficha para meter gol.', 'Los equipos van por mitades (en parejas si sois 3 o 4).', 'Botón A: arranque rápido. Gana quien más goles tenga a los 45 s.'],
  crear(c) {
    const n = c.n, FW = 300, FH = 520, GW = 118, RD = 19, RB = 10, TIEMPO = 45, MAXG = 4, horiz = c.W > c.H;
    const corte = n === 3 ? 2 : Math.floor(n / 2) || 1, eq = (i) => (i < corte ? 0 : 1), tam = [corte, n - corte];
    const pts = Array(n).fill(0), goles = [0, 0], D = [], ball = { x: FW / 2, y: FH / 2, vx: 0, vy: 0 };
    const colocar = () => {
      ball.x = FW / 2 + c.rnd.entre(-12, 12); ball.y = FH / 2; ball.vx = ball.vy = 0;
      for (let i = 0; i < n; i++) { const e = eq(i), k = i - (e ? corte : 0); D[i] = Object.assign(D[i] || { cd: 0 }, { x: FW * (k + 1) / (tam[e] + 1) + c.rnd.entre(-30, 30), y: e === 0 ? FH * 0.78 : FH * 0.22, vx: 0, vy: 0, cd: 0 }); }
    };
    colocar();
    const S = { pausa: 1.0 };
    const aSim = (wx, wy) => (horiz ? [wy, -wx] : [wx, wy]);
    const inst = {
      D, pts, fin: false, t: 0, etq: (i) => String(goles[eq(i)]),
      update(dt, ent) {
        if (this.fin) return; this.t += dt;
        if (S.pausa > 0) { S.pausa -= dt; return; }
        D.forEach((d, i) => {
          d.cd = Math.max(0, d.cd - dt); const e = eq(i), ataque = e === 0 ? -1 : 1; let [ax, ay] = aSim(ent[i].wx, ent[i].wy), a = ent[i].aP;
          if (c.jug[i].bot) {
            const lv = c.jug[i].nivel, gy = e === 0 ? 0 : FH, mate = D.map((q, j) => (eq(j) === e ? Math.hypot(q.x - ball.x, q.y - ball.y) + j * 0.01 : 1e9)), yo = mate.indexOf(Math.min(...mate)) === i;
            let tx, ty; const hx = FW / 2 - ball.x, hy = gy - ball.y, hm = Math.hypot(hx, hy) || 1;
            d.to = (d.to || 0) - dt; if (d.to <= 0) { d.to = c.rnd.entre(0.7, 1.6); d.off = c.rnd.entre(-26, 26); }
            if (yo || tam[e] === 1) { tx = ball.x - hx / hm * (RB + RD + 2) - hy / hm * d.off; ty = ball.y - hy / hm * (RB + RD + 2) + hx / hm * d.off; if (Math.hypot(ball.x - d.x, ball.y - d.y) < RB + RD + 14) { tx = ball.x; ty = ball.y; } }
            else { tx = clamp(ball.x, 50, FW - 50); ty = e === 0 ? Math.max(ball.y + 40, FH * 0.7) : Math.min(ball.y - 40, FH * 0.3); ty = clamp(ty, 40, FH - 40); }
            ax = tx - d.x; ay = ty - d.y; const m = Math.hypot(ax, ay) || 1, f = [0.55, 0.8, 1][lv] * Math.min(1, m / 30); ax = ax / m * f; ay = ay / m * f; a = lv > 0 && Math.hypot(ball.x - d.x, ball.y - d.y) < RB + RD + 14 && d.cd <= 0 && c.rnd() < [0.02, 0.2, 0.35][lv];
          }
          d.vx += ax * 900 * dt; d.vy += ay * 900 * dt; const k = Math.exp(-2.2 * dt); d.vx *= k; d.vy *= k;
          if (a && d.cd <= 0) { const m = Math.hypot(ax, ay); if (m > 0.1) { d.vx += ax / m * 330; d.vy += ay / m * 330; d.cd = 0.9; c.fx.snd('salto'); } }
          const v = Math.hypot(d.vx, d.vy); if (v > 250 && !(d.cd > 0.7)) { d.vx *= 250 / v; d.vy *= 250 / v; }
          d.x += d.vx * dt; d.y += d.vy * dt; d.x = clamp(d.x, RD, FW - RD); d.y = clamp(d.y, RD, FH - RD); void ataque;
        });
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = D[i], b = D[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 2 * RD && d > 0) { const o = (2 * RD - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (vn > 0) { a.vx -= nx * vn; a.vy -= ny * vn; b.vx += nx * vn; b.vy += ny * vn; } } }
        D.forEach((d, i) => {
          const dx = ball.x - d.x, dy = ball.y - d.y, q = Math.hypot(dx, dy), md = RD + RB;
          if (q < md && q > 0) {
            const nx = dx / q, ny = dy / q; ball.x = d.x + nx * md; ball.y = d.y + ny * md;
            const vr = (ball.vx - d.vx) * nx + (ball.vy - d.vy) * ny;
            if (vr < 0) { const J = -(1.75) * vr / (1 + 1 / 3); ball.vx += nx * J; ball.vy += ny * J; c.fx.snd('toque'); if (!c.jug[i].bot) c.fx.vib(i, 0.1, 0.3, 30); }
            else { ball.vx += nx * 40; ball.vy += ny * 40; }
          }
        });
        const k = Math.exp(-0.55 * dt); ball.vx *= k; ball.vy *= k; const bv = Math.hypot(ball.vx, ball.vy); if (bv > 620) { ball.vx *= 620 / bv; ball.vy *= 620 / bv; }
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        const enMeta = Math.abs(ball.x - FW / 2) < GW / 2;
        if (ball.x < RB) { ball.x = RB; ball.vx = Math.abs(ball.vx) * 0.85; } if (ball.x > FW - RB) { ball.x = FW - RB; ball.vx = -Math.abs(ball.vx) * 0.85; }
        let gol = -1;
        if (ball.y < RB) { if (enMeta) { if (ball.y < -RB) gol = 0; } else { ball.y = RB; ball.vy = Math.abs(ball.vy) * 0.85; } }
        if (ball.y > FH - RB) { if (enMeta) { if (ball.y > FH + RB) gol = 1; } else { ball.y = FH - RB; ball.vy = -Math.abs(ball.vy) * 0.85; } }
        if (gol >= 0) { goles[gol]++; c.fx.snd('gana'); c.fx.chispas(-1000, -1000, '#fff', 0); colocar(); S.pausa = 1.2; for (let i = 0; i < n; i++) pts[i] = goles[eq(i)]; if (goles[gol] >= MAXG) this.fin = true; }
        if (this.t >= TIEMPO) this.fin = true;
        for (let i = 0; i < n; i++) pts[i] = goles[eq(i)];
      },
      draw(g) {
        const W = c.W, H = c.H, s = horiz ? Math.min((W - 24) / FH, (H - 24) / FW) : Math.min((W - 24) / FW, (H - 24) / FH);
        g.save(); g.translate(W / 2, H / 2); if (horiz) g.rotate(Math.PI / 2); g.scale(s, s); g.translate(-FW / 2, -FH / 2);
        g.fillStyle = '#1f7a4a'; g.fillRect(0, 0, FW, FH); for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#ffffff08' : '#00000010'; g.fillRect(0, k * FH / 8, FW, FH / 8); }
        g.strokeStyle = '#fff9'; g.lineWidth = 3; g.strokeRect(0, 0, FW, FH); g.beginPath(); g.moveTo(0, FH / 2); g.lineTo(FW, FH / 2); g.stroke(); g.beginPath(); g.arc(FW / 2, FH / 2, 42, 0, TAU); g.stroke();
        [[0, -1], [FH, 1]].forEach(([y, sg], e) => { g.fillStyle = c.jug[Math.min(n - 1, e === 0 ? corte : 0)].color + '55'; g.fillRect(FW / 2 - GW / 2, sg < 0 ? y - 26 : y, GW, 26); g.strokeStyle = '#fff'; g.strokeRect(FW / 2 - GW / 2, sg < 0 ? y - 26 : y, GW, 26); });
        D.forEach((d, i) => { ficha(g, c.forma ? c.forma(c.jug[i], i) : 'circulo', d.x, d.y, RD, c.jug[i].color); texto(g, c.jug[i].avatar, d.x, d.y + 1, RD * 0.95); });
        g.beginPath(); g.arc(ball.x, ball.y, RB, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#222'; g.stroke();
        g.restore();
        texto(g, Math.max(0, Math.ceil(TIEMPO - this.t)) + ' s', W / 2, horiz ? 22 : H / 2, horiz ? 16 : 28, '#ffffff44');
      }
    };
    return inst;
  }
};
