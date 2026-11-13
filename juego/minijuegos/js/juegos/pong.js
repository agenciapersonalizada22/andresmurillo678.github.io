import { texto, clamp, TAU, rrect } from '../util.js';

const LADOS = { 2: ['b', 't'], 3: ['b', 'r', 't'], 4: ['b', 'r', 't', 'l'] };
export default {
  id: 'pong', nombre: 'Pong de esquinas', icono: '🏓', cat: 'Arena', min: 2, max: 4, dur: 45, ctrl: 'stick',
  instr: ['Cada jugador defiende un lado con su pala.', 'Mueve la pala con la palanca (izquierda/derecha o arriba/abajo).', 'Tienes 3 vidas: si la bola pasa, pierdes una.'],
  crear(c) {
    const n = c.n, W = c.W, H = c.H, lados = LADOS[Math.max(2, Math.min(4, n))], VIDAS = 3, RB = 8, OFF = 22, GR = 12;
    const P = lados.slice(0, n).map((l) => ({ l, u: 0.5, vidas: VIDAS, vivo: true, err: 0, t: 0 })), pts = Array(n).fill(0);
    const eje = (p) => (p.l === 'b' || p.l === 't' ? W : H), largo = (p) => eje(p) * 0.22;
    const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, hit: 0, espera: 1 };
    const sacar = () => { const vivos = P.filter((p) => p.vivo); const l = c.rnd.elige(vivos).l, a = c.rnd.entre(-0.5, 0.5), v = 230; const d = { b: [0, 1], t: [0, -1], l: [-1, 0], r: [1, 0] }[l]; ball.x = W / 2; ball.y = H / 2; ball.vx = (d[0] * Math.cos(a) - d[1] * Math.sin(a)) * v; ball.vy = (d[0] * Math.sin(a) + d[1] * Math.cos(a)) * v; ball.hit = 0; ball.espera = 1; };
    sacar();
    const lado = (l) => P.find((p) => p.l === l);
    const inst = {
      pts, fin: false, t: 0, etq: (i) => '❤'.repeat(Math.max(0, P[i].vidas)),
      update(dt, ent) {
        if (this.fin) return; this.t += dt;
        P.forEach((p, i) => {
          if (!p.vivo) return;
          let m = p.l === 'b' || p.l === 't' ? ent[i].wx : ent[i].wy;
          if (c.jug[i].bot) {
            const lv = c.jug[i].nivel, a = p.l === 'b' || p.l === 't' ? ball.x / W : ball.y / H; p.t -= dt; if (p.t <= 0) { p.t = 0.5; p.err = c.rnd.gauss() * [0.16, 0.1, 0.05][lv]; }
            const cerca = p.l === 'b' ? ball.vy > 0 : p.l === 't' ? ball.vy < 0 : p.l === 'r' ? ball.vx > 0 : ball.vx < 0;
            const obj = cerca || lv > 0 ? a + p.err : 0.5; m = clamp((obj - p.u) * 9, -1, 1) * [0.5, 0.75, 0.95][lv];
          }
          p.u = clamp(p.u + m * 1.25 * dt, largo(p) / eje(p) / 2, 1 - largo(p) / eje(p) / 2);
        });
        if (ball.espera > 0) { ball.espera -= dt; } else for (let s = 0; s < 3; s++) {
          const d = dt / 3; ball.x += ball.vx * d; ball.y += ball.vy * d;
          const rebote = (l) => { const p = lado(l); return p && p.vivo ? p : null; };
          const pala = (l, pos, dir) => {
            const p = rebote(l); if (!p) return false; const L = largo(p), centro = p.u * eje(p), q = l === 'b' || l === 't' ? ball.x : ball.y;
            if (Math.abs(q - centro) <= L / 2 + RB) {
              const off = clamp((q - centro) / (L / 2), -1, 1), v = Math.min(640, 235 + (++ball.hit) * 20);
              const a = off * 0.9; const tang = Math.sin(a) * v, norm = Math.cos(a) * v;
              if (l === 'b') { ball.vy = -norm; ball.vx = tang; } else if (l === 't') { ball.vy = norm; ball.vx = tang; } else if (l === 'r') { ball.vx = -norm; ball.vy = tang; } else { ball.vx = norm; ball.vy = tang; }
              c.fx.snd('toque'); const i = P.indexOf(p); if (!c.jug[i].bot) c.fx.vib(i, 0.2, 0.3, 40); return true;
            } return false;
          };
          if (ball.y > H - OFF - GR / 2 - RB && ball.vy > 0 && ball.y < H - OFF + RB) pala('b');
          if (ball.y < OFF + GR / 2 + RB && ball.vy < 0 && ball.y > OFF - RB) pala('t');
          if (ball.x > W - OFF - GR / 2 - RB && ball.vx > 0 && ball.x < W - OFF + RB) pala('r');
          if (ball.x < OFF + GR / 2 + RB && ball.vx < 0 && ball.x > OFF - RB) pala('l');
          const fuera = ball.y > H ? 'b' : ball.y < 0 ? 't' : ball.x > W ? 'r' : ball.x < 0 ? 'l' : null;
          if (fuera) {
            const p = rebote(fuera);
            if (p) { p.vidas--; const i = P.indexOf(p); c.fx.snd('pierde'); if (!c.jug[i].bot) c.fx.vib(i, 0.9, 0.5, 220); if (p.vidas <= 0) { p.vivo = false; pts[i] = this.t; c.fx.snd('explosion'); } sacar(); break; }
            if (fuera === 'b' || fuera === 't') { ball.vy = -ball.vy; ball.y = fuera === 'b' ? H : 0; } else { ball.vx = -ball.vx; ball.x = fuera === 'r' ? W : 0; }
          }
        }
        const vivos = P.filter((p) => p.vivo).length;
        if ((n > 1 && vivos <= 1) || this.t > 50) { this.fin = true; P.forEach((p, i) => { if (p.vivo) pts[i] = 1000 + p.vidas; }); }
      },
      draw(g) {
        g.strokeStyle = '#ffffff22'; g.lineWidth = 2; g.setLineDash([10, 10]); g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); g.setLineDash([]);
        ['b', 't', 'l', 'r'].forEach((l) => { const p = lado(l); if (p && p.vivo) return; g.fillStyle = '#ffffff25'; if (l === 'b') g.fillRect(0, H - 6, W, 6); if (l === 't') g.fillRect(0, 0, W, 6); if (l === 'l') g.fillRect(0, 0, 6, H); if (l === 'r') g.fillRect(W - 6, 0, 6, H); });
        P.forEach((p, i) => {
          if (!p.vivo) return; const L = largo(p), q = p.u * eje(p); g.fillStyle = c.jug[i].color; g.strokeStyle = '#fff'; g.lineWidth = 2;
          const x = p.l === 'b' || p.l === 't' ? q - L / 2 : p.l === 'l' ? OFF - GR / 2 : W - OFF - GR / 2, y = p.l === 'b' ? H - OFF - GR / 2 : p.l === 't' ? OFF - GR / 2 : q - L / 2, w = p.l === 'b' || p.l === 't' ? L : GR, h = p.l === 'b' || p.l === 't' ? GR : L;
          rrect(g, x, y, w, h, 6); g.fill(); g.stroke();
        });
        g.beginPath(); g.arc(ball.x, ball.y, RB, 0, TAU); g.fillStyle = '#fff'; g.fill();
        if (ball.espera > 0) texto(g, '●', ball.x, ball.y, 20, '#ffd23d');
      }
    };
    return inst;
  }
};
