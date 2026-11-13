import { dentroZona, texto, rrect } from '../util.js';
import { vecino } from '../util.js';

const EMOJIS = ['🍎', '🍌', '🍇', '🍒', '🍑', '🍉', '🍋', '🥝', '🌽', '🥕', '🍄', '🌵', '⭐', '🌙', '🔥', '❄️', '🎲', '🎸'];
export default {
  id: 'memoria', nombre: 'Memoria duelo', icono: '🃏', cat: 'Mesa y estrategia', min: 2, max: 4, dur: 50, ctrl: 'puntero', compartido: true,
  instr: ['Por turnos, destapa dos cartas.', 'Si son iguales te las quedas y repites turno.', 'Gana quien consiga más parejas.'],
  crear(c) {
    const n = c.n, COLS = 4, FIL = 4, PAR = 8, pts = Array(n).fill(0);
    const sel = c.rnd.baraja(EMOJIS).slice(0, PAR), cartas = c.rnd.baraja([...sel, ...sel]).map((v) => ({ v, e: 0, f: 0 }));
    const conocido = new Map(), S = { turno: 0, fase: 'elige', t: 0, a: -1, b: -1, cur: 0, lim: 14 };
    const geo = () => { const cs = Math.min(c.W * 0.9 / COLS, c.H * 0.62 / FIL); return { cs, x: (c.W - cs * COLS) / 2, y: (c.H - cs * FIL) / 2 }; };
    const centro = (k, G) => ({ x: G.x + (k % COLS + 0.5) * G.cs, y: G.y + (((k / COLS) | 0) + 0.5) * G.cs });
    const voltear = (k) => {
      if (S.fase !== 'elige' || cartas[k].e !== 0) return; cartas[k].e = 1; conocido.set(k, cartas[k].v); c.fx.snd('toque'); S.lim = 14;
      if (S.a < 0) S.a = k; else { S.b = k; S.fase = 'mira'; S.t = 0; }
    };
    const botElige = () => {
      const lv = c.jug[S.turno].nivel, pr = [0.35, 0.75, 1][lv], libres = cartas.map((q, k) => (q.e === 0 ? k : -1)).filter((k) => k >= 0);
      const sabe = (k) => conocido.has(k) && c.rnd() < pr;
      if (S.a >= 0) { const par = libres.find((k) => k !== S.a && conocido.get(k) === cartas[S.a].v && sabe(k)); if (par != null) return par; const nuevas = libres.filter((k) => k !== S.a && !conocido.has(k)); return c.rnd.elige(nuevas.length ? nuevas : libres.filter((k) => k !== S.a)); }
      for (const k of libres) { const o = libres.find((q) => q !== k && conocido.get(q) === conocido.get(k) && conocido.has(k)); if (o != null && sabe(k) && sabe(o)) return k; }
      const nuevas = libres.filter((k) => !conocido.has(k)); return c.rnd.elige(nuevas.length ? nuevas : libres);
    };
    const inst = {
      pts, fin: false,
      puntero(i, lx, ly, wx, wy) { if (c.jug[S.turno].bot) return; const G = geo(), cx = Math.floor((wx - G.x) / G.cs), cy = Math.floor((wy - G.y) / G.cs); if (cx >= 0 && cx < COLS && cy >= 0 && cy < FIL) { S.cur = cy * COLS + cx; voltear(S.cur); } },
      update(dt, ent) {
        if (this.fin) return; S.t += dt;
        cartas.forEach((q) => { q.f += ((q.e ? 1 : 0) - q.f) * Math.min(1, dt * 12); });
        if (S.fase === 'mira') {
          if (S.t > 1.0) {
            const A = cartas[S.a], B = cartas[S.b];
            if (A.v === B.v) { A.e = B.e = 2; pts[S.turno]++; c.fx.snd('ok'); if (cartas.every((q) => q.e === 2)) { this.fin = true; return; } }
            else { A.e = B.e = 0; S.turno = (S.turno + 1) % n; c.fx.snd('mal'); }
            S.a = S.b = -1; S.fase = 'elige'; S.t = 0; S.lim = 14;
          } return;
        }
        S.lim -= dt; const j = c.jug[S.turno];
        if (j.bot) { if (S.t > 0.8) { S.t = 0; voltear(botElige()); } return; }
        const e = ent[S.turno], G = geo(), pp = cartas.map((_, k) => centro(k, G)), mv = (dx, dy) => { const v = vecino(pp, S.cur, dx, dy, (k) => cartas[k].e !== 2); if (v >= 0) S.cur = v; };
        if (e.izqP) mv(-1, 0); if (e.derP) mv(1, 0); if (e.arrP) mv(0, -1); if (e.abaP) mv(0, 1);
        if (cartas[S.cur].e === 2) S.cur = cartas.findIndex((q) => q.e === 0);
        if (e.aP) voltear(S.cur);
        if (S.lim <= 0) { const l = cartas.map((q, k) => (q.e === 0 ? k : -1)).filter((k) => k >= 0); voltear(c.rnd.elige(l)); }
      },
      draw(g) {
        const G = geo();
        cartas.forEach((q, k) => {
          const p = centro(k, G), s = G.cs * 0.88, sx = Math.max(0.05, Math.abs(Math.cos(q.f * Math.PI))), arriba = q.f > 0.5;
          g.save(); g.translate(p.x, p.y); g.scale(sx, 1);
          g.fillStyle = q.e === 2 ? '#ffffff10' : arriba ? '#fff' : '#4a3aa8'; rrect(g, -s / 2, -s / 2, s, s, 12); g.fill();
          if (k === S.cur && S.fase === 'elige' && !c.jug[S.turno].bot && q.e === 0) { g.lineWidth = 4; g.strokeStyle = c.jug[S.turno].color; g.stroke(); }
          if (arriba && q.e !== 2) texto(g, q.v, 0, 2, s * 0.55); else if (q.e === 2) texto(g, q.v, 0, 2, s * 0.4); else texto(g, '?', 0, 0, s * 0.4, '#ffffff66');
          g.restore();
        });
        for (let i = 0; i < n; i++) dentroZona(g, c.zonas[i], (w, h) => { const mi = S.turno === i; texto(g, mi ? `¡Tu turno! (${Math.max(0, S.lim | 0)})` : 'Espera…', w / 2, h - 70, 15, mi ? '#fff' : '#ffffff77'); });
      }
    };
    return inst;
  }
};
